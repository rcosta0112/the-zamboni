// Ladders, without a button (owner, 2026-10-09): walking into a ladder's foot attaches her to it;
// pushing toward the ladder climbs, pushing away climbs down. At the top she steps off onto the floor
// above (if there is one), at the bottom onto the floor. Walking from the floor above toward the
// opening attaches her at the top. Jump lets go. A closed hatch above stops her (a ray from her head),
// and she can open it from the ladder. While climbing she's placed directly, without collisions.
// No climbing animation yet: she's shown standing.
// Ladders: `Ladder Cargo Bay` (through the trapdoor) and `Ladder Crew Quarters` (rungs on the cockpit
// bulkhead, up to the ceiling). (The side door, open, is a ramp: doors.ts.)
// Plan: doc/plans/features/interaction-doors.md

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
/** Seconds to step onto or off a ladder at the top. */
const STEP_SECONDS = 0.3;

export interface Ladder {
  name: string;
  /** Her feet at the bottom and at the top. */
  bottom: THREE.Vector3;
  top: THREE.Vector3;
  /** The way she faces while on it (horizontal, unit). */
  face: THREE.Vector3;
  /** There's a floor to step onto at the top. */
  topExit: boolean;
  /** Attaching from above needs an opening under the top (the trapdoor open). */
  needsOpening: boolean;
  /** Usable right now. */
  available: () => boolean;
}

