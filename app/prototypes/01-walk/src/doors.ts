// Doors the player opens and closes: the side door, the trapdoor, the roof hatches, the fridge,
// galley and locker doors. Each is tagged in the ship file (export-ship.py) with a `door` property:
// the hinge axis (ship space), the open angle, `toGround` (the side door drops outward until it rests
// on the ground; fully open, it's a ramp: a smooth walkable slope stands in for its steps, as for the
// cargo ramp) and `startOpen` (the trapdoor, for now). The hinge is at the recorded `hinge` point.
// A moving door pushes her out of its way, sideways, through her character controller (so never into
// a wall). If she can't be pushed (pinned, on a ladder, or it would have to lift her), it stops and
// waits until she's clear.
// Sliding doors (`door: {slide, auto}`): the bulkhead doors' two leaves, the engineering window's two
// halves and the lever beside it move along a vector instead of turning. The bulkhead doors (`auto`)
// open when she's near and close when she leaves, unless they were shut from a panel.
// Plans: doc/plans/features/interaction-doors.md, doc/plans/features/interaction-clearance.md,
// doc/plans/features/bulkhead-doors.md, doc/plans/features/interaction-sounds.md (their sounds)

import * as THREE from 'three/webgpu';
import type { CueId } from './audio';
import { named } from './names';
import { prepareRaycasts, type CutUnit } from './visibility';
import { CONTACT_GAP, type MovingCollider, type Physics } from './physics';
import { settings } from './settings';

/** What a moving door can do to her. */
export interface Pusher {
  /** Move her by this much, through her character controller (walls stop her). */
  push: (by: THREE.Vector3) => void;
  /** On a ladder: she can't be pushed. */
  climbing: () => boolean;
  /** Where she stands (world). */
  feet: () => THREE.Vector3;
}

/**
 * Pushed this far clear of the door (m): more than her controller's contact gap. Within the gap the
 * controller counts her as touching the door and won't move her at all, not even away from it (with
 * the gap at 0.03 and this still at 0.02, an opened locker door left her stuck: owner, 2026-10-14).
 */
const PUSH_MARGIN = CONTACT_GAP + 0.03;
/** A door that stopped against her waits until she's this far clear of its next position (m). */
const RESUME_GAP = CONTACT_GAP + 0.07;
/** A contact normal steeper than this would lift her: the door stops instead. */
const LIFTS = 0.5;
/**
 * A door that stops against her backs off until there's this much room (m): left touching her (within
 * her controller's contact gap), wedged against furniture on the other side, she couldn't move at all.
 */
const STOP_GAP = CONTACT_GAP + 0.04;

/**
 * Moves a part (a door, the ramp) from `from` to `to` (0..1), pushing her out of its way. Returns
 * where it got to, and whether it's now waiting for her to move.
 * @param unstoppable it still pushes her where it can, but never stops or waits for her (the cargo
 *   ramp moved from its keypad)
 */
export function advance(collider: MovingCollider, pose: (t: number) => void, from: number, to: number, pusher: Pusher, waiting: boolean, unstoppable = false): { amount: number; waiting: boolean } {
  pose(to);
  const stop = () => {
    if (unstoppable) return { amount: to, waiting: false }; // posed at `to` above, and left there
    // Back off (toward where it came from) until it's clear of her by STOP_GAP.
    const back = Math.sign(from - to) || -1;
    let t = from;
    pose(t);
    for (let i = 0; i < 25 && collider.contact(STOP_GAP); i++) {
      t = THREE.MathUtils.clamp(t + back * 0.01, 0, 1);
      pose(t);
    }
    return { amount: t, waiting: true };
  };
  // After stopping against her, it doesn't creep after her: it waits for room.
  if (waiting) {
    const c = collider.contact(RESUME_GAP);
    if (c && c.depth > -RESUME_GAP) return stop();
  }
  // She's kept PUSH_MARGIN clear of it, not just out of it: a door that came to rest nearer than her
  // controller's contact gap, without ever overlapping her, left her unable to move.
  const near = (c: { depth: number } | null): c is { depth: number; normal: THREE.Vector3 } => c !== null && c.depth > -PUSH_MARGIN + 0.002;
  for (let i = 0; i < 3; i++) {
    const c = collider.contact(PUSH_MARGIN);
    if (!near(c)) return { amount: to, waiting: false };
    const sideways = new THREE.Vector3(c.normal.x, 0, c.normal.z);
    const length = sideways.length();
    if (!settings.doorsPush || pusher.climbing() || c.normal.y > LIFTS || length < 0.3) return stop();
    // Sideways only, far enough to clear the overlap, and the margin, along the normal.
    pusher.push(sideways.divideScalar(length).multiplyScalar((c.depth + PUSH_MARGIN) / length));
  }
  return near(collider.contact(PUSH_MARGIN)) ? stop() : { amount: to, waiting: false };
}

