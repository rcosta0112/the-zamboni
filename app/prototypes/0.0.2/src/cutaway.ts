// See-through hull: on the ship's surfaces (everything but what's tagged `cuttable: false`), discard
// pixels so Dr. Green stays visible inside the ship while the camera stays outside. Dithered, so no
// transparency and no sorting problems.
// Plans: doc/plans/features/see-through-hull.md, doc/plans/features/see-through-rules.md
//
// - Structure (hull, walls, ceilings, and furniture on another deck): a hole, the pixels inside a
//   tube from the camera to her chest, its far end set by settings.holeEnd.
// - Furniture on her deck: cut only while it hides her (visibility.ts sets a per-object fade),
//   either by the same hole or by dithering out the whole object (tuning panel). Furniture near the
//   camera is cut by the hole above her waist anyway: it isn't next to her, it just fills the view.
// - Dividers (bulkheads, inner walls) switched to the furniture rules are always cut as a whole;
//   while the camera is inside the ship, they aren't cut at all.
//
// - material.maskNode: the cut (a pixel is discarded where it's false).
// - material.maskShadowNode = true: the shadow pass ignores the cut, so the hull keeps its full shadow.
// - Double-sided, back faces drawn in one dark colour: the cut edge reads as a solid cross-section.
//   Or single-sided (a switch in the tuning panel; owner, 2026-10-12): each material keeps the side
//   it has in the ship file, so through a cut you see what's behind it, not the surface's back.

import * as THREE from 'three/webgpu';
import { abs, bool, dot, float, floor, frontFacing, length, materialColor, mix, mod, normalWorld, output, positionWorld, screenCoordinate, select, smoothstep, clamp, texture, uniform, vec2, vec3, vec4 } from 'three/tsl';

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
  glassDim: uniform(0.1), // the glass: how much it dims what's behind it (0..1)
  glassHighlights: uniform(1), // the glass: its highlights' strength (1: as lit)
  nearPart: uniform(0.5), // furniture in the hole is cut on this part of the way from the camera to her
  waistY: uniform(0), // ...but only above this height (her waist)
  ownColour: uniform(1), // cut surface: 1 = the surface's own colour, darkened; 0 = backColor
  shade: uniform(0.35), // how much of its own colour the cut surface keeps
  fillColour: uniform(new THREE.Color(0x284644)), // the hull's gap, filled: one flat colour (unlit)
  holeEnd: uniform(2), // the hole's far end: 0 = square to the line of sight, 1 = a vertical plane, 2 = round
  holeBeyond: uniform(0), // ...this far past her chest (m; below 0: short of it)
};

/**
 * Per object, set on each mesh's userData by visibility.ts, packed into one uniform (one update per
 * draw instead of four: per-object uniforms cost CPU time on every draw):
 * x = 1: cut like structure; y: furniture's fade (0 whole, 1 cut); z = 1: cut as a whole when it's
 * cut (dividers); w = 1: not cut at all right now, -1: not drawn at all (hidden).
 */
