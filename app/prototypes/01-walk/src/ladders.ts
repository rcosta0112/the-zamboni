// Ladders, without a button (owner, 2026-10-09), up and down (owner, 2026-10-13; up only before):
// walking into a ladder's foot for half a second attaches her to it; pushing toward the ladder climbs, pushing away
// climbs down, and at the foot walks her off. At the top she's held for as long as the stick is
// toward the ladder or at rest; the first push any other way lets go, and she floats for a moment
// (`ladderFloat`) so she can walk onto the floor beside the opening: nothing moves her there (owner:
// a fixed step-off takes control from the player). From the top there's no climbing back down.
// Jump is a jump, from wherever she is on the ladder. Nothing attaches her from the floor above:
// walking into the opening, she falls through it (the way down), and the ladder doesn't collide
// while she's above its foot, so she doesn't land on it.
// A closed hatch above stops her (a ray from her head), and she can open it from the ladder. While
// climbing she's placed directly, without collisions. No climbing animation yet: she's shown standing.
// Ladders: `Ladder Cargo Bay` (through the trapdoor). (The rungs on the cockpit bulkhead were removed
// on 2026-10-09; the side door, open, is a ramp: doors.ts.)
// Plans: doc/plans/features/interaction-doors.md, doc/plans/features/movement-and-ladder.md

import * as THREE from 'three/webgpu';
import { moveDirection, type Character } from './character';
import type { Input } from './input';
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
  /** The ladder itself (world). */
  bounds: THREE.Box3;
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
    else console.warn(`[01-walk] no ladder "${name}" in the ship`);
  }
  console.info(`[01-walk] ladders: ${ladders.map((l) => `${l.name} (${l.topExit ? 'floor at the top' : 'no way off at the top'})`).join(', ')}`);
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
  return { name, bottom, top, face: normal.clone().negate(), topExit, available: () => true, bounds: box };
}

export class Ladders {
  private on: { ladder: Ladder; s: number } | null = null;
  /** After leaving a ladder, she doesn't attach again until the stick is let go. */
  private waitForRelease = false;
  /** How long she's been walking into a ladder's foot (s). */
  private pushing = 0;
  /** Counts up each time a hand lands on a rung: taking hold, then every RUNG m climbed (for the sound). */
  rungs = 0;
  private sinceRung = 0;
  private dir = new THREE.Vector3();
  private feet = new THREE.Vector3();
  private colliding = new Map<Ladder, boolean>();

  constructor(readonly list: Ladder[]) {}

  get climbing(): boolean {
    return this.on !== null;
  }

  /** For checks: 'off' or 'on' (with how far up, 0..1; 1 is held at the top), and which ladders collide. */
  get state(): { is: 'off' | 'on'; s: number; colliding: boolean[] } {
    return { is: this.on ? 'on' : 'off', s: this.on?.s ?? 0, colliding: this.list.map((l) => this.colliding.get(l) ?? true) };
  }

