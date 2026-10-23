// The scenery going by while the ship flies: a treadmill (doc/plans/features/flying-scene.md, *How the
// scenery works*). **The ship never moves**: the ground passes under it. A terrain is a data file
// (`public/terrain/<id>.json`), its meshes in `<id>.glb` beside it: its speed and height, the ground
// (one material per surface), the scatter (pools of instanced meshes sliding back; one that passes the
// rear edge comes back at the front, somewhere new: nothing is created while it runs), the backdrop
// (the same, far off and slower), the clouds (the same, in the air), the haze. Only the current terrain is built.
// **The look is the owner's fly-by** (The Zamboni 1.10 - fly by animation.blend, 2026-10-23): its
// ground (`Ice`: light blue, partly metallic, reflecting the sky; its roughness two noises, below), its `Rubble` (white, matte; ten of
// its pieces in `ice-plain.glb`), scattered as its geometry nodes do (a density, scaled at random,
// tipped and turned at random, centred on the ground), its height and speed (×1.486: the ship
// was smaller then). The lighting is the game's (the same sky and sun).
// **The scatter's shadows** are its meshes again (sharing their matrices), flattened onto the ground
// along the sun's direction in the shader, the part below the ground left out (the sun doesn't move
// and the ground is flat): sharp at any distance, no shadow map. The clouds' shadows are made the same way. They're drawn
// with the ground's material, wholly in the sun's shadow: what the ground is in shadow (the ship's shadow,
// from the shadow map, looks the same).
// Everything is in one group at the ship's centre, at the ground's height: turned, it turns the world
// round the ship (`settings.flightHeading`), the sun staying where it is.
// **The outside's own light** (doc/plans/features/outside-light.md): every material here is lit by the
// game's sun (the same light: its direction and its shadow map, so the ship's shadow on the ice) and by
// its own sky light, Blender's world, which the interior's dimming never reaches (`worldIndoors`). The
// sun is tinted on these materials only, through their received shadow (three multiplies the sun's light
// by it). Tuned on the panel's *Flight: outside light*.

import * as THREE from 'three/webgpu';
import { Fn, cameraViewMatrix, clamp, float, lights, mix, positionLocal, smoothstep, texture, uniform, varyingProperty, vec2, vec3, vec4 } from 'three/tsl';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { settings } from './settings';

interface ScatterData {
  /** The terrain file's meshes (each a shape), or a placeholder made here: `boulder`, `peak` (a mountain), `cloud`. */
  mesh: 'file' | 'boulder' | 'peak' | 'cloud';
  /** How many: a number, or per square metre of the band. */
  count?: number;
  density?: number;
  /** The meshes' unit: the file's sizes times this (m). */
  unit?: number;
  /** Scaled at random between the two, evenly (the fly-by's geometry nodes: 0 to 0.5). */
  scale: [number, number];
  /** Tipped up to this far (radians) about both level axes; turned any way about the vertical. */
  tilt?: number;
  /** Moved down by this share of its height (each mesh's own, as scaled; 0: centred on the ground). */
  sink?: number;
  /** Its base this high above the ground (m), at random between the two: for clouds. */
  lift?: [number, number];
  /** Its material: linear RGB. */
  color: [number, number, number];
  roughness: number;
  /** Smooth shading (the clouds); faceted otherwise. */
  smooth?: boolean;
  /**
   * Faded out with distance from the ship (m): whole from the first, gone at the second; its shadow
   * with it. So that what comes back at the front (or reaches the cameras' far plane) never pops in.
   */
  fade?: [number, number];
  /** Its opacity (and its shadow's) where it's whole: below 1, see-through. With `fade`. */
  opacity?: number;
  /** The band it fills (m from the ship's centre): ahead, behind, to either side. */
  ahead: number;
  behind: number;
  width: number;
  /** Kept clear either side of the ship's line (m): for a backdrop. */
  clear?: number;
  /** Its speed as a share of the ship's: below 1 for a backdrop. */
  parallax?: number;
}

