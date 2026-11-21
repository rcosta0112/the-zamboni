// The thrusters' flames while the ship flies (SC-121), as in the owner's fly-by: a cone behind each
// turbine (`Turbine.004` behind the big ones, `Turbine.005` the small), copied from the fly-by file
// by tools/thruster-flames.py. Its *Thruster 2* material, unlit: a pale yellow glow, opaque at the
// nozzle and faded out along the cone, dimmed by a fine grain that runs back along it. Additive, so
// the glass and the haze don't sort against it. In exterior cutscenes only (owner, 2026-10-23): not
// from inside the ship. Each cone flickers on its own (owner, 2026-10-24): a noise over time per cone
// dims and shortens it, so no two are in step.
//
// The landing (owner, 2026-11-10; plan doc/plans/features/landing-cutscene.md, pass 2): each cone is
// its own mesh, hung on its turbine (the nearest to its nozzle), so it turns with it; a cutscene keys
// the front pair's share of the strength and the cones' length (`reach`: shortened near the ground);
// and a painted bloom per nozzle (no post-processing, as exhaust.ts): a white-hot core in a warm
// halo, a camera-facing sprite sized in its nozzle's radii (so it shrinks with distance), flaring with the flames' strength.
//
// The shape (SC-190, owner, 2026-11-21; plan doc/plans/features/thruster-flame-shape.md, from two
// cartoon references): the cones are only the placement now (each nozzle's middle, axis, radius, turbine).
// Each nozzle gets a strip on the flame's axis, turned about it to face the camera (as the temple's light
// shaft), and its shader draws the outline: a round base the nozzle's size joined smoothly to a long thin
// flame tapering to a point, in the flames' colour; and a solid white core down its middle, never
// under `thrusterFlameCorePx` pixels, **laid over** (the temple's lesson: white added to the sky came out
// pink-white); the colour laid over too (added, the pale yellow vanished against the sky). Seen down its axis the strip thins out, so it fades there. The old cones behind a switch.

import * as THREE from 'three/webgpu';
import { abs, attribute, cameraPosition, cross, dot, float, length, max, min, mix, modelWorldMatrix, modelWorldMatrixInverse, mx_noise_float, normalize, positionLocal, positionWorld, pow, saturate, select, smoothstep, sqrt, time, uniform, uv, varying, vec2, vec3, vec4 } from 'three/tsl';
import { settings } from './settings';

const URL = '/ship/thruster-flames.json';

type FlamesFile = { positions: number[]; along: number[]; indices: number[] };

/** The flames as a cutscene keys them (main.ts, from the track's `flight` keys). */
export interface KeyedFlames {
  /** Times the strength; 0: off. */
  strength: number;
  /** The front pair's share of it (1: as the back). */
  front: number;
  /** The cones' length, times their file length. */
  reach: number;
  /** The painted bloom, times its level (0: none). */
  glow: number;
}

type Cone = {
  /** The fly-by file's cone (`thrusterFlameCones`). */
  mesh: THREE.Mesh;
  /** The strip: its flame (added) and its white core (laid over), on one geometry. */
  strip: THREE.Mesh[];
  front: boolean;
  /** The nozzle's radius (m). */
  radius: number;
  glow: ReturnType<typeof glowMaterial> & { sprite: THREE.Sprite; size: number; target: number };
};

function flameMaterial(u: ThrusterFlames['u']) {
  const strength = uniform(1);
  // The flicker, 0 to 1: two octaves of noise over time, each cone at its own place in it.
  const cone = attribute<'float'>('cone', 'float').mul(7.31);
  const t = time.mul(u.flickerRate);
  const n = saturate(mx_noise_float(vec2(t, cone.add(0.5))).add(mx_noise_float(vec2(t.mul(2.3), cone.add(3.7))).mul(0.5)).mul(0.4).add(0.5));
  // The fly-by's alpha ramp: 1 at the nozzle, 0.033 at `fade`, nothing at the cone's end (shortened by the flicker).
  const s = attribute<'float'>('along', 'float').div(float(1).sub(u.flickerLength.mul(n)));
  const alpha = select(s.lessThan(u.fade), mix(float(1), float(0.033), s.div(u.fade)), mix(float(0.033), float(0), saturate(s.sub(u.fade).div(float(1).sub(u.fade)))));
  // The grain, running back along the flame (the cone's -z).
  const at = positionLocal.div(u.grainSize).add(vec3(0, 0, time.mul(u.speed).div(u.grainSize)));
  const grain = float(1).sub(u.grain.mul(mx_noise_float(at).mul(0.5).add(0.5)));
  const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  material.colorNode = u.color.mul(strength).mul(alpha).mul(grain).mul(float(1).sub(u.flicker.mul(n)));
  return { material, strength };
}

