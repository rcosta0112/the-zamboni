// See-through rules: what is cut, and how much.
// - The hole (structure: hull, walls, ceilings; and furniture on the other deck) opens only while
//   something solid hides her; glass doesn't count.
// - Furniture on her deck is cut only while it hides her head or enough of her (coverage), or the
//   way ahead (tall furniture only), and fades in and out instead of popping.
// - Exceptions: `seeThrough: "keep"` furniture is never cut for hiding her; `divider: true`
//   (bulkheads, inner walls) isn't cut while the camera is inside the ship (no hull between the
//   camera and her) unless it hides her (the camera trailing behind an inner wall); from outside
//   it's cut by the hole, or as a whole (tuning panel).
// The result goes on each mesh's userData (cutStructure, cutFade, cutWhole, cutSolid), read per
// object by cutaway.ts.
// Plan: doc/plans/features/see-through-rules.md

import * as THREE from 'three/webgpu';
import type { MeshBVH } from 'three-mesh-bvh';
import { settings } from './settings';

/** One object from the ship file (a glTF node) with the meshes it draws. */
export interface CutUnit {
  object: THREE.Object3D;
  meshes: THREE.Mesh[];
  /** Tagged `structure: true` (or under something that is): cut by the hole. */
  structure: boolean;
  /** Tagged `divider: true`: structure that can be cut as a whole instead (tuning panel). */
  divider: boolean;
  /** Tagged `seeThrough: "keep"`: never cut for hiding her. */
  keep: boolean;
  /** 0 = lower deck, 1 = upper deck, from the bottom of its bounds. */
  deck: 0 | 1;
  /** Top of its bounds (world y). */
  top: number;
  /** 0 = whole, 1 = cut. */
  fade: number;
  /** Seconds since it last hid her. */
  clearFor: number;
  /** Something she's looking at (Interaction, later): cut only if it hides her, never for other points. */
  lookTarget?: boolean;
  /** For the raycasts (the ship doesn't move): bounds, and each opaque mesh's BVH in its own space. */
  sphere: THREE.Sphere;
  targets: { bvh: MeshBVH; toLocal: THREE.Matrix4; scale: number }[];
}

export interface VisibilityInput {
  /** The hull: the camera is inside the ship when it isn't between the camera and her. */
  hull: CutUnit | undefined;
  camera: THREE.Vector3;
  /** Her feet (the rendered position). */
  feet: THREE.Vector3;
  height: number;
  facing: number;
  moving: boolean;
  /** Inside the ship with the see-through hull on. Outside, nothing is cut. */
  active: boolean;
  /** The deck she's on. */
  deck: 0 | 1;
  /** Other points to keep visible (look and interaction targets; none yet). */
  extraTargets?: THREE.Vector3[];
}

/** Heights on her body, as fractions of her height: feet, hips, chest, head. */
const ROWS = [0.08, 0.45, 0.7, 0.92];
/** Sideways offsets across her silhouette (m), as seen from the camera. */
const COLUMNS = [-0.2, 0, 0.2];
/** The centre head point: if it's hidden, the object is cut whatever the coverage. */
const HEAD = (ROWS.length - 1) * COLUMNS.length + 1;
/** Points for "does the structure hide her": head, chest, hips (centre), chest left and right. */
const STRUCTURE_POINTS = [HEAD, 2 * COLUMNS.length + 1, COLUMNS.length + 1, 2 * COLUMNS.length, 2 * COLUMNS.length + 2];
/** Seconds clear before the hole closes. */
const HOLE_HOLD = 0.3;

const herPoints = ROWS.flatMap(() => COLUMNS.map(() => new THREE.Vector3()));
const ahead = new THREE.Vector3();
const side = new THREE.Vector3();
const ray = new THREE.Ray();
const local = new THREE.Ray();
const dir = new THREE.Vector3();
const closest = new THREE.Vector3();
let holeClearFor = Infinity;
const solidDividers = new Set<CutUnit>();

/**
 * Per frame, after the camera has moved. Returns whether the hole should be open (something solid
 * hides her).
 */
