// See-through hull: on the ship's surfaces (everything but what's tagged `cuttable: false`), discard
// pixels so Dr. Green stays visible inside the ship while the camera stays outside. Dithered, so no
// transparency and no sorting problems.
// Plans: doc/plans/features/see-through-hull.md, doc/plans/features/see-through-rules.md
//
// - Structure (hull, walls, ceilings, and furniture on another deck): a hole, the pixels inside a
//   capsule from the camera to her chest.
// - Furniture on her deck: cut only while it hides her (visibility.ts sets a per-object fade),
//   either by the same hole or by dithering out the whole object (tuning panel). Furniture near the
//   camera is cut by the hole above her waist anyway: it isn't next to her, it just fills the view.
// - Dividers (bulkheads) switched to the furniture rules are always cut as a whole.
//
// - material.maskNode: the cut (a pixel is discarded where it's false).
// - material.maskShadowNode = true: the shadow pass ignores the cut, so the hull keeps its full shadow.
// - Double-sided, back faces drawn in one dark colour: the cut edge reads as a solid cross-section.

import * as THREE from 'three/webgpu';
import { abs, bool, dot, float, floor, frontFacing, length, materialColor, mix, mod, normalWorld, positionWorld, screenCoordinate, select, smoothstep, uniform, vec3 } from 'three/tsl';

/** Shared by every cuttable material; updated each frame by updateCutaway(). */
const u = {
  camera: uniform(new THREE.Vector3()),
  target: uniform(new THREE.Vector3()),
  radius: uniform(0), // the hole (structure); 0 = no hole
  soft: uniform(0.25),
  furnitureRadius: uniform(0), // furniture's hole and near-camera cut: on while she's inside
  furnitureSoft: uniform(0.25),
  floorY: uniform(0), // no upward-facing surface below this height is cut (the floor she stands on)
  backColor: uniform(new THREE.Color(0x1b2327)),
  furnitureFade: uniform(0), // furniture look: 0 = hole, 1 = whole-object fade
  minVisibility: uniform(0), // whole-object fade: how much of the object stays (0 = gone)
  showOccluders: uniform(0), // debug: tint furniture that is being cut
  nearPart: uniform(0.5), // furniture in the hole is cut on this part of the way from the camera to her
  waistY: uniform(0), // ...but only above this height (her waist)
  ownColour: uniform(1), // cut surface: 1 = the surface's own colour, darkened; 0 = backColor
  shade: uniform(0.35), // how much of its own colour the cut surface keeps
};

/** Per object (set on each mesh's userData by visibility.ts): 1 = cut like structure. */
const structure = uniform(1).onObjectUpdate(({ object }) => (object?.userData.cutStructure as number | undefined) ?? 1);
/** Per object: 1 = always cut as a whole when it's cut (dividers). */
const whole = uniform(0).onObjectUpdate(({ object }) => (object?.userData.cutWhole as number | undefined) ?? 0);
/** Per object: furniture's fade, 0 = whole, 1 = cut. */
const fade = uniform(0).onObjectUpdate(({ object }) => (object?.userData.cutFade as number | undefined) ?? 0);

