// Interaction: point at something and press E (keyboard) or Circle / B (gamepad) to use it.
// "Pointing" in third person: of the things within her reach (from her chest, not hidden behind
// something solid) and in her room (the ship's rooms; owner, 2026-10-22), the one aimed at most nearly, by **whichever the player moved last** (owner, 2026-10-22):
// the camera (its cone: interactMaxAngleDeg across) or her facing (hers: interactFacingAngleDeg
// across); up and down come from the camera in both (interactMaxVerticalDeg; the camera can't tilt
// up indoors) and count a third as much as across. Measured to its prompt's point (a door's handle,
// otherwise its middle). Nothing in that cone: the other's. No crosshair. A prompt next to the target on screen names the
// action, with the button of the last device used (owner, 2026-10-12; the highlight that came first
// is gone, 2026-10-14); every other thing nearby shows a white circle at its prompt's point
// (owner, 2026-10-22; plan: doc/plans/features/prompt-choice.md).
// Targets: the doors, and the devices (the kinds `keypad`, `door-panel`, `lever`: the keypads by the
// side door and the ramp, the bulkhead doors' panels, the engineering window's lever), each naming
// what it opens by id with its `controls` tag. A door that a device controls isn't offered itself (the side door,
// the cargo ramp, the bulkhead doors, the window). Doors that open together are one target (the
// roof hatch's two parts), and a panel moves all of them (a bulkhead door's two leaves).
// Other devices (the boombox) make their own target and are handed in (`others`).
// Locked (a scene or Ink): a door, or its keypad or panel, offers its story knot (`use_<id>`, its
// `# verb:` tag as the prompt) if the story has one, otherwise "Locked" (`respectLocks`); so does
// anything else locked by id (the flight rules: a jetpack, her parka). A knot
// tagged `# instead` runs in place of the action, locked or not (the crew's lockers: her remark).
// The crew: *Talk to Dr. Kaufman* (and so on) when the story has their `talk_<id>` knot, the prompt
// above their heads (`crewInteractables`). A thing with no action of its own (the pilot's seat) is
// offered while the story has its `use_<id>` knot (`storyInteractables`).
// Plan: doc/plans/features/interaction-doors.md, doc/plans/backlog-passes.md (pass 1),
// doc/plans/features/bulkhead-doors.md, doc/plans/features/audio-from-ue.md,
// doc/plans/features/interaction-sounds.md (the panels' two tones, the lever's clunk),
// doc/plans/features/dialogue.md (talking to the crew)

import * as THREE from 'three/webgpu';
import type { CueId } from './audio';
import type { Command } from './commands';
import type { Door } from './doors';
import type { Entities, Openable } from './entities';
import type { Device } from './input';
import { isDeviceKind, isStoryKind } from './kinds';
import { labelOf } from './labels';
import type { Physics } from './physics';
import { settings } from './settings';
import { displayName, type GameStory } from './story';

export interface Interactable {
  /** A name for checks and logs. */
  name: string;
  /** Its parts: for its bounds (all of them together). */
  objects: THREE.Object3D[];
  /** What pressing the button does, for the prompt ("Open", "Close"...). */
  verb: () => string;
  act: () => void;
  /** Offered right now (default: yes). */
  available?: () => boolean;
  /** What it opens: while any is locked, it does what `respectLocks` says instead. */
  controls?: Openable[];
  /** Where the prompt goes beside (world, into `out`): a door's handle. Not set: the centre of its bounds. */
  anchor?: (out: THREE.Vector3) => THREE.Vector3;
  /** The prompt centred above the anchor instead of beside it (a character's head). */
  above?: boolean;
  /** A dot only while it's the target (the crew: owner, 2026-10-22). */
  dotWhenTarget?: boolean;
  /** How far from her chest to its bounds it can be used (m). Not set: `settings.interactReach`. */
  reach?: () => number;
  /** The point her line of sight must reach (world, into `out`). Not set: the nearest of its bounds. */
  sight?: (out: THREE.Vector3) => THREE.Vector3;
  /** Something solid this close in front of its bounds doesn't hide it (m; default 0.15): a character's seat. */
  sightMargin?: number;
}

/** A hinged door's handle is this far in from the edge away from its hinge (m). */
const HANDLE_INSET = 0.05;

/**
 * A hinged door's handle, by rule (doc/plans/features/prompt-placement.md): the edge away from the
 * hinge, halfway along it, in the middle of the door's thickness. Measured once, closed, in the
 * hinge's own space, so the point swings with the door.
 */
