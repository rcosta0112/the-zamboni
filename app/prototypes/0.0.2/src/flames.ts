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
// halo, a camera-facing sprite a share of the screen's height, flaring with the flames' strength.

import * as THREE from 'three/webgpu';
import { attribute, float, length, mix, mx_noise_float, positionLocal, saturate, select, smoothstep, time, uniform, uv, vec2, vec3, vec4 } from 'three/tsl';
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
  mesh: THREE.Mesh;
  front: boolean;
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
  };
  private readonly back = flameMaterial(this.u);
  private readonly frontMaterial = flameMaterial(this.u);
  private readonly cones: Cone[] = [];
  private sinceFlicker = 0;
  private readonly at = new THREE.Vector3();
  private readonly out = new THREE.Vector3();
  private readonly toCamera = new THREE.Vector3();
  /** Shown now (for the probes). */
  visible = false;

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
      (turbine ? holderOf(turbine) : ship).add(mesh);
      const g = glowMaterial();
      const sprite = new THREE.Sprite(g.material);
      sprite.name = `thruster glow ${c}`;
      sprite.visible = false;
      sprite.raycast = () => undefined;
      scene.add(sprite);
      this.cones.push({ mesh, front: isFront, glow: { ...g, sprite, size: 1, target: 1 } });
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
  update(dt: number, exterior: boolean, keyed: KeyedFlames | null, camera: THREE.PerspectiveCamera): void {
    dt = Math.max(0, dt);
    this.visible = exterior && (keyed !== null ? keyed.strength > 0 : settings.shipFlying) && settings.thrusterFlames;
    const glowing = this.visible && keyed !== null && keyed.glow > 0 && settings.thrusterGlow;
    for (const c of this.cones) {
      c.mesh.visible = this.visible;
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
    this.u.speed.value = settings.thrusterFlameSpeed;
    this.u.flicker.value = settings.thrusterFlameFlicker;
    this.u.flickerLength.value = settings.thrusterFlameFlickerLength;
    this.u.flickerRate.value = settings.thrusterFlameFlickerRate;
    const reach = Math.max(0.01, keyed?.reach ?? 1);
    for (const c of this.cones) c.mesh.scale.set(1, 1, reach);
    if (!glowing || !keyed) return;

    // The bloom: at each nozzle, a little out along its flame and toward the camera (so the turbine
    // doesn't cut through it); a share of the screen's height, flickering now and then.
    this.sinceFlicker += dt;
    const newTarget = this.sinceFlicker >= 1 / settings.thrusterGlowFlickerRate;
    if (newTarget) this.sinceFlicker = 0;
    const ease = 1 - Math.exp(-dt * settings.thrusterGlowFlickerRate * 2);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
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
      const toward = Math.min(settings.thrusterGlowTowardCamera, distance * 0.5);
      this.at.addScaledVector(this.toCamera, toward / Math.max(distance, 1e-6));
      g.sprite.position.copy(this.at);
      const share = c.front ? settings.thrusterGlowFront : 1;
      // Grows a little with the flames' strength (a brighter source blooms wider).
      const flare = Math.sqrt(Math.min(2, keyed.strength * (c.front ? keyed.front : 1)));
      g.sprite.scale.setScalar(settings.thrusterGlowSize * 2 * tanHalf * (distance - toward) * share * flare * g.size);
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
