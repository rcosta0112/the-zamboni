// Ladders by button, with the owner's climbing animation (owner, 2026-10-17; plan:
// doc/plans/features/ladder-climb-animation.md, pass 2a). At the ladder's foot the prompt says
// *Climb*; pressed, she slides to where the animation starts (`climb` tag on her model: the place
// and facing of the armature it was made on, in the ship) and the animation plays: it moves her (its
// root motion, `Body`'s translation), so the camera and everything that follows her position
// follow. At the end she stands where its last frame leaves her, on the floor above, turned as she
// is there, and the stick is hers again. While it plays her movement, jump and the jetpack do
// nothing; the camera stays the player's (owner, 2026-10-19). No climbing down: from the floor
// above she drops through the opening, and the ladder doesn't collide while she's above its foot.
// Not yet (pass 2b): the trapdoor opening as her head reaches it, the rung sounds on her hands.
// The climb with the stick (2026-10-09 to 10-19) is kept, not in use: ladders-free.ts.
// Ladders: `Ladder Cargo Bay` (through the trapdoor).

import * as THREE from 'three/webgpu';
import type { Character } from './character';
import type { Input } from './input';
import type { Interactable } from './interaction';
import { named } from './names';
import type { Physics } from './physics';
import { settings } from './settings';

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
/** Her capsule's radius (main.ts). */
const RADIUS = 0.28;
/** The ladder collides again once she's on the floor at its foot and this far clear of it (m). */
const CLEAR = 0.03;
/** Above its foot by this much (m), the ladder doesn't collide: she's upstairs, or falling past it. */
const ABOVE = 1.0;
/** She slides to the animation's start at this speed (m/s), taking at least SLIDE_MIN (s). */
const SLIDE_SPEED = 1.5;
const SLIDE_MIN = 0.2;
/**
 * At the end, she slides this far clear of any door she's nearer to (m), over CLEAR_TIME (s), on
 * the last frame. The climb ends by the open trapdoor: 0.04 clear, she still caught on it.
 */
const DOOR_CLEAR = 0.15;
const CLEAR_TIME = 0.25;
/** The prompt shows within this distance of the start, with her feet on the ladder's floor (m). */
const NEAR = 1.2;

export interface Ladder {
  name: string;
  /** Her feet at the bottom and at the top. */
  bottom: THREE.Vector3;
  top: THREE.Vector3;
  /** The way she faces while on it (horizontal, unit). */
  face: THREE.Vector3;
  /** There's a floor to step onto at the top. */
  topExit: boolean;
  /** Usable right now. */
  available: () => boolean;
  /** The ladder itself (world), and its object. */
  bounds: THREE.Box3;
  object: THREE.Object3D;
  /** Its own collider, if it has one apart from the ship's: off while she's above its foot. */
  collider: { setEnabled: (on: boolean) => void } | null;
}

/** The ship's ladders. */
export function shipLadders(ship: THREE.Object3D, physics: Physics, colliders: Record<string, { setEnabled: (on: boolean) => void } | null> = {}): Ladder[] {
  const ladders: Ladder[] = [];
  for (const name of ['Ladder Cargo Bay']) {
    let object: THREE.Object3D | undefined;
    ship.traverse((o) => {
      if (named(o, name)) object = o;
    });
    if (object) ladders.push({ ...fixedLadder(name, object, physics), collider: colliders[name] ?? null });
    else console.warn(`[0.0.1] no ladder "${name}" in the ship`);
  }
  console.info(`[0.0.1] ladders: ${ladders.map((l) => `${l.name} (${l.topExit ? 'floor at the top' : 'no way off at the top'})`).join(', ')}`);
  return ladders;
}

/**
 * A ladder standing in the ship, from its bounds: she stands on its more open side; the bottom is
 * the floor under it; the top is the floor beside its top end, if there's one she can reach through
 * an opening (with the doors open: they're left out of these measurements).
 */