function handleOf(door: Door): (out: THREE.Vector3) => THREE.Vector3 {
  const hinge = door.hinge;
  const toHinge = new THREE.Matrix4().copy(hinge.matrixWorld).invert();
  const box = new THREE.Box3();
  const part = new THREE.Box3();
  door.object.traverse((o) => {
    const geometry = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!geometry) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    box.union(part.copy(geometry.boundingBox!).applyMatrix4(new THREE.Matrix4().multiplyMatrices(toHinge, o.matrixWorld)));
  });
  const local = new THREE.Vector3();
  if (!box.isEmpty()) {
    // Away from the hinge line, square to the axis: the far edge is the box's furthest corner that way.
    const centre = box.getCenter(new THREE.Vector3());
    const away = centre.clone().addScaledVector(door.axis, -centre.dot(door.axis));
    if (away.lengthSq() > 1e-6) {
      away.normalize();
      let far = -Infinity;
      for (let i = 0; i < 8; i++) {
        const corner = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
        far = Math.max(far, corner.dot(away));
      }
      local.copy(centre).addScaledVector(away, far - centre.dot(away) - HANDLE_INSET);
    } else {
      local.copy(centre);
    }
  }
  return (out) => out.copy(local).applyMatrix4(hinge.matrixWorld);
}

/** The middle of several points (doors that open as one target: where their handles meet). */
function middleOf(anchors: ((out: THREE.Vector3) => THREE.Vector3)[]): (out: THREE.Vector3) => THREE.Vector3 {
  const one = new THREE.Vector3();
  return (out) => {
    out.set(0, 0, 0);
    for (const anchor of anchors) out.add(anchor(one));
    return out.divideScalar(anchors.length);
  };
}

/** The centre of an object's bounds (a lever's handle). */
function centreOf(object: THREE.Object3D): (out: THREE.Vector3) => THREE.Vector3 {
  const box = new THREE.Box3();
  return (out) => box.setFromObject(object).getCenter(out);
}

/**
 * The ship's interactables: its doors, and the devices that control something (`controls`): the
 * keypads of the ramp and the side door, the bulkhead doors' panels, the engineering window's lever.
 * @param others targets that are made elsewhere (the boombox)
 * @param sound plays a device's own sound, at the device: a panel's two tones (up for open, down
 *   for close), the lever's clunk
 * @param ramp the cargo ramp's state (what its keypad controls)
 */