/** True where the pixel is kept. */
const keep = (() => {
  const ab = u.target.sub(u.camera);
  const ap = positionWorld.sub(u.camera);
  const t = dot(ap, ab).div(dot(ab, ab));
  const closest = u.camera.add(ab.mul(t));
  const d = length(positionWorld.sub(closest));
  // 4x4 ordered (Bayer) dither per screen pixel: turns soft edges and fades into a regular pattern,
  // which crawls far less than random noise when the camera moves.
  const px = floor(screenCoordinate.x);
  const py = floor(screenCoordinate.y);
  const bayer2 = (x: typeof px, y: typeof px) => abs(x.sub(y)).mul(2).add(y);
  const fine = bayer2(mod(px, 2), mod(py, 2));
  const coarse = bayer2(mod(floor(px.div(2)), 2), mod(floor(py.div(2)), 2));
  const noise = fine.mul(4).add(coarse).add(0.5).div(16);
  // Never the ground under her: upward-facing surfaces below her feet stay (floors, the pallet,
  // hatches; upstairs, that floor is also the cargo bay's ceiling). Everything else is cut all the
  // way down, so furniture leaves no stubs.
  const upY = select(frontFacing, normalWorld.y, normalWorld.y.negate());
  const ground = upY.greaterThan(0.7).and(positionWorld.y.lessThan(u.floorY));

  // The hole. Structure: full size. Furniture (look A): scaled by its fade, so it only appears on
  // furniture that hides her. 0 inside the hole, 1 outside, with a soft band of width `soft`.
  const isStructure = structure.greaterThan(0.5);
  const radius = select(isStructure, u.radius, u.furnitureRadius.mul(fade));
  const soft = select(isStructure, u.soft, u.furnitureSoft.mul(fade));
  const mask = smoothstep(radius.sub(soft), radius, d);
  // Only between the camera and the target, and only when there's a hole at all (with radius 0,
  // smoothstep's edges meet and its result is undefined on GPUs).
  const inHole = t.greaterThan(0).and(t.lessThan(0.98)).and(radius.greaterThan(0.001)).and(mask.lessThanEqual(noise));
  // Whole-object fade (look B): dithers out the whole object, down to the minimum visibility.
  const faded = fade.mul(float(1).sub(u.minVisibility)).greaterThan(noise);
  // Near the camera, furniture is cut by the full hole whether or not it hides her (it fills the
  // view); near her, it stays unless it hides her. Soft over 10% of the way.
  const fullMask = smoothstep(u.furnitureRadius.sub(u.furnitureSoft), u.furnitureRadius, d);
  const nearMask = smoothstep(u.nearPart.sub(0.1), u.nearPart, t);
  const nearCamera = t.greaterThan(0).and(u.furnitureRadius.greaterThan(0.001)).and(fullMask.max(nearMask).lessThanEqual(noise)).and(positionWorld.y.greaterThan(u.waistY));
  const furnitureCut = select(u.furnitureFade.greaterThan(0.5).or(whole.greaterThan(0.5)), faded, inHole).or(nearCamera);
  const cut = select(isStructure, inHole, furnitureCut).and(ground.not());
  return cut.not();
})();

/** Debug tint for furniture being cut (only visible in the fade look's ghost, or at the hole's edge). */
const occluderTint = u.showOccluders.mul(fade).mul(select(structure.lessThan(0.5), float(1), float(0))).mul(0.7);

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
    const cutSurface = select(u.ownColour.greaterThan(0.5), materialColor.rgb.mul(u.shade), u.backColor.rgb);
    material.colorNode = select(frontFacing, mix(materialColor.rgb, vec3(1, 0.1, 0.3), occluderTint), cutSurface);
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
  furnitureLook: 'hole' | 'fade';
  minVisibility: number; // 0..1
  showOccluders: boolean;
  nearPart: number; // 0..1
  waist: number; // m above her feet
  ownColour: boolean;
  shade: number; // 0..1
}

/**
 * Per frame. `holeAmount` (0..1) scales the structure's hole: eased to 1 while something solid
 * hides her. `insideAmount` (0..1) scales the furniture cuts: eased to 1 while she's inside.
 */
export function updateCutaway(cameraPosition: THREE.Vector3, target: THREE.Vector3, feetY: number, holeAmount: number, insideAmount: number, s: CutawaySettings): void {
  u.camera.value.copy(cameraPosition);
  u.target.value.copy(target);
  u.floorY.value = feetY + 0.15;
  u.radius.value = s.radius * holeAmount;
  u.soft.value = Math.min(s.softness, s.radius) * holeAmount;
  u.furnitureRadius.value = s.radius * insideAmount;
  u.furnitureSoft.value = Math.min(s.softness, s.radius) * insideAmount;
  u.backColor.value.set(s.backColor);
  u.furnitureFade.value = s.furnitureLook === 'fade' ? 1 : 0;
  u.minVisibility.value = s.minVisibility;
  u.showOccluders.value = s.showOccluders ? 1 : 0;
  u.nearPart.value = s.nearPart;
  u.waistY.value = feetY + s.waist;
  u.ownColour.value = s.ownColour ? 1 : 0;
  u.shade.value = s.shade;
}
