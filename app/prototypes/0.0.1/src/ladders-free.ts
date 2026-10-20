// The ladder as it was until 2026-10-19: no button, climbed with the stick. **Not in use** (owner,
// 2026-10-19: kept so it can be rolled back). To put it back, in main.ts: `ladders = new FreeLadders(...)`
// in place of `new LadderClimb(...)`, and leave the ladder out of the interaction targets.
//
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
import { facingOf, horizontal, updateLadderColliders, type Ladder } from './ladders';
import type { Physics } from './physics';
import { settings } from './settings';

const UP = new THREE.Vector3(0, 1, 0);

export class FreeLadders {
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
    updateLadderColliders(this.list, character, this.colliding);

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


}

/** How long she walks into a ladder's foot before she takes hold of it (s). */
const ATTACH_DELAY = 0.5;

/** At the top, a push less toward the ladder than this (the cosine of its angle to it) lets go. */
const LEAVES_TOP = 0.25;

/** How far apart her hands land while climbing (m). */
const RUNG = 0.35;