export class Door {
  /** 0 = closed, 1 = open. */
  amount = 0;
  open = false;
  /** Stopped against her: waiting until she's clear. */
  blocked = false;
  readonly units: CutUnit[] = [];
  /** A door that's a ramp when fully open: the walkable slope then replaces its collider. */
  walkway: { setEnabled: (on: boolean) => void } | null = null;
  /**
   * A hatch she walks over when it's shut (the trapdoor): a fixed lid then replaces its collider.
   * Standing on a moving part's collider, her controller hardly moves her (she stuck on the closed
   * trapdoor: owner, 2026-10-14); on a fixed one she walks as on the floor.
   */
  lid: { setEnabled: (on: boolean) => void } | null = null;
  /** A sliding door: how far and which way it moves to open (the ship's space). Not set: it turns. */
  slide: THREE.Vector3 | null = null;
  /** Opens when she's near, closes when she leaves (the bulkhead doors). */
  auto = false;
  /** An automatic door shut from a panel: it stays shut until a panel is used again. */
  shut = false;
  /** The doors that open with it (`opensWith`), itself included. */
  group: Door[] = [this];
  /** Around the whole door, closed (world): how near she is to it. */
  readonly zone = new THREE.Box3();
  /** The panel or lever it's the handle of (its parent in the file): it follows what that controls. */
  device: THREE.Object3D | null = null;
  /**
   * What moves first (the window waits for its lever: the lever's sound was covered by the
   * window's, owner 2026-10-13). This starts `leverDelay` seconds after it was asked to move.
   */
  waitsFor: Door[] = [];
  /** How long ago it was asked to move (s); 0 at rest. */
  private asked = 0;
  private home = new THREE.Vector3();

  constructor(
    readonly name: string,
    /** The door's own object (what's tagged in the file). */
    readonly object: THREE.Object3D,
    /** The hinge: rotating it swings the door. */
    readonly hinge: THREE.Object3D,
    readonly axis: THREE.Vector3,
    readonly openAngle: number,
    readonly collider: MovingCollider | null,
  ) {}

  toggle(): void {
    this.open = !this.open;
  }

  /**
   * One fixed step: ease toward open or closed, pushing her out of the way (`force`: jump there,
   * at load).
   */
  update(dt: number, force = false, pusher?: Pusher): void {
    const target = this.open ? 1 : 0;
    if (!force && this.amount === target) {
      this.blocked = false;
      this.asked = 0;
      return;
    }
    if (!force && this.held) {
      this.asked += dt;
      return;
    }
    const step = dt / (this.slide ? settings.slideSeconds : settings.doorSeconds);
    const next = force ? target : target > this.amount ? Math.min(target, this.amount + step) : Math.max(target, this.amount - step);
    // A sliding door that's opening moves along its own face, away from the doorway: it has nothing
    // to push. (Running at it, she touched the leaves before they were open and was pushed aside,
    // against the edge of the doorway.)
    const opening = this.slide !== null && next > this.amount;
    if (force || !this.collider || !pusher || opening) {
      this.amount = next;
      this.pose();
    } else {
      const moved = advance(this.collider, (t) => {
        this.amount = t;
        this.pose();
      }, this.amount, next, pusher, this.blocked);
      this.blocked = moved.waiting;
    }
    this.collider?.sync();
    if (this.walkway) {
      const open = this.amount === 1;
      this.walkway.setEnabled(open);
      this.collider?.setEnabled(!open);
    }
    if (this.lid) {
      const shut = this.amount === 0;
      this.lid.setEnabled(shut);
      this.collider?.setEnabled(!shut);
    }
    for (const unit of this.units) prepareRaycasts(unit);
  }