export interface TerrainData {
  speed: number;
  height: number;
  /**
   * The ground: linear RGB, metalness (its share of the sky's reflection), a glow (linear RGB: the
   * fly-by's blue under the game's sun and tone mapping) and its roughness: the fly-by's `Ice`, two
   * noises added (`coarse`, `fine`: a cell's size across and along the flight, m), clamped to 0..1,
   * from the ramp's low end to its high one.
   */
  ground: {
    color: [number, number, number];
    metalness: number;
    emissive?: [number, number, number];
    roughness: { low: number; high: number; coarse: [number, number]; fine: [number, number] };
  };
  scatter: ScatterData[];
  backdrop: ScatterData[];
  /** Clouds: a pool in the air (`lift`), its shadows flattened onto the ground as the scatter's are. */
  clouds?: ScatterData[];
  haze: { near: number; far: number };
}

/** The ground reaches this much past the full haze, each way. */
const GROUND_MARGIN = 1.2;
/** The flattened shadows sit this far above the ground (m), and are drawn in front of it. */
const SHADOW_LIFT = 0.05;
/** The landed haze, put back when the ship lands. */
const LANDED_HAZE = { near: settings.hazeNear, far: settings.hazeFar };
/** The roughness's noise: a repeating tile this many pixels across, with this many noise cells across it. */
const NOISE_SIZE = 256;
const NOISE_CELLS = 32;
/** Floats kept per copy: x, z, turn, its size's share of the pool's range, two tilts, its height's share of its range. */
const PER_COPY = 7;

/** One pool: its copies' places in the group, their meshes and their shadows. */
interface Pool {
  data: ScatterData;
  count: number;
  meshes: THREE.InstancedMesh[];
  shadows: THREE.InstancedMesh[];
  /** Each mesh's height, unscaled (m). */
  heights: number[];
  copies: Float32Array;
}

export class Treadmill {
  readonly group = new THREE.Group();
  /** The terrain shown, or null (landed). */
  current: string | null = null;
  /** Metres travelled since the terrain was set. */
  travelled = 0;
  /** The cameras' far plane while it's shown: past the full haze. */
  far = 0;
  private readonly ground: THREE.Mesh;
  private pools: Pool[] = [];
  /** The ground's and its shadows' materials: the tuning panel's values go to both. */
  private groundMaterials: THREE.MeshStandardNodeMaterial[] = [];
  private groundTuned = '';
  /** Each noise's cells along the flight over across (the fly-by's plane was stretched). */
  private stretch: [number, number] = [1, 1];
  /** The ground's roughness: the ramp's ends, and the two noises' frequencies (1/m, across and along). */
  private readonly roughLow = uniform(0.45);
  private readonly roughHigh = uniform(1);
  private readonly coarse = uniform(new THREE.Vector2(0.01, 0.01));
  private readonly fine = uniform(new THREE.Vector2(1, 1));
  /** The ground's scroll (m): what the ship has travelled, kept small enough for the shader. */
  private readonly scroll = uniform(0);
  /** The noise both roughness layers read, made once. */
  private readonly noise = noiseTile(NOISE_SIZE, NOISE_CELLS);
  private materials: THREE.Material[] = [];
  private random = mulberry32(1);
  /** The sun's direction in the group (toward it): what the shadows are flattened along. */
  private readonly sun = uniform(new THREE.Vector3(0, 1, 0));
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  /** The outside's sky light: kept out of the scene, so only the materials here get it. */
  private readonly outsideSky = new THREE.HemisphereLight();
  /** The lights the materials here use instead of the scene's: the game's sun and the outside's sky. */
  private readonly outsideLights;
  /** The sun's colour on the outside only (white: as the game's), times its strength there. */
  private readonly sunTint = uniform(new THREE.Color(1, 1, 1));
  /** The sky's reflection on the ice: the panel's strength over the metals' (`scene.environmentIntensity` scales both). */
  private readonly reflect = uniform(1);
  private readonly tint = new THREE.Color();

