// The planet map (plan doc/plans/features/non-linear-travel/planet-map-page.md): the navigation station's big
// screen, green lines on black. The planet of the intro shot (planet.ts's height, the same preset and seed),
// drawn as an **orthographic globe** at every zoom: zooming scales the globe, panning turns it.
//
// One material for a full-screen quad (`QuadMesh` on the test page; a render target on the station later):
// per pixel, the point on the globe under it, the planet's height there (planet.ts's warped fBm, its octaves
// cut to what the pixel shows), then lines where the height crosses a level, their width from the height's
// slope (`fwidth`), so they stay thin at every zoom:
// - the **coastline** (the height at sea level; land is below it, as in planet.ts), bright;
// - a few dim **contour lines** on the land, evenly spaced below sea level;
// - the globe's **rim**, dim (zoomed out, where the globe ends).
// The sea is left black.
//
// Positions: north–south 0 = the north pole, 90 = the equator, 180 = the south pole; east–west counted
// eastward from the preset's meridian (planet-map.md). The planet's own frame is Blender's (Z up, planet.ts).

import * as THREE from 'three/webgpu';
import { abs, clamp, float, Fn, fract, fwidth, length, log2, max, min, mx_noise_vec3, sqrt, step, uniform, uv, vec3 } from 'three/tsl';
import { fbm, seedOffset, type PlanetPreset } from './planet';

/** The navigation station's big screen (`Navigation_Display`'s face, *Topographical Map*): 0.806 × 0.677 m, measured 2026-11-24. */
export const MAP_ASPECT = 0.8056 / 0.6772;

/** The map's look (the test page's sliders). */
export interface MapLook {
  /** sRGB hex. */
  colour: string;
  /** The coastline's width, in pixels. */
  coastWidth: number;
  /** The contour lines' width, in pixels. */
  contourWidth: number;
  /** How many contour lines below sea level. */
  contours: number;
  /** The height between two contour lines (the planet's height runs about 0..1, sea level at 0.5). */
  contourSpacing: number;
  /** The contour lines' and the rim's brightness, 0..1 of the coastline's. */
  dim: number;
}

export const DEFAULT_LOOK: MapLook = { colour: '#39ff6a', coastWidth: 1.5, contourWidth: 1, contours: 4, contourSpacing: 0.03, dim: 0.35 };

/** Where the map looks and how far it's zoomed. */
export interface MapView {
  /** The screen's centre: north–south, degrees (0 the north pole … 180 the south pole). */
  northSouth: number;
  /** The screen's centre: east–west, degrees eastward from the meridian (0 … 360). */
  eastWest: number;
  /** The screen's width in degrees of the globe (≥ 180: the whole globe, fitted to the screen's height). */
  width: number;
}

export interface PlanetMap {
  material: THREE.MeshBasicNodeMaterial;
  setView(view: MapView): void;
  setLook(look: MapLook): void;
  apply(preset: PlanetPreset): void;
  dispose(): void;
}

type FloatNode = THREE.Node<'float'>;

const DEG = Math.PI / 180;

