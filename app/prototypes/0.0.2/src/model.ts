// Animated character models, for testing walk/run animation:
// - "part1": Part 1's Dr. Green (Big Moon Tiny Moon) with its own animations.
// - "zamboni": the Zamboni Dr. Green (parka) from the ship file's `Player` collection (the crew
//   file's model, with a jetpack), driven by Part 1's animations through retargeting (same bone
//   names, different bone orientations and proportions). Wearing a jetpack shows it and moves the hood.
//   Two outfits on one skeleton (item 72): the parka's file has the skeleton; the jumpsuit's meshes
//   are moved onto it at load (`dress`), so one mixer animates both and a swap only shows and hides.
// Blends standing → walking → running by speed, keeping walk and run on the same step
// (shared phase), and plays the jump while airborne. Flying (the jetpack), Part 1's Flying clip
// loops, blended in and out over FLY_BLEND. Seated (`seated`), her piloting loop is all that's shown.

import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ClimbClip } from './ladders';
import { downloads } from './loading';
import { named } from './names';
import { retargetClips } from './retarget';
import { settings } from './settings';

const PART1_URL = '/test/part1-dr-green.glb';
const ZAMBONI_URL = '/test/green-parka.glb';
const JUMPSUIT_URL = '/test/green-jumpsuit.glb';
/** Part 1's character height as authored; the Zamboni model is scaled to match by default. */
export const PART1_HEIGHT = 1.23;

export type ModelId = 'zamboni' | 'part1';
/** What she wears (the Zamboni model): indoors the jumpsuit and sneakers, outside the parka and boots. */
export type Outfit = 'jumpsuit' | 'parka';

/** In the Zamboni model (the ship file's `Player` collection): the jetpack on her back, her little
 * backpack, and the hood's shape key for wearing the jetpack. */
const JETPACK = 'Jetpack';
/** The jumpsuit's jetpack (with its straps). */
const JUMPSUIT_JETPACK = 'Jetpack With Straps';
const BACKPACK = 'Backpack.002';
const HOOD_KEY = 'jetpack';

/** Time constant of the blend into and out of the flying clip (s). */
const FLY_BLEND = 0.12;

type Clips = { standing: THREE.AnimationAction; walking: THREE.AnimationAction; running: THREE.AnimationAction; jumping: THREE.AnimationAction; flying: THREE.AnimationAction };

export class AnimatedModel {
  readonly object: THREE.Object3D;
  private mixer: THREE.AnimationMixer;
  private clips: Clips;
  /** Position in the walk/run cycle, 0..1, shared so both cycles stay on the same step. */
  private phase = 0;
  /** Where the walk/run cycle is, 0..1 (for the footsteps). */
  get cycle(): number {
    return this.phase;
  }
  private wasGrounded = true;
  /** Speed the animation is showing (m/s), eased toward the character's real speed. */
  private animSpeed = 0;
  /** The flying clip's share, eased (0..1). */
  private flyWeight = 0;

