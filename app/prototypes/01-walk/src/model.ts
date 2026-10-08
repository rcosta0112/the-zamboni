// Animated character models, for testing walk/run animation:
// - "part1": Part 1's Dr. Green (Big Moon Tiny Moon) with its own animations.
// - "zamboni": the Zamboni Dr. Green (parka) from the crew file, driven by Part 1's animations
//   through retargeting (same bone names, different bone orientations and proportions).
// Blends standing → walking → running by speed, keeping walk and run on the same step
// (shared phase), and plays the jump while airborne.

import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { retargetClips } from './retarget';
import { settings } from './settings';

const PART1_URL = '/test/part1-dr-green.glb';
const ZAMBONI_URL = '/test/green-parka.glb';
/** Part 1's character height as authored; the Zamboni model is scaled to match by default. */
export const PART1_HEIGHT = 1.23;

export type ModelId = 'zamboni' | 'part1';

type Clips = { standing: THREE.AnimationAction; walking: THREE.AnimationAction; running: THREE.AnimationAction; jumping: THREE.AnimationAction };

export class AnimatedModel {
  readonly object: THREE.Object3D;
  private mixer: THREE.AnimationMixer;
  private clips: Clips;
  /** Position in the walk/run cycle, 0..1, shared so both cycles stay on the same step. */
  private phase = 0;
  private wasGrounded = true;
  /** Speed the animation is showing (m/s), eased toward the character's real speed. */
  private animSpeed = 0;

  constructor(
    object: THREE.Object3D,
    animations: THREE.AnimationClip[],
    /** Built-in facing correction for this model (degrees). */
    private baseYawDeg: number,
    /** Scale for this model's authored height, given the target height (m). */
    private heightToScale: () => number,
  ) {
    this.object = object;
    this.mixer = new THREE.AnimationMixer(object);

    const action = (name: string) => {
      const clip = THREE.AnimationClip.findByName(animations, name);
      if (!clip) throw new Error(`Animation "${name}" not found`);
      return this.mixer.clipAction(clip);
    };
    this.clips = {
      standing: action('standing'),
      walking: action('walking'),
      running: action('running'),
      jumping: action('jumping'),
    };

    // Walk and run are driven by hand (time set from the shared phase), so they don't advance on their own.
    for (const a of [this.clips.standing, this.clips.walking, this.clips.running]) {
      a.play();
      a.timeScale = 0;
    }
    this.clips.jumping.setLoop(THREE.LoopOnce, 1);
    this.clips.jumping.clampWhenFinished = true;
    this.clips.jumping.play();
    this.clips.jumping.setEffectiveWeight(0);

    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.frustumCulled = false; // skinned meshes move away from their bind-pose bounds
      }
    });
  }

  /**
   * Called every rendered frame with the character's current horizontal speed, and the walk and
   * run speeds in use (they differ indoors), which set the walk/run blend.
   */
  update(dt: number, actualSpeed: number, grounded: boolean, walk: number, run: number): void {
    this.object.scale.setScalar(settings.modelScale * this.heightToScale());
    this.object.rotation.y = THREE.MathUtils.degToRad(this.baseYawDeg + settings.modelYawOffsetDeg);

    // The animation follows a smoothed speed, so starting and stopping blend over time instead of
    // snapping (the movement itself stops almost instantly). Slowing down eases more gently than
    // speeding up, and the legs keep cycling while they settle.
    const blendTime = actualSpeed < this.animSpeed ? settings.animStopBlend : settings.animStartBlend;
    const k = blendTime > 0 ? 1 - Math.exp(-dt / blendTime) : 1;
    this.animSpeed += (actualSpeed - this.animSpeed) * k;
    if (this.animSpeed < 0.01) this.animSpeed = 0;
    const speed = this.animSpeed;

    const { standing, walking, running, jumping } = this.clips;

    // Ground blend: 0 = standing, 1 = walking, 2 = running.
    const blend = speed <= walk ? speed / walk : 1 + Math.min(1, (speed - walk) / Math.max(0.01, run - walk));
    const wWalk = blend <= 1 ? blend : 2 - blend;
    const wRun = Math.max(0, blend - 1);
    const wStand = Math.max(0, 1 - blend);

    // Advance the shared cycle: each clip plays at normal speed when the character moves at its
    // reference speed (tunable), so feet match the ground.
    const walkRate = speed / settings.walkAnimSpeed / walking.getClip().duration;
    const runRate = speed / settings.runAnimSpeed / running.getClip().duration;
    const rate = wRun > 0 ? THREE.MathUtils.lerp(walkRate, runRate, wRun) : walkRate;
    this.phase = (this.phase + rate * dt) % 1;
    walking.time = this.phase * walking.getClip().duration;
    running.time = this.phase * running.getClip().duration;

    // Airborne: the jump takes over.
    if (!grounded && this.wasGrounded) {
      jumping.reset();
      jumping.play();
    }
    this.wasGrounded = grounded;
    const wJump = grounded ? 0 : 1;
    const ground = 1 - wJump;

    standing.setEffectiveWeight(wStand * ground);
    walking.setEffectiveWeight(wWalk * ground);
    running.setEffectiveWeight(wRun * ground);
    jumping.setEffectiveWeight(wJump);

    this.mixer.update(dt);
  }
}

/**
 * Load both characters. The Zamboni Dr. Green gets Part 1's animations, retargeted.
 * Also returns the Zamboni Dr. Green's height in the Blender file's units, so other models from
 * the same files (the ship) can be scaled to match.
 */
export async function loadModels(): Promise<{ models: Record<ModelId, AnimatedModel>; zamboniFileHeight: number }> {
  const loader = new GLTFLoader();
  const [part1, zamboni] = await Promise.all([loader.loadAsync(PART1_URL), loader.loadAsync(ZAMBONI_URL)]);

  const zamboniHeight = new THREE.Box3().setFromObject(zamboni.scene).getSize(new THREE.Vector3()).y;
  const zamboniClips = retargetClips(part1.scene, zamboni.scene, part1.animations, {
    yawFixDeg: settings.retargetYawFixDeg,
  });

  return {
    models: {
      part1: new AnimatedModel(part1.scene, part1.animations, 180, () => 1),
      zamboni: new AnimatedModel(zamboni.scene, zamboniClips, settings.zamboniBaseYawDeg, () => settings.zamboniHeight / zamboniHeight),
    },
    zamboniFileHeight: zamboniHeight,
  };
}