/** Rows of a strip along the flame (the outline is worked out per pixel). */
const ROWS = 24;

/** A strip: `side` -1..1 across, `t` 0..1 from the base's back to the tip; the nozzle's radius and the cone's length per vertex. */
function stripGeometry(radius: number, coneLength: number, cone: number): THREE.BufferGeometry {
  const side: number[] = [];
  const t: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= ROWS; r++) {
    for (const s of [-1, 1]) {
      side.push(s);
      t.push(r / ROWS);
    }
    if (r < ROWS) indices.push(2 * r, 2 * r + 1, 2 * r + 2, 2 * r + 1, 2 * r + 3, 2 * r + 2);
  }
  const n = side.length;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Array<number>(n * 3).fill(0), 3));
  g.setAttribute('side', new THREE.Float32BufferAttribute(side, 1));
  g.setAttribute('along', new THREE.Float32BufferAttribute(t, 1));
  g.setAttribute('radius', new THREE.Float32BufferAttribute(new Array<number>(n).fill(radius), 1));
  g.setAttribute('coneLength', new THREE.Float32BufferAttribute(new Array<number>(n).fill(coneLength), 1));
  g.setAttribute('cone', new THREE.Float32BufferAttribute(new Array<number>(n).fill(cone), 1));
  g.setIndex(indices);
  return g;
}

/** Smooth maximum (a rounded join where the base meets the flame). */
function smax(a: THREE.Node<'float'>, b: THREE.Node<'float'>, k: THREE.Node<'float'>): THREE.Node<'float'> {
  const h = max(k.sub(abs(a.sub(b))), 0).div(max(k, 1e-5));
  return max(a, b).add(h.mul(h).mul(k).mul(0.25));
}

/**
 * The strip's two materials, on the shared uniforms: the flame in its colour (added) and the white core
 * (laid over). In the nozzle's space the flame runs down -z from the nozzle's middle; `d` is metres along it.
 */