export function shipInteractables(entities: Entities, doors: Door[], others: Interactable[] = [], sound: (id: CueId, at: THREE.Object3D) => void = () => undefined, ramp?: Openable): Interactable[] {
  const list: Interactable[] = [...others];
  // The devices first: a door with a keypad, a panel or a lever is used from there only.
  const withKeypad = new Set<Door>();
  for (const { object: o, kind } of entities.all()) {
    if (!isDeviceKind(kind)) continue;
    const target = o.userData.controls as string | undefined;
    if (!target) {
      console.warn(`[0.0.2] the ${kind} "${o.name}" controls nothing (no \`controls\` tag)`);
      continue;
    }
    if (target === 'cargo-ramp') {
      list.push({
        name: o.name,
        objects: [o],
        ...(ramp ? { controls: [ramp] } : {}),
        verb: () => `${settings.cargoRampOpen ? 'Close' : 'Open'} ${labelOf('cargo-ramp')}`,
        act: () => {
          settings.cargoRampOpen = !settings.cargoRampOpen;
          settings.cargoRampByKeypad = settings.cargoRampOpen; // from inside: it won't stop for her (ship.ts)
          sound(settings.cargoRampOpen ? 'sfx_panel_open' : 'sfx_panel_close', o);
        },
      });
      continue;
    }
    const door = doors.find((d) => d.id === target);
    if (!door) {
      console.warn(`[0.0.2] "${o.name}" controls "${target}", which isn't a door`);
      continue;
    }
    // What it moves: the door with everything that opens with it (a bulkhead door's two leaves),
    // and the device's own handle (the lever), which goes to its other position with it.
    const group = door.group;
    const handles = doors.filter((d) => d.device === o);
    for (const d of [...group, ...handles]) withKeypad.add(d);
    // The handle moves first, then what it controls.
    for (const d of group) d.waitsFor = handles;
    const what = labelOf(door.id, entities.of(door.object)?.kind);
    // A door that opens by itself: the panel shuts it and keeps it shut; used again, the door is
    // automatic again (owner, 2026-10-13). With the automatic opening off, the panel just toggles.
    const automatic = () => door.auto && settings.autoDoors;
    list.push({
      name: o.name,
      objects: [o, ...handles.map((h) => h.object)],
      controls: group,
      ...(handles[0] ? { anchor: centreOf(handles[0].object) } : {}),
      verb: () => ((automatic() ? !door.shut : door.open) ? `Close ${what}` : `Open ${what}`),
      act: () => {
        // A lever isn't used while it's moving (as in the UE prototype).
        if ([...group, ...handles].some((d) => d.moving) && handles.length > 0) return;
        let opens: boolean;
        if (automatic()) {
          const shut = !door.shut;
          for (const d of group) d.shut = shut;
          opens = !shut;
        } else {
          const open = !door.open;
          for (const d of group) {
            d.open = open;
            d.shut = false;
          }
          opens = open;
        }
        for (const h of handles) h.open = door.open;
        sound(kind === 'lever' ? 'sfx_lever' : opens ? 'sfx_panel_open' : 'sfx_panel_close', o);
      },
    });
  }
  const grouped = new Set<Door>();
  for (const all of new Set(doors.filter((d) => d.group.length > 1).map((d) => d.group))) {
    const group = all.filter((d) => !withKeypad.has(d));
    if (group.length === 0) continue;
    for (const door of group) grouped.add(door);
    const first = group[0]!;
    list.push({
      name: group.map((d) => d.name).join(' + '),
      objects: group.map((d) => d.object),
      controls: group,
      anchor: middleOf(group.map(handleOf)),
      verb: () => `${first.open ? 'Close' : 'Open'} ${labelOf(first.id, entities.of(first.object)?.kind)}`,
      // All to the same state, whatever each was.
      act: () => {
        const open = !first.open;
        for (const door of group) door.open = open;
      },
      available: () => !group.some((d) => d.collider?.under()),
    });
  }
  for (const door of doors) {
    if (withKeypad.has(door) || grouped.has(door)) continue;
    list.push({
      name: door.name,
      objects: [door.object],
      controls: [door],
      ...(door.slide ? {} : { anchor: handleOf(door) }),
      verb: () => `${door.open ? 'Close' : 'Open'} ${labelOf(door.id, entities.of(door.object)?.kind)}`,
      act: () => door.toggle(),
      // Not while she's standing on it (the trapdoor, closed).
      available: () => !door.collider?.under(),
    });
  }
  return list;
}

/**
 * The crew (the entities of kind `character`): *Talk to <name>*, running their `talk_<id>` knot,
 * while the story has one and they're shown, from further than a thing (`settings.talkReach`) and
 * if she can see their head (past the seat they're in). The prompt goes above their heads.
 */
export function crewInteractables(entities: Entities, story: () => GameStory | null, talk: (knot: string) => void): Interactable[] {
  const list: Interactable[] = [];
  const box = new THREE.Box3();
  for (const { id, object, kind } of entities.all()) {
    if (kind !== 'character') continue;
    const knot = () => story()?.talkKnot(id) ?? null;
    list.push({
      name: object.name,
      objects: [object],
      verb: () => `Talk to ${displayName(id)}`,
      act: () => {
        const k = knot();
        if (k) talk(k);
      },
      available: () => knot() !== null && shown(object),
      anchor: (out) => {
        box.setFromObject(object);
        return box.getCenter(out).setY(box.max.y + 0.08);
      },
      above: true,
      dotWhenTarget: true,
      // Further than a thing's reach (across the crew quarters' table); the seat they're in doesn't hide them.
      reach: () => settings.talkReach,
      sightMargin: 0.6,
      sight: (out) => {
        box.setFromObject(object);
        return box.getCenter(out).setY(box.max.y - 0.15);
      },
    });
  }
  return list;
}

/**
 * The things with no action of their own (kinds.ts, `STORY_KINDS`: the pilot's seat): offered while
 * the story has their `use_<id>` knot, prompted by its `# verb:` tag ("Use" without one), running it.
 */
export function storyInteractables(entities: Entities, story: () => GameStory | null, run: (command: Command) => void): Interactable[] {
  const list: Interactable[] = [];
  for (const { id, object, kind } of entities.all()) {
    if (!isStoryKind(kind)) continue;
    const knot = () => story()?.useKnot(id) ?? null;
    list.push({
      name: object.name,
      objects: [object],
      verb: () => story()?.tag(knot()!, 'verb') ?? 'Use',
      act: () => {
        const k = knot();
        if (k) run({ do: 'story', knot: k });
      },
      available: () => knot() !== null,
    });
  }
  return list;
}