  /** One fixed step. Returns true if she's on a ladder: the ladder moved her. */
  update(dt: number, input: Input, cameraYaw: number, character: Character, physics: Physics): boolean {
    const dir = moveDirection(input, cameraYaw, this.dir);
    const amount = Math.min(1, dir.length());
    if (amount > 0) dir.divideScalar(amount);
    this.updateColliders(character);

    if (!this.on) {
      if (amount < 0.2) this.waitForRelease = false;
      if (this.waitForRelease || !character.grounded || input.flyHeld || amount < 0.3) {
        this.pushing = 0;
        return false;
      }
      const feet = character.position;
      for (const ladder of this.list) {
        if (!ladder.available()) continue;
        // At the foot, walking into it for a moment, so walking past doesn't attach her (owner,
        // 2026-10-14). (Never from the floor above: she falls through the opening.)
        if (Math.abs(feet.y - ladder.bottom.y) < 0.3 && horizontal(feet, ladder.bottom) < 0.5 && dir.dot(ladder.face) > 0.5) {
          this.pushing += dt;
          if (this.pushing < ATTACH_DELAY) return false;
          this.pushing = 0;
          this.on = { ladder, s: 0 };
          this.rungs++;
          this.sinceRung = 0;
          character.setClimbing(ladder.bottom, facingOf(ladder.face), physics);
          return true;
        }
      }
      this.pushing = 0;
      return false;
    }

    const on = this.on;
    const ladder = on.ladder;
    const leave = () => {
      this.on = null;
      this.waitForRelease = true;
      return false;
    };
    if (!ladder.available()) return leave();
    // The jetpack lets go: she flies from where she is.
    if (input.flyHeld) return leave();
    // Jump is a jump, from where she is: she falls back down, or lands on the floor above.
    if (input.consumeJump()) {
      character.jump();
      return leave();
    }
    // Toward the ladder is up, away from it is down.
    const toward = amount > 0.2 ? dir.dot(ladder.face) : 0;
    const push = THREE.MathUtils.clamp(toward * 1.5, -1, 1) * amount;
    if (on.s === 1 && ladder.topExit) {
      // Held at the top. The first push that isn't toward the ladder lets go: she floats for a
      // moment, walking as anywhere else, and it's hers to get onto the floor.
      if (amount > 0.3 && toward <= LEAVES_TOP) {
        character.floating = settings.ladderFloat;
        return leave();
      }
      character.setClimbing(ladder.top, facingOf(ladder.face), physics);
      return true;
    }
    // At the foot, pushing away walks her off.
    if (on.s === 0 && push < -0.3) return leave();
    const line = new THREE.Vector3().subVectors(ladder.top, ladder.bottom);
    const length = line.length();
    let ds = (push * settings.climbSpeed * dt) / length;
    if (ds > 0) {
      // Something above her head (a closed hatch, the ceiling): she stops.
      const head = this.feet.copy(character.position);
      head.y += settings.zamboniHeight - 0.05;
      if (physics.ray(head, line.clone().normalize(), ds * length + 0.08)) ds = 0;
    }
    const before = on.s;
    on.s = THREE.MathUtils.clamp(on.s + ds, 0, 1);
    this.sinceRung += Math.abs(on.s - before) * length;
    if (this.sinceRung >= RUNG) {
      this.sinceRung -= RUNG;
      this.rungs++;
    }
    this.feet.lerpVectors(ladder.bottom, ladder.top, on.s);
    character.setClimbing(this.feet, facingOf(ladder.face), physics);
    return true;
  }

  /**
   * A ladder collides only while she's at its foot: above it (upstairs, or falling through the
   * opening) it's out of her way. It comes back once she stands on the floor below, clear of it.
   */
  private updateColliders(character: Character): void {
    const feet = character.position;
    for (const ladder of this.list) {
      if (!ladder.collider) continue;
      const now = this.colliding.get(ladder) ?? true;
      let next = now;
      if (feet.y > ladder.bottom.y + ABOVE) next = false;
      else if (!now && character.grounded && feet.y < ladder.bottom.y + 0.3) {
        const b = ladder.bounds;
        const dx = Math.max(b.min.x - feet.x, 0, feet.x - b.max.x);
        const dz = Math.max(b.min.z - feet.z, 0, feet.z - b.max.z);
        next = Math.hypot(dx, dz) > RADIUS + CLEAR;
      }
      if (next !== now || !this.colliding.has(ladder)) {
        this.colliding.set(ladder, next);
        ladder.collider.setEnabled(next);
      }
    }
  }
}

/** How long she walks into a ladder's foot before she takes hold of it (s). */
const ATTACH_DELAY = 0.5;

/** At the top, a push less toward the ladder than this (the cosine of its angle to it) lets go. */
const LEAVES_TOP = 0.25;

/** How far apart her hands land while climbing (m). */
const RUNG = 0.35;

function horizontal(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** The character's facing angle for a horizontal direction (0 faces -Z). */
function facingOf(dir: THREE.Vector3): number {
  return Math.atan2(-dir.x, -dir.z);
}