export function updateVisibility(units: CutUnit[], s: VisibilityInput, dt: number): boolean {
  // Her silhouette, as seen from the camera: sideways is horizontal, across the view.
  side.subVectors(s.feet, s.camera).setY(0);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize().set(-side.z, 0, side.x);
  ROWS.forEach((r, i) => COLUMNS.forEach((c, j) => {
    herPoints[i * COLUMNS.length + j]!.copy(s.feet).addScaledVector(side, c).setY(s.feet.y + r * s.height);
  }));
  const waistY = s.feet.y + settings.furnitureWaist * s.height;
  const others: THREE.Vector3[] = [...(s.extraTargets ?? [])];
  if (s.moving && settings.wayAheadDistance > 0) {
    ahead.set(-Math.sin(s.facing), 0, -Math.cos(s.facing)).multiplyScalar(settings.wayAheadDistance).add(s.feet);
    ahead.y += 0.15;
  }

  // The camera is inside the ship when the hull isn't between it and her chest (through the
  // windshield counts as inside: glass doesn't hide her).
  const chest = herPoints[2 * COLUMNS.length + 1]!;
  const cameraInside = s.active && !(s.hull && hides(s.hull, s.camera, chest));
  // Dividers stay solid from inside, unless they hide her: then the hole cuts them as usual.
  solidDividers.clear();
  if (cameraInside) {
    for (const unit of units) if (unit.divider && !covers(unit, s.camera)) solidDividers.add(unit);
  }
  const solid = (unit: CutUnit) => solidDividers.has(unit);

  // The hole: open while anything solid that the hole cuts (structure, the other deck) hides her.
  let hidden = false;
  if (s.active) {
    for (const unit of units) {
      if (!cutByHole(unit, s.deck) || solid(unit)) continue;
      if (STRUCTURE_POINTS.some((k) => hides(unit, s.camera, herPoints[k]!))) {
        hidden = true;
        break;
      }
    }
  }
  holeClearFor = hidden ? 0 : holeClearFor + dt;
  const holeOpen = s.active && (!settings.holeOnlyWhenHidden || holeClearFor < HOLE_HOLD);

  const step = settings.furnitureFadeTime > 0 ? dt / settings.furnitureFadeTime : 1;
  for (const unit of units) {
    const byHole = cutByHole(unit, s.deck);
    const isSolid = solid(unit);
    let hidesHer = false;
    if (s.active && !byHole && !unit.keep && !isSolid) {
      hidesHer = covers(unit, s.camera) ||
        (!unit.lookTarget && unit.top > waistY && s.moving && settings.wayAheadDistance > 0 && hides(unit, s.camera, ahead)) ||
        (!unit.lookTarget && others.some((p) => hides(unit, s.camera, p)));
    }
    unit.clearFor = hidesHer ? 0 : unit.clearFor + dt;
    // Back only after it has been clear for a while, so objects at the edge don't flicker.
    const target = s.active && !byHole && unit.clearFor < settings.furnitureHoldTime ? 1 : 0;
    unit.fade = target > unit.fade ? Math.min(target, unit.fade + step) : Math.max(target, unit.fade - step);
    for (const mesh of unit.meshes) {
      mesh.userData.cutStructure = byHole ? 1 : 0;
      mesh.userData.cutFade = unit.fade;
      mesh.userData.cutWhole = unit.divider ? 1 : 0;
      mesh.userData.cutSolid = isSolid ? 1 : 0;
    }
  }
  return holeOpen;
}

/** Structure, and anything on the deck she isn't on, is cut by the hole. */
function cutByHole(unit: CutUnit, deck: 0 | 1): boolean {
  if (unit.structure) return !(unit.divider && settings.dividersWhole && unit.deck === deck);
  return unit.deck !== deck;
}

/** True if it hides her head, or more than the coverage share of her silhouette. */
function covers(unit: CutUnit, camera: THREE.Vector3): boolean {
  if (hides(unit, camera, herPoints[HEAD]!)) return true;
  const needed = Math.floor(settings.furnitureCoverage * herPoints.length) + 1;
  let count = 0;
  for (let k = 0; k < herPoints.length; k++) {
    if (k === HEAD) continue;
    if (hides(unit, camera, herPoints[k]!) && ++count >= needed) return true;
    // Not enough points left to reach it.
    if (count + (herPoints.length - 1 - k) < needed) return false;
  }
  return false;
}

/** True if the object's opaque triangles cross the line from the camera to the point. */
function hides(unit: CutUnit, camera: THREE.Vector3, point: THREE.Vector3): boolean {
  dir.subVectors(point, camera);
  const distance = dir.length();
  if (distance < 1e-3) return false;
  ray.set(camera, dir.divideScalar(distance));
  const far = distance - 0.05;
  // Cheap rejection: the line doesn't come near the object's bounds.
  const along = THREE.MathUtils.clamp(dir.dot(closest.subVectors(unit.sphere.center, camera)), 0, far);
  if (ray.at(along, closest).distanceToSquared(unit.sphere.center) > unit.sphere.radius * unit.sphere.radius) return false;
  for (const t of unit.targets) {
    local.copy(ray).applyMatrix4(t.toLocal);
    if (t.bvh.raycastFirst(local, THREE.DoubleSide, 0, far * t.scale)) return true;
  }
  return false;
}

/** Glass doesn't hide her: transparent or transmissive materials. */
function isGlass(mesh: THREE.Mesh): boolean {
  const m = mesh.material as THREE.MeshPhysicalMaterial;
  return m.transparent || (m.transmission ?? 0) > 0;
}

/** Bounds and BVHs for the raycasts; call once the meshes are in place (the ship doesn't move). */
export function prepareRaycasts(unit: CutUnit): void {
  const box = new THREE.Box3();
  for (const mesh of unit.meshes) box.expandByObject(mesh);
  unit.sphere = box.getBoundingSphere(new THREE.Sphere());
  unit.targets = unit.meshes
    .filter((mesh) => !isGlass(mesh) && mesh.geometry.boundsTree)
    .map((mesh) => {
      const toLocal = mesh.matrixWorld.clone().invert();
      // Ray.applyMatrix4 keeps the direction normalised, so lengths are converted with this
      // (the ship is scaled uniformly).
      return { bvh: mesh.geometry.boundsTree as MeshBVH, toLocal, scale: toLocal.getMaxScaleOnAxis() };
    });
}

export function newCutUnit(object: THREE.Object3D, tags: { structure: boolean; divider: boolean; keep: boolean }, deck: 0 | 1, top: number): CutUnit {
  return { object, meshes: [], ...tags, deck, top, fade: 0, clearFor: Infinity, sphere: new THREE.Sphere(), targets: [] };
}