  constructor(
    scene: THREE.Scene,
    /** The ship's centre on the ground plan (world x, z), and its belly's height (world y). */
    private readonly centre: { x: number; z: number; belly: number },
    /** The landed ground, hidden while flying. */
    private readonly landedFloor: THREE.Object3D,
    /** The sky's gradient, for the ground to reflect (as the ship's metals do: cutaway.ts). */
    private readonly reflections: THREE.Texture,
    /** The game's sun. */
    sun: THREE.DirectionalLight,
  ) {
    this.outsideSky.position.set(0, 1, 0); // light from above: its own colour; from below: the other
    this.outsideSky.updateMatrixWorld();
    this.outsideLights = lights([sun, this.outsideSky]);
    // Its size and material: the terrain's (set).
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    this.ground.receiveShadow = true;
    this.group.add(this.ground);
    this.group.visible = false;
    scene.add(this.group);
  }

  /** The scene's terrain (`travel.terrain`), or null when the ship isn't flying. */
  async set(id: string | null): Promise<void> {
    if (id === this.current) return;
    this.clear();
    this.current = id;
    this.landedFloor.visible = id === null;
    this.group.visible = false;
    if (id === null) {
      settings.hazeNear = LANDED_HAZE.near;
      settings.hazeFar = LANDED_HAZE.far;
      return;
    }
    const response = await fetch(`/terrain/${id}.json`);
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error(`no terrain "${id}"`);
    const data = (await response.json()) as TerrainData;
    const all = [...data.scatter, ...data.backdrop, ...(data.clouds ?? [])];
    const usesFile = all.some((d) => d.mesh === 'file');
    const shapes = usesFile ? await fileMeshes(`/terrain/${id}.glb`) : [];
    if (this.current !== id) return; // another was asked for meanwhile
    settings.flightSpeed = data.speed;
    settings.flightHeight = data.height;
    settings.flightHeading = 0;
    settings.hazeNear = data.haze.near;
    settings.hazeFar = data.haze.far;
    settings.groundColor = `#${linear(data.ground.color).getHexString()}`;
    settings.groundMetalness = data.ground.metalness;
    const rough = data.ground.roughness;
    settings.groundRoughnessLow = rough.low;
    settings.groundRoughnessHigh = rough.high;
    settings.groundCoarse = rough.coarse[0];
    settings.groundFine = rough.fine[0];
    this.stretch = [rough.coarse[1] / rough.coarse[0], rough.fine[1] / rough.fine[0]];
    settings.groundGlow = `#${linear(data.ground.emissive ?? [0, 0, 0]).getHexString()}`;
    this.far = data.haze.far * GROUND_MARGIN;
    const size = 2 * this.far;
    this.ground.geometry.dispose();
    this.ground.geometry = new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2);
    const ground = this.groundMaterial(data.ground, false);
    const shadow = this.groundMaterial(data.ground, true);
    this.ground.material = ground;
    this.materials.push(ground, shadow);
    this.groundMaterials = [ground, shadow];
    this.groundTuned = '';
    this.travelled = 0;
    this.random = mulberry32(1); // the same scatter every time (screenshots compare)
    for (const pool of all) this.pools.push(this.pool(pool, shapes, shadow, data.ground));
    this.group.visible = true;
    console.info(`[0.0.2] terrain: ${id} (${this.pools.reduce((n, p) => n + p.count, 0)} copies in ${this.pools.reduce((n, p) => n + p.meshes.length * 2, 0)} draws)`);
  }

  update(dt: number): void {
    if (!this.group.visible) return;
    const g = this.group;
    g.position.set(this.centre.x, this.centre.belly - settings.flightHeight, this.centre.z);
    g.rotation.y = THREE.MathUtils.degToRad(settings.flightHeading);
    const step = settings.flightSpeed * dt;
    this.travelled += step;
    this.scroll.value = this.travelled % 1e5;
    this.tuneGround();
    this.tuneOutside();

    // The sun's direction in the group: it stays put in the world while the group turns.
    const el = THREE.MathUtils.degToRad(settings.sunElevationDeg);
    const az = THREE.MathUtils.degToRad(settings.sunAzimuthDeg) - g.rotation.y;
    this.sun.value.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));

    for (const pool of this.pools) {
      const d = pool.data;
      const length = d.ahead + d.behind;
      const c = pool.copies;
      const variants = pool.meshes.length;
      const unit = d.unit ?? 1;
      const [lo, hi] = d.scale;
      const [low, high] = d.lift ?? [0, 0];
      for (let i = 0; i < pool.count; i++) {
        const k = i * PER_COPY;
        c[k + 1]! += step * (d.parallax ?? 1);
        if (c[k + 1]! > d.behind) {
          // Past the rear edge: back to the front, somewhere new.
          c[k + 1]! -= length;
          this.place(c, k, d, false);
        }
        const v = i % variants;
        const size = unit * (lo + (hi - lo) * c[k + 3]!);
        this.p.set(c[k]!, low + (high - low) * c[k + 6]! - (d.sink ?? 0) * pool.heights[v]! * size, c[k + 1]!);
        this.q.setFromEuler(this.e.set(c[k + 4]!, c[k + 2]!, c[k + 5]!, 'YXZ'));
        this.s.setScalar(size);
        this.m.compose(this.p, this.q, this.s);
        const n = Math.floor(i / variants);
        pool.meshes[v]!.setMatrixAt(n, this.m); // the shadows share it
      }
      for (const mesh of pool.meshes) mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** The panel's *Flight: outside light*: the outside's sky, the sun's tint and strength there, the reflections. */
  private tuneOutside(): void {
    this.outsideSky.intensity = Math.PI * settings.outsideSkyStrength; // π: Blender's world radiance as irradiance (world.ts)
    this.outsideSky.color.set(settings.outsideSkyColor);
    this.outsideSky.groundColor.set(settings.outsideBelowColor);
    this.sunTint.value.copy(this.tint.set(settings.outsideSunTint)).multiplyScalar(settings.outsideSunStrength);
    this.reflect.value = settings.outsideReflections / Math.max(settings.metalReflections, 1e-3);
  }

  /** The tuning panel's values on the ground's materials, when they change. */
  private tuneGround(): void {
    const tuned = `${settings.groundColor} ${settings.groundMetalness} ${settings.groundGlow} ${settings.groundRoughnessLow} ${settings.groundRoughnessHigh} ${settings.groundCoarse} ${settings.groundFine}`;
    if (tuned === this.groundTuned) return;
    this.groundTuned = tuned;
    for (const m of this.groundMaterials) {
      m.color.set(settings.groundColor);
      m.metalness = settings.groundMetalness;
      m.emissive.set(settings.groundGlow);
    }
    this.roughLow.value = settings.groundRoughnessLow;
    this.roughHigh.value = settings.groundRoughnessHigh;
    // A cell's size (m) as a frequency; along the flight stretched as the file has it.
    this.coarse.value.set(1 / settings.groundCoarse, 1 / (settings.groundCoarse * this.stretch[0]));
    this.fine.value.set(1 / settings.groundFine, 1 / (settings.groundFine * this.stretch[1]));
  }

  /**
   * The ground's roughness, as the fly-by's `Ice` has it: two single-layer noises (its fBm's roughness
   * is 0: no layer past the first counts), added, clamped, through a linear ramp. Where a point of the
   * ice is: the group's own x, z (the ground's, or a shadow's, flattened onto it), moved on by the
   * distance travelled. **For speed** the noise is computed once, into a repeating tile (`noiseTile`),
   * and read twice, at the two scales: two texture lookups per pixel (no cost measurable with the ice
   * filling a 3160 × 1422 view, 2026-10-23), not the noise's maths. Its mip levels average the
   * fine one out (to its mean, 0) where its cells get smaller than a pixel: no shimmer in the distance.
   * The big noise repeats every 32 of its cells (15 km), the fine one every 38 m (unseen at its size).
   */
  private roughness() {
    const at = vec2(positionLocal.x, positionLocal.z.sub(this.scroll)).div(NOISE_CELLS);
    const read = (frequency: typeof this.coarse) => texture(this.noise, at.mul(frequency)).r.mul(2).sub(1);
    return mix(this.roughLow, this.roughHigh, clamp(read(this.coarse).add(read(this.fine)), 0, 1));
  }

  /** The ground's material; the shadows' is the same lit by the sky alone. */
  private groundMaterial(ground: TerrainData['ground'], shadow: boolean, fade?: [number, number], opacity = 1): THREE.MeshStandardNodeMaterial {
    const material = new THREE.MeshStandardNodeMaterial({ color: linear(ground.color), metalness: ground.metalness, emissive: linear(ground.emissive ?? [0, 0, 0]) });
    material.roughnessNode = this.roughness();
    // Only the texture is used (sampled by direction); the coordinate keeps it from asking for UVs.
    material.envNode = texture(this.reflections, vec2(0)).mul(this.reflect);
    this.outside(material);
    if (shadow) {
      // Wholly in the sun's shadow (its meshes receive shadows for this): lit by the sky alone.
      material.receivedShadowNode = Fn(() => float(0));
      // Each point (placed by its copy's matrix) moved along the sun's direction onto the ground, the
      // buried ones too (up toward the sun): one flat projection, so each triangle stays a triangle and
      // its height carries across it exactly; what comes from below the ground is left out. (Kept
      // where they were, the buried parts drew their footprints as shadow: shadows with no rock.)
      const sun = this.sun;
      const fading = fade ? fadeBy(material, fade, opacity) : null;
      const height = varyingProperty('float', 'vHeight');
      material.positionNode = Fn(() => {
        const p = positionLocal;
        fading?.(p);
        height.assign(p.y);
        const h = p.y.div(sun.y);
        return vec3(p.x.sub(sun.x.mul(h)), SHADOW_LIFT, p.z.sub(sun.z.mul(h)));
      })();
      material.maskNode = height.greaterThanEqual(0);
      // Lit as the ground is: facing up.
      material.normalNode = cameraViewMatrix.mul(vec4(0, 1, 0, 0)).xyz;
      material.polygonOffset = true;
      material.polygonOffsetFactor = -2;
      material.polygonOffsetUnits = -2;
    }
    return material;
  }

  private pool(data: ScatterData, shapes: THREE.BufferGeometry[], groundShadow: THREE.MeshStandardNodeMaterial, ground: TerrainData['ground']): Pool {
    const material = new THREE.MeshStandardNodeMaterial({ color: linear(data.color), roughness: data.roughness, metalness: 0, flatShading: !data.smooth });
    this.outside(material);
    this.materials.push(material);
    let shadowMaterial = groundShadow;
    if (data.fade) {
      const fading = fadeBy(material, data.fade, data.opacity);
      material.positionNode = Fn(() => {
        fading(positionLocal);
        return positionLocal;
      })();
      // Its own shadows' material: the ground's in shadow, fading with it.
      shadowMaterial = this.groundMaterial(ground, true, data.fade, data.opacity);
      this.materials.push(shadowMaterial);
      this.groundMaterials.push(shadowMaterial);
      this.groundTuned = '';
    }
    const count = data.count ?? Math.round((data.density ?? 0) * (data.ahead + data.behind) * 2 * data.width);
    const made = { boulder: boulderGeometry, peak: peakGeometry, cloud: cloudGeometry };
    const geometries = data.mesh === 'file' ? shapes : [0, 1, 2].map(() => made[data.mesh as keyof typeof made](this.random));
    const meshes: THREE.InstancedMesh[] = [];
    const shadows: THREE.InstancedMesh[] = [];
    geometries.forEach((geometry, v) => {
      const n = Math.ceil((count - v) / geometries.length);
      const mesh = new THREE.InstancedMesh(geometry, material, n);
      const shadow = new THREE.InstancedMesh(geometry, shadowMaterial, n);
      shadow.instanceMatrix = mesh.instanceMatrix;
      // They move every frame: their bounds at load would be wrong.
      mesh.frustumCulled = false;
      shadow.frustumCulled = false;
      mesh.receiveShadow = true; // the ship's shadow passes over them
      shadow.receiveShadow = true; // so that its material can say it's in shadow
      // Fading, they're see-through: drawn before the ship's glass and the like (all nearer).
      if (data.fade) mesh.renderOrder = shadow.renderOrder = -1;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      meshes.push(mesh);
      shadows.push(shadow);
      this.group.add(shadow, mesh);
    });
    const heights = geometries.map((g) => {
      g.computeBoundingBox();
      return g.boundingBox!.max.y - g.boundingBox!.min.y;
    });
    const copies = new Float32Array(count * PER_COPY);
    for (let i = 0; i < count; i++) this.place(copies, i * PER_COPY, data, true);
    return { data, count, meshes, shadows, heights, copies };
  }

  /** Lit by the outside's lights, the sun tinted (a flattened shadow replaces its received shadow after this). */
  private outside(material: THREE.MeshStandardNodeMaterial): void {
    material.lightsNode = this.outsideLights;
    const tint = this.sunTint;
    // three calls it with the shadow (ShadowNode.js); the types leave the argument out.
    material.receivedShadowNode = ((shadow: THREE.Node<'float'>) => tint.mul(shadow)) as unknown as () => THREE.Node;
  }

  /** A copy somewhere new: across the band, at the front (or anywhere in it, at the start). */
  private place(c: Float32Array, k: number, d: ScatterData, anywhere: boolean): void {
    const r = this.random;
    const clear = d.clear ?? 0;
    const side = clear + r() * (d.width - clear);
    c[k] = r() < 0.5 ? -side : side;
    if (anywhere) c[k + 1] = -d.ahead + r() * (d.ahead + d.behind);
    else c[k + 1] = c[k + 1]! - r() * 2; // a little spread, or they come back in a line
    c[k + 2] = r() * Math.PI * 2;
    c[k + 3] = r();
    const tilt = d.tilt ?? 0;
    c[k + 4] = r() * tilt;
    c[k + 5] = r() * tilt;
    c[k + 6] = r();
  }

  private clear(): void {
    for (const pool of this.pools) {
      for (const mesh of [...pool.meshes, ...pool.shadows]) {
        this.group.remove(mesh);
        mesh.dispose();
      }
      if (pool.data.mesh !== 'file') pool.meshes.forEach((m) => m.geometry.dispose());
    }
    for (const material of this.materials) material.dispose();
    this.pools = [];
    this.materials = [];
    this.groundMaterials = [];
  }
}