  constructor(
    object: THREE.Object3D,
    animations: THREE.AnimationClip[],
    /** Built-in facing correction for this model (degrees). */
    private baseYawDeg: number,
    /** Scale for this model's authored height, given the target height (m). */
    private heightToScale: () => number,
    /** The ladder's climbing animation, made for this model (none on Part 1's). */
    climbClip?: THREE.AnimationClip,
    /** Her outfits' things (`outfitParts`, `dress`); none on Part 1's. */
    private outfits: Partial<Record<Outfit, THREE.Object3D[]>> = {},
    /** Her piloting loop, played while seated (none on Part 1's). */
    pilotClip?: THREE.AnimationClip,
  ) {
    this.object = object;
    this.mixer = new THREE.AnimationMixer(object);
    if (climbClip) this.climbing = new Climbing(object, climbClip, this.mixer);
    if (pilotClip) {
      this.piloting = this.mixer.clipAction(pilotClip);
      this.piloting.play();
      this.piloting.setEffectiveWeight(0);
    }

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
      flying: action('flying'),
    };
    this.clips.flying.play();
    this.clips.flying.setEffectiveWeight(0);

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
        // Her fade (the camera close to her): dithered, set now so the shaders are built with it.
        const material = (child as THREE.Mesh).material;
        for (const m of Array.isArray(material) ? material : [material]) {
          if (this.fading.some((f) => f.material === m)) continue;
          m.alphaHash = true;
          this.fading.push({ material: m, opacity: m.opacity });
        }
        const index = (child as THREE.Mesh).morphTargetDictionary?.[HOOD_KEY];
        if (index !== undefined) this.hood.push({ mesh: child as THREE.Mesh, index });
      }
      if (named(child, JETPACK)) this.jetpack = child;
      if (named(child, BACKPACK)) this.backpack = child;
    });
    for (const [outfit, parts] of Object.entries(this.outfits)) {
      const jetpack = parts.find((p) => named(p, JETPACK) || named(p, JUMPSUIT_JETPACK));
      if (jetpack) this.jetpacks.set(outfit as Outfit, jetpack);
    }
  }

  // Wearing a jetpack (the Zamboni model; Part 1's has its own, always on): hers shows, her little
  // backpack hides, and the hood's shape key moves it out of the jetpack's way.
  /** The jetpack group (on the `Body` bone), shown only while she wears it; the exhaust glow's nozzles are in it. */
  jetpack: THREE.Object3D | null = null;
  private backpack: THREE.Object3D | null = null;
  /** Each outfit's jetpack. */
  private jetpacks = new Map<Outfit, THREE.Object3D>();
  private hood: { mesh: THREE.Mesh; index: number }[] = [];
  /** Her materials, with their own opacities: setShown scales them (the shadow pass ignores it). */
  private fading: { material: THREE.Material; opacity: number }[] = [];

  /** 0..1: how much of her shows (dithered; her shadow stays whole). */
  setShown(share: number): void {
    for (const f of this.fading) f.material.opacity = f.opacity * share;
  }

  /** Every outfit shown, for building their shaders at load (the next update dresses her again). */
  showEveryOutfit(): void {
    for (const parts of Object.values(this.outfits)) for (const p of parts) p.visible = true;
  }

  /** Shows the outfit's things and hides the other's; then the jetpack, hers in that outfit. */
  private dressIn(outfit: Outfit): void {
    for (const [id, parts] of Object.entries(this.outfits)) for (const p of parts) p.visible = id === outfit;
    this.jetpack = this.jetpacks.get(outfit) ?? this.jetpack;
  }

  /** Part of the outfit she wears (or of no outfit: Part 1's model). */
  private inWornOutfit(part: THREE.Object3D): boolean {
    return Object.entries(this.outfits).every(([id, parts]) => id === settings.outfit || !parts.includes(part));
  }

  private wear(on: boolean): void {
    if (this.jetpack) this.jetpack.visible = on;
    // The little backpack goes with its outfit (the parka): off with the jumpsuit too (owner, 2026-10-21).
    if (this.backpack) this.backpack.visible = !on && this.inWornOutfit(this.backpack);
    for (const { mesh, index } of this.hood) mesh.morphTargetInfluences![index] = on ? 1 : 0;
  }

  /**
   * Called every rendered frame with the character's current horizontal speed, and the walk and
   * run speeds in use (they differ indoors), which set the walk/run blend.
   */
  /** The climbing animation, if this model has one. */
  readonly climbing: Climbing | null = null;

  /** Her piloting loop, if this model has one. */
  private readonly piloting: THREE.AnimationAction | null = null;
  /** In her seat: the piloting loop alone (main.ts, while she's seated; at its tag's place). */
  seated = false;

  /** The ladder's animation, for the climb; null without one. */
  get climb(): ClimbClip | null {
    return this.climbing;
  }

  update(dt: number, actualSpeed: number, grounded: boolean, walk: number, run: number, flying = false, clipTime: number | null = null): void {
    this.object.scale.setScalar(settings.modelScale * this.heightToScale());
    this.object.rotation.y = THREE.MathUtils.degToRad(this.baseYawDeg + settings.modelYawOffsetDeg);
    this.dressIn(settings.outfit);
    this.wear(settings.wearingJetpack);

    // The animation follows a smoothed speed, so starting and stopping blend over time instead of
    // snapping (the movement itself stops almost instantly). Slowing down eases more gently than
    // speeding up, and the legs keep cycling while they settle.
    const blendTime = actualSpeed < this.animSpeed ? settings.animStopBlend : settings.animStartBlend;
    const k = blendTime > 0 ? 1 - Math.exp(-dt / blendTime) : 1;
    this.animSpeed += (actualSpeed - this.animSpeed) * k;
    if (this.animSpeed < 0.01) this.animSpeed = 0;
    const speed = this.animSpeed;

    const { standing, walking, running, jumping, flying: flyingClip } = this.clips;

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

    // Airborne: the jump takes over (not when she takes off flying).
    if (!grounded && this.wasGrounded && !flying) {
      jumping.reset();
      jumping.play();
    }
    this.wasGrounded = grounded;
    // Flying: the flying clip over everything, eased in and out.
    this.flyWeight += ((flying ? 1 : 0) - this.flyWeight) * (1 - Math.exp(-Math.max(0, dt) / FLY_BLEND));
    if (this.flyWeight < 0.001) this.flyWeight = 0;
    // Climbing, the ladder's animation is all that's shown, at the time the climb gives it.
    const climbing = clipTime !== null && this.climbing !== null;
    this.climbing?.show(climbing ? clipTime : null);
    // Seated, the piloting loop is all that's shown (no blend: she's placed in the seat at once).
    const seated = this.seated && this.piloting !== null;
    this.piloting?.setEffectiveWeight(seated ? 1 : 0);
    if (climbing || seated) this.animSpeed = 0;
    const rest = (1 - this.flyWeight) * (climbing || seated ? 0 : 1);
    const wJump = grounded ? 0 : rest;
    const ground = grounded ? rest : 0;

    standing.setEffectiveWeight(wStand * ground);
    walking.setEffectiveWeight(wWalk * ground);
    running.setEffectiveWeight(wRun * ground);
    jumping.setEffectiveWeight(wJump);
    flyingClip.setEffectiveWeight(climbing || seated ? 0 : this.flyWeight);

    this.mixer.update(dt);
  }
}

