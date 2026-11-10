// The planet (owner's resources/models/props/planet.blend, material "Planet - Mixed"), procedural in
// TSL so it can be zoomed into and re-tuned (plan: doc/plans/features/planet-cinematic.md).
//
// As in Blender, one height field drives everything:
// - height: fBm noise (Blender's 4D noise, its W warped by a second noise; here 3D noise, its position
//   pushed by a noise vector: the same effect, TSL has no 4D noise);
// - a hard step at `seaLevel`: below it land, above it sea (Blender's ramp: black under 0.5, white over);
// - land: a latitude band mixed with a third noise picks the green ramp, else the white/cyan "coast" ramp;
// - sea: the blue ramp; the colour feeds base colour (plus Blender's Fresnel added as white) and emission.
// The number of octaves follows the pixel's size on the surface (`lodBias`): few when the planet is
// small, all of them close up, so it's cheap from far and doesn't shimmer.
//
// The atmosphere (Blender's "Atmosphere": the same mesh at 1.024, a child of the planet): blue, see-through
// by Blender's Fresnel (IOR 1.07) plus a share of a cloud noise; specular (roughness 0.1, IOR 1.5): the
// sun's glint is on it, not on the planet.
//
// The planet's frame is Blender's (Z up): `root` turns it into Three's (Y up). Its tilt is Blender's
// object rotation; `spin` turns it about its own axis (the shot's last cut).

import * as THREE from 'three/webgpu';
import {
  abs,
  clamp,
  cross,
  dFdx,
  dFdy,
  dot,
  float,
  floor,
  Fn,
  fwidth,
  int,
  length,
  log2,
  Loop,
  max,
  min,
  mix,
  mx_noise_float,
  mx_noise_vec3,
  normalize,
  normalView,
  positionLocal,
  positionView,
  sign,
  smoothstep,
  sqrt,
  step,
  uniform,
  vec3,
} from 'three/tsl';

export interface ColourStop {
  at: number;
  colour: string; // sRGB hex
}
export interface ValueStop {
  at: number;
  value: number;
}
export type Interpolation = 'constant' | 'linear' | 'ease';

export interface PlanetPreset {
  seed: number;
  /** The height noise (Blender: scale, detail, roughness, lacunarity). */
  scale: number;
  detail: number;
  roughness: number;
  lacunarity: number;
  /** The warp: how far a noise vector pushes the height's position (in the height's own units), and its scale. */
  warp: number;
  warpScale: number;
  /** Below: land; above: sea. */
  seaLevel: number;
  /** The coastline's softness, in pixels (0: Blender's hard step, aliased). */
  coastSoftness: number;
  /** Land outside the band (Blender: white → cyan → blue, on height). */
  coast: ColourStop[];
  /** Land in the band (greens, on height). */
  green: ColourStop[];
  /** Sea (blues, on height). */
  ocean: ColourStop[];
  /** The latitude band (0 south pole, 1 north): 1 = green. */
  band: ValueStop[];
  /** The noise breaking up the band, mixed in by `bandMix`. */
  bandNoise: { scale: number; detail: number; roughness: number; lacunarity: number; from: number; to: number };
  bandMix: number;
  /** Blender's bump on the coastline step. */
  bump: number;
  emission: number;
  /** Blender's Fresnel (added to the base colour as white). */
  rimIor: number;
  /** More octaves (+) or fewer (−) than the pixel size asks for. */
  lodBias: number;
  atmosphere: AtmospherePreset;
}

export interface AtmospherePreset {
  /** The shell's size, the planet's radius = 1. */
  size: number;
  colour: string;
  roughness: number;
  ior: number;
  /** Its see-through: Blender's Fresnel (this IOR) plus `cloudAmount` × the cloud noise's ramp (`cloudFrom` → `cloudTo`). */
  rimIor: number;
  cloudScale: number;
  cloudDetail: number;
  cloudRoughness: number;
  cloudLacunarity: number;
  cloudFrom: number;
  cloudTo: number;
  cloudAmount: number;
}

export const INTERPOLATION = { coast: 'ease', green: 'ease', ocean: 'linear', band: 'ease' } as const satisfies Record<string, Interpolation>;

type FloatNode = THREE.Node<'float'>;
type Vec3Node = THREE.Node<'vec3'>;

/**
 * Blender's fBm (noise_fbm, normalized): octaves 0..floor(detail), the fraction blended in as one more;
 * 0..1. `detail` may change per pixel (the loop's end is a node).
 */