function fixedLadder(name: string, object: THREE.Object3D, physics: Physics): Omit<Ladder, 'collider'> {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const thin = size.x < size.z ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  // Measured at her height above its foot, not at its middle: the ladder reaches up into the
  // opening since 1.20, and halfway up the rays met what's around the opening.
  const low = new THREE.Vector3(centre.x, box.min.y + 0.5, centre.z);
  const free = (dir: THREE.Vector3) => physics.ray(low, dir, 3, true)?.distance ?? Infinity;
  const normal = free(thin) >= free(thin.clone().negate()) ? thin : thin.clone().negate();
  const thickness = Math.min(size.x, size.z);
  const stand = centre.clone().addScaledVector(normal, thickness / 2 + RADIUS + 0.05);
  stand.y = box.min.y + 0.5;
  const floorHit = physics.ray(stand, DOWN, 1.5, true);
  const bottom = new THREE.Vector3(stand.x, floorHit ? stand.y - floorHit.distance : box.min.y, stand.z);

  // A floor beside the top end, reachable straight up from the bottom (the lowest found: higher
  // hits are furniture around the opening).
  let topY = Infinity;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    for (const d of [0.6, 0.8]) {
      const from = new THREE.Vector3(stand.x + Math.cos(a) * d, box.max.y + 1.2, stand.z + Math.sin(a) * d);
      const hit = physics.ray(from, DOWN, 1.6, true);
      if (!hit || hit.normal.y < 0.7) continue;
      const y = from.y - hit.distance;
      if (y < box.max.y - 0.3 || y > box.max.y + 1.0) continue;
      if (physics.ray(new THREE.Vector3(from.x, y + 0.05, from.z), UP, settings.zamboniHeight, true)) continue;
      topY = Math.min(topY, y);
    }
  }
  const up = new THREE.Vector3(bottom.x, bottom.y + 0.5, bottom.z);
  const topExit = topY < Infinity && physics.ray(up, UP, topY + 0.3 - up.y, true) === null;
  const top = new THREE.Vector3(bottom.x, topExit ? topY : box.max.y - 0.3, bottom.z);
  return { name, bottom, top, face: normal.clone().negate(), topExit, available: () => true, bounds: box, object };
}

/**
 * A ladder collides only while she's at its foot: above it (upstairs, or falling through the
 * opening) it's out of her way. It comes back once she stands on the floor below, clear of it.
 */
export function updateLadderColliders(list: Ladder[], character: Character, colliding: Map<Ladder, boolean>): void {
  const feet = character.position;
  for (const ladder of list) {
    if (!ladder.collider) continue;
    const now = colliding.get(ladder) ?? true;
    let next = now;
    if (feet.y > ladder.bottom.y + ABOVE) next = false;
    else if (!now && character.grounded && feet.y < ladder.bottom.y + 0.3) {
      const b = ladder.bounds;
      const dx = Math.max(b.min.x - feet.x, 0, feet.x - b.max.x);
      const dz = Math.max(b.min.z - feet.z, 0, feet.z - b.max.z);
      next = Math.hypot(dx, dz) > RADIUS + CLEAR;
    }
    if (next !== now || !colliding.has(ladder)) {
      colliding.set(ladder, next);
      ladder.collider.setEnabled(next);
    }
  }
}

/** The climbing animation, as the shown model plays it. */
export interface ClimbClip {
  /** Its length (s). */
  duration: number;
  /** How far it has moved her at `t` (s) from its first frame, in her own space (facing -Z). */
  offset(t: number, out: THREE.Vector3): THREE.Vector3;
  /** How much she has turned at its end (radians, as `facing`). */
  turn(): number;
}

/** Where the animation starts: her feet and facing (world). */
export interface ClimbStart {
  feet: THREE.Vector3;
  facing: number;
}

export class LadderClimb {
  private phase: { kind: 'slide'; t: number; length: number; from: THREE.Vector3; fromFacing: number } | { kind: 'clip'; t: number } | { kind: 'clear'; t: number; by: THREE.Vector3; facing: number } | null = null;
  /** Counts up each time a hand lands on a rung (for the sound): taking hold, for now. */
  rungs = 0;
  readonly interactables: Interactable[];
  private colliding = new Map<Ladder, boolean>();
  private feet = new THREE.Vector3();
  private offset = new THREE.Vector3();