const perObject = uniform(new THREE.Vector4(1, 0, 0, 0)).onObjectUpdate(({ object }, self) => {
  const d = object?.userData;
  (self.value as THREE.Vector4).set(
    (d?.cutStructure as number | undefined) ?? 1,
    (d?.cutFade as number | undefined) ?? 0,
    (d?.cutWhole as number | undefined) ?? 0,
    (d?.cutSolid as number | undefined) ?? 0,
  );
});
const structure = perObject.x;
const fade = perObject.y;
const whole = perObject.z;
const solid = perObject.w;

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
  // The hole's far end (owner, 2026-10-15), holeBeyond past her chest (the floor she stands on stays:
  // `ground`). Vertical: a plane square to the camera's direction seen from above, so walls beside her
  // end in vertical edges whatever the pitch. Round: a hemisphere of the hole's radius that closes
  // there, so the hole narrows as it nears her. Otherwise a plane square to the line of sight (it
  // leans with the pitch); vertical falls back to it when the camera looks almost straight down,
  // where "seen from above" means nothing.
  const lengthAB = length(ab);
  const across = length(vec2(ab.x, ab.z));
  const round = u.holeEnd.greaterThan(1.5);
  const capT = float(1).add(u.holeBeyond.sub(radius).div(lengthAB));
  const dRound = length(positionWorld.sub(u.camera.add(ab.mul(clamp(t, 0, capT.max(0))))));
  const mask = smoothstep(radius.sub(soft), radius, select(round, dRound, d));
  const pastAlongSight = t.sub(1).mul(lengthAB);
  const pastSeenFromAbove = dot(vec2(positionWorld.x.sub(u.target.x), positionWorld.z.sub(u.target.z)), vec2(ab.x, ab.z)).div(across.max(1e-4));
  const vertical = u.holeEnd.greaterThan(0.5).and(round.not()).and(across.greaterThan(lengthAB.mul(0.2)));
  const beforeEnd = round.or(select(vertical, pastSeenFromAbove, pastAlongSight).lessThan(u.holeBeyond));
  // Only between the camera and the end, and only when there's a hole at all (with radius 0,
  // smoothstep's edges meet and its result is undefined on GPUs).
  const inHole = t.greaterThan(0).and(beforeEnd).and(radius.greaterThan(0.001)).and(mask.lessThanEqual(noise));
  // Whole-object fade (look B): dithers out the whole object, down to the minimum visibility.
  const faded = fade.mul(float(1).sub(u.minVisibility)).greaterThan(noise);
  // Near the camera, furniture is cut by the full hole whether or not it hides her (it fills the
  // view); near her, it stays unless it hides her. Soft over 10% of the way.
  const fullMask = smoothstep(u.furnitureRadius.sub(u.furnitureSoft), u.furnitureRadius, d);
  const nearMask = smoothstep(u.nearPart.sub(0.1), u.nearPart, t);
  const nearCamera = t.greaterThan(0).and(u.furnitureRadius.greaterThan(0.001)).and(fullMask.max(nearMask).lessThanEqual(noise)).and(positionWorld.y.greaterThan(u.waistY));
  const furnitureCut = select(u.furnitureFade.greaterThan(0.5).or(whole.greaterThan(0.5)), faded, inHole).or(nearCamera);
  const cut = select(isStructure, inHole, furnitureCut).and(ground.not()).and(solid.lessThan(0.5));
  return cut.or(solid.lessThan(-0.5)).not();
})();

/** Debug tint for furniture being cut (only visible in the fade look's ghost, or at the hole's edge). */
const occluderTint = u.showOccluders.mul(fade).mul(select(structure.lessThan(0.5), float(1), float(0))).mul(0.7);

/** One cuttable copy per source material, shared by every mesh that uses it. */
const copies = new Map<THREE.Material, THREE.MeshStandardNodeMaterial>();
/** The hull's parts: front faces only, whatever the single-sided switch (fillBackFaces). */
const frontCopies = new Map<THREE.Material, THREE.MeshStandardNodeMaterial>();
const sourceOf = new Map<THREE.Material, THREE.MeshStandardMaterial>();
/** The hull gap's fill material (fillBackFaces). */
let fill: THREE.MeshBasicNodeMaterial | null = null;
let singleSided = false;
let reflections: THREE.Texture | null = null;

/**
 * What metal reflects (an equirectangular texture): set before the ship loads. Metallic materials
 * have no diffuse colour, so without something to reflect they're black but for the lights'
 * highlights. Its strength is `scene.environmentIntensity`.
 */
export function setReflections(environment: THREE.Texture): void {
  reflections = environment;
}

/**
 * Single-sided: every cuttable material is drawn with the side it has in the ship file (backface
 * culling in Blender). Otherwise double-sided, with the dark back faces.
 */
export function setSingleSided(on: boolean): void {
  if (on === singleSided) return;
  singleSided = on;
  for (const [source, material] of copies) {
    material.side = on ? source.side : THREE.DoubleSide;
    material.needsUpdate = true;
  }
}

/**
 * Give a mesh the cuttable copy of its material (copies, because nothing else may be cut, e.g. the
 * ramp and Dr. Green). The copy keeps every property of the source (physical ones too:
 * transmission, specular...), so cut and uncut surfaces look the same.
 */
export function makeCuttable(mesh: THREE.Mesh): void {
  const source = mesh.material as THREE.MeshStandardMaterial;
  let material = copies.get(source);
  if (!material) {
    material = cuttableCopy(source, 'cuttable');
    material.side = singleSided ? source.side : THREE.DoubleSide;
    copies.set(source, material);
  }
  sourceOf.set(material, source);
  mesh.material = material;
}