export const fbm = Fn(([p, detail, roughness, lacunarity]: [Vec3Node, FloatNode, FloatNode, FloatNode]) => {
  const sum = float(0).toVar();
  const amp = float(1).toVar();
  const maxAmp = float(0).toVar();
  const freq = float(1).toVar();
  const last = int(floor(detail)).toVar();
  Loop({ start: int(0), end: last, type: 'int', condition: '<=' }, () => {
    sum.addAssign(mx_noise_float(p.mul(freq)).mul(amp));
    maxAmp.addAssign(amp);
    amp.mulAssign(roughness);
    freq.mulAssign(lacunarity);
  });
  const base = sum.div(maxAmp).mul(0.5).add(0.5);
  const more = sum.add(mx_noise_float(p.mul(freq)).mul(amp)).div(maxAmp.add(amp)).mul(0.5).add(0.5);
  return mix(base, more, detail.sub(floor(detail)));
});

/** Blender's Fresnel node (fresnel_dielectric_cos). */
export function fresnel(ior: FloatNode, n: Vec3Node, v: Vec3Node): FloatNode {
  const c = abs(dot(n, v));
  const g2 = ior.mul(ior).sub(1).add(c.mul(c));
  const g = sqrt(max(g2, 0));
  const a = g.sub(c).div(g.add(c));
  const b = c.mul(g.add(c)).sub(1).div(c.mul(g.sub(c)).add(1));
  const f = a.mul(a).mul(0.5).mul(b.mul(b).add(1));
  return mix(float(1), f, step(0, g2)) as FloatNode;
}

export interface Stops<T> {
  at: THREE.UniformNode<'float', number>[];
  value: T[];
}

/** A colour ramp from uniforms (the stops' count is fixed; positions and values are live). */
export function ramp<T extends THREE.Node>(f: FloatNode, stops: Stops<THREE.Node>, interpolation: Interpolation): T {
  let out = stops.value[0]! as Vec3Node;
  for (let i = 1; i < stops.value.length; i++) {
    const p0 = stops.at[i - 1]!;
    const p1 = stops.at[i]!;
    let t: FloatNode;
    if (interpolation === 'constant') t = step(p1, f);
    else {
      t = clamp(f.sub(p0).div(max(p1.sub(p0), 1e-5)), 0, 1);
      if (interpolation === 'ease') t = t.mul(t).mul(t.mul(-2).add(3));
    }
    out = mix(out, stops.value[i]! as Vec3Node, t);
  }
  return out as unknown as T;
}

/** A seed → an offset in noise space, small enough that 16 octaves keep float precision. */
export function seedOffset(seed: number, salt: number): THREE.Vector3 {
  const h = (n: number) => {
    const x = Math.sin(seed * 127.1 + salt * 311.7 + n * 74.7) * 43758.5453;
    return (x - Math.floor(x)) * 10;
  };
  return new THREE.Vector3(h(1), h(2), h(3));
}

export interface Planet {
  /** Add this to the scene: Blender's frame (Z up) turned into Three's. */
  root: THREE.Group;
  /** The tilt (Blender's object rotation, XYZ). */
  body: THREE.Group;
  /** Turns about the planet's own axis (radians, on `spin.rotation.z`). */
  spin: THREE.Group;
  mesh: THREE.Mesh;
  atmosphere: THREE.Mesh;
  apply(preset: PlanetPreset): void;
  dispose(): void;
}

/** Blender's ico sphere, 2 subdivisions: 162 vertices, smooth shaded (owner: it stays low poly). */
export function planetGeometry(radius = 1): THREE.BufferGeometry {
  return new THREE.IcosahedronGeometry(radius, 3);
}

