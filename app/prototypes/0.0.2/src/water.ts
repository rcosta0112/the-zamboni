// The toon water for a shallow pond (plan: doc/plans/features/ice-and-water.md, pass 2). Not in a scene
// yet (owner, 2026-11-18): the dev page water-test.html shows it (src/water-page.ts).
//
// One plane, semi-transparent (drawn after the solid objects, no depth written). The depth shading
// after Roystan's toon water (roystan.net/articles/toon-water); the web from the owner's
// `Penguins Scene 1.01.blend`, material `Water 4 AO` (Voronoi F1 minus smooth F1, ramped 0.041–0.068,
// bent by a noise). One read of the scene's depth gives the water's depth under each pixel, measured
// straight down (not along the view, so the bands stay on the bed as the camera moves); everything
// below uses it: the colour, the opacity, the lines fading in deep water and the foam at the shore.
// Anything solid that crosses the surface gets foam (characters too); transparent things don't.

import * as THREE from 'three/webgpu';
import {
  cameraFar,
  cameraNear,
  cameraWorldMatrix,
  dot,
  float,
  floor,
  fract,
  length,
  max,
  min,
  mix,
  normalView,
  perspectiveDepthToViewZ,
  positionView,
  positionViewDirection,
  positionWorld,
  pow,
  reflectVector,
  saturate,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  vec2,
  vec4,
  viewportDepthTexture,
} from 'three/tsl';

/** Linear RGB, as three's working colour space. */
type Rgb = [number, number, number];

/** Every value of the look. */
export interface WaterLook {
  /** The colour over the shallows and over `maxDepth` and deeper (the file's water). */
  shallow: Rgb;
  deep: Rgb;
  /** The depth (m) at which the water is wholly `deep`. */
  maxDepth: number;
  /** Flat colour bands across the depth; 0 for a smooth gradient. */
  bands: number;
  /** Opacity at the shore and at `maxDepth`. */
  opacityShallow: number;
  opacityDeep: number;
  /** The web: cells a metre (the file's 12 × 0.39), how fast their points drift (rad/s), the ramp. */
  cellScale: number;
  cellSpeed: number;
  lineLow: number;
  lineHigh: number;
  /** Smooth F1's smoothness (the file's 0.5; Blender halves it inside). */
  smoothness: number;
  /** The lines' colour, their strength in the shallows, and the share of it left at `maxDepth`. */
  line: Rgb;
  lineStrength: number;
  lineDeep: number;
  /** The file's noise bending the web: its scale (noise cells a metre), its reach (m), its drift (m/s). */
  warpScale: number;
  warpAmount: number;
  warpSpeed: number;
  /** The foam: its band (m of depth), how much a finer noise breaks it, its scale (noise cells a metre), solid from. */
  foam: Rgb;
  foamWidth: number;
  foamBreak: number;
  foamNoiseScale: number;
  foamSolid: number;
  /** The water's surface (the file's) and the sky's reflection (the file's world gradient, by Fresnel). */
  metalness: number;
  roughness: number;
  reflection: number;
  skyHorizon: Rgb;
  skyMiddle: Rgb;
  skyZenith: Rgb;
}

/** The owner's look (2026-11-18, from the test page), on the file's where untouched. */
export const WATER_DEFAULTS: WaterLook = {
  shallow: [0, 0.62, 0.85],
  deep: [0, 0.2484, 0.3965],
  maxDepth: 0.8,
  bands: 0,
  opacityShallow: 0.6,
  opacityDeep: 0.92,
  cellScale: 1.3,
  cellSpeed: 0.01,
  lineLow: 0.012,
  lineHigh: 0.031,
  smoothness: 0.5,
  line: [0.8, 0.8, 0.8],
  lineStrength: 0.533,
  lineDeep: 0.238,
  warpScale: 1.349,
  warpAmount: 0.603,
  warpSpeed: 0.01,
  foam: [1, 1, 1],
  foamWidth: 0.12,
  foamBreak: 0.35,
  foamNoiseScale: 6,
  foamSolid: 0.65,
  metalness: 0,
  roughness: 0.693,
  reflection: 2,
  skyHorizon: [0.205, 0.834, 1],
  skyMiddle: [0, 0.468, 1],
  skyZenith: [0, 0.21, 1],
};

