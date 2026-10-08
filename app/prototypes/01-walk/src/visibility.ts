// See-through rules: which furniture is cut, and how much. Structure (hull, walls, ceilings) is
// always cut by the hole; furniture on another deck is cut like structure; furniture on her deck
// is cut only while it hides a protected point (her head, chest, hips, feet; the way ahead while
// she walks; look targets later), and fades in and out instead of popping.
// The result goes on each mesh's userData (cutStructure, cutFade), read per object by cutaway.ts.
// Plan: doc/plans/features/see-through-rules.md

import * as THREE from 'three/webgpu';
import { settings } from './settings';

/** One object from the ship file (a glTF node) with the meshes it draws. */
export interface CutUnit {
  object: THREE.Object3D;
  meshes: THREE.Mesh[];
  /** Tagged `structure: true` (or under something that is): always cut by the hole. */
  structure: boolean;
  /** 0 = lower deck, 1 = upper deck, from the bottom of its bounds. */
  deck: 0 | 1;
  /** 0 = whole, 1 = cut. */
  fade: number;
  /** Seconds since it last hid a protected point. */
  clearFor: number;
  /** Something she's looking at (Interaction, later): cut only if it hides her, never for other points. */
  lookTarget?: boolean;
}

export interface VisibilityInput {
  camera: THREE.Vector3;
  /** Her feet (the rendered position). */
  feet: THREE.Vector3;
  height: number;
  facing: number;
  moving: boolean;
  /** Inside the ship with the see-through hull on. Outside, all furniture comes back. */
  active: boolean;
  /** The deck she's on. */
  deck: 0 | 1;
  /** Other points to keep visible (look and interaction targets; none yet). */
  extraTargets?: THREE.Vector3[];
}

/** Heights on her body, as fractions of her height: feet, hips, chest, head. */
const BODY = [0.08, 0.45, 0.7, 0.92];

const herPoints = BODY.map(() => new THREE.Vector3());
const ahead = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const dir = new THREE.Vector3();
const hits: THREE.Intersection[] = [];

/** Per frame, after the camera has moved. */
export function updateVisibility(units: CutUnit[], s: VisibilityInput, dt: number): void {
  herPoints.forEach((p, i) => p.copy(s.feet).setY(s.feet.y + BODY[i]! * s.height));
  const others: THREE.Vector3[] = [...(s.extraTargets ?? [])];
  if (s.moving && settings.wayAheadDistance > 0) {
    ahead.set(-Math.sin(s.facing), 0, -Math.cos(s.facing)).multiplyScalar(settings.wayAheadDistance).add(s.feet);
    ahead.y += 0.15;
    others.push(ahead);
  }

  for (const unit of units) {
    if (unit.structure) continue;
    const otherDeck = s.active && unit.deck !== s.deck;
    let hides = false;
    if (s.active && !otherDeck) {
      hides = hidesAny(unit, s.camera, herPoints) || (!unit.lookTarget && hidesAny(unit, s.camera, others));
    }
    unit.clearFor = hides ? 0 : unit.clearFor + dt;
    // Back only after it has been clear for a while, so objects at the edge don't flicker.
    const target = s.active && unit.clearFor < settings.furnitureHoldTime ? 1 : 0;
    const step = settings.furnitureFadeTime > 0 ? dt / settings.furnitureFadeTime : 1;
    unit.fade = target > unit.fade ? Math.min(target, unit.fade + step) : Math.max(target, unit.fade - step);
    for (const mesh of unit.meshes) {
      mesh.userData.cutStructure = otherDeck ? 1 : 0;
      mesh.userData.cutFade = unit.fade;
    }
  }
}

/** True if the object's triangles cross a line from the camera to any of the points. */
function hidesAny(unit: CutUnit, camera: THREE.Vector3, points: THREE.Vector3[]): boolean {
  for (const p of points) {
    dir.subVectors(p, camera);
    const distance = dir.length();
    if (distance < 1e-3) continue;
    raycaster.set(camera, dir.divideScalar(distance));
    raycaster.far = distance - 0.05;
    hits.length = 0;
    raycaster.intersectObjects(unit.meshes, false, hits);
    if (hits.length > 0) return true;
  }
  return false;
}

/** Furniture starts whole. */
export function newCutUnit(object: THREE.Object3D, structure: boolean, deck: 0 | 1): CutUnit {
  return { object, meshes: [], structure, deck, fade: 0, clearFor: Infinity };
}