export function createPlanet(preset: PlanetPreset): Planet {
  const u = {
    seed: uniform(seedOffset(preset.seed, 0)),
    seedBand: uniform(seedOffset(preset.seed, 1)),
    seedWarp: uniform(seedOffset(preset.seed, 2)),
    scale: uniform(preset.scale),
    detail: uniform(preset.detail),
    roughness: uniform(preset.roughness),
    lacunarity: uniform(preset.lacunarity),
    warp: uniform(preset.warp),
    warpScale: uniform(preset.warpScale),
    seaLevel: uniform(preset.seaLevel),
    coastSoftness: uniform(preset.coastSoftness),
    bandMix: uniform(preset.bandMix),
    bandScale: uniform(preset.bandNoise.scale),
    bandDetail: uniform(preset.bandNoise.detail),
    bandRoughness: uniform(preset.bandNoise.roughness),
    bandLacunarity: uniform(preset.bandNoise.lacunarity),
    bandFrom: uniform(preset.bandNoise.from),
    bandTo: uniform(preset.bandNoise.to),
    bump: uniform(preset.bump),
    emission: uniform(preset.emission),
    rimIor: uniform(preset.rimIor),
    lodBias: uniform(preset.lodBias),
  };
  const colourStops = (stops: ColourStop[]) => ({
    at: stops.map((s) => uniform(s.at)),
    value: stops.map((s) => uniform(new THREE.Color(s.colour))),
  });
  const coast = colourStops(preset.coast);
  const green = colourStops(preset.green);
  const ocean = colourStops(preset.ocean);
  const band = { at: preset.band.map((s) => uniform(s.at)), value: preset.band.map((s) => uniform(s.value)) };

  // Blender's Generated coordinates: the object's box mapped to 0..1 (the mesh's radius is 1).
  const gen = positionLocal.mul(0.5).add(0.5);

  // The height: warped fBm, its octaves cut to what the pixel can show.
  const warp = mx_noise_vec3(gen.add(u.seedWarp).mul(u.warpScale)).mul(u.warp);
  const p = gen.add(u.seed).mul(u.scale).add(warp.mul(u.scale));
  const footprint = max(length(fwidth(p)), 1e-6);
  const lodDetail = log2(float(0.5).div(footprint)).div(max(log2(u.lacunarity), 0.01)).add(u.lodBias);
  const detail = clamp(min(u.detail, lodDetail), 0, u.detail);
  const height = fbm(p, detail, u.roughness, u.lacunarity) as FloatNode;

  // Land (0) or sea (1): Blender's hard step, softened over `coastSoftness` pixels.
  const edge = max(fwidth(height).mul(u.coastSoftness), 1e-5);
  const sea = smoothstep(u.seaLevel.sub(edge), u.seaLevel.add(edge), height);

  // Land colour: green in the latitude band (broken up by a noise), else the coast ramp.
  const latitude = clamp(gen.z, 0, 1);
  const bandNoise = fbm(gen.add(u.seedBand).mul(u.bandScale), u.bandDetail, u.bandRoughness, u.bandLacunarity) as FloatNode;
  const bandBreak = smoothstep(u.bandFrom, u.bandTo, bandNoise);
  const inBand = mix(ramp<FloatNode>(latitude, band, INTERPOLATION.band), bandBreak, u.bandMix);
  const land = mix(ramp<Vec3Node>(height, coast, INTERPOLATION.coast), ramp<Vec3Node>(height, green, INTERPOLATION.green), inBand);
  const surface = mix(land, ramp<Vec3Node>(height, ocean, INTERPOLATION.ocean), sea);

  // Blender's bump on the step, mixed in by `bump`: the land raised (height = 1 − the sea mask; owner,
  // 2026-11-10: the sea had come out high).
  const n = normalView;
  const sx = dFdx(positionView);
  const sy = dFdy(positionView);
  const r1 = cross(sy, n);
  const r2 = cross(n, sx);
  const det = dot(sx, r1);
  const grad = sign(det).mul(dFdx(sea).mul(r1).add(dFdy(sea).mul(r2))).negate(); // − : land up
  const bumped = normalize(abs(det).mul(n).sub(grad));
  const normal = normalize(mix(n, bumped, u.bump));

  const toCamera = normalize(positionView.negate());
  // Blender's IOR 1: no specular on the planet itself, so Lambert. NodeMaterial reads `emissiveNode` for
  // every lit material, but the types declare it only on some.
  const material = new THREE.MeshLambertNodeMaterial() as THREE.MeshLambertNodeMaterial & { emissiveNode: THREE.Node | null };
  material.normalNode = normal;
  material.colorNode = surface.add(vec3(fresnel(u.rimIor, normal, toCamera)));
  material.emissiveNode = surface.mul(u.emission);

  const geometry = planetGeometry();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Planet';

  // The atmosphere: the same mesh, scaled (Blender's Generated coordinates are the mesh's own, so the
  // cloud noise reads the unscaled position, as there).
  const a = preset.atmosphere;
  const au = {
    seed: uniform(seedOffset(preset.seed, 3)),
    colour: uniform(new THREE.Color(a.colour)),
    roughness: uniform(a.roughness),
    ior: uniform(a.ior),
    rimIor: uniform(a.rimIor),
    cloudScale: uniform(a.cloudScale),
    cloudDetail: uniform(a.cloudDetail),
    cloudRoughness: uniform(a.cloudRoughness),
    cloudLacunarity: uniform(a.cloudLacunarity),
    cloudFrom: uniform(a.cloudFrom),
    cloudTo: uniform(a.cloudTo),
    cloudAmount: uniform(a.cloudAmount),
  };
  const cloud = fbm(gen.add(au.seed).mul(au.cloudScale), au.cloudDetail, au.cloudRoughness, au.cloudLacunarity) as FloatNode;
  const cloudShare = clamp(cloud.sub(au.cloudFrom).div(max(au.cloudTo.sub(au.cloudFrom), 1e-5)), 0, 1);
  const airAlpha = clamp(fresnel(au.rimIor, normalView, toCamera).add(cloudShare.mul(au.cloudAmount)), 0, 1);
  const air = new THREE.MeshPhysicalNodeMaterial({ transparent: true, depthWrite: false });
  air.colorNode = au.colour;
  air.roughnessNode = au.roughness;
  air.iorNode = au.ior;
  air.metalness = 0;
  air.opacityNode = airAlpha;
  const atmosphere = new THREE.Mesh(geometry, air);
  atmosphere.name = 'Atmosphere';
  atmosphere.scale.setScalar(a.size);

  const spin = new THREE.Group();
  spin.add(mesh, atmosphere);
  const body = new THREE.Group();
  body.rotation.set(0.41, -0.404, 0.167, 'ZYX'); // Blender's XYZ Euler = Three's ZYX order
  body.add(spin);
  const root = new THREE.Group();
  root.rotation.x = -Math.PI / 2; // Blender Z up → Three Y up
  root.add(body);

  function apply(next: PlanetPreset): void {
    u.seed.value.copy(seedOffset(next.seed, 0));
    u.seedBand.value.copy(seedOffset(next.seed, 1));
    u.seedWarp.value.copy(seedOffset(next.seed, 2));
    u.scale.value = next.scale;
    u.detail.value = next.detail;
    u.roughness.value = next.roughness;
    u.lacunarity.value = next.lacunarity;
    u.warp.value = next.warp;
    u.warpScale.value = next.warpScale;
    u.seaLevel.value = next.seaLevel;
    u.coastSoftness.value = next.coastSoftness;
    u.bandMix.value = next.bandMix;
    u.bandScale.value = next.bandNoise.scale;
    u.bandDetail.value = next.bandNoise.detail;
    u.bandRoughness.value = next.bandNoise.roughness;
    u.bandLacunarity.value = next.bandNoise.lacunarity;
    u.bandFrom.value = next.bandNoise.from;
    u.bandTo.value = next.bandNoise.to;
    u.bump.value = next.bump;
    u.emission.value = next.emission;
    u.rimIor.value = next.rimIor;
    u.lodBias.value = next.lodBias;
    const na = next.atmosphere;
    au.seed.value.copy(seedOffset(next.seed, 3));
    au.colour.value.set(na.colour);
    au.roughness.value = na.roughness;
    au.ior.value = na.ior;
    au.rimIor.value = na.rimIor;
    au.cloudScale.value = na.cloudScale;
    au.cloudDetail.value = na.cloudDetail;
    au.cloudRoughness.value = na.cloudRoughness;
    au.cloudLacunarity.value = na.cloudLacunarity;
    au.cloudFrom.value = na.cloudFrom;
    au.cloudTo.value = na.cloudTo;
    au.cloudAmount.value = na.cloudAmount;
    atmosphere.scale.setScalar(na.size);
    const setColours = (target: typeof coast, stops: ColourStop[]) =>
      stops.forEach((s, i) => {
        if (!target.at[i]) return;
        target.at[i].value = s.at;
        target.value[i]!.value.set(s.colour);
      });
    setColours(coast, next.coast);
    setColours(green, next.green);
    setColours(ocean, next.ocean);
    next.band.forEach((s, i) => {
      if (!band.at[i]) return;
      band.at[i].value = s.at;
      band.value[i]!.value = s.value;
    });
  }

  return {
    root,
    body,
    spin,
    mesh,
    atmosphere,
    apply,
    dispose() {
      geometry.dispose();
      material.dispose();
      air.dispose();
    },
  };
}