function stripMaterials(u: ThrusterFlames['u'], strength: THREE.UniformNode<'float', number>) {
  const R = attribute<'float'>('radius', 'float');
  const cone = attribute<'float'>('cone', 'float').mul(7.31);
  const t = time.mul(u.flickerRate);
  const n = saturate(mx_noise_float(vec2(t, cone.add(0.5))).add(mx_noise_float(vec2(t.mul(2.3), cone.add(3.7))).mul(0.5)).mul(0.4).add(0.5));
  // The parts, in metres: the base's radius and middle, the thin flame's half-width and its tip (shortened by the flicker and `reach`).
  const rb = R.mul(u.base);
  const d0 = R.mul(u.baseOut);
  const ws = R.mul(u.width);
  const tip = max(d0.add(0.01), attribute<'float'>('coneLength', 'float').mul(u.length).mul(u.reach).mul(float(1).sub(u.flickerLength.mul(n))));
  // Vertex: the point on the axis, the strip turned about it to face the camera, wide enough for the base, the flame and the core's pixels.
  const d = mix(d0.sub(rb), tip, attribute<'float'>('along', 'float'));
  const axis = vec3(0, 0, d.negate());
  const camera = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz;
  const across = normalize(cross(vec3(0, 0, -1), camera.sub(axis)));
  const axisWorld = modelWorldMatrix.mul(vec4(axis, 1)).xyz;
  const px = length(cameraPosition.sub(axisWorld)).mul(u.pixel);
  const half = max(max(rb, ws), px.mul(u.corePx).mul(0.6)).mul(1.1);
  const side = attribute<'float'>('side', 'float');
  const positionNode = axis.add(across.mul(side.mul(half)));
  // Seen down the axis the strip is edge-on: faded out there.
  const facing = abs(dot(normalize(camera.sub(axis)), vec3(0, 0, -1)));
  const vFacing = varying(float(1).sub(smoothstep(0.8, 0.97, facing)));
  const vD = varying(d);
  const vS = varying(side.mul(half));
  const vN = varying(n);

  // Fragment: the outline's half-width here, the base's disc joined smoothly to the tapering flame.
  const fD = vD;
  const fS = abs(vS);
  const disc = sqrt(max(rb.mul(rb).sub(fD.sub(d0).mul(fD.sub(d0))), 0));
  const share = saturate(fD.sub(d0).div(tip.sub(d0))); // 0 where the flame leaves the base, 1 at its tip
  const flame = select(fD.lessThan(d0), float(0), ws.mul(pow(float(1).sub(share), u.taper)));
  const h = max(smax(disc, flame, ws.mul(0.8)), 1e-4);
  const across01 = fS.div(h);
  const body = float(1).sub(smoothstep(float(1).sub(u.edge), 1, across01));
  const fade = float(1).sub(smoothstep(u.fade, 1, share));
  // The grain, running back along the flame.
  const at = vec3(vS, 0, fD.sub(time.mul(u.speed))).div(u.grainSize);
  const grain = float(1).sub(u.grain.mul(mx_noise_float(at).mul(0.5).add(0.5)));
  // Laid over, not added (2026-11-21: the pale colour added to the bright sky vanished, as the temple's did); its brightness
  // before tone mapping in the colour, the outline, fade, grain and flicker in its opacity.
  const flameMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
  flameMaterial.positionNode = positionNode;
  flameMaterial.colorNode = vec4(u.color.mul(strength), min(body.mul(fade).mul(grain).mul(float(1).sub(u.flicker.mul(vN))).mul(vFacing).mul(min(strength, 1)), 1));

  // The core: the flame's shape narrowed, never under `corePx` pixels, solid to its edge (softened over its last tenth),
  // from the base to `coreLength` of the flame, faded at both ends.
  const fPx = length(cameraPosition.sub(positionWorld)).mul(u.pixel);
  const coreHalf = max(h.mul(u.coreWidth), fPx.mul(u.corePx).mul(0.5));
  const coreShape = float(1).sub(smoothstep(0.9, 1, fS.div(coreHalf)));
  const coreAlong = float(1).sub(smoothstep(u.coreLength.mul(0.6), u.coreLength, share)).mul(smoothstep(d0.sub(rb.mul(0.7)), d0.sub(rb.mul(0.2)), fD));
  const coreMaterial = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
  coreMaterial.positionNode = positionNode;
  coreMaterial.colorNode = vec4(vec3(1, 1, 1).mul(u.coreBright), min(coreShape.mul(coreAlong).mul(vFacing).mul(min(strength, 1)), 1));
  return [flameMaterial, coreMaterial];
}

/** The painted bloom (exhaust.ts's): a halo falling off to the sprite's edge, a soft-edged core over it. */
function glowMaterial() {
  const core = uniform(new THREE.Color());
  const halo = uniform(new THREE.Color());
  const coreSize = uniform(0.3);
  const haloLevel = uniform(1);
  const level = uniform(0);
  const r = length(uv().sub(0.5)).mul(2);
  const haloShape = float(1).sub(smoothstep(0, 1, r)).pow(1.6);
  const coreShape = float(1).sub(smoothstep(coreSize.mul(0.4), coreSize, r));
  const material = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  material.toneMapped = false;
  material.colorNode = vec4(halo.mul(haloShape.mul(haloLevel)).add(core.mul(coreShape)).mul(level), 1);
  return { material, core, halo, coreSize, haloLevel, level };
}