/**
 * A material faded out with distance from the ship (the group's centre), from `fade[0]` to `fade[1]`
 * (m, along the ground). See-through, at most `opacity`; no depth written, so overlapping parts all
 * show. Returns what measures it at `p` (a point in the group), called in the material's
 * `positionNode`: a shadow passes its point from before it's flattened, so that it fades with what
 * casts it.
 */
function fadeBy(material: THREE.NodeMaterial, fade: [number, number], opacity = 1): (p: typeof positionLocal) => void {
  const v = varyingProperty('float', 'vFade');
  material.opacityNode = v;
  material.transparent = true;
  material.depthWrite = false;
  return (p) => {
    v.assign(float(1).sub(smoothstep(fade[0], fade[1], vec2(p.x, p.z).length())).mul(opacity));
  };
}

/** The terrain file's meshes, each a shape (centred where it was exported). */
async function fileMeshes(url: string): Promise<THREE.BufferGeometry[]> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const found: THREE.BufferGeometry[] = [];
  gltf.scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) found.push((o as THREE.Mesh).geometry);
  });
  return found;
}

/**
 * Gradient noise (as Blender's, one layer) over a tile that repeats: `cells` cells across `size`
 * pixels, its gradients wrapping at the edge. Stored 0..1 (0.5 is 0), with mip levels.
 */