  /** Call once, closed: it slides from where it is now. */
  slides(by: THREE.Vector3): void {
    this.slide = by;
    this.home.copy(this.hinge.position);
  }

  /** Still on its way to open or closed. */
  get moving(): boolean {
    return this.amount !== (this.open ? 1 : 0);
  }

  /** Asked to move and not started yet: what moves first has its time. */
  get held(): boolean {
    return this.waitsFor.length > 0 && this.moving && this.asked < settings.leverDelay;
  }

  private pose(): void {
    const t = this.amount;
    const eased = t * t * (3 - 2 * t);
    if (this.slide) this.hinge.position.copy(this.home).addScaledVector(this.slide, eased);
    else this.hinge.quaternion.setFromAxisAngle(this.axis, this.openAngle * eased);
    this.hinge.updateMatrixWorld(true);
  }
}

/** A hinged door that lies flatter than this when shut (m) is a hatch in a floor: it gets a lid. */
const LID_THICK = 0.4;

/** An automatic door closes when she's this much further away than where it opens (m): no flutter at the edge. */
const AUTO_CLOSE_MARGIN = 0.3;

/**
 * One fixed step, before the doors move: the automatic doors (the bulkhead doors) open while she's
 * near, on their deck, and close when she leaves; one shut from a panel stays shut. With the
 * automatic opening off (tuning panel), the panels alone open and close them.
 * @param feet where she stands (world)
 */
export function updateAutoDoors(doors: Door[], feet: THREE.Vector3, height: number): void {
  if (!settings.autoDoors) return;
  for (const door of doors) {
    if (!door.auto) continue;
    const zone = door.zone;
    const onDeck = feet.y + height > zone.min.y && feet.y < zone.max.y;
    const dx = Math.max(zone.min.x - feet.x, 0, feet.x - zone.max.x);
    const dz = Math.max(zone.min.z - feet.z, 0, feet.z - zone.max.z);
    const reach = settings.autoDoorDistance + (door.open ? AUTO_CLOSE_MARGIN : 0);
    door.open = !door.shut && onDeck && Math.hypot(dx, dz) <= reach;
  }
}

/**
 * The doors in the ship: a hinge for each (the part attached to it), its open angle (for `toGround`,
 * the first angle at which it touches the ground), and a collider for the big ones.
 */
export function createDoors(ship: THREE.Object3D, physics: Physics, hingeAt: (ship: THREE.Object3D, part: THREE.Object3D) => THREE.Object3D): Door[] {
  const tagged: THREE.Object3D[] = [];
  ship.traverse((o) => {
    if (o.userData.door) tagged.push(o);
  });
  const doors = tagged.map((object) => {
    const data = object.userData.door as { axis: [number, number, number]; angle: number; toGround: boolean; startOpen?: boolean; slide?: [number, number, number]; auto?: boolean };
    // A lever on its panel is the panel's handle (below, it's attached to a pivot of its own).
    const device = object.parent && object.parent.userData.interact === 'use' ? object.parent : null;
    const hinge = hingeAt(ship, object);
    if (data.slide) {
      // A handle doesn't collide: it's a few centimetres on the wall.
      const door = new Door(object.name, object, hinge, new THREE.Vector3(0, 1, 0), 0, device ? null : physics.addMovingConvex(hinge));
      door.slides(new THREE.Vector3(...data.slide));
      door.auto = data.auto === true;
      door.device = device;
      return door;
    }
    const axis = new THREE.Vector3(...data.axis).normalize();
    const openAngle = data.toGround ? angleToGround(hinge, axis, data.angle) : data.angle;
    const walkway = data.toGround ? physics.addStaticTriangles(...walkwayTriangles(hinge, axis, physics)) : null;
    hinge.quaternion.identity();
    hinge.updateMatrixWorld(true);
    const collider = physics.addMovingConvex(hinge);
    const door = new Door(object.name, object, hinge, axis, openAngle, collider);
    door.walkway = walkway;
    // A hatch lying in a floor (it's shut here): its top as a fixed lid. Off until the door's first
    // update, so nothing that measures the ship with the doors left out sees it.
    const shut = new THREE.Box3().setFromObject(hinge);
    if (!walkway && Math.abs(axis.y) < 0.7 && shut.max.y - shut.min.y < LID_THICK) {
      door.lid = physics.addStaticBox(shut);
      door.lid.setEnabled(false);
    }
    door.open = data.startOpen === true; // posed by the ship's first (forced) update
    door.device = device;
    return door;
  });
  // Doors that open together (`opensWith`: the roof hatch's two parts, a bulkhead door's two leaves).
  for (const door of doors) {
    const other = door.object.userData.opensWith as string | undefined;
    if (!other) continue;
    const partner = doors.find((d) => d !== door && named(d.object, other));
    if (!partner) console.warn(`[01-walk] "${door.name}" opens with "${other}", which isn't a door`);
    else if (partner.group.includes(door)) door.group = partner.group;
    else door.group = [door, partner].sort((a, b) => a.name.localeCompare(b.name));
  }
  // They're closed here: the bounds of each whole door, for how near she is.
  const part = new THREE.Box3();
  for (const door of doors) for (const d of door.group) door.zone.union(part.setFromObject(d.hinge));
  return doors;
}