/** Shown: it and everything it's under are visible (the crew are hidden on the lower deck). */
function shown(object: THREE.Object3D): boolean {
  for (let o: THREE.Object3D | null = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

/**
 * The targets, minding locks: while what one controls is locked, it runs the story's knot for it
 * (`use_<id>` of its first object, through the commands), prompted by the knot's `# verb:` tag
 * ("Use" without one); with no knot, it says "Locked" and does nothing. A knot tagged `# instead`
 * runs whether it's locked or not (someone else's locker: she says so, it stays shut).
 */
export function respectLocks(items: Interactable[], story: () => GameStory | null, run: (command: Command) => void, lockedIds: ReadonlySet<string> = new Set()): Interactable[] {
  return items.map((item) => {
    const controls = item.controls ?? [];
    const id = item.objects[0]?.userData.id as string | undefined;
    if (!controls.length && !id) return item;
    // What it opens is locked, or it is (a jetpack, her parka: the `lock` command on a thing that doesn't open).
    const locked = () => controls.some((c) => c.locked) || (id !== undefined && lockedIds.has(id));
    const knot = () => (id ? (story()?.useKnot(id) ?? null) : null);
    const instead = () => {
      const k = knot();
      return k !== null && story()!.tag(k, 'instead') !== null;
    };
    return {
      ...item,
      verb: () => {
        if (!locked() && !instead()) return item.verb();
        const k = knot();
        return k ? (story()!.tag(k, 'verb') ?? 'Use') : 'Locked';
      },
      act: () => {
        if (!locked() && !instead()) return item.act();
        const k = knot();
        if (k) run({ do: 'story', knot: k });
      },
    };
  });
}

const GLYPH: Record<Device, string> = { gamepad: '◯', keyboard: 'E' };

/** The prompt stays this far inside the screen's edges (px). */
const EDGE = 8;
/** The target's dot (px, as in style.css `.mark.active`), and the space between it and the prompt above it. */
const DOT = 12;
const GAP = 8;
/** Nearer than this across (m), a thing is straight ahead for her facing's cone, whichever way she faces: she's at it (overhead, in its doorway). */
const AT_HER = 0.4;
/** How much up and down counts against across, choosing the target. */
const VERTICAL_SHARE = 1 / 3;
/** The target keeps its place unless another is better by this much (rad): no flicker as the camera sways. */
const HOLD = THREE.MathUtils.degToRad(4);

export class Interaction {
  target: Interactable | null = null;
  /** The things whose circles show now (their names): for checks. */
  get marked(): string[] {
    return [...this.marks].filter(([, mark]) => mark.classList.contains('shown')).map(([item]) => item.name);
  }
  /** Where the prompt's centre is on screen (CSS px), while there's a target: for checks. */
  readonly promptAt = { x: 0, y: 0 };
  private box = new THREE.Box3();
  private part = new THREE.Box3();
  private anchor = new THREE.Vector3();
  private closest = new THREE.Vector3();
  private toTarget = new THREE.Vector3();
  private forward = new THREE.Vector3();
  private ahead = new THREE.Vector3();
  private local = new THREE.Vector3();
  private toCamera = new THREE.Quaternion();
  private point = new THREE.Vector3();
  private chestBox = new THREE.Box3();
  /** Which aims (owner, 2026-10-22): the one the player moved last. For checks. */
  aimBy: 'camera' | 'facing' = 'camera';
  /** What aimed when the target was chosen: the hold applies only while the same one aims. */
  private targetBy: 'camera' | 'facing' = 'camera';
  private lastForward = new THREE.Vector3();
  private lastFacing: number | null = null;
  private lastChest = new THREE.Vector3();
  /** The rooms a box is in (`Ship.roomsOf`); none set: no room rule. */
  roomsOf: ((box: THREE.Box3) => string[]) | null = null;
  /** The one target while set, wherever she and the camera look (main.ts: *Get up* while she's seated). */
  only: Interactable | null = null;
  /** The prompt's two parts: the button, and what it does. */
  private glyph = document.createElement('span');
  private verb = document.createElement('span');
  /** Each nearby thing's circle, made the first time it's needed. */
  private marks = new Map<Interactable, HTMLElement>();
  /** A use waiting for its click to finish: no other until it's done. */
  private pending = false;
  /** The ids switched off by a scene or a command (any of an item's objects): not offered. */
  disabled = new Set<string>();

  constructor(
    private items: Interactable[],
    private physics: Physics,
    private prompt: HTMLElement,
    /**
     * Every use's click (owner, 2026-10-21: every interaction in the game), calling `then` when it
     * has finished; false if it didn't play. The thing acts (and makes its own sound) after it.
     */
    private used: (then: () => void) => boolean = () => false,
  ) {
    this.glyph.className = 'glyph';
    prompt.replaceChildren(this.glyph, ' ', this.verb);
  }

  /**
   * Per frame: pick the target, show the prompt next to it; act on a press.
   * @param chest her chest (world)
   * @param facing which way she faces (radians around +Y; 0 faces -Z)
   */
  update(chest: THREE.Vector3, facing: number, camera: THREE.Camera, device: Device, pressed: boolean, off = false): void {
    // Off (she's climbing the ladder): no target, no prompt, no circles.
    if (off) {
      this.target = null;
      this.prompt.hidden = true;
      this.showMarks([], camera);
      return;
    }
    camera.updateMatrixWorld();
    camera.getWorldDirection(this.forward);
    camera.getWorldQuaternion(this.toCamera).invert();
    this.ahead.set(-Math.sin(facing), 0, -Math.cos(facing));
    // The one moved last aims; both in one frame: the camera.
    const deg = THREE.MathUtils.degToRad;
    const turned = this.lastFacing === null ? 0 : Math.abs(Math.atan2(Math.sin(facing - this.lastFacing), Math.cos(facing - this.lastFacing)));
    if (this.lastFacing !== null && this.forward.angleTo(this.lastForward) > deg(settings.aimByCameraDeg)) this.aimBy = 'camera';
    else if (turned > deg(settings.aimByFacingDeg) || (this.lastFacing !== null && chest.distanceTo(this.lastChest) > settings.aimByStep)) this.aimBy = 'facing';
    this.lastForward.copy(this.forward);
    this.lastFacing = facing;
    this.lastChest.copy(chest);
    const mine = this.roomsOf?.(this.chestBox.set(chest, chest)) ?? [];
    const maxAcross = deg(settings.interactMaxAngleDeg);
    const maxFacing = deg(settings.interactFacingAngleDeg);
    const maxUp = deg(settings.interactMaxVerticalDeg);
    const nearby: Interactable[] = [];
    const best = { camera: { item: null as Interactable | null, score: Infinity, distance: Infinity }, facing: { item: null as Interactable | null, score: Infinity, distance: Infinity } };
    const consider = (by: keyof typeof best, item: Interactable, score: number, distance: number) => {
      const b = best[by];
      if (score < b.score - 1e-3 || (Math.abs(score - b.score) <= 1e-3 && distance < b.distance)) Object.assign(b, { item, score, distance });
    };
    for (const item of this.only ? [] : this.items) {
      if (item.available && !item.available()) continue;
      if (this.disabled.size && item.objects.some((o) => this.disabled.has(o.userData.id as string))) continue;
      this.bounds(item);
      const distance = this.box.distanceToPoint(chest);
      // Within reach it can be used; a dot shows further (owner, 2026-10-22: everything close to her).
      const reach = item.reach?.() ?? settings.interactReach;
      if (distance > Math.max(reach, settings.interactDotReach)) continue;
      // In her room (through a doorway, Adam in the cockpit isn't).
      if (mine.length) {
        const theirs = this.roomsOf!(this.box);
        if (theirs.length && !theirs.some((room) => mine.includes(room))) continue;
      }
      // Not behind something solid (its own collider is hit at about its own distance).
      if (item.sight) item.sight(this.closest);
      else this.box.clampPoint(chest, this.closest);
      const hit = distance > 0.05 ? this.physics.castRay(chest, this.closest) : null;
      if (hit !== null && hit < distance - (item.sightMargin ?? 0.15)) continue;
      nearby.push(item);
      if (distance > reach) continue;
      // The angles to its prompt's point: across from the camera and from her facing, up/down
      // from the camera. (Behind the camera, across is over 90°: out of the limit.)
      this.point.copy(this.pointOf(item));
      this.local.subVectors(this.point, camera.position).applyQuaternion(this.toCamera);
      const across = Math.abs(Math.atan2(this.local.x, -this.local.z));
      const up = Math.abs(Math.atan2(this.local.y, Math.hypot(this.local.x, this.local.z)));
      if (up > maxUp) continue;
      this.toTarget.subVectors(this.point, chest).setY(0);
      const side = this.toTarget.lengthSq() < AT_HER * AT_HER ? 0 : this.toTarget.angleTo(this.ahead);
      const hold = item === this.target && this.targetBy === this.aimBy ? HOLD : 0;
      if (across <= maxAcross) consider('camera', item, across + up * VERTICAL_SHARE - hold, distance);
      if (side <= maxFacing) consider('facing', item, side + up * VERTICAL_SHARE - hold, distance);
    }
    // The one moved last; nothing in its cone: the other's.
    this.target = this.only ?? best[this.aimBy].item ?? best[this.aimBy === 'camera' ? 'facing' : 'camera'].item;
    this.targetBy = this.aimBy;
    if (pressed && this.target && !this.pending) {
      const target = this.target;
      let done = false;
      const act = () => {
        if (done) return;
        done = true;
        this.pending = false;
        target.act();
      };
      this.pending = true;
      // After the click; at once if it didn't play, and never later than half a second (it was cut off).
      if (this.used(act)) setTimeout(act, 500);
      else act();
    }
    if (this.target) {
      this.glyph.textContent = GLYPH[device];
      this.verb.textContent = this.target.verb();
      this.prompt.hidden = false;
      this.placePrompt(this.target, camera);
    } else {
      this.prompt.hidden = true;
    }
    this.showMarks(nearby, camera);
  }

  /** Where its prompt goes from (world): its anchor (a door's handle), or the middle of its bounds. Uses `this.box`. */
  private pointOf(item: Interactable): THREE.Vector3 {
    return item.anchor ? item.anchor(this.anchor) : this.box.getCenter(this.anchor);
  }

  /** A white dot at each of these things' prompt points, the target's full size (`active`); the others' dots fade out (CSS). */
  private showMarks(items: Interactable[], camera: THREE.Camera): void {
    const shown = new Set<HTMLElement>();
    for (const item of items) {
      if (item.dotWhenTarget && item !== this.target) continue;
      this.bounds(item);
      const point = this.pointOf(item);
      if (this.toTarget.subVectors(point, camera.position).dot(this.forward) <= 0.05) continue;
      let mark = this.marks.get(item);
      if (!mark) {
        mark = document.createElement('div');
        mark.className = 'mark';
        this.prompt.before(mark);
        this.marks.set(item, mark);
      }
      point.project(camera);
      const x = (point.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-point.y * 0.5 + 0.5) * window.innerHeight;
      // `translate`, not `transform`: CSS applies `scale` (the smaller dots) before `transform`, which scaled the position too.
      mark.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
      mark.classList.add('shown');
      mark.classList.toggle('active', item === this.target);
      shown.add(mark);
    }
    for (const mark of this.marks.values()) if (!shown.has(mark)) mark.classList.remove('shown');
  }

  /** The target's bounds (all its parts), into `this.box`. */
  private bounds(item: Interactable): void {
    this.box.makeEmpty();
    for (const o of item.objects) this.box.union(this.part.setFromObject(o));
  }

  /**
   * The prompt centred above the target's dot (owner, 2026-10-22), GAP px clear of it. Behind the
   * camera (it's inside the target's bounds): the middle of the screen. Kept inside the screen's edges.
   */
  private placePrompt(item: Interactable, camera: THREE.Camera): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const w = this.prompt.offsetWidth;
    const h = this.prompt.offsetHeight;
    this.bounds(item);
    camera.updateMatrixWorld();
    const point = this.pointOf(item);
    let x = width / 2;
    let y = height / 2;
    if (this.toTarget.subVectors(point, camera.position).dot(this.forward) > 0.05) {
      point.project(camera);
      x = (point.x * 0.5 + 0.5) * width;
      y = (-point.y * 0.5 + 0.5) * height - DOT / 2 - GAP - h / 2;
    }
    x = THREE.MathUtils.clamp(x, EDGE + w / 2, Math.max(EDGE + w / 2, width - EDGE - w / 2));
    y = THREE.MathUtils.clamp(y, EDGE + h / 2, Math.max(EDGE + h / 2, height - EDGE - h / 2));
    this.promptAt.x = x;
    this.promptAt.y = y;
    this.prompt.style.transform = `translate(${Math.round(x - w / 2)}px, ${Math.round(y - h / 2)}px)`;
  }

}