const COLOUR_KEYS = ['shallow', 'deep', 'line', 'foam', 'skyHorizon', 'skyMiddle', 'skyZenith'] as const;
type ColourKey = (typeof COLOUR_KEYS)[number];
type NumberKey = Exclude<keyof WaterLook, ColourKey>;

export type WaterUniforms = { [K in ColourKey]: THREE.UniformNode<'color', THREE.Color> } & {
  [K in NumberKey]: THREE.UniformNode<'float', number>;
};

export interface Water {
  material: THREE.MeshStandardNodeMaterial;
  /** The uniforms by name (a panel edits them live). */
  u: WaterUniforms;
  /** Sets every value from a look (missing values left as they are). */
  set(look: Partial<WaterLook>): void;
}

/**
 * The water's material. `noise`: a repeating gradient-noise tile stored 0..1 (terrain.ts `noiseTile`).
 * `noiseCells`: the tile's cells across it (32). `lightsNode`: in the game, the outside's own lights (decision log, 2026-10-23); left out, the scene's.
 */
export function createWater(noise: THREE.Texture, options: { noiseCells?: number; lightsNode?: THREE.LightsNode; look?: Partial<WaterLook> } = {}): Water {
  /** The tile's noise cells across it (terrain.ts makes 32): the scales are in noise cells a metre. */
  const perTile = 1 / (options.noiseCells ?? 32);
  const u = {} as Record<string, THREE.UniformNode<'color', THREE.Color> | THREE.UniformNode<'float', number>>;
  for (const [key, value] of Object.entries(WATER_DEFAULTS)) {
    u[key] = Array.isArray(value) ? uniform(new THREE.Color().setRGB(value[0], value[1], value[2])) : uniform(value as number);
  }
  const U = u as unknown as WaterUniforms;

  // 1. The water's depth under the pixel: the scene's depth turned into a point on the same view ray,
  //    then into the world; depth = the surface's height minus that point's (0 or more).
  const sceneZ = perspectiveDepthToViewZ(viewportDepthTexture(), cameraNear, cameraFar);
  const bedView = positionView.mul(sceneZ.div(positionView.z));
  const bedWorld = cameraWorldMatrix.mul(vec4(bedView, 1)).xyz;
  const depth = max(positionWorld.y.sub(bedWorld.y), 0);
  const deepness = saturate(depth.div(U.maxDepth));
  // Bands: the gradient in `bands` flat steps (0: smooth).
  const banded = saturate(floor(deepness.mul(U.bands)).div(max(U.bands.sub(1), 1)));
  const t = mix(deepness, banded, saturate(U.bands));

  // 5. The file's noise bends the web (added to Y before the Voronoi), drifting slowly.
  const xz = positionWorld.xz;
  const drift = time.mul(U.warpSpeed);
  const warp = texture(noise, xz.mul(U.warpScale.mul(perTile)).add(drift)).r.sub(0.5);
  const p = vec2(xz.x, xz.y.add(warp.mul(U.warpAmount))).mul(U.cellScale);

  // 4. The web: F1 and smooth F1 in one pass over the 3 × 3 cells round the pixel. Each cell's point
  //    drifts in [0, 1]² over time (as the file's W moving); smooth F1 as Blender's (smoothness halved).
  //    (Tried 5 × 5, as Blender searches for smooth F1: no visible difference, 2026-11-18.)
  const cell = floor(p);
  const f = fract(p);
  const s = U.smoothness.mul(0.5).clamp(0.0001, 0.5);
  const phase = time.mul(U.cellSpeed);
  let f1: THREE.Node<'float'> = float(8);
  let smoothF1: THREE.Node<'float'> = float(8);
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const offset = vec2(i, j);
      const id = cell.add(offset);
      const h = fract(sin(vec2(dot(id, vec2(127.1, 311.7)), dot(id, vec2(269.5, 183.3)))).mul(43758.5453));
      const point = offset.add(sin(h.mul(6.2831853).add(phase)).mul(0.5).add(0.5));
      const d = length(point.sub(f));
      f1 = min(f1, d);
      const k = smoothstep(0, 1, float(0.5).add(smoothF1.sub(d).div(s).mul(0.5)));
      smoothF1 = mix(smoothF1, d, k).sub(s.mul(k).mul(float(1).sub(k)));
    }
  }
  const edgeOfCell = f1.sub(smoothF1);

  // 7. Foam: within `foamWidth` of something solid; broken up by a finer read of the same noise.
  const near = float(1).sub(saturate(depth.div(U.foamWidth)));
  const grain = texture(noise, xz.mul(U.foamNoiseScale.mul(perTile)).sub(drift)).r.sub(0.5);
  const shore = saturate(near.add(grain.mul(U.foamBreak).mul(2)).mul(near.greaterThan(0).select(1, 0)));
  // Near the shore the ramp's cutoff drops, so the lines thicken into foam; solid at the very edge.
  // 8. Every cutoff a narrow smoothstep (the ramp's own width; never zero).
  const cut = float(1).sub(shore);
  const low = U.lineLow.mul(cut);
  const high = max(U.lineHigh.mul(cut), low.add(0.004));
  const web = smoothstep(low, high, edgeOfCell);
  const solid = smoothstep(U.foamSolid, U.foamSolid.add(0.08), shore);
  // 6. The lines as caustics: full in the shallows, `lineDeep` of it at maxDepth; foam always full.
  const lineAmount = U.lineStrength.mul(mix(float(1), U.lineDeep, deepness));
  const white = max(web.mul(mix(lineAmount, float(1), shore)), solid);
  const whiteColour = mix(U.line, U.foam, shore);

  // 2–3. The colour and opacity by depth; the lines and foam over them.
  const water = mix(U.shallow, U.deep, t);
  const colour = mix(water, whiteColour, white);

  // 9. The sky's reflection by Fresnel (water's F0 0.02), the file's world gradient by the reflected
  //    ray's height; none on the foam. It also makes the water more opaque at glancing angles.
  const facing = saturate(dot(normalView, positionViewDirection));
  const fresnel = float(0.02).add(float(0.98).mul(pow(float(1).sub(facing), 5)));
  const up = saturate(reflectVector.y);
  const sky = mix(mix(U.skyHorizon, U.skyMiddle, smoothstep(0, 0.327, up)), U.skyZenith, smoothstep(0.327, 1, up));
  const reflection = sky.mul(fresnel).mul(U.reflection).mul(float(1).sub(white));
  const opacity = max(mix(mix(U.opacityShallow, U.opacityDeep, t), float(1), white), fresnel.mul(U.reflection).clamp(0, 1));

  const material = new THREE.MeshStandardNodeMaterial({ transparent: true, depthWrite: false });
  material.name = 'Water';
  material.colorNode = colour;
  material.opacityNode = opacity;
  material.emissiveNode = reflection;
  material.metalnessNode = mix(U.metalness, float(0), white);
  material.roughnessNode = mix(U.roughness, float(1), white);
  if (options.lightsNode) material.lightsNode = options.lightsNode;

  const set = (look: Partial<WaterLook>) => {
    for (const [key, value] of Object.entries(look)) {
      const node = u[key];
      if (!node || value === undefined) continue;
      if (Array.isArray(value)) (node.value as THREE.Color).setRGB(value[0], value[1], value[2]);
      else (node as THREE.UniformNode<'float', number>).value = value as number;
    }
  };
  if (options.look) set(options.look);
  return { material, u: U, set };
}