function noiseTile(size: number, cells: number): THREE.DataTexture {
  const random = mulberry32(7);
  const gradients = Array.from({ length: cells * cells }, () => {
    const a = random() * Math.PI * 2;
    return [Math.cos(a), Math.sin(a)] as const;
  });
  const g = (x: number, y: number) => gradients[(((y % cells) + cells) % cells) * cells + (((x % cells) + cells) % cells)]!;
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const data = new Uint8Array(size * size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = ((px + 0.5) / size) * cells;
      const y = ((py + 0.5) / size) * cells;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = x - x0;
      const fy = y - y0;
      const dot = (ix: number, iy: number) => {
        const [gx, gy] = g(x0 + ix, y0 + iy);
        return gx * (fx - ix) + gy * (fy - iy);
      };
      const u = fade(fx);
      const v = fade(fy);
      const top = dot(0, 0) + (dot(1, 0) - dot(0, 0)) * u;
      const bottom = dot(0, 1) + (dot(1, 1) - dot(0, 1)) * u;
      // A 2D gradient noise reaches about ±0.7: scaled to about ±1, as the shader's was.
      const n = (top + (bottom - top) * v) * 1.4;
      data[py * size + px] = Math.round(THREE.MathUtils.clamp(n * 0.5 + 0.5, 0, 1) * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function linear([r, g, b]: [number, number, number]): THREE.Color {
  return new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace);
}

/** A faceted chunk of ice, about 1 m across, centred: an icosahedron with its corners pushed about. */
function boulderGeometry(random: () => number): THREE.BufferGeometry {
  return jitter(new THREE.IcosahedronGeometry(0.5, 0), random, 0.28);
}

/** A mountain, about 1 m across and 0.6 high, its base at 0. */
function peakGeometry(random: () => number): THREE.BufferGeometry {
  return jitter(new THREE.ConeGeometry(0.5, 0.6, 7, 2).translate(0, 0.3, 0).toNonIndexed(), random, 0.15);
}

/**
 * A cumulus, about 1 m across and 0.4 high, its base flat at 0: a few lumpy puffs side by side,
 * cut level underneath. Its corners shared, for smooth shading.
 */
function cloudGeometry(random: () => number): THREE.BufferGeometry {
  const puffs: THREE.BufferGeometry[] = [];
  const n = 5 + Math.floor(random() * 3);
  for (let i = 0; i < n; i++) {
    const r = 0.16 + random() * 0.14;
    const puff = jitter(new THREE.IcosahedronGeometry(r, 2), random, 0.06);
    // The middle ones bigger and higher, as a cumulus heaps up.
    const x = (i / (n - 1) - 0.5) * 0.7;
    puff.translate(x, r * (0.4 + 0.4 * (1 - Math.abs(x) * 2)), (random() - 0.5) * 0.3);
    puffs.push(puff);
  }
  const g = mergeGeometries(puffs)!;
  puffs.forEach((p) => p.dispose());
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, 0);
  g.deleteAttribute('normal');
  const smooth = mergeVertices(g);
  g.dispose();
  smooth.computeVertexNormals();
  return smooth;
}

/**
 * Each corner moved in and out at random (the same for every face that shares it, so nothing tears).
 * Flat normals: one per face.
 */
function jitter(g: THREE.BufferGeometry, random: () => number, amount: number): THREE.BufferGeometry {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const moved = new Map<string, number>();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    let f = moved.get(key);
    if (f === undefined) moved.set(key, (f = 1 + (random() * 2 - 1) * amount));
    v.multiplyScalar(f);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

/** A small seeded random generator: the same scatter on every run. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