export class ThrusterFlames {
  /** Shared by both materials. */
  readonly u = {
    color: uniform(new THREE.Color()),
    fade: uniform(0.6),
    grain: uniform(0.5),
    grainSize: uniform(0.08),
    speed: uniform(20),
    flicker: uniform(0.3),
    flickerLength: uniform(0.15),
    flickerRate: uniform(12),
    // The strip's shape (settings' `thrusterFlame...`).
    base: uniform(1),
    baseOut: uniform(0.3),
    length: uniform(1.2),
    reach: uniform(1),
    width: uniform(0.45),
    taper: uniform(1.2),
    edge: uniform(0.45),
    coreWidth: uniform(0.4),
    corePx: uniform(2),
    coreLength: uniform(0.55),
    coreBright: uniform(6),
    /** World size of one pixel at 1 m from the camera. */
    pixel: uniform(0.001),
  };
  private readonly back = flameMaterial(this.u);
  private readonly frontMaterial = flameMaterial(this.u);
  private readonly backStrip = stripMaterials(this.u, this.back.strength);
  private readonly frontStrip = stripMaterials(this.u, this.frontMaterial.strength);
  private readonly cones: Cone[] = [];
  private sinceFlicker = 0;
  private readonly at = new THREE.Vector3();
  private readonly out = new THREE.Vector3();
  private readonly toCamera = new THREE.Vector3();
  /** Shown now (for the probes). */
  visible = false;
  /** Held still: no flicker, the grain stopped, the bloom's size kept (the flame editor, to judge the shape). */
  held = false;