/**
 * The ladder's climbing animation (exported with her model from the ship file). Played in place:
 * `Body`'s translation, its root motion, is taken out and handed to the climb, which moves her by
 * it, so the camera and everything that follows her position follow.
 */
class Climbing implements ClimbClip {
  readonly duration: number;
  private action: THREE.AnimationAction;
  private root: THREE.Interpolant;
  private first: THREE.Vector3;
  private turned: THREE.Quaternion;
  /** From the armature's space to the model object's. */
  private chain: THREE.Matrix4;
  private m = new THREE.Matrix4();
  private m3 = new THREE.Matrix3();

  constructor(
    private object: THREE.Object3D,
    clip: THREE.AnimationClip,
    mixer: THREE.AnimationMixer,
  ) {
    this.duration = clip.duration;
    const position = clip.tracks.find((t) => t.name === `${BODY}.position`);
    const rotation = clip.tracks.find((t) => t.name === `${BODY}.quaternion`);
    if (!position || !rotation) throw new Error(`the climbing animation has no ${BODY} position or rotation`);
    this.root = new THREE.LinearInterpolant(position.times.slice(), position.values.slice(), 3, new Float32Array(3));
    this.first = new THREE.Vector3().fromArray(position.values, 0);
    // In place: Body stays where it is at the first frame.
    for (let i = 0; i < position.values.length; i += 3) position.values.set(this.first.toArray(), i);
    // How Body turns from the first frame to the last.
    const q = rotation.values;
    const q0 = new THREE.Quaternion().fromArray(q, 0);
    this.turned = new THREE.Quaternion().fromArray(q, q.length - 4).multiply(q0.invert());

    const body = object.getObjectByName(BODY);
    object.updateMatrixWorld(true);
    this.chain = new THREE.Matrix4().copy(object.matrixWorld).invert().multiply(body!.parent!.matrixWorld);

    this.action = mixer.clipAction(clip);
    this.action.setLoop(THREE.LoopOnce, 1);
    this.action.clampWhenFinished = true;
    this.action.play();
    this.action.timeScale = 0;
    this.action.setEffectiveWeight(0);
  }

  /** At this time, or hidden (null). */
  show(time: number | null): void {
    this.action.setEffectiveWeight(time === null ? 0 : 1);
    if (time !== null) this.action.time = time;
  }

  /** From the armature's space to her own (the character's root, facing -Z). */
  private toRoot(): THREE.Matrix4 {
    this.object.updateMatrix();
    return this.m.multiplyMatrices(this.object.matrix, this.chain);
  }

  offset(t: number, out: THREE.Vector3): THREE.Vector3 {
    const [x = 0, y = 0, z = 0] = this.root.evaluate(Math.min(t, this.duration));
    out.set(x - this.first.x, y - this.first.y, z - this.first.z);
    return out.applyMatrix3(this.m3.setFromMatrix4(this.toRoot()));
  }

  turn(): number {
    const r = new THREE.Quaternion();
    this.toRoot().decompose(new THREE.Vector3(), r, new THREE.Vector3());
    const turned = r.clone().multiply(this.turned).multiply(r.clone().invert());
    const v = new THREE.Vector3(0, 0, -1).applyQuaternion(turned);
    return Math.atan2(-v.x, -v.z);
  }
}

const BODY = 'Body';

/** Where the climbing animation starts, in the ship's space (glTF axes): her feet and facing; its clip's name. */
export interface ClimbTag {
  clip?: string;
  start: [number, number, number];
  facing: [number, number, number];
}

/** Where she sits for her piloting loop, in the ship's space (glTF axes): her feet (the armature's place) and facing; its clip's name. */
export interface PilotTag {
  clip: string;
  at: [number, number, number];
  facing: [number, number, number];
}

/**
 * Load both characters. The Zamboni Dr. Green gets Part 1's animations, retargeted. She's 1.23
 * tall in the file, as in the game (since 2026-10-19), so she's shown at the file's size unless
 * the tuning panel's height changes it.
 */