/** What the door sounds need of the audio (`GameAudio`). */
export interface DoorAudio {
  play(id: CueId, at?: THREE.Object3D): boolean;
  stop(id: CueId, at?: THREE.Object3D, fade?: number): void;
}

/** The motor of a door that's a ramp dies away over this long when it stops (s). */
const MOTOR_FADE = 0.2;

/**
 * A motor's sound for something that opens down to the ground (the side door, the cargo ramp): it
 * runs while the thing moves, and the stop is heard when it gets there. Stopped against her and
 * waiting, the motor is off and there's no stop sound. Returns what to call each frame.
 * @param moving on its way and not waiting
 * @param arrived at open or closed
 */
export function motorSound(audio: DoorAudio, at: THREE.Object3D, moving: () => boolean, arrived: () => boolean): () => void {
  let was = false;
  return () => {
    const now = moving();
    if (now === was) return;
    was = now;
    if (now) audio.play('sfx_ramp_move', at);
    else {
      audio.stop('sfx_ramp_move', at, MOTOR_FADE);
      if (arrived()) audio.play('sfx_ramp_stop', at);
    }
  };
}

/**
 * The doors' sounds: one place per door (the middle of the closed door, not each leaf or part).
 * Returns what to call each frame.
 * - A sliding door (the bulkhead doors, the engineering window): `sfx_door_slide` when it starts to
 *   move, opening or closing (as in the UE prototype).
 * - A door that opens down to the ground (the side door): a motor, see `motorSound`.
 * - The other hinged doors: one sound when it starts to open, one when it reaches closed. A hinge
 *   that stands upright is a small door's (lockers, the fridge, the cupboard: a latch); one that
 *   lies flat is a hatch's (the trapdoor, the roof hatch: the same sounds, lower).
 */
export function createDoorSounds(ship: THREE.Object3D, doors: Door[], audio: DoorAudio): () => void {
  const groups = [...new Set(doors.filter((d) => !d.device).map((d) => d.group))];
  const updates = groups.map((group) => {
    const first = group[0]!;
    const at = new THREE.Object3D();
    at.name = `${first.name} sound`;
    ship.add(at);
    ship.worldToLocal(first.zone.getCenter(at.position));
    at.updateMatrixWorld(true);
    let open = first.open;
    if (first.slide) {
      return () => {
        // When it starts to move: after its lever, if it has one.
        if (first.open === open || first.held) return;
        open = first.open;
        audio.play('sfx_door_slide', at);
      };
    }
    if (first.walkway) return motorSound(audio, at, () => first.moving && !first.blocked, () => !first.moving);
    const hatch = Math.abs(first.axis.y) < 0.7;
    let closed = first.amount === 0;
    return () => {
      if (first.open && !open) audio.play(hatch ? 'sfx_hatch_open' : 'sfx_latch_open', at);
      open = first.open;
      const now = first.amount === 0;
      if (now && !closed) audio.play(hatch ? 'sfx_hatch_close' : 'sfx_latch_close', at);
      closed = now;
    };
  });
  return () => {
    for (const update of updates) update();
  };
}

/** Steepest the stand-in slope may be (her controller climbs up to 45°). */
const WALKWAY_SLOPE = THREE.MathUtils.degToRad(42);

