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

//
// Changed from the file (owner, 2026-11-08, "almost invisible against the blue sky"): **cyan**
// (`hologramColour`, the emission's; the glass is it mixed a third toward white), 180 stripes, rim IOR
// 1.1; a **scan band** sweeping up through it (`hologramBand*`: a brighter band in world height, its
// path from just under the mesh to just over it); a **painted glow** (no bloom in the game): a shell of
// the mesh pushed out along smoothed normals, so many pixels wide (at least `hologramGlowMin` m), its
// back faces laid over what's behind as a ring round the outline. The stone hides it where it's in
// front, so over the ruins it shows only round the hologram's edge.

import * as THREE from 'three/webgpu';
import { abs, cameraPosition, dot, float, frontFacing, length, max, mix, modelWorldMatrix, normalLocal, normalView, positionGeometry, positionLocal, positionViewDirection, positionWorld, screenUV, select, sin, smoothstep, sqrt, uniform, vec3, vec4 } from 'three/tsl';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { settings } from './settings';
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
  private readonly colour = uniform(new THREE.Vector3(0, 0.78, 1));
  private readonly colourTemp = new THREE.Color();
  /** The scan band: its centre's height (world, m), half its height (m), its strength. */
  private readonly bandAt = uniform(0);
  private readonly bandHalf = uniform(0.75);
  private readonly bandLevel = uniform(2);
  private bandPhase = 0;
  private readonly bounds = new THREE.Box3();
  /** The painted glow: one pixel's size at 1 m (2 tan(fov / 2) / the drawing's height), its width. */
  private readonly pixel = uniform(0.001);
  private readonly glowPx = uniform(24);
  private readonly glowMin = uniform(0.3);
  private readonly glowLevel = uniform(0.6);
  private readonly glowSoft = uniform(0.35);
  /** The mesh's world scale: the shell is pushed out in the mesh's own units. */
  private readonly worldScale = uniform(1);
  private readonly scaleTemp = new THREE.Vector3();
  /** The painted glow's shell (a child of the mesh: shown and hidden with it). */
  readonly glow: THREE.Mesh;

  constructor(readonly mesh: THREE.Mesh) {
    mesh.material = this.material();
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.visible = false;
    mesh.renderOrder = 1; // after the stone and the ground, among the see-through
    this.glow = new THREE.Mesh(this.shellGeometry(mesh.geometry), this.glowMaterial());
    this.glow.name = 'Hologram glow';
    this.glow.castShadow = false;
    this.glow.receiveShadow = false;
    this.glow.renderOrder = 0; // before the hologram's own drawing
    this.glow.frustumCulled = false; // pushed out past the mesh's bounds
    mesh.add(this.glow);
  }

  toggle(): void {
    this.on = !this.on;
  }

  /** Each frame: the fade, the scan band, the glow's pixel size, the panel's settings. */
  update(camera: THREE.PerspectiveCamera, drawingHeight: number, dt: number): void {
    const seconds = Math.max(settings.hologramFadeSeconds, 1e-3);
    this.linear = THREE.MathUtils.clamp(this.linear + (this.on ? dt : -dt) / seconds, 0, 1);
    this.amount = this.linear * this.linear * (3 - 2 * this.linear);
    this.appear.value = this.amount;
    this.mesh.visible = this.amount > 0;
    this.strength.value = settings.hologramStrength;
    this.stripes.value = settings.hologramStripes;
    this.ior.value = settings.hologramRimIor;
    this.glass.value = settings.hologramGlass;
    const linear = this.colourTemp.set(settings.hologramColour); // a hex string is sRGB: set() makes it linear
    this.colour.value.set(linear.r, linear.g, linear.b);
    // The scan band: from just under the mesh to just over it, then again.
    this.bandPhase = (this.bandPhase + Math.max(0, dt) / Math.max(settings.hologramBandSeconds, 0.1)) % 1;
    this.bandHalf.value = settings.hologramBandHeight / 2;
    this.bandLevel.value = settings.hologramBandStrength;
    if (this.mesh.visible) {
      this.bounds.setFromObject(this.mesh);
      const low = this.bounds.min.y - this.bandHalf.value;
      const high = this.bounds.max.y + this.bandHalf.value;
      this.bandAt.value = low + (high - low) * this.bandPhase;
    }
    this.pixel.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / Math.max(1, drawingHeight);
    this.glowPx.value = settings.hologramGlowPx;
    this.glowMin.value = settings.hologramGlowMin;
    this.glowLevel.value = settings.hologramGlowStrength;
    this.glowSoft.value = settings.hologramGlowSoftness;
    this.worldScale.value = Math.max(1e-6, this.mesh.getWorldScale(this.scaleTemp).x);
    this.glow.visible = settings.hologramGlowStrength > 0;
  }

  /** The glow's shell: the mesh's positions welded, with smoothed normals to push them out along (a flat-shaded mesh pushed out along its own normals would crack at every edge). */
  private shellGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
    const bare = new THREE.BufferGeometry();
    // Copied out to plain floats: the file's positions are packed (Meshopt: interleaved, quantised).
    const packed = source.getAttribute('position');
    const plain = new Float32Array(packed.count * 3);
    for (let i = 0; i < packed.count; i++) plain.set([packed.getX(i), packed.getY(i), packed.getZ(i)], i * 3);
    bare.setAttribute('position', new THREE.BufferAttribute(plain, 3));
    if (source.index) bare.setIndex(source.index);
    const welded = mergeVertices(bare, 1e-4);
    welded.computeVertexNormals();
    return welded;
  }

  /** The painted glow: the shell's back faces laid over what's behind, a ring round the outline. */
  private glowMaterial(): THREE.MeshBasicNodeMaterial {
    const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.BackSide });
    material.name = 'Hologram glow';
    const world = modelWorldMatrix.mul(vec4(positionGeometry, 1)).xyz;
    const widthWorld = max(this.glowMin, length(cameraPosition.sub(world)).mul(this.pixel).mul(this.glowPx));
    material.positionNode = positionLocal.add(normalLocal.mul(widthWorld.div(this.worldScale)));
    // A ring round the outline: 0 where the shell's edge is seen side-on, full a little in (`glowSoft`),
    // gone again further in, so it doesn't wash over the hologram itself (tried: a flat pale block that
    // hid the stripes). Laid over what's behind, not added: added to the bright sky, cyan came out white.
    const c = abs(dot(normalView, positionViewDirection)).clamp(0, 1);
    const shape = smoothstep(0, this.glowSoft, c).mul(float(1).sub(smoothstep(this.glowSoft, this.glowSoft.mul(2.5), c)));
    material.colorNode = vec4(this.colour, shape.mul(this.glowLevel).mul(this.appear).clamp(0, 1));
    return material;
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
    // The scan band: 1 at its centre, 0 half its height off it; it lets a little less through.
    const band = float(1).sub(smoothstep(0, 1, abs(positionWorld.y.sub(this.bandAt)).div(this.bandHalf)));
    const through = float(SEE_THROUGH_A).mul(float(1).sub(rim)).add(SEE_THROUGH_B).mul(float(1).sub(band.mul(0.3)));
    const colour = this.colour;
    const glassColour = mix(colour, vec3(1, 1, 1), 1 / 3);
    const emission = colour.mul(this.strength).mul(rim).add(glassColour.mul(this.glass).mul(facing)).add(colour.mul(this.bandLevel).mul(band));
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
