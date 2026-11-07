// The column of light on the horizon (owner, 2026-11-07): cutscene 3, *What's that?*, the crew see it
// from the air, ahead and a little to the right (where the owner marked it on the opening shot). A
// PLACEHOLDER until the temple's own light shaft (doc/plans/features/temple.md, pass 2) can be shown
// from the air (its SC-162): a vertical ribbon far ahead, turned about the vertical to face the camera
// being drawn, a bright core and a soft glow across it, faded out toward its top; unlit, additive, no
// haze, not writing depth (what's nearer hides it: the cockpit, the crew, the ground below its base).
// Shown only while a watched conversation whose data says `column` plays (main.ts). **It fades in as if
// coming into view** (owner, 2026-11-07): from `FADE_DELAY` after the cutscene starts, over `FADE_TIME`
// (eased), so it's all there by the end of the opening shot's 4 s hold, before Green's *"What's that?"*.

import * as THREE from 'three/webgpu';
import { exp, float, smoothstep, uniform, uv, vec4 } from 'three/tsl';
import { fromBlender } from './commands';

/** Where it stands, from the ship (Blender coordinates, m): 3 km ahead, about 6° right of straight ahead. */
const AT: [number, number, number] = [-315, -2985, 0];
/** From this far under the ship (m: under the ground, which hides its foot) ... */
const BOTTOM = -200;
/** ... to this far above it (m), the top part faded out. */
const TOP = 1500;
/** Its whole width, glow included (m); the core is a share of it. */
const WIDTH = 80;
/** It starts to fade in this long after it's first shown (s)... */
const FADE_DELAY = 1;
/** ...and is all there this long after that (s). */
const FADE_TIME = 2.5;

export class LightColumn {
  readonly mesh: THREE.Mesh;
  private readonly strength = uniform(0);
  /** How long it has been shown (s); back to 0 when hidden. */
  private shownFor = 0;

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.PlaneGeometry(WIDTH, TOP - BOTTOM);
    geometry.translate(0, (TOP + BOTTOM) / 2, 0);
    const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    // Across: 0 at the axis, 1 at the edge. A sharp core and a long faint tail, as bloom falls off.
    const across = uv().x.mul(2).sub(1).abs();
    const core = float(1).sub(smoothstep(0.06, 0.12, across)).mul(3);
    const glow = exp(across.mul(-6)).mul(float(1).sub(across)).mul(0.8);
    // Up: full to 40% of its height, gone at the top.
    const fade = float(1).sub(smoothstep(0.4, 1, uv().y));
    material.colorNode = vec4(vec4(1, 0.97, 0.9, 1).xyz.mul(core.add(glow)).mul(fade).mul(this.strength), 1);
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /** Shown or not; placed from the ship, turned to face the camera (about the vertical). */
  update(dt: number, shown: boolean, ship: THREE.Object3D | null, camera: THREE.Camera): void {
    this.mesh.visible = shown && ship !== null;
    this.shownFor = this.mesh.visible ? this.shownFor + Math.max(0, dt) : 0;
    if (!this.mesh.visible || !ship) return;
    // Cubed: the core is three times white, so a straight fade would look all there from a third of the way.
    this.strength.value = THREE.MathUtils.smoothstep(this.shownFor, FADE_DELAY, FADE_DELAY + FADE_TIME) ** 3;
    ship.localToWorld(this.mesh.position.copy(fromBlender(AT)));
    this.mesh.rotation.set(0, Math.atan2(camera.position.x - this.mesh.position.x, camera.position.z - this.mesh.position.z), 0);
  }
}
