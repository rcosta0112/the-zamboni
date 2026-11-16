// The scanner's ray (gadgets: the scanner, pass 2; doc/plans/features/gadgets-scanner.md): the file's
// `Scanner Ray` (a 16-face cone, its apex, the origin, at the lens) drawn with a copy of its material
// `Scanner Ray.001`, shown only while she scans: it fades in and grows out of the lens (scaled from
// its origin), the reverse when she lets go.
//
// The Blender material: a Principled BSDF, emission colour = base colour (0.8, 0, 0.258, linear);
// **emission strength** a 4D noise (FBM, scale 2, no detail, on the Generated coordinates, its W driven
// by `frame / 20`: 1.2 a second at 24 fps) mapped 0..1 → 1..10; **alpha** a ramp on the Generated Y
// (along the cone: 1 at the lens, 0 at the far end) from 0 at 0.159 to 0.2075 at 1 (raised in the game to 0.7 at the lens: owner, 2026-11-16). Blended.
// Copied as: three's TSL noise is 3D only, so the noise drifts through 3D (its W added to the
// coordinates) instead of changing in place; the lit part (base colour, roughness 1) left out (next to
// the emission it barely shows). Drawn as Blender mixes it: what's behind × (1 − alpha) + the emission
// × alpha (premultiplied; ONE, ONE_MINUS_SRC_ALPHA), so the strength's 1..10 shows as it does there
// (tone mapping rolls off the brightest). `scannerRayStrength` scales it (panel *Scanner*).

import * as THREE from 'three/webgpu';
import { clamp, float, mx_noise_float, positionGeometry, time, uniform, vec3, vec4 } from 'three/tsl';
import { settings } from './settings';

/** The file's colour (linear). */
const COLOUR = new THREE.Vector3(0.8, 0, 0.2579);
/** The alpha ramp: 0 below this along the cone (from the far end), up to ALPHA_MAX at the lens. */
const RAMP_FROM = 0.1591;
const ALPHA_MAX = 0.7; // owner, 2026-11-16 (the file's ramp ends at 0.2075)
/** The noise's W a second: the driver's frame / 20 at 24 fps. */
const W_RATE = 24 / 20;

export class ScannerRay {
  /** 0 hidden … 1 shown (the scan's share, eased): its size and fade. */
  amount = 0;
  private readonly appear = uniform(0);
  private readonly strength = uniform(1);
  private readonly baseScale: THREE.Vector3;
  /** From the lens out along the cone, in the object's own axes (unit): where it points (scanner pass 3). */
  readonly axis = new THREE.Vector3(0, 0, -1);

  constructor(readonly object: THREE.Object3D) {
    this.baseScale = object.scale.clone();
    object.visible = false;
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = this.material(mesh.geometry);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = 2; // after her and the see-through
    });
  }

  /** The cone's Generated coordinates (its bounding box, 0..1 on each axis), and how far along it from the far end (1 at the lens). */
  private material(geometry: THREE.BufferGeometry): THREE.MeshBasicNodeMaterial {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const size = box.getSize(new THREE.Vector3());
    // The cone's length is its longest axis; the lens (the apex, at the origin) is the end nearer 0.
    const axis = size.x >= size.y && size.x >= size.z ? 0 : size.y >= size.z ? 1 : 2;
    const lo = box.min.getComponent(axis);
    const hi = box.max.getComponent(axis);
    const lensAtMax = Math.abs(hi) < Math.abs(lo);
    this.axis.set(0, 0, 0).setComponent(axis, lensAtMax ? -1 : 1);
    const p = positionGeometry;
    const generated = p.sub(vec3(box.min.x, box.min.y, box.min.z)).div(vec3(Math.max(size.x, 1e-6), Math.max(size.y, 1e-6), Math.max(size.z, 1e-6)));
    const along = [generated.x, generated.y, generated.z][axis]!;
    const toLens = lensAtMax ? along : float(1).sub(along);
    const alpha = clamp(toLens.sub(RAMP_FROM).div(1 - RAMP_FROM), 0, 1).mul(ALPHA_MAX).mul(this.appear);
    const w = time.mul(W_RATE);
    const fac = clamp(mx_noise_float(generated.mul(2).add(vec3(w, w.mul(0.6), w.mul(-0.8)))).mul(0.5).add(0.5), 0, 1);
    const emission = fac.mul(9).add(1).mul(this.strength); // Map Range 0..1 → 1..10
    const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
    material.blending = THREE.CustomBlending;
    material.blendSrc = THREE.OneFactor;
    material.blendDst = THREE.OneMinusSrcAlphaFactor; // premultiplied here, in the colour (not `premultipliedAlpha`: that multiplies again)
    material.blendSrcAlpha = THREE.ZeroFactor;
    material.blendDstAlpha = THREE.OneFactor;
    material.colorNode = vec4(vec3(COLOUR.x, COLOUR.y, COLOUR.z).mul(emission).mul(alpha), alpha);
    material.name = 'Scanner Ray (game)';
    return material;
  }

  /** Called every rendered frame with the scan's share (0..1, `Gadgets.scan`). */
  update(scan: number): void {
    this.amount = THREE.MathUtils.clamp(scan, 0, 1);
    const eased = this.amount * this.amount * (3 - 2 * this.amount);
    this.object.visible = eased > 0.001;
    this.object.scale.copy(this.baseScale).multiplyScalar(Math.max(0.001, eased));
    this.appear.value = eased;
    this.strength.value = settings.scannerRayStrength;
  }
}
