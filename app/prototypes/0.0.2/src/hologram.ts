// The temple's hologram (owner, 2026-11-08; doc/plans/features/temple-hologram.md): the file's
// `Temple Hologram` drawn with a copy of its *Hologram* material, hidden until the plinth's prompt
// (landmarks.ts) turns it on; it fades in, and out again when turned off.
//
// The Blender material, two layers added:
// 1. **Scan lines over a rim glow.** A Wave texture (Bands along X, sine) on Window coordinates, the
//    Mapping turned 90° and scaled 20, the Wave's scale 5: n = 2,000 × the screen's height fraction,
//    one stripe every 2π: about 318 stripes per screen height, fixed to the screen (owner). Off a
//    stripe: see-through, grey 0.57. On a stripe: a Fresnel (IOR 1.04) mixes see-through 0.57 + a
//    blue glass (facing) with blue emission × 10 (grazing: a thin rim).
// 2. **The crease glow:** AO over 2 mm picks the same emission in creases, see-through 0.32
//    elsewhere. At 2 mm it's 0.32 almost everywhere: kept as a flat 0.32, the crease glow dropped.
//
// Drawn as Blender adds Transparent and Emission: what's behind times the see-through grey, plus the
// emission (blending ONE, ONE_MINUS_SRC_ALPHA; alpha = 1 − the grey). The glass (it lets through and
// adds a blue tint of what's behind, more than the grey's share) can't be per channel with alpha
// blending: it's a faint blue added (`hologramGlass`), the scalar part in the grey.
// The mesh sits 2.5 mm inside the ruins (the file's Displace, applied by the export) so the ruins win
// where they meet; at 200 m the depth buffer can't tell 2.5 mm apart, so it's also pushed back a
// little in depth (a polygon offset). No light, no fog, no shadows, no collider.

import * as THREE from 'three/webgpu';
import { abs, dot, float, frontFacing, max, mix, normalView, positionViewDirection, screenUV, select, sin, sqrt, uniform, vec3, vec4 } from 'three/tsl';
import { settings } from './settings';

/** The emission's colour (linear), the file's (both Emission nodes). */
const EMISSION = new THREE.Vector3(0, 0.1784, 0.4793);
/** The glass's colour (linear), the file's. */
const GLASS = new THREE.Vector3(0.1541, 0.2748, 0.4793);
/** The see-through greys: the rim layer's and the crease layer's. */
const SEE_THROUGH_A = 0.5705;
const SEE_THROUGH_B = 0.3249;

export class Hologram {
  /** 0 hidden … 1 fully shown (eased); the probe reads it. */
  amount = 0;
  /** Turned on (it fades toward it). */
  on = false;
  private linear = 0;
  private readonly appear = uniform(0);
  private readonly strength = uniform(10);
  private readonly stripes = uniform(318);
  private readonly ior = uniform(1.04);
  private readonly glass = uniform(0.3);

  constructor(readonly mesh: THREE.Mesh) {
    mesh.material = this.material();
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.visible = false;
    mesh.renderOrder = 1; // after the stone and the ground, among the see-through
  }

  toggle(): void {
    this.on = !this.on;
  }

  /** Each frame: the fade, the panel's settings. */
  update(dt: number): void {
    const seconds = Math.max(settings.hologramFadeSeconds, 1e-3);
    this.linear = THREE.MathUtils.clamp(this.linear + (this.on ? dt : -dt) / seconds, 0, 1);
    this.amount = this.linear * this.linear * (3 - 2 * this.linear);
    this.appear.value = this.amount;
    this.mesh.visible = this.amount > 0;
    this.strength.value = settings.hologramStrength;
    this.stripes.value = settings.hologramStripes;
    this.ior.value = settings.hologramRimIor;
    this.glass.value = settings.hologramGlass;
  }

  private material(): THREE.MeshBasicNodeMaterial {
    const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
    material.name = 'Hologram';
    material.blending = THREE.CustomBlending;
    material.blendEquation = THREE.AddEquation;
    material.blendSrc = THREE.OneFactor;
    material.blendDst = THREE.OneMinusSrcAlphaFactor;
    material.blendSrcAlpha = THREE.ZeroFactor;
    material.blendDstAlpha = THREE.OneFactor;
    material.polygonOffset = true;
    material.polygonOffsetFactor = 2;
    material.polygonOffsetUnits = 4;
    // The stripes: Blender's sine bands, 0.5 + 0.5 sin(n − π/2), one every 2π.
    const n = screenUV.y.mul(this.stripes).mul(Math.PI * 2);
    const wave = sin(n.sub(Math.PI / 2)).mul(0.5).add(0.5);
    // Blender's Fresnel (the exact dielectric one), the IOR flipped on the back faces.
    const c = abs(dot(normalView, positionViewDirection)).clamp(0, 1);
    const eta = select(frontFacing, this.ior, float(1).div(this.ior));
    const fresnel = this.fresnel(c, eta);
    const onStripe = wave;
    const rim = onStripe.mul(fresnel);
    const facing = onStripe.mul(float(1).sub(fresnel));
    // What's behind lets through: the rim layer's grey where it isn't rim, plus the crease layer's.
    const through = float(SEE_THROUGH_A).mul(float(1).sub(rim)).add(SEE_THROUGH_B);
    const emission = vec3(EMISSION.x, EMISSION.y, EMISSION.z).mul(this.strength).mul(rim).add(vec3(GLASS.x, GLASS.y, GLASS.z).mul(this.glass).mul(facing));
    const shownThrough = mix(float(1), through.clamp(0, 1), this.appear);
    material.colorNode = vec4(emission.mul(this.appear), float(1).sub(shownThrough));
    return material;
  }

  /** The exact dielectric Fresnel (Blender's `fresnel_dielectric_cos`); total reflection gives 1. */
  private fresnel(c: THREE.Node<'float'>, eta: THREE.Node<'float'>): THREE.Node<'float'> {
    const g2 = eta.mul(eta).sub(1).add(c.mul(c));
    const g = sqrt(max(g2, 0));
    const a = g.sub(c).div(g.add(c));
    const b = c.mul(g.add(c)).sub(1).div(c.mul(g.sub(c)).add(1));
    return select(g2.greaterThan(0), a.mul(a).mul(0.5).mul(b.mul(b).add(1)), float(1));
  }
}