export async function loadModels(onProgress: (share: number) => void = () => undefined): Promise<{ models: Record<ModelId, AnimatedModel>; climbTag: ClimbTag | null; pilotTag: PilotTag | null }> {
  const loader = new GLTFLoader();
  const [a, b, c] = downloads(3, onProgress);
  const [part1, zamboni, jumpsuit] = await Promise.all([loader.loadAsync(PART1_URL, a), loader.loadAsync(ZAMBONI_URL, b), loader.loadAsync(JUMPSUIT_URL, c)]);

  // Her size from the parka (the jumpsuit's hair is 1.4 cm higher than the hood: she doesn't change size).
  const zamboniHeight = new THREE.Box3().setFromObject(zamboni.scene).getSize(new THREE.Vector3()).y;
  const outfits = { parka: outfitParts(zamboni.scene), jumpsuit: dress(zamboni.scene, jumpsuit.scene) };
  let climbTag: ClimbTag | null = null;
  let pilotTag: PilotTag | null = null;
  zamboni.scene.traverse((o) => {
    if (o.userData.climb) climbTag = o.userData.climb as ClimbTag;
    if (o.userData.pilot) pilotTag = o.userData.pilot as PilotTag;
  });
  // Her clips by the tags' names (export-crew-character.py); a file from before the tags named them: the first is the ladder's.
  const clip = (name: string | undefined) => (name ? THREE.AnimationClip.findByName(zamboni.animations, name) : undefined) ?? undefined;
  const climbClip = clip((climbTag as ClimbTag | null)?.clip) ?? zamboni.animations[0];
  const pilotClip = clip((pilotTag as PilotTag | null)?.clip);
  // Without the tracks of bones her skeleton doesn't have (`Hand_r.IK`, an IK target left out of the export: they'd only warn).
  for (const c of [climbClip, pilotClip]) if (c) c.tracks = c.tracks.filter((t) => zamboni.scene.getObjectByName(THREE.PropertyBinding.parseTrackName(t.name).nodeName));
  if (pilotTag && !pilotClip) console.warn(`[0.0.2] her model has no clip "${(pilotTag as PilotTag).clip}" (the pilot tag's)`);
  const zamboniClips = retargetClips(part1.scene, zamboni.scene, part1.animations, {
    yawFixDeg: settings.retargetYawFixDeg,
  });

  return {
    models: {
      part1: new AnimatedModel(part1.scene, part1.animations, 180, () => 1),
      // Her model's animations are the ladder's and her piloting (export-crew-character.py --clip, --loop).
      zamboni: new AnimatedModel(zamboni.scene, zamboniClips, settings.zamboniBaseYawDeg, () => settings.zamboniHeight / zamboniHeight, climbClip, outfits, pilotClip),
    },
    climbTag,
    pilotTag,
  };
}

const isBone = (o: THREE.Object3D | null): boolean => (o as THREE.Bone | null)?.isBone === true;

/** An outfit's things in its file: the meshes beside the skeleton and what hangs on its bones (not the bones). */
function outfitParts(root: THREE.Object3D): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!isBone(o) && o.parent && (isBone(o.parent) || o.parent.children.some(isBone))) parts.push(o);
  });
  return parts;
}

/**
 * Puts another outfit's things on her skeleton (`body`): each where it was in its own file (beside
 * the skeleton, or on the bone of the same name), skinned meshes bound to her bones by name, and
 * materials of the same name shared (one material per colour). Both armatures have the same rest
 * pose (`tools/fit-jumpsuit.py`), so the clothes' own bind matrices fit. Returns the things moved.
 */
function dress(body: THREE.Object3D, clothes: THREE.Object3D): THREE.Object3D[] {
  const bones = new Map<string, THREE.Object3D>();
  const materials = new Map<string, THREE.Material>();
  body.traverse((o) => {
    if (isBone(o)) bones.set(o.name, o);
    const m = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh).material : [];
    for (const material of Array.isArray(m) ? m : [m]) materials.set(material.name, material);
  });
  const skeleton = [...bones.values()].find((b) => !isBone(b.parent))!.parent!;
  const bone = (name: string) => {
    const found = bones.get(name);
    if (!found) throw new Error(`her model has no bone ${name} for the other outfit`);
    return found;
  };
  const parts = outfitParts(clothes);
  for (const part of parts) {
    (isBone(part.parent) ? bone(part.parent!.name) : skeleton).add(part);
    part.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      const own = (m: THREE.Material) => materials.get(m.name) ?? m;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
      if (mesh.isSkinnedMesh) mesh.bind(new THREE.Skeleton(mesh.skeleton.bones.map((b) => bone(b.name) as THREE.Bone), mesh.skeleton.boneInverses), mesh.bindMatrix);
    });
  }
  return parts;
}