function cuttableCopy(source: THREE.MeshStandardMaterial, label: string): THREE.MeshStandardNodeMaterial {
  // Always physical: at its defaults (ior 1.5, specular 1) it shades as a standard material does,
  // and one kind of material means fewer shaders (pipelines.ts; most of the file's are physical).
  const material = new THREE.MeshPhysicalNodeMaterial();
  // As three's own conversion does (NodeLibrary.fromMaterial), minus the identity.
  const target = material as unknown as Record<string, unknown>;
  for (const key in source) {
    if (key === 'uuid' || key === 'type' || key === 'name') continue;
    target[key] = (source as unknown as Record<string, unknown>)[key];
  }
  material.name = `${source.name} (${label})`;
  // Cast shadows from the back faces only, as a closed single-sided hull would.
  material.shadowSide = THREE.BackSide;
  const cutSurface = select(u.ownColour.greaterThan(0.5), materialColor.rgb.mul(u.shade), u.backColor.rgb);
  const surface = select(frontFacing, mix(materialColor.rgb, vec3(1, 0.1, 0.3), occluderTint), cutSurface);
  // A colour node without alpha is opaque: keep the alpha of the colour texture (the scanner's ray).
  material.colorNode = source.transparent && source.map ? vec4(surface, texture(source.map).a) : surface;
  material.maskNode = keep;
  // Not glass: it's see-through, and in the ship file it's fully metallic too.
  // Only the texture is used (three samples it by direction); the coordinate keeps it from asking
  // for the mesh's UVs, which untextured meshes no longer have (pipelines.ts).
  if (reflections && source.metalness >= 0.5 && !source.transparent) material.envNode = texture(reflections, vec2(0));
  // The glass (see-through, metallic, untextured: the windows, the windshield): nearly invisible, as in
  // Blender, its highlights kept (owner, 2026-10-23). Normal blending scaled its highlights by its
  // opacity and laid its dark body over the view; here the highlights are added whole and what's
  // behind is dimmed by `glassDim` alone (the body is black: metal, no reflection of the sky).
  if (source.transparent && !source.map && source.metalness >= 0.5) {
    material.blending = THREE.CustomBlending;
    material.blendSrc = THREE.OneFactor;
    material.blendDst = THREE.OneMinusSrcAlphaFactor;
    material.blendSrcAlpha = THREE.OneFactor;
    material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    material.outputNode = vec4(output.rgb.mul(u.glassHighlights), u.glassDim);
  }
  material.maskShadowNode = bool(true);
  return material;
}

/**
 * The hull has an outer and an inner skin with a gap between, and parts that sit in the gap (the
 * ceilings, the ceiling lights, the tops of the inner walls) (owner, 2026-10-14): where the hole cuts
 * them, the gap showed through. Each drawn part of the hull (ship.ts: the shell and its inner parts)
 * draws its front faces as before (front only, even where the file's material is double-sided) and
 * a second mesh on the same geometry draws its back faces, unlit, in one flat colour (*hull gap
 * colour*), cut like the mesh: through the cut, whatever is seen from behind reads as one solid
 * edge. (Each material's own colour was tried first: the outer skin and the lining then showed in
 * two colours at two depths, which still read as a hollow wall.) Unlit, as no light reaches inside
 * the gap (lit back faces came out black there). Call after makeCuttable; the fill shares the mesh's
 * userData (its see-through values).
 */
export function fillBackFaces(mesh: THREE.Mesh): void {
  const copy = mesh.material as THREE.MeshStandardNodeMaterial;
  const source = sourceOf.get(copy);
  // Not glass: from inside, the windows would turn solid.
  if (!source || source.transparent || ((source as THREE.MeshPhysicalMaterial).transmission ?? 0) > 0) return;
  let front = frontCopies.get(source);
  if (!front) {
    front = cuttableCopy(source, 'cuttable, front');
    front.side = THREE.FrontSide;
    frontCopies.set(source, front);
  }
  mesh.material = front;
  if (!fill) {
    fill = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide });
    fill.name = 'hull gap';
    fill.colorNode = u.fillColour;
    fill.maskNode = keep;
  }
  const fillMesh = new THREE.Mesh(mesh.geometry, fill);
  fillMesh.name = `${mesh.name} (hull gap)`;
  fillMesh.userData = mesh.userData;
  fillMesh.castShadow = false;
  fillMesh.receiveShadow = false;
  fillMesh.raycast = () => undefined;
  mesh.add(fillMesh);
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
  fillColour: string; // the hull's gap
  holeEnd: 'square' | 'vertical' | 'round';
  holeBeyond: number; // m past her chest
  glassDim: number; // 0..1: how much the glass dims what's behind it
  glassHighlights: number; // the glass's highlights (1: as lit)
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
  u.fillColour.value.set(s.fillColour);
  u.holeEnd.value = ['square', 'vertical', 'round'].indexOf(s.holeEnd);
  u.holeBeyond.value = s.holeBeyond;
  u.glassDim.value = s.glassDim;
  u.glassHighlights.value = s.glassHighlights;
}