/**
 * The walkable stand-in for a door that opens down to the ground (it's at its open angle when this
 * is called), in world space and as wide as the door: a slope up to the top of the doorway's sill,
 * then flat across the sill into the ship. The door's own steps would be bumpy, and the sill stands
 * above both the door's hinge and the floor inside, so the slope aims at the sill's outer edge, at
 * most WALKWAY_SLOPE steep: its foot may lie a little past the door's far end.
 */
function walkwayTriangles(hinge: THREE.Object3D, shipAxis: THREE.Vector3, physics: Physics): [Float32Array, Uint32Array] {
  hinge.updateWorldMatrix(true, true);
  const h = new THREE.Vector3().setFromMatrixPosition(hinge.matrixWorld);
  const axis = shipAxis.clone().transformDirection(hinge.parent!.matrixWorld);
  // The far end (lowest point, brought back to the hinge's line across the door) and the width.
  const v = new THREE.Vector3();
  const far = new THREE.Vector3(0, Infinity, 0);
  let minW = Infinity;
  let maxW = -Infinity;
  hinge.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (v.y < far.y) far.copy(v);
      const w = v.clone().sub(h).dot(axis);
      minW = Math.min(minW, w);
      maxW = Math.max(maxW, w);
    }
  });
  far.addScaledVector(axis, -far.clone().sub(h).dot(axis));
  const outward = new THREE.Vector3(far.x - h.x, 0, far.z - h.z).normalize();
  // The sill: the static surfaces under the doorway, from just outside the hinge to just inside.
  const down = new THREE.Vector3(0, -1, 0);
  const heightAt = (d: number) => {
    const p = h.clone().addScaledVector(outward, d);
    p.y += 0.6;
    const hit = physics.ray(p, down, 1.2, true);
    return hit ? p.y - hit.distance : -Infinity;
  };
  let sillY = h.y;
  for (let d = 0.3; d >= -0.3; d -= 0.02) sillY = Math.max(sillY, heightAt(d));
  let edge = 0; // the sill's outer edge, as a distance outward from the hinge
  for (let d = 0.3; d >= -0.3; d -= 0.02) {
    if (heightAt(d) >= sillY - 0.03) {
      edge = d + 0.02;
      break;
    }
  }
  const top = h.clone().addScaledVector(outward, edge);
  top.y = sillY;
  const inside = h.clone().addScaledVector(outward, -0.3);
  inside.y = sillY;
  const run = Math.max(sillY / Math.tan(WALKWAY_SLOPE), new THREE.Vector3(far.x - top.x, 0, far.z - top.z).length());
  const foot = top.clone().addScaledVector(outward, run);
  foot.y = 0;
  console.info(`[01-walk] side door ramp: sill ${sillY.toFixed(3)} at ${edge.toFixed(2)} m out, hinge ${h.y.toFixed(3)}, foot ${run.toFixed(2)} m out`);
  const corners = [foot, top, inside].flatMap((p) => [p.clone().addScaledVector(axis, minW), p.clone().addScaledVector(axis, maxW)]);
  const vertices = new Float32Array(corners.flatMap((p) => [p.x, p.y, p.z]));
  // Two quads (slope, then flat), both faces: 0-1 foot, 2-3 sill edge, 4-5 inside.
  const quads: [number, number, number, number][] = [[0, 1, 3, 2], [2, 3, 5, 4]];
  const indices = quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d, a, c, b, a, d, c]);
  return [vertices, new Uint32Array(indices)];
}

/** Turning toward `limit`, the first angle at which the part's lowest point reaches the ground. */
function angleToGround(hinge: THREE.Object3D, axis: THREE.Vector3, limit: number): number {
  const v = new THREE.Vector3();
  const lowest = (angle: number) => {
    hinge.quaternion.setFromAxisAngle(axis, angle);
    hinge.updateWorldMatrix(true, true);
    let min = Infinity;
    hinge.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const pos = mesh.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) min = Math.min(min, v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).y);
    });
    return min;
  };
  const steps = Math.ceil(Math.abs(THREE.MathUtils.radToDeg(limit)) * 4);
  for (let i = 0; i <= steps; i++) {
    const angle = (limit * i) / steps;
    if (lowest(angle) <= 0.01) return angle;
  }
  return limit;
}
