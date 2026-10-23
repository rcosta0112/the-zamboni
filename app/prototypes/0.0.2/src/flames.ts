// The thrusters' flames while the ship flies (SC-121), as in the owner's fly-by: a cone behind each
// turbine (`Turbine.004` behind the big ones, `Turbine.005` the small), copied from the fly-by file
// by tools/thruster-flames.py. Its *Thruster 2* material, unlit: a pale yellow glow, opaque at the
// nozzle and faded out along the cone, dimmed by a fine grain that runs back along it. Additive, so
// the glass and the haze don't sort against it. A child of the ship: it sways with it in cutscenes.
// In exterior cutscenes only (owner, 2026-10-23): not from inside the ship.

import * as THREE from 'three/webgpu';
import { attribute, float, mix, mx_noise_float, positionLocal, select, time, uniform, vec3 } from 'three/tsl';
import { settings } from './settings';

const URL = '/ship/thruster-flames.json';

type FlamesFile = { positions: number[]; along: number[]; indices: number[] };

export class ThrusterFlames {
  readonly mesh: THREE.Mesh;
  private readonly color = uniform(new THREE.Color());
  private readonly strength = uniform(1);
  private readonly fade = uniform(0.6);
  private readonly grain = uniform(0.5);
  private readonly grainSize = uniform(0.08);
  private readonly speed = uniform(20);

  private constructor(file: FlamesFile) {
    // Blender's (x, y, z) is the ship's (x, z, -y).
    const p = file.positions;
    const positions = new Float32Array(p.length);
    for (let i = 0; i < p.length; i += 3) positions.set([p[i]!, p[i + 2]!, -p[i + 1]!], i);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('along', new THREE.Float32BufferAttribute(file.along, 1));
    geometry.setIndex(file.indices);

    // The fly-by's alpha ramp: 1 at the nozzle, 0.033 at `fade`, nothing at the cone's end.
    const s = attribute<'float'>('along', 'float');
    const alpha = select(s.lessThan(this.fade), mix(float(1), float(0.033), s.div(this.fade)), mix(float(0.033), float(0), s.sub(this.fade).div(float(1).sub(this.fade))));
    // The grain, running back along the flame (the ship's -z).
    const at = positionLocal.div(this.grainSize).add(vec3(0, 0, time.mul(this.speed).div(this.grainSize)));
    const grain = float(1).sub(this.grain.mul(mx_noise_float(at).mul(0.5).add(0.5)));
    const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    material.colorNode = this.color.mul(this.strength).mul(alpha).mul(grain);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'thruster flames';
    this.mesh.raycast = () => undefined; // nothing aims at it, the camera's tests included
    this.mesh.visible = false;
  }

  /** The cones, added to the ship's object (its own space). */
  static async load(ship: THREE.Object3D): Promise<ThrusterFlames> {
    const response = await fetch(URL);
    if (!response.ok) throw new Error(`${URL}: ${response.status}`);
    const flames = new ThrusterFlames((await response.json()) as FlamesFile);
    ship.add(flames.mesh);
    return flames;
  }

  /** Per frame: shown while the ship flies, in exterior cutscenes only (owner, 2026-10-23; `exterior`: one is playing). */
  update(exterior: boolean): void {
    this.mesh.visible = exterior && settings.shipFlying && settings.thrusterFlames;
    if (!this.mesh.visible) return;
    this.color.value.set(settings.thrusterFlameColor);
    this.strength.value = settings.thrusterFlameStrength;
    this.fade.value = settings.thrusterFlameFade;
    this.grain.value = settings.thrusterFlameGrain;
    this.grainSize.value = settings.thrusterFlameGrainSize;
    this.speed.value = settings.thrusterFlameSpeed;
  }
}
