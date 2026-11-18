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
// A gadget (2026-11-16: the binoculars) over all that, on her upper body only (`UPPER_BODY`): each
// movement clip is split in two at load, the legs' half played as before, the upper half handing over
// to the gadget's clip as it comes into her hands (`gadgetHeld`, the clip's first frame), the clip
// played on as it's used (`gadgetRaised`: the binoculars to her eyes); the gadget's own object (the
// binoculars on her hand) keyed in the same clip, shown while it's out. The scanner (2026-11-16):
// its clip is one frame, the hold; while it's on (`gadgetScan`), `Body` and `Head` turn about their
// length by a smooth made-up noise (the file's Noise modifiers, copied loosely: owner, "the easiest
// way"), written after the mixer; `Body`'s share only while she stands (no spine: it turns her legs).
// Aimed (scanner pass 3, owner 2026-11-16): while she scans, `Body` turns toward the closest
// interaction point within reach (`scanTargets`, from interaction.ts), up and down too, eased, the legs
// turned back so her steps stay on her path; her heading, movement and the camera are untouched.
// The coffee (2026-11-18; plan doc/plans/features/coffee.md): her drinking loop on her right arm only
// (`RIGHT_ARM`: the movement's upper half is split again, so her left arm keeps its swing), held on its
// first frame (`coffeeHeld`) and played once for a sip (`coffeeSip`, `coffeeSipShare`); the mug on her
// right hand keyed in the same clip, shown while she holds it (not while she climbs or sits).

import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GadgetId } from './gadgets';
import type { ClimbClip } from './ladders';
import { downloads } from './loading';
import { named, sanitize } from './names';
import { retargetClips } from './retarget';
import { ScannerRay } from './scanner-ray';
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

/** Her upper body: the bones a gadget's clip takes over from the movement clips (her skeleton has no spine: `Body` is the torso, left to the movement). */
const UPPER_BODY = ['Arm_l', 'Hand_l', 'Arm_r', 'Hand_r', 'Head'];
/** Her right arm: the coffee's clip takes it over from the movement clips (the left arm keeps its swing). */
const RIGHT_ARM = ['Arm_r', 'Hand_r'];
/** The coffee: her drinking loop (frame 1 the hold; export-crew-character.py --action) and the mug on her right hand. */
export const COFFEE_CLIP = 'Dr. Green - Coffee';
const MUG = 'Mug';
/** The binoculars: her clip (the export bakes the binoculars' own turn into it) and the object on her right hand. */
export const BINOCULARS_CLIP = 'Dr. Green - Binoculars';
const BINOCULARS = 'Binoculars.001';
/** The scanner: her hold (one frame), the scanner on `Body` and its ray (a child, shown while it's on: scanner pass 2). */
export const SCANNER_CLIP = 'Dr. Green - Scanner';
const SCANNER = 'Scanner';
const SCANNER_RAY = 'Scanner Ray';
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const SCAN_TURN = new THREE.Quaternion();
/** The scan's turn: two sines (periods in s, at `scannerTurnSpeed` 1), close to the file's Noise of size 100 frames. */
const wobble = (t: number) => 0.62 * Math.sin((2 * Math.PI * t) / 4.3) + 0.38 * Math.sin((2 * Math.PI * t) / 2.7 + 1.3);
/** The head's turn this much later (s): the file's offset of 25 frames, and more so the two don't move as one. */
const HEAD_LATER = 1.04 + 7.1;
const AIM_Q = new THREE.Quaternion();
const AIM_Q2 = new THREE.Quaternion();
const AIM_P = new THREE.Quaternion();
const AIM_V = new THREE.Vector3();
const AIM_O = new THREE.Vector3();
const AIM_D = new THREE.Vector3();
const AIM_W = new THREE.Vector3();
const AIM_R = new THREE.Vector3();
/** Eased toward `target` by a share that stays the same at any frame rate (`time`: about how long it takes). */
const easeTo = (value: number, target: number, dt: number, time: number) => value + (target - value) * (1 - Math.exp(-Math.max(0, dt) / Math.max(1e-3, time / 3)));

