// Clouds on the ground round the ship in the landing cutscene (0600, pass 4; owner, 2026-11-10; plan
// doc/plans/features/landing-cutscene.md). Drawn as the owner's `Cloud.blend` draws the reference's
// clouds (archive `Resources/Models/Cloud.blend`): a flat card per puff, its outline the cloud
// texture's alpha, lit through a baked normal map of a clump of puffs (its UVs wobbled by noise) and
// the light run through a colour ramp, deep teal in the shade to a pale warm yellow in the sun (toon
// light). Here the cards face the camera; the light is the scene's sun, in the card's frame.
//
// What moves (all a function of the track's time, so a replay or a skip is the same):
// - **the bank breathes**: the noise wobbling the normal map and the outline's boil scroll slowly,
//   each card turns slowly in the screen's plane, the whole bank drifts with the wind;
// - **the downwash**: the bank pushed out from under the ship as the thrust nears the ice (the track's
//   `push` curve, falling off with a card's distance from the ship);
// - **kicked-up puffs**: born under each nozzle in the last metres, rolling out, growing, slowing,
//   thinning out. The track (tools/landing-cutscene.mjs) holds every card and puff.
//
// One instanced sprite, sorted back to front each frame (alpha-blended, not additive); faded where it
// meets the ground or the ship (the scene's depth: soft particles), so no hard line where a card cuts
// the ice.

import * as THREE from 'three/webgpu';
import {
  cameraFar,
  cameraNear,
  cos,
  float,
  instancedBufferAttribute,
  max,
  mix,
  mx_noise_float,
  perspectiveDepthToViewZ,
  positionView,
  saturate,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
  viewportDepthTexture,
} from 'three/tsl';
import { fromBlender } from './commands';
import { settings } from './settings';

/** A card of the resting bank (Blender axes, m, from the ship's landed origin). */
export interface BankCloud {
  at: [number, number, number];
  size: number;
  /** Its turn in the screen's plane (rad) at time 0, and how fast it turns (rad/s). */
  spin: number;
  turn: number;
  /** Its place in the noise. */
  seed: number;
}

/** A puff kicked up under a nozzle. */
export interface Puff {
  /** Seconds into the track. */
  born: number;
  /** Where it starts on the ice (Blender X, Y), and the way it rolls (a unit vector). */
  at: [number, number];
  dir: [number, number];
  /** How far it rolls in all (m), slowing at `drag` (1/s). */
  travel: number;
  drag: number;
  /** Its size at birth and in the end (m), growing at `grow` (1/s). */
  size: [number, number];
  grow: number;
  /** It has thinned out by this age (s). */
  life: number;
  spin: number;
  turn: number;
  seed: number;
}

export interface CloudTrack {
  /** The wind's drift (m/s, Blender X, Y). */
  wind: [number, number];
  /** The push falls off over this distance from the ship (m). */
  radius: number;
  /** How far a card right under the ship has been pushed, over time ([s, m], evenly keyed). */
  push: [number, number][];
  bank: BankCloud[];
  puffs: Puff[];
}

const ALPHA_URL = '/scenery/clouds/cloud-alpha.png';
const NORMAL_URL = '/scenery/clouds/cloud-normal.png';
/** The Blender file's Mix: the normal map's UVs, this share of themselves, the rest noise. */
const UV_SHARE = 0.567;
/** Cloud.blend's sun in its camera's frame (toward the light: right, up, toward the camera). */
const REFERENCE_LIGHT: [number, number, number] = [-0.579, 0.538, 0.613];
/** The Blender file's diffuse colour. */
const ALBEDO = 0.8;

/** Linear between evenly spaced keys (held past the ends). */
function keyed(keys: [number, number][], t: number): number {
  if (t <= keys[0]![0]) return keys[0]![1];
  const last = keys[keys.length - 1]!;
  if (t >= last[0]) return last[1];
  const step = keys[1]![0] - keys[0]![0];
  const i = Math.min(keys.length - 2, Math.floor((t - keys[0]![0]) / step));
  const [t0, v0] = keys[i]!;
  const [t1, v1] = keys[i + 1]!;
  return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
}