  /**
   * `turbines`: the ship's turbine nodes, at rest (each cone hangs on the nearest, so it turns with it);
   * `front`: those of the front pair. None found: the cones hang on the ship.
   */
  private constructor(file: FlamesFile, ship: THREE.Object3D, scene: THREE.Scene, turbines: THREE.Object3D[], front: Set<THREE.Object3D>) {
    // Blender's (x, y, z) is the ship's (x, z, -y).
    const p = file.positions;
    const positions = new Float32Array(p.length);
    for (let i = 0; i < p.length; i += 3) positions.set([p[i]!, p[i + 2]!, -p[i + 1]!], i);
    const coneOf = cones(positions.length / 3, file.indices);
    const count = Math.max(...coneOf) + 1;
    // Each turbine's holder: undoes its rest pose, so the cones keep the ship's coordinates and turn with it.
    ship.updateMatrixWorld(true);
    const holders = new Map<THREE.Object3D, THREE.Object3D>();
    const holderOf = (turbine: THREE.Object3D) => {
      let h = holders.get(turbine);
      if (!h) {
        h = new THREE.Group();
        h.name = `flames on ${turbine.name}`;
        h.matrixAutoUpdate = false;
        // The turbine's place in the ship's space (its parents up to the ship), inverted.
        const rest = new THREE.Matrix4().copy(ship.matrixWorld).invert().multiply(turbine.matrixWorld);
        h.matrix.copy(rest.invert());
        turbine.add(h);
        holders.set(turbine, h);
      }
      return h;
    };
    const turbineAt = turbines.map((t) => ship.worldToLocal(t.getWorldPosition(new THREE.Vector3())));
    for (let c = 0; c < count; c++) {
      // The cone's vertices; its nozzle's middle (along = 0).
      const old = new Map<number, number>();
      const nozzle = new THREE.Vector3();
      let nozzles = 0;
      coneOf.forEach((k, i) => {
        if (k !== c) return;
        old.set(i, old.size);
        if (file.along[i] === 0) {
          nozzle.add(new THREE.Vector3(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]));
          nozzles++;
        }
      });
      nozzle.divideScalar(Math.max(1, nozzles));
      // The nozzle's radius (its ring's mean distance from the middle) and the cone's length.
      let radius = 0;
      let coneLength = 0;
      coneOf.forEach((k, i) => {
        if (k !== c) return;
        const r = Math.hypot(positions[3 * i]! - nozzle.x, positions[3 * i + 1]! - nozzle.y, positions[3 * i + 2]! - nozzle.z);
        if (file.along[i] === 0) radius += r / Math.max(1, nozzles);
        else coneLength = Math.max(coneLength, r);
      });
      const pos = new Float32Array(old.size * 3);
      const along = new Float32Array(old.size);
      for (const [i, j] of old) {
        pos.set([positions[3 * i]! - nozzle.x, positions[3 * i + 1]! - nozzle.y, positions[3 * i + 2]! - nozzle.z], 3 * j);
        along[j] = file.along[i]!;
      }
      const indices: number[] = [];
      for (let i = 0; i < file.indices.length; i += 3) if (coneOf[file.indices[i]!] === c) for (let k = 0; k < 3; k++) indices.push(old.get(file.indices[i + k]!)!);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geometry.setAttribute('along', new THREE.BufferAttribute(along, 1));
      geometry.setAttribute('cone', new THREE.Float32BufferAttribute(new Array<number>(old.size).fill(c), 1));
      geometry.setIndex(indices);
      // The nearest turbine.
      let nearest = -1;
      turbineAt.forEach((at, i) => {
        if (nearest < 0 || at.distanceTo(nozzle) < turbineAt[nearest]!.distanceTo(nozzle)) nearest = i;
      });
      const turbine = nearest >= 0 ? turbines[nearest]! : null;
      const isFront = turbine !== null && front.has(turbine);
      const mesh = new THREE.Mesh(geometry, (isFront ? this.frontMaterial : this.back).material);
      mesh.name = `thruster flame ${c}`;
      mesh.position.copy(nozzle);
      mesh.raycast = () => undefined; // nothing aims at it, the camera's tests included
      mesh.visible = false;
      const holder = turbine ? holderOf(turbine) : ship;
      holder.add(mesh);
      const stripGeom = stripGeometry(radius, coneLength, c);
      const strip = (isFront ? this.frontStrip : this.backStrip).map((material, i) => {
        const m = new THREE.Mesh(stripGeom, material);
        m.name = `thruster flame ${c} ${i ? 'core' : 'strip'}`;
        m.position.copy(nozzle);
        m.frustumCulled = false; // placed in the shader
        m.renderOrder = i ? 6 : 5; // the core over the flame
        m.raycast = () => undefined;
        m.visible = false;
        holder.add(m);
        return m;
      });
      const g = glowMaterial();
      const sprite = new THREE.Sprite(g.material);
      sprite.name = `thruster glow ${c}`;
      sprite.visible = false;
      sprite.raycast = () => undefined;
      scene.add(sprite);
      this.cones.push({ mesh, strip, front: isFront, radius, glow: { ...g, sprite, size: 1, target: 1 } });
    }
  }

  /** The cones, hung on the ship's turbines (`turbines`, at rest; `front`: the front pair's). */
  static async load(ship: THREE.Object3D, scene: THREE.Scene, turbines: THREE.Object3D[] = [], front: THREE.Object3D[] = []): Promise<ThrusterFlames> {
    const response = await fetch(URL);
    if (!response.ok) throw new Error(`${URL}: ${response.status}`);
    return new ThrusterFlames((await response.json()) as FlamesFile, ship, scene, turbines, new Set(front));
  }

  /** Per rendered frame, after the camera has moved: shown while the ship flies, in exterior cutscenes only
   *  (owner, 2026-10-23; `exterior`: one is playing). `keyed`: the cutscene's flames, standing in for the flying. */
  update(dt: number, exterior: boolean, keyed: KeyedFlames | null, camera: THREE.PerspectiveCamera, drawingHeight = innerHeight * devicePixelRatio): void {
    dt = Math.max(0, dt);
    this.visible = exterior && (keyed !== null ? keyed.strength > 0 : settings.shipFlying) && settings.thrusterFlames;
    const glowing = this.visible && keyed !== null && keyed.glow > 0 && settings.thrusterGlow;
    const cones = settings.thrusterFlameCones;
    for (const c of this.cones) {
      c.mesh.visible = this.visible && cones;
      for (const m of c.strip) m.visible = this.visible && !cones;
      c.glow.sprite.visible = glowing;
    }
    if (!this.visible) return;
    const strength = settings.thrusterFlameStrength * (keyed?.strength ?? 1);
    this.back.strength.value = strength;
    this.frontMaterial.strength.value = strength * (keyed?.front ?? 1);
    this.u.color.value.set(settings.thrusterFlameColor);
    this.u.fade.value = settings.thrusterFlameFade;
    this.u.grain.value = settings.thrusterFlameGrain;
    this.u.grainSize.value = settings.thrusterFlameGrainSize;
    this.u.speed.value = this.held ? 0 : settings.thrusterFlameSpeed;
    this.u.flicker.value = settings.thrusterFlameFlicker;
    this.u.flickerLength.value = settings.thrusterFlameFlickerLength;
    this.u.flickerRate.value = this.held ? 0 : settings.thrusterFlameFlickerRate;
    const reach = Math.max(0.01, keyed?.reach ?? 1);
    for (const c of this.cones) c.mesh.scale.set(1, 1, reach);
    const u = this.u;
    u.reach.value = reach;
    u.base.value = settings.thrusterFlameBase;
    u.baseOut.value = settings.thrusterFlameBaseOut;
    u.length.value = settings.thrusterFlameLength;
    u.width.value = settings.thrusterFlameWidth;
    u.taper.value = settings.thrusterFlameTaper;
    u.edge.value = Math.max(0.01, settings.thrusterFlameEdge);
    u.coreWidth.value = settings.thrusterFlameCoreWidth;
    u.corePx.value = settings.thrusterFlameCorePx;
    u.coreLength.value = Math.max(0.01, settings.thrusterFlameCoreLength);
    u.coreBright.value = settings.thrusterFlameCoreBrightness;
    u.pixel.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / Math.max(1, drawingHeight);
    if (!glowing || !keyed) return;

    // The bloom: at each nozzle, a little out along its flame and toward the camera by about its nozzle's
    // radius (so its own turbine doesn't cut through it, while an engine in front of the nozzle still
    // hides it: the sprite is depth-tested at that point); its size in its nozzle's radii (it shrinks with distance), flickering now and then.
    this.sinceFlicker += dt;
    const newTarget = !this.held && this.sinceFlicker >= 1 / settings.thrusterGlowFlickerRate;
    if (newTarget) this.sinceFlicker = 0;
    const ease = 1 - Math.exp(-dt * settings.thrusterGlowFlickerRate * 2);
    for (const c of this.cones) {
      const g = c.glow;
      if (newTarget) g.target = 1 + (Math.random() * 2 - 1) * settings.thrusterGlowFlicker;
      g.size += (g.target - g.size) * ease;
      c.mesh.updateWorldMatrix(true, false);
      this.at.set(0, 0, 0).applyMatrix4(c.mesh.matrixWorld);
      this.out.set(0, 0, -1).transformDirection(c.mesh.matrixWorld);
      this.at.addScaledVector(this.out, (c.front ? settings.thrusterGlowOutFront : settings.thrusterGlowOut) * reach);
      this.toCamera.copy(camera.position).sub(this.at);
      const distance = this.toCamera.length();
      const toward = Math.min(settings.thrusterGlowTowardRadii * c.radius, distance * 0.5);
      this.at.addScaledVector(this.toCamera, toward / Math.max(distance, 1e-6));
      g.sprite.position.copy(this.at);
      const share = c.front ? settings.thrusterGlowFront : 1;
      // Grows a little with the flames' strength (a brighter source blooms wider).
      const flare = Math.sqrt(Math.min(2, keyed.strength * (c.front ? keyed.front : 1)));
      g.sprite.scale.setScalar(settings.thrusterGlowRadii * c.radius * share * flare * g.size);
      g.core.value.set(settings.thrusterGlowCoreColor);
      g.halo.value.set(settings.thrusterGlowHaloColor);
      g.coreSize.value = settings.thrusterGlowCore;
      g.haloLevel.value = settings.thrusterGlowHalo;
      // As bright on both pairs (the front ones are smaller, not dimmer: against the sky a dim one vanished).
      g.level.value = keyed.glow * Math.min(1, keyed.strength) * (0.85 + 0.15 * g.size);
    }
  }
}

/** Each vertex's cone (0, 1, 2…): the mesh's connected parts, in the order they're met. */
function cones(count: number, indices: number[]): number[] {
  const parent = Array.from({ length: count }, (_, i) => i);
  const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i]!)));
  for (let i = 0; i < indices.length; i += 3) {
    const a = root(indices[i]!);
    parent[root(indices[i + 1]!)] = a;
    parent[root(indices[i + 2]!)] = a;
  }
  const numbers = new Map<number, number>();
  return parent.map((_, i) => {
    const r = root(i);
    if (!numbers.has(r)) numbers.set(r, numbers.size);
    return numbers.get(r)!;
  });
}
