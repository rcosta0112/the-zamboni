// See-through hull: on "cuttable" surfaces (hull, walls, ceilings), discard the pixels inside a
// capsule from the camera to Dr. Green's chest, so she stays visible inside the ship while the
// camera stays outside. The hole's edge is dithered (no transparency, so no sorting problems).
// Plan: doc/plans/features/see-through-hull.md
//
// - material.maskNode: the cut (a pixel is discarded where it's false).
// - material.maskShadowNode = true: the shadow pass ignores the cut, so the hull keeps its full shadow.
// - Double-sided, back faces drawn in one dark colour: the cut edge reads as a solid cross-section.

import * as THREE from 'three/webgpu';
import { abs, bool, dot, floor, frontFacing, length, materialColor, mod, positionWorld, screenCoordinate, select, smoothstep, uniform } from 'three/tsl';

/** Shared by every cuttable material; updated each frame by updateCutaway(). */
const u = {
  camera: uniform(new THREE.Vector3()),
  target: uniform(new THREE.Vector3()),
  radius: uniform(0), // 0 = no hole
  soft: uniform(0.25),
  floorY: uniform(0), // nothing below this height is cut (the floor she stands on)
  backColor: uniform(new THREE.Color(0x1b2327)),
};

/** True where the pixel is kept. */
const keep = (() => {
  const ab = u.target.sub(u.camera);
  const ap = positionWorld.sub(u.camera);
  const t = dot(ap, ab).div(dot(ab, ab));
  const closest = u.camera.add(ab.mul(t));
  const d = length(positionWorld.sub(closest));
  // 0 inside the hole, 1 outside it, with a soft band of width `soft` at the edge.
  const mask = smoothstep(u.radius.sub(u.soft), u.radius, d);
  // 4x4 ordered (Bayer) dither per screen pixel: turns the soft band into a regular pattern,
  // which crawls far less than random noise when the camera moves.
  const px = floor(screenCoordinate.x);
  const py = floor(screenCoordinate.y);
  const bayer2 = (x: typeof px, y: typeof px) => abs(x.sub(y)).mul(2).add(y);
  const fine = bayer2(mod(px, 2), mod(py, 2));
  const coarse = bayer2(mod(floor(px.div(2)), 2), mod(floor(py.div(2)), 2));
  const noise = fine.mul(4).add(coarse).add(0.5).div(16);
  // Only between the camera and the target, and only when there's a hole at all (with radius 0,
  // smoothstep's edges meet and its result is undefined on GPUs).
  // Never below her feet, so the floor she stands on stays (upstairs, that floor is also the
  // cargo bay's ceiling, which is cuttable).
  const cutting = t.greaterThan(0).and(t.lessThan(0.98)).and(u.radius.greaterThan(0.001)).and(positionWorld.y.greaterThan(u.floorY));
  return cutting.not().or(mask.greaterThan(noise));
})();

/**
 * Give a mesh a cuttable copy of its material (copies, because the ship's materials are shared
 * with objects that must stay solid, e.g. the turbines).
 */
export function makeCuttable(mesh: THREE.Mesh): void {
  const source = mesh.material as THREE.MeshStandardMaterial;
  const material = new THREE.MeshStandardNodeMaterial({
    color: source.color,
    map: source.map,
    roughness: source.roughness,
    metalness: source.metalness,
    emissive: source.emissive,
    emissiveMap: source.emissiveMap,
    emissiveIntensity: source.emissiveIntensity,
    transparent: source.transparent,
    opacity: source.opacity,
    side: THREE.DoubleSide,
    // Cast shadows from the back faces only, as a closed single-sided hull would.
    shadowSide: THREE.BackSide,
  });
  material.name = `${source.name} (cuttable)`;
  material.colorNode = select(frontFacing, materialColor.rgb, u.backColor.rgb);
  material.maskNode = keep;
  material.maskShadowNode = bool(true);
  mesh.material = material;
}

export interface CutawaySettings {
  radius: number; // m
  softness: number; // m
  backColor: string;
}

/**
 * Per frame. `amount` (0..1) scales the hole: 0 outside the ship, eased to 1 inside.
 */
export function updateCutaway(cameraPosition: THREE.Vector3, target: THREE.Vector3, feetY: number, amount: number, s: CutawaySettings): void {
  u.camera.value.copy(cameraPosition);
  u.target.value.copy(target);
  u.floorY.value = feetY + 0.15;
  u.radius.value = s.radius * amount;
  u.soft.value = Math.min(s.softness, s.radius) * amount;
  u.backColor.value.set(s.backColor);
}