export class Clouds {
  private readonly sprite: THREE.Sprite;
  private readonly capacity: number;
  private readonly centers: THREE.InstancedBufferAttribute;
  private readonly sizes: THREE.InstancedBufferAttribute;
  private readonly spins: THREE.InstancedBufferAttribute;
  private readonly alphas: THREE.InstancedBufferAttribute;
  private readonly seeds: THREE.InstancedBufferAttribute;
  private readonly u = {
    sun: uniform(new THREE.Vector3(0, 1, 0)),
    light: uniform(1),
    ambient: uniform(0.1),
    c0: uniform(new THREE.Color()),
    c1: uniform(new THREE.Color()),
    c2: uniform(new THREE.Color()),
    c3: uniform(new THREE.Color()),
    brightness: uniform(1),
    opacity: uniform(1),
    soft: uniform(1.5),
    edge: uniform(0.35),
    boil: uniform(0.3),
    breathe: uniform(0.05),
    wobble: uniform(1),
  };
  private readonly at = new THREE.Vector3();
  private readonly sunWorld = new THREE.Vector3();
  private readonly order: { d: number; x: number; y: number; z: number; size: number; spin: number; alpha: number; seed: number }[] = [];
  /** Cards drawn now (for the probes). */
  shown = 0;

  constructor(scene: THREE.Scene, capacity = 256) {
    this.capacity = capacity;
    const attr = (size: number) => new THREE.InstancedBufferAttribute(new Float32Array(capacity * size), size).setUsage(THREE.DynamicDrawUsage);
    this.centers = attr(3);
    this.sizes = attr(1);
    this.spins = attr(1);
    this.alphas = attr(1);
    this.seeds = attr(1);
    const loader = new THREE.TextureLoader();
    const alphaMap = loader.load(ALPHA_URL);
    const normalMap = loader.load(NORMAL_URL);
    normalMap.colorSpace = THREE.NoColorSpace;
    for (const t of [alphaMap, normalMap]) t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;

    const center = instancedBufferAttribute<'vec3'>(this.centers, 'vec3');
    const size = instancedBufferAttribute<'float'>(this.sizes, 'float');
    const spin = instancedBufferAttribute<'float'>(this.spins, 'float');
    const alpha = instancedBufferAttribute<'float'>(this.alphas, 'float');
    const seed = instancedBufferAttribute<'float'>(this.seeds, 'float');
    const u = this.u;

    const material = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false });
    material.positionNode = center;
    material.scaleNode = vec2(size, size);
    material.rotationNode = spin;

    // The normal map's UVs wobbled by a slow noise (the file's Mix of noise and UV), scrolling: the
    // toon bands crawl over the puff.
    const p = uv();
    const drift = time.mul(u.breathe);
    const wobble = mx_noise_float(vec3(p.mul(1.2), seed.add(drift))).mul(0.35).add(0.5);
    const nUv = p.mul(UV_SHARE).add(wobble.mul(float(1 - UV_SHARE)).mul(u.wobble)).add(float(1 - UV_SHARE).mul(0.5).mul(float(1).sub(u.wobble)));
    const n = texture(normalMap, nUv).xyz.mul(2).sub(1);
    // The card's frame in view space: its right and up turned by its spin; it faces the camera.
    const c = cos(spin);
    const s = sin(spin);
    const normal = vec3(n.x.mul(c).sub(n.y.mul(s)), n.x.mul(s).add(n.y.mul(c)), n.z).normalize();
    const shade = float(ALBEDO).mul(u.ambient.add(u.light.mul(max(normal.dot(u.sun), 0))));
    // The file's ramp: 0 deep teal, 0.10, 0.24 sage, 0.40 and over pale warm yellow.
    let colour = mix(u.c0, u.c1, saturate(shade.div(0.1)));
    colour = mix(colour, u.c2, saturate(shade.sub(0.1).div(0.14)));
    colour = mix(colour, u.c3, saturate(shade.sub(0.24).div(0.16)));

    // The outline: the texture's alpha, its edge boiling slowly.
    const boil = mx_noise_float(vec3(p.mul(5), seed.mul(1.7).add(drift.mul(3)))).mul(u.boil);
    const a = texture(alphaMap, p).r;
    const outline = smoothstep(u.edge.mul(0.4), u.edge, a.add(boil.mul(float(1).sub(a))));
    // Faded where it meets what's behind (the ice, the ship): the scene's depth against its own.
    const sceneZ = perspectiveDepthToViewZ(viewportDepthTexture(), cameraNear, cameraFar);
    const soft = saturate(positionView.z.sub(sceneZ).div(u.soft));
    material.colorNode = vec4(colour.mul(u.brightness), 1);
    material.opacityNode = outline.mul(alpha).mul(u.opacity).mul(soft);

    this.sprite = new THREE.Sprite(material);
    this.sprite.name = 'landing clouds';
    this.sprite.count = 0;
    this.sprite.frustumCulled = false;
    this.sprite.raycast = () => undefined;
    this.sprite.visible = false;
    scene.add(this.sprite);
  }

  /**
   * Per rendered frame, after the camera has moved. `track`: the cutscene's clouds (null: none shown);
   * `t`: its time; `frame`: the ship's landed place; `sun`: the sun light (its direction lights them).
   */
  update(track: CloudTrack | null, t: number, frame: THREE.Object3D, sun: THREE.DirectionalLight, camera: THREE.Camera): void {
    this.sprite.visible = track !== null && settings.landingClouds;
    if (!track || !this.sprite.visible) {
      this.shown = 0;
      return;
    }
    const u = this.u;
    u.light.value = settings.cloudLight;
    u.ambient.value = settings.cloudAmbient;
    u.c0.value.set(settings.cloudShadow);
    u.c1.value.set(settings.cloudShadow2);
    u.c2.value.set(settings.cloudMid);
    u.c3.value.set(settings.cloudLit);
    u.brightness.value = settings.cloudBrightness;
    u.opacity.value = settings.cloudOpacity;
    u.soft.value = Math.max(0.01, settings.cloudSoft);
    u.edge.value = settings.cloudEdge;
    u.boil.value = settings.cloudBoil;
    u.breathe.value = settings.cloudBreathe;
    // The light's direction in the camera's frame (the cards' normals are in it): as in Cloud.blend, from
    // the camera's upper left, in front of the cloud; or the scene's sun (behind the clouds in this shot).
    if (settings.cloudLightFrom === 'sun') {
      this.sunWorld.copy(sun.position).sub(sun.target.position).normalize();
      camera.updateMatrixWorld();
      u.sun.value.copy(this.sunWorld).transformDirection(camera.matrixWorldInverse);
    } else u.sun.value.set(...REFERENCE_LIGHT).normalize();

    frame.updateMatrixWorld();
    const order = this.order;
    order.length = 0;
    const wind: [number, number] = [track.wind[0] * t, track.wind[1] * t];
    const pushed = keyed(track.push, t);
    const r2 = track.radius * track.radius;
    const add = (x: number, y: number, z: number, size: number, spin: number, alpha: number, seed: number) => {
      if (alpha <= 0.002 || order.length >= this.capacity) return;
      frame.localToWorld(this.at.copy(fromBlender([x, y, z])));
      order.push({ d: this.at.distanceToSquared(camera.position), x: this.at.x, y: this.at.y, z: this.at.z, size, spin, alpha, seed });
    };
    for (const b of track.bank) {
      const r = Math.hypot(b.at[0], b.at[1]);
      const k = (pushed * Math.exp(-(r * r) / r2)) / Math.max(r, 1e-3);
      add(b.at[0] + b.at[0] * k + wind[0], b.at[1] + b.at[1] * k + wind[1], b.at[2], b.size, b.spin + b.turn * t, 1, b.seed);
    }
    for (const p of track.puffs) {
      const age = t - p.born;
      if (age <= 0) continue;
      const out = p.travel * (1 - Math.exp(-p.drag * age));
      const size = p.size[0] + (p.size[1] - p.size[0]) * (1 - Math.exp(-p.grow * age));
      // In over a third of a second, thinning out over the second half of its life.
      const alpha = Math.min(1, age / 0.35) * (1 - THREE.MathUtils.smoothstep(age, p.life * 0.45, p.life)) * settings.cloudPuffOpacity;
      // Its middle a little over the ice as it grows, rising slowly.
      const z = size * 0.1 + 0.4 * (1 - Math.exp(-age / 2.5));
      add(p.at[0] + p.dir[0] * out + wind[0], p.at[1] + p.dir[1] * out + wind[1], z, size, p.spin + p.turn * age, alpha, p.seed);
    }
    // Back to front.
    order.sort((a, b) => b.d - a.d);
    const c = this.centers.array as Float32Array;
    order.forEach((o, i) => {
      c[3 * i] = o.x;
      c[3 * i + 1] = o.y;
      c[3 * i + 2] = o.z;
      (this.sizes.array as Float32Array)[i] = o.size * settings.cloudSize;
      (this.spins.array as Float32Array)[i] = o.spin;
      (this.alphas.array as Float32Array)[i] = o.alpha;
      (this.seeds.array as Float32Array)[i] = o.seed;
    });
    for (const a of [this.centers, this.sizes, this.spins, this.alphas, this.seeds]) a.needsUpdate = true;
    this.sprite.count = order.length;
    this.shown = order.length;
  }
}
