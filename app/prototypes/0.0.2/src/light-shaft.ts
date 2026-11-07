// The temple's light shaft and its bloom, painted in (no post-processing; owner, 2026-11-07,
// doc/plans/features/temple.md pass 2; decision log *The temple's glow painted in*). Three parts, not
// writing depth, drawn in the shaft's colour (the file's Blackbody, 1,500 K, turned
// into a colour by the export: `glowColor`):
// - **the core:** a ribbon on the shaft's axis turned about the vertical to face the camera, the
//   file's width (owner: kept), never drawn under `shaftCorePx` pixels across, so it doesn't break up
//   at 200 m (the file's 15 cm is under a pixel from the ship); opaque, a little yellower than the glow,
//   drawn over it;
// - **the glow:** the same, `shaftGlowPx` pixels across (bloom's width is the screen's, near or far)
//   and at least `shaftGlowMin` metres, bright along the axis with a long faint tail;
// - **the flare:** a camera-facing card low in the temple, round, sized in pixels too.
// All three are orange laid over what's behind (normal blending, see-through by their shape), not
// added: added to the bright blue sky, orange came out pink-white and the core pure white (tried,
// 2026-11-07), and the Blackbody's tint was lost.
// From the floor up to `shaftHeight` metres (2,500: the top seen at 85° from the ship), faded out over
// its top third so there's never an end to see. **The haze fades it** (owner: fine) as the scene's
// fog would, toward nothing instead of toward the haze's colour (it adds light). And **a point light**
// inside the temple in the same colour, really bright (owner), added to the outside's light list
// (Treadmill.addOutsideLight): it lights the stone, the steps and the ice round it; no shadow.

import * as THREE from 'three/webgpu';
import { attribute, cameraPosition, cross, exp, float, length, max, min, normalize, positionView, positionWorld, smoothstep, uniform, uv, vec3, vec4 } from 'three/tsl';
import { settings } from './settings';

/** Rows of the ribbons along the height (the fade and the haze are worked out per pixel). */
const ROWS = 32;

/** A ribbon from the axis's foot `height` metres up, `side` -1..1 across, `t` 0..1 along. */
function ribbonGeometry(): THREE.BufferGeometry {
  const sides: number[] = [];
  const along: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= ROWS; r++) {
    const t = r / ROWS;
    for (const s of [-1, 1]) {
      sides.push(s);
      along.push(t);
      uvs.push((s + 1) / 2, t);
    }
    if (r < ROWS) {
      const i = r * 2;
      indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Array(sides.length * 3).fill(0), 3));
  g.setAttribute('side', new THREE.Float32BufferAttribute(sides, 1));
  g.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return g;
}

export class LightShaft {
  readonly group = new THREE.Group();
  readonly light: THREE.PointLight;
  private readonly foot = uniform(new THREE.Vector3());
  private readonly height = uniform(2500);
  /** World size of one pixel at 1 m from the camera (2 tan(fov / 2) / the drawing's height). */
  private readonly pixel = uniform(0.001);
  private readonly hazeNear = uniform(500);
  private readonly hazeFar = uniform(3000);
  private readonly colour = uniform(new THREE.Vector3(1, 1, 1));
  private readonly coreHalf = uniform(0.075);
  private readonly corePx = uniform(2);
  private readonly coreLevel = uniform(3);
  private readonly glowPx = uniform(60);
  private readonly glowMin = uniform(3);
  private readonly glowLevel = uniform(1.5);
  private readonly flareLevel = uniform(1);
  private readonly flare: THREE.Sprite;
  private readonly flareFoot = new THREE.Vector3();
  private readonly flareMin: number;