const trackNode = (t: THREE.KeyframeTrack) => THREE.PropertyBinding.parseTrackName(t.name).nodeName;
/** A clip's tracks on these nodes (`keep` true) or on the others, as a clip of its own. */
function subclip(clip: THREE.AnimationClip, nodes: string[], keep: boolean, suffix: string): THREE.AnimationClip {
  return new THREE.AnimationClip(clip.name + suffix, clip.duration, clip.tracks.filter((t) => nodes.includes(trackNode(t)) === keep));
}

/** A gadget's clip on her model: her upper body's part, weighted by how far it's raised, and its object's, at full weight while it shows. */
interface GadgetClip {
  body: THREE.AnimationAction;
  /** Its object's own tracks (the binoculars' turn); none when the object only hangs on a bone (the scanner). */
  held: THREE.AnimationAction | null;
  object: THREE.Object3D | null;
}

type ClipName = 'standing' | 'walking' | 'running' | 'jumping' | 'flying';
type Clips = Record<ClipName, THREE.AnimationAction>;
const CLIP_NAMES: ClipName[] = ['standing', 'walking', 'running', 'jumping', 'flying'];

export class AnimatedModel {
  readonly object: THREE.Object3D;
  private mixer: THREE.AnimationMixer;
  /** The movement clips: without the upper body when there's a gadget clip (`upper` has it), whole otherwise. */
  private clips: Clips;
  /** The movement clips' upper-body halves, weighted by what the gadget leaves them; none without a gadget clip. */
  private upper: Clips | null = null;
  /** Her gadgets' clips (binoculars, scanner), those her model has. */
  private gadgets: Partial<Record<GadgetId, GadgetClip>> = {};
  /** The movement clips' right-arm part, with a coffee clip (then `upper` has the rest of the upper body). */
  private right: Clips | null = null;
  /** The coffee's clip on her right arm, twice (the hold, at frame 1; the sip, played), the mug's tracks the same, and the mug. */
  private coffee: { hold: THREE.AnimationAction; sip: THREE.AnimationAction; mugHold: THREE.AnimationAction; mugSip: THREE.AnimationAction; mug: THREE.Object3D | null } | null = null;
  /** How far the mug's hold has come into her arm: 0 .. 1 (main.ts, from `Coffee.held`). */
  coffeeHeld = 0;
  /** The sip's place in the loop, 0 .. 1, and its share over the hold (main.ts, from `Coffee`). */
  coffeeSip = 0;
  coffeeSipShare = 0;
  /** The coffee clip's length (s), for `Coffee`'s sips; 0 without one. */
  get coffeeSeconds(): number {
    return this.coffee?.sip.getClip().duration ?? 0;
  }
  /** Which gadget's clip and object show (main.ts, from `Gadgets.shown`). */
  gadgetShown: GadgetId | null = null;
  /** The scanner on: 0 .. 1 (main.ts, from `Gadgets.scan`): her body and head turn as she scans. */
  gadgetScan = 0;
  /** The scanner's ray, shown while she scans (scanner-ray.ts); null without one. */
  scannerRay: ScannerRay | null = null;
  private scannerRayObject: THREE.Object3D | null = null;
  private scanTime = 0;
  private bodyBone: THREE.Object3D | null = null;
  private headBone: THREE.Object3D | null = null;
  /** `Body`'s and `Head`'s rotations as the mixer left them, before the scan's turn: put back before
   * the next mixer update (it writes a bone only when its value changes: unrestored, the turn piles up). */
  private readonly scanBase = [new THREE.Quaternion(), new THREE.Quaternion()];
  private scanTurned = false;
  /** Her legs (`Leg_l`, `Leg_r`): turned back under the aim's turn of `Body`; their mixer poses kept as `scanBase`'s are. */
  private legBones: THREE.Object3D[] = [];
  private readonly legBase: THREE.Quaternion[] = [];
  private readonly legWorld: THREE.Quaternion[] = [];
  /** What the scanner may aim at (main.ts, from `Interaction.inReach`): world points. */
  scanTargets: { name: string; point: THREE.Vector3 }[] = [];
  /** The point aimed at now (its name), or null. */
  private scanAimed: string | null = null;
  /** The aim's turn of `Body` now (radians, eased): about the vertical (+ left), then up (+). */
  private aimYaw = 0;
  private aimPitch = 0;
  /** 0 .. 1, eased: how much it's aimed (the random scan made smaller by it). */
  private aimShare = 0;
  /** For checks: what it's aimed at and the turn now (degrees). */
  get scanAim(): { target: string | null; yaw: number; pitch: number; share: number } {
    return { target: this.scanAimed, yaw: THREE.MathUtils.radToDeg(this.aimYaw), pitch: THREE.MathUtils.radToDeg(this.aimPitch), share: this.aimShare };
  }
  /** How far the gadget has come into her hands: 0 away .. 1 held, in its clip's first frame (main.ts, from `Gadgets`). */
  gadgetHeld = 0;
  /** How far it's raised from her hands by its clip: 0 .. 1, the clip's time (main.ts, from `Gadgets`). */
  gadgetRaised = 0;
  /** The gadget in her hands (the binoculars), for the first-person camera at it; null without one. */
  get gadgetObject(): THREE.Object3D | null {
    return this.gadgets.binoculars?.object ?? null;
  }
  /** The gadget clip's length (s), for `Gadgets`; 0 without one. */
  get gadgetSeconds(): number {
    return this.gadgets.binoculars?.body.getClip().duration ?? 0;
  }
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
    /** Her binoculars' clip (none on Part 1's). */
    binocularsClip?: THREE.AnimationClip,
    /** Her scanner's clip (none on Part 1's). */
    scannerClip?: THREE.AnimationClip,
    /** Her coffee's clip (none on Part 1's). */
    coffeeClip?: THREE.AnimationClip,
  ) {
    this.object = object;
    this.mixer = new THREE.AnimationMixer(object);
    if (climbClip) this.climbing = new Climbing(object, climbClip, this.mixer);
    if (pilotClip) {
      this.piloting = this.mixer.clipAction(pilotClip);
      this.piloting.play();
      this.piloting.setEffectiveWeight(0);
    }

    const find = (name: string) => {
      const clip = THREE.AnimationClip.findByName(animations, name);
      if (!clip) throw new Error(`Animation "${name}" not found`);
      return clip;
    };
    // With a gadget clip, each movement clip in two: the legs' half and the upper body's.
    // With the coffee's clip, the upper half in two again: the right arm and the rest.
    const upperRest = UPPER_BODY.filter((b) => !(coffeeClip && RIGHT_ARM.includes(b)));
    const clipsOf = (part: 'lower' | 'upper' | 'right' | 'whole') =>
      Object.fromEntries(
        CLIP_NAMES.map((name) => {
          const clip = find(name);
          const piece =
            part === 'whole' ? clip : part === 'lower' ? subclip(clip, UPPER_BODY, false, ' (lower)') : subclip(clip, part === 'upper' ? upperRest : RIGHT_ARM, true, ` (${part})`);
          return [name, this.mixer.clipAction(piece)];
        }),
      ) as Clips;
    const anyGadget = binocularsClip !== undefined || scannerClip !== undefined || coffeeClip !== undefined;
    this.clips = clipsOf(anyGadget ? 'lower' : 'whole');
    if (anyGadget) this.upper = clipsOf('upper');
    if (coffeeClip) this.right = clipsOf('right');
    for (const clips of [this.clips, this.upper, this.right]) {
      if (!clips) continue;
      clips.flying.play();
      clips.flying.setEffectiveWeight(0);
      // Walk and run are driven by hand (time set from the shared phase), so they don't advance on their own.
      for (const a of [clips.standing, clips.walking, clips.running]) {
        a.play();
        a.timeScale = 0;
      }
      clips.jumping.setLoop(THREE.LoopOnce, 1);
      clips.jumping.clampWhenFinished = true;
      clips.jumping.play();
      clips.jumping.setEffectiveWeight(0);
    }
    // Played by hand: the binoculars' time follows how far they're raised (`gadgetRaised`), both ways.
    const byHand = (clip: THREE.AnimationClip) => {
      const a = this.mixer.clipAction(clip);
      a.play();
      a.timeScale = 0;
      a.setEffectiveWeight(0);
      return a;
    };
    if (binocularsClip) {
      const held = [BINOCULARS, sanitize(BINOCULARS)];
      const object = object3d(this.object, held);
      if (!object) console.warn(`[0.0.2] her model has no ${BINOCULARS} (the binoculars' clip moves it)`);
      if (object) object.visible = false;
      this.gadgets.binoculars = { body: byHand(subclip(binocularsClip, UPPER_BODY, true, ' (body)')), held: byHand(subclip(binocularsClip, held, true, ' (held)')), object };
    }
    if (coffeeClip) {
      const mugNames = [MUG, sanitize(MUG)];
      const mug = object3d(this.object, mugNames);
      if (!mug) console.warn(`[0.0.2] her model has no ${MUG} (the coffee's clip moves it)`);
      if (mug) mug.visible = false;
      const arm = subclip(coffeeClip, RIGHT_ARM, true, ' (arm)');
      const onHand = subclip(coffeeClip, mugNames, true, ' (mug)');
      this.coffee = { hold: byHand(arm), sip: byHand(arm.clone()), mugHold: byHand(onHand), mugSip: byHand(onHand.clone()), mug };
    }
    if (scannerClip) {
      const object = object3d(this.object, [SCANNER]);
      if (!object) console.warn(`[0.0.2] her model has no ${SCANNER}`);
      if (object) object.visible = false;
      this.scannerRayObject = object3d(this.object, [SCANNER_RAY, sanitize(SCANNER_RAY)]);
      if (!this.scannerRayObject) console.warn(`[0.0.2] her model has no ${SCANNER_RAY}`);
      this.gadgets.scanner = { body: byHand(subclip(scannerClip, UPPER_BODY, true, ' (body)')), held: null, object };
      this.bodyBone = this.object.getObjectByName('Body') ?? null;
      this.headBone = this.object.getObjectByName('Head') ?? null;
      this.legBones = ['Leg_l', 'Leg_r'].flatMap((n) => this.object.getObjectByName(n) ?? []);
      for (let i = 0; i < this.legBones.length; i++) {
        this.legBase.push(new THREE.Quaternion());
        this.legWorld.push(new THREE.Quaternion());
      }
    }

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
    // The ray's own material, after her fade's setup (it isn't dithered with her: it's never close to the camera's cut-off).
    if (this.scannerRayObject) this.scannerRay = new ScannerRay(this.scannerRayObject);
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

    const { walking, running, jumping } = this.clips;

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
      this.upper?.jumping.reset().play();
      this.right?.jumping.reset().play();
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

    const weights: Record<ClipName, number> = {
      standing: wStand * ground,
      walking: wWalk * ground,
      running: wRun * ground,
      jumping: wJump,
      flying: climbing || seated ? 0 : this.flyWeight,
    };
    for (const name of CLIP_NAMES) this.clips[name].setEffectiveWeight(weights[name]);

    // The gadget on her upper body: the movement's upper halves hand over to its clip as it comes into
    // her hands (eased), the clip held at its first frame; using it plays the clip on (the binoculars
    // to her eyes) and back. Not while she climbs or sits (main.ts puts it away then).
    const free = !climbing && !seated;
    const held = free ? THREE.MathUtils.clamp(this.gadgetHeld, 0, 1) : 0;
    const raised = free ? THREE.MathUtils.clamp(this.gadgetRaised, 0, 1) : 0;
    const share = held * held * (3 - 2 * held);
    // The coffee on her right arm (never with a gadget: main.ts locks them while she holds it).
    const coffeeHeld = free && this.coffee ? THREE.MathUtils.clamp(this.coffeeHeld, 0, 1) : 0;
    const coffeeShare = coffeeHeld * coffeeHeld * (3 - 2 * coffeeHeld);
    for (const [part, left] of [
      [this.upper, 1 - share],
      [this.right, (1 - share) * (1 - coffeeShare)],
    ] as const) {
      if (!part) continue;
      for (const name of CLIP_NAMES) {
        const up = part[name];
        up.setEffectiveWeight(weights[name] * left);
        // On the legs' frame: walk, run and stand are set by hand; the jump and the flight run on their own, started with the legs'.
        if (name !== 'jumping' && name !== 'flying') up.time = this.clips[name].time;
      }
    }
    if (this.coffee) {
      const { hold, sip, mugHold, mugSip, mug } = this.coffee;
      const sipShare = THREE.MathUtils.clamp(this.coffeeSipShare, 0, 1);
      hold.time = mugHold.time = 0;
      sip.time = mugSip.time = THREE.MathUtils.clamp(this.coffeeSip, 0, 1) * sip.getClip().duration;
      hold.setEffectiveWeight(coffeeShare * (1 - sipShare));
      sip.setEffectiveWeight(coffeeShare * sipShare);
      const shown = coffeeShare > 0;
      mugHold.setEffectiveWeight(shown ? 1 - sipShare : 0);
      mugSip.setEffectiveWeight(shown ? sipShare : 0);
      if (mug) mug.visible = shown;
    }
    for (const [id, gadget] of Object.entries(this.gadgets) as [GadgetId, GadgetClip][]) {
      const { body, held: inHand, object } = gadget;
      const mine = id === this.gadgetShown ? share : 0;
      body.time = id === 'binoculars' ? raised * body.getClip().duration : 0;
      if (inHand) inHand.time = body.time;
      body.setEffectiveWeight(mine);
      inHand?.setEffectiveWeight(mine > 0 ? 1 : 0);
      if (object) object.visible = mine > 0;
    }

    if (this.scanTurned) {
      this.bodyBone?.quaternion.copy(this.scanBase[0]!);
      this.headBone?.quaternion.copy(this.scanBase[1]!);
      this.legBones.forEach((b, i) => b.quaternion.copy(this.legBase[i]!));
      this.scanTurned = false;
    }
    this.mixer.update(dt);

    // Scanning: `Body` and `Head` turn about their length (the file's Noise: size 100 frames,
    // strength 1, the head's 25 frames later). `Body`'s share only while she stands: walking,
    // running or in the air it would turn her legs off her path.
    const on = free && this.gadgetShown === 'scanner' ? THREE.MathUtils.clamp(this.gadgetScan, 0, 1) : 0;
    if (on > 0) {
      this.scanTime += Math.max(0, dt) * settings.scannerTurnSpeed;
      const amp = THREE.MathUtils.degToRad(settings.scannerTurnDeg) * on * on * (3 - 2 * on) * share;
      if (this.bodyBone) this.scanBase[0]!.copy(this.bodyBone.quaternion);
      if (this.headBone) this.scanBase[1]!.copy(this.headBone.quaternion);
      this.legBones.forEach((b, i) => this.legBase[i]!.copy(b.quaternion));
      this.scanTurned = true;
      this.aim(dt, on);
      // The random scan on top, smaller while aimed (owner: a little of it kept).
      const kept = THREE.MathUtils.lerp(1, settings.scannerAimWobble, this.aimShare);
      if (this.bodyBone) this.bodyBone.quaternion.multiply(SCAN_TURN.setFromAxisAngle(Y_AXIS, kept * amp * weights.standing * wobble(this.scanTime)));
      if (this.headBone) this.headBone.quaternion.multiply(SCAN_TURN.setFromAxisAngle(Y_AXIS, kept * amp * wobble(this.scanTime + HEAD_LATER)));
    } else {
      this.scanTime = 0;
      this.aimYaw = this.aimPitch = this.aimShare = 0;
      this.scanAimed = null;
    }
    this.scannerRay?.update(on);
  }

  /**
   * The aim (scanner pass 3): of the points in reach, the closest the turn can get to, kept unless
   * another is closer by `scannerAimHold`; `Body` eased toward it (or back), the legs turned back.
   * Starts from the mixer's pose (`scanBase`).
   */
  private aim(dt: number, on: number): void {
    const ray = this.scannerRay;
    if (!this.bodyBone || !ray) return;
    this.object.updateMatrixWorld(true);
    this.legBones.forEach((leg, i) => leg.getWorldQuaternion(this.legWorld[i]!));
    // Where the ray points as the animation has it, flattened: the turn's frame.
    const origin = ray.object.getWorldPosition(AIM_O);
    const ahead = AIM_V.copy(ray.axis).applyQuaternion(ray.object.getWorldQuaternion(AIM_Q)).setY(0);
    if (ahead.lengthSq() < 1e-6) return;
    ahead.normalize();
    const right = AIM_R.crossVectors(ahead, Y_AXIS).normalize(); // a turn about it, +: up
    const maxYaw = THREE.MathUtils.degToRad(settings.scannerAimYawDeg);
    const maxPitch = THREE.MathUtils.degToRad(settings.scannerAimPitchDeg);

    type Aim = { name: string; yaw: number; pitch: number; distance: number };
    let best: Aim | null = null;
    let current: Aim | null = null;
    const from = origin.clone();
    for (const t of this.scanTargets) {
      const distance = t.point.distanceTo(from);
      if (best && distance >= best.distance && t.name !== this.scanAimed) continue;
      const turn = this.solveAim(t.point, right);
      if (!turn || Math.abs(turn.yaw) > maxYaw || Math.abs(turn.pitch) > maxPitch) continue;
      const found = { name: t.name, ...turn, distance };
      if (t.name === this.scanAimed) current = found;
      if (!best || distance < best.distance) best = found;
    }
    const chosen = current && best && best.distance > current.distance - settings.scannerAimHold ? current : best;
    this.scanAimed = chosen?.name ?? null;
    const time = settings.scannerAimEase;
    this.aimYaw = easeTo(this.aimYaw, chosen?.yaw ?? 0, dt, time);
    this.aimPitch = easeTo(this.aimPitch, chosen?.pitch ?? 0, dt, time);
    this.aimShare = easeTo(this.aimShare, chosen ? 1 : 0, dt, time);
    const share = on * on * (3 - 2 * on);
    this.turnBody(this.aimYaw * share, this.aimPitch * share, right, true);
  }

  /** The turn (radians) that puts the ray's axis through `point`: up to six steps, the scanner being off `Body`'s pivot. Leaves `Body` at its mixer pose. */
  private solveAim(point: THREE.Vector3, right: THREE.Vector3): { yaw: number; pitch: number } | null {
    const ray = this.scannerRay!;
    let yaw = 0;
    let pitch = 0;
    for (let i = 0; i < 6; i++) {
      this.turnBody(yaw, pitch, right, false);
      const origin = ray.object.getWorldPosition(AIM_O);
      const dir = AIM_D.copy(ray.axis).applyQuaternion(ray.object.getWorldQuaternion(AIM_Q)).normalize();
      const want = AIM_W.subVectors(point, origin);
      if (want.lengthSq() < 1e-4) return null;
      want.normalize();
      // About the vertical from the ray's way to the wanted way (+ left), then the difference in elevation.
      const dYaw = Math.atan2(dir.z * want.x - dir.x * want.z, dir.x * want.x + dir.z * want.z);
      const dPitch = Math.asin(THREE.MathUtils.clamp(want.y, -1, 1)) - Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
      yaw += dYaw;
      pitch += dPitch;
      if (Math.abs(dYaw) + Math.abs(dPitch) < 0.002) break; // about a tenth of a degree
    }
    this.turnBody(0, 0, right, false);
    return { yaw, pitch };
  }

  /** `Body` from its mixer pose turned in the world: `pitch` about `right` (+ up), then `yaw` about the vertical (+ left); with `legs`, the legs turned back to where they were. */
  private turnBody(yaw: number, pitch: number, right: THREE.Vector3, legs: boolean): void {
    const body = this.bodyBone!;
    body.quaternion.copy(this.scanBase[0]!);
    const turn = AIM_Q.setFromAxisAngle(Y_AXIS, yaw).multiply(AIM_Q2.setFromAxisAngle(right, pitch));
    if (body.parent) {
      body.parent.getWorldQuaternion(AIM_P);
      turn.multiply(AIM_P).premultiply(AIM_P.invert()); // into the parent's space
    }
    body.quaternion.premultiply(turn);
    body.updateMatrixWorld(true);
    if (!legs) return;
    this.legBones.forEach((leg, i) => {
      leg.quaternion.copy(leg.parent!.getWorldQuaternion(AIM_Q2).invert().multiply(this.legWorld[i]!));
      leg.updateMatrixWorld(true);
    });
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

  // Her size from the parka (the jumpsuit's hair is 1.4 cm higher than the hood: she doesn't change size),
  // without the binoculars (on her hand, in the file's pose of their clip's last frame).
  // (and without the mug: its place in the file is wherever the coffee's clip left it).
  const binoculars = object3d(zamboni.scene, [BINOCULARS, sanitize(BINOCULARS)]);
  const mug = object3d(zamboni.scene, [MUG, sanitize(MUG)]);
  const held = [binoculars, mug].flatMap((o) => (o?.parent ? [{ o, parent: o.parent }] : []));
  for (const h of held) h.o.removeFromParent();
  const zamboniHeight = new THREE.Box3().setFromObject(zamboni.scene).getSize(new THREE.Vector3()).y;
  for (const h of held) h.parent.add(h.o);
  // The binoculars, the scanner and the mug hang on her in the parka's file but belong to neither outfit: shown by their clips.
  const scanner = object3d(zamboni.scene, [SCANNER]);
  const outfits = { parka: outfitParts(zamboni.scene).filter((p) => p !== binoculars && p !== scanner && p !== mug), jumpsuit: dress(zamboni.scene, jumpsuit.scene) };
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
  const binocularsClip = clip(BINOCULARS_CLIP);
  if (!binocularsClip) console.warn(`[0.0.2] her model has no clip "${BINOCULARS_CLIP}"`);
  const scannerClip = clip(SCANNER_CLIP);
  if (!scannerClip) console.warn(`[0.0.2] her model has no clip "${SCANNER_CLIP}"`);
  const coffeeClip = clip(COFFEE_CLIP);
  if (!coffeeClip) console.warn(`[0.0.2] her model has no clip "${COFFEE_CLIP}"`);
  // Without the tracks of bones her skeleton doesn't have (`Hand_r.IK`, an IK target left out of the export: they'd only warn).
  for (const c of [climbClip, pilotClip, binocularsClip, scannerClip, coffeeClip]) if (c) c.tracks = c.tracks.filter((t) => zamboni.scene.getObjectByName(THREE.PropertyBinding.parseTrackName(t.name).nodeName));
  if (pilotTag && !pilotClip) console.warn(`[0.0.2] her model has no clip "${(pilotTag as PilotTag).clip}" (the pilot tag's)`);
  const zamboniClips = retargetClips(part1.scene, zamboni.scene, part1.animations, {
    yawFixDeg: settings.retargetYawFixDeg,
  });

  return {
    models: {
      part1: new AnimatedModel(part1.scene, part1.animations, 180, () => 1),
      // Her model's animations are the ladder's, her piloting and the binoculars (export-crew-character.py --clip, --loop, --action).
      zamboni: new AnimatedModel(zamboni.scene, zamboniClips, settings.zamboniBaseYawDeg, () => settings.zamboniHeight / zamboniHeight, climbClip, outfits, pilotClip, binocularsClip, scannerClip, coffeeClip),
    },
    climbTag,
    pilotTag,
  };
}

const isBone = (o: THREE.Object3D | null): boolean => (o as THREE.Bone | null)?.isBone === true;

/** The first object under `root` with one of these names. */
function object3d(root: THREE.Object3D, names: string[]): THREE.Object3D | null {
  for (const n of names) {
    const found = root.getObjectByName(n);
    if (found) return found;
  }
  return null;
}

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