/** The ship's ladders. */
export function shipLadders(ship: THREE.Object3D, physics: Physics): Ladder[] {
  const ladders: Ladder[] = [];
  for (const name of ['Ladder Cargo Bay', 'Ladder Crew Quarters']) {
    let object: THREE.Object3D | undefined;
    ship.traverse((o) => {
      if (named(o, name)) object = o;
    });
    if (object) ladders.push(fixedLadder(name, object, physics));
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
function fixedLadder(name: string, object: THREE.Object3D, physics: Physics): Ladder {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const thin = size.x < size.z ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const free = (dir: THREE.Vector3) => physics.ray(centre, dir, 3, true)?.distance ?? Infinity;
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
  return { name, bottom, top, face: normal.clone().negate(), topExit, needsOpening: true, available: () => true };
}

interface Step {
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  facing: number;
  /** Then onto this ladder (at its top), or off it. */
  then: { ladder: Ladder; s: number } | null;
}

export class Ladders {
  private on: { ladder: Ladder; s: number; latchDown: boolean } | null = null;
  private step: Step | null = null;
  /** After letting go, she doesn't attach again until the stick is let go too. */
  private waitForRelease = false;
  private dir = new THREE.Vector3();
  private feet = new THREE.Vector3();

  constructor(readonly list: Ladder[]) {}

  get climbing(): boolean {
    return this.on !== null || this.step !== null;
  }

  /** One fixed step. Returns true if she's on (or stepping onto or off) a ladder: the ladder moved her. */
  update(dt: number, input: Input, cameraYaw: number, character: Character, physics: Physics): boolean {
    const dir = moveDirection(input, cameraYaw, this.dir);
    const amount = Math.min(1, dir.length());
    if (amount > 0) dir.divideScalar(amount);

    if (this.step) {
      const step = this.step;
      step.t = Math.min(1, step.t + dt / STEP_SECONDS);
      const e = step.t * step.t * (3 - 2 * step.t);
      this.feet.lerpVectors(step.from, step.to, e);
      // Up first, then across (stepping up over the top), or across then down.
      this.feet.y = step.to.y > step.from.y ? THREE.MathUtils.lerp(step.from.y, step.to.y, Math.min(1, e * 2)) : THREE.MathUtils.lerp(step.from.y, step.to.y, Math.max(0, e * 2 - 1));
      character.setClimbing(this.feet, step.facing, physics);
      if (step.t === 1) {
        this.step = null;
        this.on = step.then ? { ...step.then, latchDown: true } : null;
        if (!this.on) this.waitForRelease = true;
      }
      return true;
    }

    if (!this.on) {
      if (amount < 0.2) this.waitForRelease = false;
      if (this.waitForRelease || !character.grounded || amount < 0.3) return false;
      const feet = character.position;
      for (const ladder of this.list) {
        if (!ladder.available()) continue;
        // At the foot, walking into it.
        if (Math.abs(feet.y - ladder.bottom.y) < 0.3 && horizontal(feet, ladder.bottom) < 0.5 && dir.dot(ladder.face) > 0.5) {
          this.on = { ladder, s: 0, latchDown: false };
          character.setClimbing(ladder.bottom, facingOf(ladder.face), physics);
          return true;
        }
        // On the floor above, walking toward its top.
        if (!ladder.topExit || Math.abs(feet.y - ladder.top.y) > 0.3) continue;
        const d = horizontal(feet, ladder.top);
        if (d > 0.7 || d < 0.05) continue;
        const toTop = new THREE.Vector3(ladder.top.x - feet.x, 0, ladder.top.z - feet.z).normalize();
        if (dir.dot(toTop) < 0.6) continue;
        if (ladder.needsOpening && physics.ray(new THREE.Vector3(ladder.top.x, ladder.top.y + 0.4, ladder.top.z), DOWN, 0.6)) continue;
        this.step = { from: feet.clone(), to: ladder.top.clone(), t: 0, facing: facingOf(ladder.face), then: { ladder, s: 1 } };
        return true;
      }
      return false;
    }

    const on = this.on;
    const ladder = on.ladder;
    if (!ladder.available() || input.consumeJump()) {
      this.on = null;
      this.waitForRelease = true;
      return false;
    }
    // Entered from the top: whatever the stick says, down, until it's let go.
    if (on.latchDown && amount < 0.2) on.latchDown = false;
    const push = on.latchDown ? -amount : amount > 0.2 ? THREE.MathUtils.clamp(dir.dot(ladder.face) * 1.5, -1, 1) * amount : 0;
    const line = new THREE.Vector3().subVectors(ladder.top, ladder.bottom);
    const length = line.length();
    let ds = (push * settings.climbSpeed * dt) / length;
    if (ds > 0) {
      // Something above her head (a closed hatch, the ceiling): she stops.
      const head = this.feet.copy(character.position);
      head.y += settings.zamboniHeight - 0.05;
      if (physics.ray(head, line.clone().normalize(), ds * length + 0.08)) ds = 0;
    }
    on.s = THREE.MathUtils.clamp(on.s + ds, 0, 1);
    this.feet.lerpVectors(ladder.bottom, ladder.top, on.s);
    character.setClimbing(this.feet, facingOf(ladder.face), physics);

    if (on.s === 1 && push > 0.3 && ladder.topExit) {
      const exit = findExit(ladder, amount > 0.2 ? dir : ladder.face, physics);
      if (exit) {
        this.on = null;
        this.step = { from: this.feet.clone(), to: exit, t: 0, facing: facingOf(new THREE.Vector3(exit.x - this.feet.x, 0, exit.z - this.feet.z).normalize()), then: null };
      }
    } else if (on.s === 0 && push < -0.3) {
      this.on = null; // on the floor: she walks off
      this.waitForRelease = true;
    }
    return true;
  }
}

/** Where to step off at the top: floor at the top's height, room for her, nothing in the way; nearest `prefer`. */
function findExit(ladder: Ladder, prefer: THREE.Vector3, physics: Physics): THREE.Vector3 | null {
  let best: THREE.Vector3 | null = null;
  let bestScore = -Infinity;
  const from = new THREE.Vector3(ladder.top.x, ladder.top.y + 0.4, ladder.top.z);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const score = dir.dot(prefer);
    if (score <= bestScore) continue;
    for (const d of [0.55, 0.8]) {
      const p = new THREE.Vector3(ladder.top.x + dir.x * d, ladder.top.y + 0.5, ladder.top.z + dir.z * d);
      const hit = physics.ray(p, DOWN, 0.8);
      if (!hit || hit.normal.y < 0.7) continue;
      p.y -= hit.distance;
      if (Math.abs(p.y - ladder.top.y) > 0.25) continue;
      if (physics.ray(from, dir, d)) continue;
      if (!physics.fits(p)) continue;
      best = p;
      bestScore = score;
      break;
    }
  }
  return best;
}

function horizontal(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** The character's facing angle for a horizontal direction (0 faces -Z). */
function facingOf(dir: THREE.Vector3): number {
  return Math.atan2(-dir.x, -dir.z);
}