/** `uvDown`: the quad's v runs down the screen (three's `QuadMesh`); false for a mesh whose v runs up. */
export function createPlanetMap(preset: PlanetPreset, look: MapLook = DEFAULT_LOOK, aspect = MAP_ASPECT, uvDown = true): PlanetMap {
  const u = {
    seed: uniform(seedOffset(preset.seed, 0)),
    seedWarp: uniform(seedOffset(preset.seed, 2)),
    scale: uniform(preset.scale),
    detail: uniform(preset.detail),
    roughness: uniform(preset.roughness),
    lacunarity: uniform(preset.lacunarity),
    warp: uniform(preset.warp),
    warpScale: uniform(preset.warpScale),
    seaLevel: uniform(preset.seaLevel),
    lodBias: uniform(preset.lodBias),
    // The view: the screen's half height in globe radii, and the globe's frame at the screen's centre.
    halfHeight: uniform(1.08),
    aspect: uniform(aspect),
    east: uniform(new THREE.Vector3(0, 1, 0)),
    north: uniform(new THREE.Vector3(0, 0, 1)),
    out: uniform(new THREE.Vector3(1, 0, 0)),
    // The look.
    colour: uniform(new THREE.Color(look.colour)),
    coastWidth: uniform(look.coastWidth),
    contourWidth: uniform(look.contourWidth),
    contours: uniform(look.contours),
    contourSpacing: uniform(look.contourSpacing),
    dim: uniform(look.dim),
  };

  const colour = Fn(() => {
    // The screen's point, in globe radii from its centre (x right, y up; `QuadMesh`'s uv runs top-down).
    const s = uv().sub(0.5).mul(u.halfHeight.mul(2));
    const x = s.x.mul(u.aspect);
    const y = uvDown ? s.y.negate() : s.y;
    const r = length(vec3(x, y, 0));
    const onGlobe = step(r, 1);
    const z = sqrt(max(float(1).sub(r.mul(r)), 0));
    // The point on the globe, in the planet's frame; then planet.ts's height there.
    const point = u.east.mul(x).add(u.north.mul(y)).add(u.out.mul(z));
    const gen = point.mul(0.5).add(0.5);
    const warp = mx_noise_vec3(gen.add(u.seedWarp).mul(u.warpScale)).mul(u.warp);
    const p = gen.add(u.seed).mul(u.scale).add(warp.mul(u.scale));
    const footprint = max(length(fwidth(p)), 1e-6);
    const lodDetail = log2(float(0.5).div(footprint)).div(max(log2(u.lacunarity), 0.01)).add(u.lodBias);
    const detail = clamp(min(u.detail, lodDetail), 0, u.detail);
    const height = fbm(p, detail, u.roughness, u.lacunarity) as FloatNode;
    const slope = max(fwidth(height), 1e-6);

    // A line `width` pixels wide where `distance` (in pixels) is 0, its edge softened over one pixel.
    const line = (distance: FloatNode, width: FloatNode) => clamp(width.mul(0.5).add(0.5).sub(distance), 0, 1);

    const coast = line(abs(height.sub(u.seaLevel)).div(slope), u.coastWidth);
    // Contours: levels seaLevel − k × spacing, k = 1 … contours (land only: below sea level).
    const k = u.seaLevel.sub(height).div(u.contourSpacing);
    const nearest = abs(fract(k.add(0.5)).sub(0.5)).mul(u.contourSpacing).div(slope);
    const inRange = step(0.5, k).mul(step(k, u.contours.add(0.5)));
    const contour = line(nearest, u.contourWidth).mul(inRange);
    const rim = line(abs(r.sub(1)).div(max(fwidth(r), 1e-6)), u.contourWidth);

    const lit = max(max(coast, contour.mul(u.dim)).mul(onGlobe), rim.mul(u.dim));
    return vec3(u.colour.x, u.colour.y, u.colour.z).mul(lit);
  });

  const material = new THREE.MeshBasicNodeMaterial();
  material.colorNode = colour();
  material.name = 'Planet map';

  function setView(view: MapView): void {
    const lat = (90 - view.northSouth) * DEG;
    const lon = ((preset.meridian ?? 0) + view.eastWest) * DEG;
    const cl = Math.cos(lat), sl = Math.sin(lat), co = Math.cos(lon), so = Math.sin(lon);
    u.out.value.set(cl * co, cl * so, sl);
    u.east.value.set(-so, co, 0);
    u.north.value.set(-sl * co, -sl * so, cl);
    // Zoomed out: the whole globe fills the height with a margin; zoomed in: `width` degrees across.
    u.halfHeight.value = view.width >= 180 ? 1.08 : Math.sin((view.width / 2) * DEG) / u.aspect.value;
  }

  function setLook(next: MapLook): void {
    u.colour.value.set(next.colour);
    u.coastWidth.value = next.coastWidth;
    u.contourWidth.value = next.contourWidth;
    u.contours.value = next.contours;
    u.contourSpacing.value = Math.max(next.contourSpacing, 1e-4);
    u.dim.value = next.dim;
  }

  function apply(next: PlanetPreset): void {
    preset = next;
    u.seed.value.copy(seedOffset(next.seed, 0));
    u.seedWarp.value.copy(seedOffset(next.seed, 2));
    u.scale.value = next.scale;
    u.detail.value = next.detail;
    u.roughness.value = next.roughness;
    u.lacunarity.value = next.lacunarity;
    u.warp.value = next.warp;
    u.warpScale.value = next.warpScale;
    u.seaLevel.value = next.seaLevel;
    u.lodBias.value = next.lodBias;
  }

  return { material, setView, setLook, apply, dispose: () => material.dispose() };
}

/** A position's quadrant name (planet-map.md): north–south and east–west, whole degrees, three hex digits each. */
export function quadrantName(northSouth: number, eastWest: number): string {
  const ns = Math.min(180, Math.max(0, Math.floor(northSouth)));
  const ew = ((Math.floor(eastWest) % 360) + 360) % 360;
  const hex = (n: number) => n.toString(16).toUpperCase().padStart(3, '0');
  return `${hex(ns)}-${hex(ew)}`;
}
