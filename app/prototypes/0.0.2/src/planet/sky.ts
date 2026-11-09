// The star sky behind the planet: the owner's planet.blend world ("Stars"), procedural in TSL (plan:
// doc/plans/features/planet-cinematic.md). As in Blender, on the view direction:
// - two layers of stars (Blender: Voronoi scale 80, a star falling to black at 0.091 of a cell; scale
//   200, at 0.141), one star per cell;
// - each star tinted by a stepped ramp (yellow, red, blue, white);
// - all of it times a large noise × 2 (the patchy brightness), plus a very faint nebula noise.
// Changes:
// - stars keep their size on screen (owner, 2026-11-09): a star's radius is set in pixels (of a
//   1080-line screen), not in angle, so the 9× zoom doesn't make them 9× bigger;
// - they keep their density (owner): the count on screen stays as Blender's at `reference` mm. The cells
//   are 3D and a star shows only where the sky's sphere passes near its point, so a layer twice as fine
//   has 8× the stars on screen: each finer layer (one per doubling of the focal length) keeps a random
//   share of them (1/8 per doubling ahead) and fades in, while the coarser ones stay and spread apart,
//   as in a zoom. Below `reference` mm, the first layer thins out the same way;
// - for speed, a star is looked for in the 8 cells round the pixel (enough for stars under half a cell),
//   not the 27 Voronoi checks; its random values come from a cheap hash, and its colour from one of them
//   (spread like Blender's noise: `tint.spread`) instead of a noise. Layers faded out are skipped.
// The sky is drawn after the planet with the depth test on, so pixels the planet covers cost nothing.

import * as THREE from 'three/webgpu';
import { cameraPosition, clamp, dot, exp2, float, floor, Fn, fract, If, length, max, mix, normalize, positionWorld, uniform, vec3 } from 'three/tsl';
import { fbm, ramp, seedOffset, type ColourStop } from './planet';

export interface SkyPreset {
  seed: number;
  /** The focal length (mm) at which the stars are as many as in Blender (its camera: 50); held at every other. */
  reference: number;
  /** Star layers: cells across the sky's unit sphere (Blender's Voronoi scale), and a star's radius in pixels (of a 1080-line screen). */
  layers: { scale: number; size: number }[];
  /** The stars' colours: a stepped ramp on each star's random value; `spread` < 1 gathers the values round 0.5, as Blender's noise does. */
  tint: { spread: number; stops: ColourStop[] };
  /** The patchy brightness: a noise (0..1) times `strength` (Blender: scale 2.7, × 2). */
  patches: { scale: number; strength: number };
  /** The faint nebula, added: a noise's ramp from black to `colour`. */
  nebula: { scale: number; detail: number; roughness: number; lacunarity: number; from: number; to: number; colour: string };
}

/** Finer layers available: one per doubling of the focal length past `reference` (6: up to 32×). */
const OCTAVES = 6;

type FloatNode = THREE.Node<'float'>;
type Vec3Node = THREE.Node<'vec3'>;

export interface Sky {
  mesh: THREE.Mesh;
  /** Each frame, before rendering: follows the camera, sizes the stars to its lens. */
  update(camera: THREE.PerspectiveCamera): void;
  apply(preset: SkyPreset): void;
  dispose(): void;
}

