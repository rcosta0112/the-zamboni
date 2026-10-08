// See-through hull: on the ship's surfaces (everything but what's tagged `cuttable: false`), discard
// the pixels inside a capsule from the camera to Dr. Green's chest, so she stays visible inside the
// ship while the camera stays outside. The hole's edge is dithered (no transparency, so no sorting
// problems).
// Plan: doc/plans/features/see-through-hull.md
//
// - material.maskNode: the cut (a pixel is discarded where it's false).
// - material.maskShadowNode = true: the shadow pass ignores the cut, so the hull keeps its full shadow.
// - Double-sided, back faces drawn in one dark colour: the cut edge reads as a solid cross-section.

import * as THREE from 'three/webgpu';
import { abs, bool, dot, floor, frontFacing, length, materialColor, mod, normalWorld, positionWorld, screenCoordinate, select, smoothstep, uniform } from 'three/tsl';

/** Shared by every cuttable material; updated each frame by updateCutaway(). */
const u = {
  camera: uniform(new THREE.Vector3()),
  target: uniform(new THREE.Vector3()),
  radius: uniform(0), // 0 = no hole
  soft: uniform(0.25),
  floorY: uniform(0), // no upward-facing surface below this height is cut (the floor she stands on)
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
  // Never the ground under her: upward-facing surfaces below her feet stay (floors, the pallet,
  // hatches; upstairs, that floor is also the cargo bay's ceiling). Everything else is cut all the
  // way down, so furniture leaves no stubs.
  const upY = select(frontFacing, normalWorld.y, normalWorld.y.negate());
  const ground = upY.greaterThan(0.7).and(positionWorld.y.lessThan(u.floorY));
  const cutting = t.greaterThan(0).and(t.lessThan(0.98)).and(u.radius.greaterThan(0.001)).and(ground.not());
  return cutting.not().or(mask.greaterThan(noise));
})();

/** One cuttable copy per source material, shared by every mesh that uses it. */
const copies = new Map<THREE.Material, THREE.MeshStandardNodeMaterial>();

/**
 * Give a mesh the cuttable copy of its material (copies, because nothing else may be cut, e.g. the
 * ramp and Dr. Green). The copy keeps every property of the source (physical ones too:
 * transmission, specular...), so cut and uncut surfaces look the same.
 */
export function makeCuttable(mesh: THREE.Mesh): void {
  const source = mesh.material as THREE.MeshStandardMaterial;
  let material = copies.get(source);
  if (!material) {
    material = (source as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial
      ? new THREE.MeshPhysicalNodeMaterial()
      : new THREE.MeshStandardNodeMaterial();
    // As three's own conversion does (NodeLibrary.fromMaterial), minus the identity.
    const target = material as unknown as Record<string, unknown>;
    for (const key in source) {
      if (key === 'uuid' || key === 'type' || key === 'name') continue;
      target[key] = (source as unknown as Record<string, unknown>)[key];
    }
    material.name = `${source.name} (cuttable)`;
    material.side = THREE.DoubleSide;
    // Cast shadows from the back faces only, as a closed single-sided hull would.
    material.shadowSide = THREE.BackSide;
    material.colorNode = select(frontFacing, materialColor.rgb, u.backColor.rgb);
    material.maskNode = keep;
    material.maskShadowNode = bool(true);
    copies.set(source, material);
  }
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