  constructor(
    readonly list: Ladder[],
    private character: Character,
    /** The shown model's climbing animation (none on Part 1's model: no prompt then). */
    private clip: () => ClimbClip | null,
    private start: ClimbStart | null,
    /** How far she must move to be `margin` clear of the doors (doors.ts `awayFromDoors`). */
    private awayFromDoors: (margin: number) => THREE.Vector3 = () => new THREE.Vector3(),
  ) {
    const ladder = list[0];
    this.interactables = ladder && start ? [{ name: ladder.name, objects: [ladder.object], verb: () => 'Climb', act: () => this.begin(), available: () => this.offered(ladder) }] : [];
    if (ladder && !start) console.warn('[0.0.1] no `climb` tag on her model: the ladder has no animation to play');
  }

  get climbing(): boolean {
    return this.phase !== null;
  }

  /** For checks: what she's doing, how far into it (s), and which ladders collide. */
  get state(): { is: 'off' | 'slide' | 'clip' | 'clear'; t: number; colliding: boolean[] } {
    return { is: this.phase?.kind ?? 'off', t: this.phase?.t ?? 0, colliding: this.list.map((l) => this.colliding.get(l) ?? true) };
  }

  private offered(ladder: Ladder): boolean {
    const c = this.character;
    if (this.phase || !this.start || !this.clip() || !c.grounded || c.flying) return false;
    return Math.abs(c.position.y - ladder.bottom.y) < 0.3 && horizontal(c.position, this.start.feet) < NEAR;
  }

  private begin(): void {
    if (!this.start) return;
    const from = this.character.position.clone();
    const length = Math.max(SLIDE_MIN, horizontal(from, this.start.feet) / SLIDE_SPEED);
    this.phase = { kind: 'slide', t: 0, length, from, fromFacing: this.character.facing };
  }

  /** One fixed step. Returns true while she's climbing: the climb moved her. */
  update(dt: number, input: Input, _cameraYaw: number, character: Character, physics: Physics): boolean {
    updateLadderColliders(this.list, character, this.colliding);
    const phase = this.phase;
    const clip = this.clip();
    if (!phase || !this.start) return false;
    if (!clip) {
      this.phase = null;
      character.clipTime = null;
      return false;
    }
    input.consumeJump(); // nothing she does counts while she climbs
    const start = this.start;
    if (phase.kind === 'slide') {
      phase.t += dt;
      const k = Math.min(1, phase.t / phase.length);
      this.feet.lerpVectors(phase.from, start.feet, k);
      character.setClimbing(this.feet, phase.fromFacing + shortestAngle(phase.fromFacing, start.facing) * k, physics);
      if (k === 1) {
        this.phase = { kind: 'clip', t: 0 };
        character.clipTime = 0;
        this.rungs++;
      }
      return true;
    }
    if (phase.kind === 'clear') {
      // Clear of the doors, through her controller (walls stop her), then hers again.
      const step = Math.min(dt, CLEAR_TIME - phase.t);
      phase.t += step;
      physics.move(phase.by.clone().multiplyScalar(step / CLEAR_TIME));
      character.setClimbing(physics.feet, phase.facing, physics);
      if (phase.t >= CLEAR_TIME) this.phase = null;
      return true;
    }
    phase.t = Math.min(clip.duration, phase.t + dt);
    this.place(clip, phase.t);
    character.setClimbing(this.feet, start.facing, physics);
    character.clipTime = phase.t;
    if (phase.t < clip.duration) return true;
    // The last frame: on the floor under her, turned as she is there; hers again.
    const hit = physics.ray(this.feet.clone().addScaledVector(UP, 0.3), DOWN, 0.6, true);
    if (hit) this.feet.y += 0.3 - hit.distance;
    character.clipTime = null;
    const facing = start.facing + clip.turn();
    character.setClimbing(this.feet, facing, physics);
    const by = this.awayFromDoors(DOOR_CLEAR);
    this.phase = by.lengthSq() > 0 ? { kind: 'clear', t: 0, by, facing } : null;
    return true;
  }

  /** Her feet at `t` into the animation: its start, moved by its root motion turned to her facing. */
  private place(clip: ClimbClip, t: number): void {
    clip.offset(t, this.offset).applyAxisAngle(UP, this.start!.facing);
    this.feet.copy(this.start!.feet).add(this.offset);
  }
}

export function horizontal(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** The character's facing angle for a horizontal direction (0 faces -Z). */
export function facingOf(dir: THREE.Vector3): number {
  return Math.atan2(-dir.x, -dir.z);
}

function shortestAngle(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