export function createSky(preset: SkyPreset): Sky {
  const u = {
    seed: uniform(seedOffset(preset.seed, 10)),
    patchSeed: uniform(seedOffset(preset.seed, 12)),
    nebulaSeed: uniform(seedOffset(preset.seed, 13)),
    /** Radians per pixel of a 1080-line screen, from the camera's lens. */
    pixelAngle: uniform(0.000375),
    /** log2(focal length / reference): how many finer layers are in (below 0: the first thins out). */
    level: uniform(0),
    tintSpread: uniform(preset.tint.spread),
    patchScale: uniform(preset.patches.scale),
    patchStrength: uniform(preset.patches.strength),
    nebulaScale: uniform(preset.nebula.scale),
    nebulaDetail: uniform(preset.nebula.detail),
    nebulaRoughness: uniform(preset.nebula.roughness),
    nebulaLacunarity: uniform(preset.nebula.lacunarity),
    nebulaFrom: uniform(preset.nebula.from),
    nebulaTo: uniform(preset.nebula.to),
    nebulaColour: uniform(new THREE.Color(preset.nebula.colour)),
  };
  const layers = preset.layers.map((l) => ({ scale: uniform(l.scale), size: uniform(l.size) }));
  const tintStops = { at: preset.tint.stops.map((s) => uniform(s.at)), value: preset.tint.stops.map((s) => uniform(new THREE.Color(s.colour))) };
  let reference = preset.reference;

  // The view direction in Blender's frame (Three's (x, y, z) is Blender's (x, -z, y)).
  const d = normalize(positionWorld.sub(cameraPosition));
  const dir = vec3(d.x, d.z.negate(), d.y);

  /** Three random values 0..1 for a cell (Dave Hoskins' hash33: no sine, fine for these coordinates). */
  function hash33(cell: Vec3Node): Vec3Node {
    const p3 = fract(cell.mul(vec3(0.1031, 0.103, 0.0973))).toVar();
    p3.addAssign(dot(p3, p3.yxz.add(33.33)));
    return fract(p3.xxy.add(p3.yxx).mul(p3.zyx));
  }

  /**
   * One star per cell, its point anywhere in the cell: the 8 cells round the pixel are enough for a star
   * smaller than half a cell (Voronoi checks 27). A cell keeps its star if its random value is under
   * `keep` (faded over the last 10%, so stars don't pop); its colour from another random value.
   */
  function starLayer(p: Vec3Node, radius: FloatNode, keep: FloatNode): Vec3Node {
    const base = floor(p.sub(0.5));
    let out: Vec3Node = vec3(0);
    for (const o of [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] as const) {
      const cell = base.add(vec3(...o));
      const point = cell.add(hash33(cell));
      const more = hash33(cell.add(71.3));
      const kept = clamp(keep.sub(more.x).div(keep.mul(0.1).add(1e-4)), 0, 1);
      const star = clamp(float(1).sub(length(p.sub(point)).div(max(radius, 1e-5))), 0, 1);
      const value = more.y.sub(0.5).mul(u.tintSpread).add(0.5) as FloatNode;
      out = out.add(ramp<Vec3Node>(value, tintStops, 'constant').mul(star.mul(kept)));
    }
    return out;
  }

  // If() needs a function's body (TSL's stack), hence the Fn.
  const stars = Fn(() => {
    const sum = vec3(0).toVar();
    for (let j = 0; j < OCTAVES; j++) {
      const fine = 2 ** j;
      // Layer j fades in as the level goes from j − 1 to j (layer 0 always), keeping 8^(level − j) of its stars.
      const weight = j === 0 ? float(1) : clamp(u.level.sub(j - 1), 0, 1);
      const keep = clamp(exp2(u.level.sub(j).mul(3)), 0, 1);
      If(weight.greaterThan(0), () => {
        for (const [i, layer] of layers.entries()) {
          const cells = layer.scale.mul(fine);
          const radius = layer.size.mul(u.pixelAngle).mul(cells); // in cells
          sum.addAssign(starLayer(dir.mul(cells).add(u.seed.mul(i + 1 + j * 7)), radius, keep).mul(weight));
        }
      });
    }
    return sum;
  })();

  const patches = (fbm(dir.mul(u.patchScale).add(u.patchSeed), float(0), float(0.5), float(2)) as FloatNode).mul(u.patchStrength);
  const nebulaNoise = fbm(dir.mul(u.nebulaScale).add(u.nebulaSeed), u.nebulaDetail, u.nebulaRoughness, u.nebulaLacunarity) as FloatNode;
  const nebula = mix(vec3(0), u.nebulaColour, clamp(nebulaNoise.sub(u.nebulaFrom).div(max(u.nebulaTo.sub(u.nebulaFrom), 1e-5)), 0, 1));

  const material = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
  material.colorNode = stars.add(nebula).mul(patches);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), material);
  mesh.name = 'Sky';
  mesh.frustumCulled = false;
  mesh.renderOrder = 1000; // after the planet: what it covers fails the depth test

  return {
    mesh,
    update(camera) {
      mesh.position.copy(camera.position);
      const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      u.pixelAngle.value = (2 * halfHeight) / 1080;
      u.level.value = Math.log2(camera.getFocalLength() / Math.max(1, reference));
    },
    apply(next) {
      reference = next.reference;
      u.seed.value.copy(seedOffset(next.seed, 10));
      u.patchSeed.value.copy(seedOffset(next.seed, 12));
      u.nebulaSeed.value.copy(seedOffset(next.seed, 13));
      next.layers.forEach((l, i) => {
        if (!layers[i]) return;
        layers[i].scale.value = l.scale;
        layers[i].size.value = l.size;
      });
      u.tintSpread.value = next.tint.spread;
      next.tint.stops.forEach((s, i) => {
        if (!tintStops.at[i]) return;
        tintStops.at[i].value = s.at;
        tintStops.value[i]!.value.set(s.colour);
      });
      u.patchScale.value = next.patches.scale;
      u.patchStrength.value = next.patches.strength;
      u.nebulaScale.value = next.nebula.scale;
      u.nebulaDetail.value = next.nebula.detail;
      u.nebulaRoughness.value = next.nebula.roughness;
      u.nebulaLacunarity.value = next.nebula.lacunarity;
      u.nebulaFrom.value = next.nebula.from;
      u.nebulaTo.value = next.nebula.to;
      u.nebulaColour.value.set(next.nebula.colour);
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