  /**
   * @param foot the shaft's foot (world), on the temple's floor
   * @param width the shaft's width in the file, times the temple's scale (m)
   * @param colour the Blackbody's colour (linear, brightest channel 1)
   * @param size the temple's width (m): where the flare and the light go, and the flare's least size
   */
  constructor(foot: THREE.Vector3, width: number, colour: THREE.Color, size: number) {
    this.foot.value.copy(foot);
    this.coreHalf.value = width / 2;
    this.colour.value.set(colour.r, colour.g, colour.b);
    const geometry = ribbonGeometry();
    const core = new THREE.Mesh(geometry, this.ribbon(true));
    const glow = new THREE.Mesh(geometry, this.ribbon(false));
    for (const m of [glow, core]) {
      m.frustumCulled = false; // placed in the shader
      m.renderOrder = m === core ? 11 : 10; // the core over the glow
      this.group.add(m);
    }
    // The flare: a round card a little above the floor (in front of the plinth's top).
    this.flareFoot.copy(foot).setY(foot.y + size * 0.12);
    this.flareMin = size * 0.5;
    const r = length(uv().sub(0.5)).mul(2);
    const flareMaterial = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, fog: false });
    flareMaterial.toneMapped = false;
    const shape = float(1).sub(smoothstep(0, 1, r)).pow(3);
    flareMaterial.colorNode = vec4(this.colour.mul(shape.add(1)), min(shape.mul(this.flareLevel).mul(this.hazeFade()), 1));
    this.flare = new THREE.Sprite(flareMaterial);
    this.flare.position.copy(this.flareFoot);
    this.flare.renderOrder = 12;
    this.group.add(this.flare);
    // The light, a third of the way up the temple, inside it.
    this.light = new THREE.PointLight(colour, settings.templeLight, settings.templeLightRange, 2);
    this.light.position.copy(foot).setY(foot.y + size * 0.3);
    this.light.castShadow = false;
    this.group.add(this.light);
  }

  /** The fog's share faded out (as three's range fog, by depth), toward nothing: the shaft adds light. */
  private hazeFade(): THREE.Node<'float'> {
    return float(1).sub(smoothstep(this.hazeNear, this.hazeFar, positionView.z.negate()));
  }

  private ribbon(isCore: boolean): THREE.MeshBasicNodeMaterial {
    const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
    material.toneMapped = false;
    const side = attribute<'float'>('side');
    const t = attribute<'float'>('along');
    // The ribbon's half-width at a point of the axis: its least in metres, or so many pixels there.
    const halfAt = (axis: THREE.Node<'vec3'>) => {
      const px = length(cameraPosition.sub(axis)).mul(this.pixel); // one pixel there (m)
      return isCore ? max(this.coreHalf, px.mul(this.corePx).mul(0.5)) : max(this.glowMin, px.mul(this.glowPx).mul(0.5));
    };
    const axis = this.foot.add(vec3(0, t.mul(this.height), 0));
    const across = normalize(cross(vec3(0, 1, 0), cameraPosition.sub(axis)));
    material.positionNode = axis.add(across.mul(side.mul(halfAt(axis))));
    // Across: 0 on the axis, 1 at the ribbon's edge, worked out per pixel from where it is: the uv,
    // interpolated over the tapered rows' triangles, skewed the glow off the vertical (2026-11-07).
    const p = positionWorld;
    const u = min(length(p.xz.sub(this.foot.xz)).div(halfAt(vec3(this.foot.x, p.y, this.foot.z))), 1);
    const height = p.y.sub(this.foot.y).div(this.height);
    const top = float(1).sub(smoothstep(0.66, 1, height)); // faded over its top third
    if (isCore) {
      // The colour, a little hotter (yellower) in the middle, soft at its edges.
      const shape = float(1).sub(smoothstep(0.5, 1, u));
      material.colorNode = vec4(this.colour.add(vec3(0, 0.3, 0.08)), min(shape.mul(this.coreLevel).mul(top).mul(this.hazeFade()), 1));
    } else {
      // Bloom's fall-off: a bright narrow part and a long faint tail, nothing at the edge.
      const edge = float(1).sub(u).pow(2);
      const shape = exp(u.mul(u).mul(-40)).mul(0.7).add(float(1).div(u.mul(u).mul(60).add(1)).mul(0.3)).mul(edge);
      // Brighter toward the axis (up to twice the colour: yellower), as opaque as `glowLevel` says.
      material.colorNode = vec4(this.colour.mul(shape.add(1)), min(shape.mul(this.glowLevel).mul(top).mul(this.hazeFade()), 1));
    }
    return material;
  }

  /** Each frame: the camera's pixel size, the haze, the panel's settings; the flare's size in pixels. */
  update(camera: THREE.PerspectiveCamera, drawingHeight: number, fog: THREE.Fog | null): void {
    const pixel = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / Math.max(1, drawingHeight);
    this.pixel.value = pixel;
    this.hazeNear.value = fog ? fog.near : 1e6;
    this.hazeFar.value = fog ? fog.far : 1e6 + 1;
    this.height.value = settings.shaftHeight;
    this.corePx.value = settings.shaftCorePx;
    this.coreLevel.value = settings.shaftCoreStrength;
    this.glowPx.value = settings.shaftGlowPx;
    this.glowMin.value = settings.shaftGlowMin;
    this.glowLevel.value = settings.shaftGlowStrength;
    this.flareLevel.value = settings.shaftFlareStrength;
    const d = camera.getWorldPosition(new THREE.Vector3()).distanceTo(this.flareFoot);
    this.flare.scale.setScalar(Math.max(this.flareMin, d * pixel * settings.shaftFlarePx));
    this.light.intensity = settings.templeLight;
    this.light.distance = settings.templeLightRange;
  }
}
