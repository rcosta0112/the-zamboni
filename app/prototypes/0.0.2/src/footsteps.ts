// Her footsteps: a step sounds when a foot comes down in the walk/run cycle the model keeps (so they
// come faster at a run by themselves), on the ground, while she's really moving. Inside the ship she
// moves at lower speeds and the animation's cycle slows with her: the steps there keep the frequency
// they have outside (owner, 2026-10-13), on a cycle of their own, so they don't follow her feet.
// Which sound: the ship's floor inside the ship, snow outside (a ray down for a surface tag, as in
// Part 1, waits until there's a second surface outside). Quieter at a walk. A landing after a jump
// or a fall is a heavier step. Not placed in the world: she's always the same distance from the
// camera. The sounds are single steps cut from recordings: Part 1's running loop on grass for the
// snow, the owner's metal footsteps file for the ship (tools/make-placeholder-sounds.mjs).
// Plan: doc/plans/features/interaction-sounds.md

import * as THREE from 'three/webgpu';
import type { CueId } from './audio';
import type { Character } from './character';
import { settings } from './settings';

/**
 * Where in the cycle (0..1) the left and right foot come down, walking and running: read from
 * Part 1's animations (each foot bone's height through the clip; `Foot_l`, `Foot_r`). The Zamboni
 * model plays the same clips, retargeted, so they hold for both.
 */
const WALK_FALLS = [0.4, 0.9];
const RUN_FALLS = [0.5, 0.925];
/** Slower than this (m/s) she isn't walking: no steps (the legs still settle for a moment). */
const MIN_SPEED = 0.3;
/** A drop of less than this (m) isn't a landing. */
const MIN_DROP = 0.3;
/** A step at a walk, as a share of one at a run. */
const WALK_LEVEL = 0.6;

export class Footsteps {
  private cycle: number | null = null;
  /** The steps' own cycle: the model's, except where they come faster than her feet. */
  private own = 0;
  /** While she's in the air: the highest she's been. */
  private top: number | null = null;

  constructor(private play: (id: CueId, level: number) => void) {}

  /**
   * Per frame, after her animation.
   * @param inside she's inside the ship
   * @param climbing on a ladder
   */
  update(character: Character, inside: boolean, climbing: boolean): void {
    const before = this.cycle;
    const now = character.cycle;
    this.cycle = now;
    const y = character.position.y;
    // Flying (on the ground too), no steps; the landing comes once she's let go.
    if ((!character.grounded || character.flying) && !climbing) {
      this.top = Math.max(this.top ?? y, y);
      return;
    }
    if (this.top !== null) {
      const drop = this.top - y;
      this.top = null;
      if (drop > MIN_DROP && !climbing) {
        this.play(inside ? 'sfx_land_ship' : 'sfx_land_snow', 1);
        return;
      }
    }
    // Skidding: the landing is heard, no steps.
    if (climbing || character.skidding || before === null || now === null || character.movedSpeed < MIN_SPEED) return;
    const turned = (now - before + 1) % 1;
    if (turned === 0 || turned > 0.5) return;
    const walk = character.walkSpeed();
    const running = THREE.MathUtils.clamp((character.movedSpeed - walk) / Math.max(0.01, character.runSpeed() - walk), 0, 1);
    // How much faster the steps come than her feet: as if she moved at the outdoor speeds.
    const faster = THREE.MathUtils.lerp(settings.walkSpeed / walk, settings.runSpeed / character.runSpeed(), running);
    const from = faster > 1.01 ? this.own : before;
    const moved = Math.min(0.5, turned * Math.max(1, faster));
    this.own = faster > 1.01 ? (from + moved) % 1 : now;
    for (let foot = 0; foot < 2; foot++) {
      const fall = THREE.MathUtils.lerp(WALK_FALLS[foot]!, RUN_FALLS[foot]!, running);
      // The cycle passed the footfall this frame.
      if ((fall - from + 1) % 1 < moved) this.play(inside ? 'sfx_step_ship' : 'sfx_step_snow', THREE.MathUtils.lerp(WALK_LEVEL, 1, running));
    }
  }
}
