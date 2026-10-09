// Doors the player opens and closes: the side door, the trapdoor, the roof hatches, the fridge,
// galley and locker doors. Each is tagged in the ship file (export-ship.py) with a `door` property:
// the hinge axis (ship space), the open angle, `toGround` (the side door drops outward until it rests
// on the ground; fully open, it's a ramp: a smooth walkable slope stands in for its steps, as for the
// cargo ramp) and `startOpen` (the trapdoor, for now). The hinge is at the recorded `hinge` point.
// Plan: doc/plans/features/interaction-doors.md

import * as THREE from 'three/webgpu';
import { named } from './names';
import { prepareRaycasts, type CutUnit } from './visibility';
import type { MovingCollider, Physics } from './physics';
import { settings } from './settings';

/** Doors big enough to collide with her (the fridge and galley doors are small and low: no collider). */
const COLLIDES = ['Door', 'Hatch.002', 'Top Hatch', 'Top Hatch Bottom', 'Locker Door', 'Locker Door.001', 'Locker Door.003'];

export class Door {
  /** 0 = closed, 1 = open. */
  amount = 0;
  open = false;
  /** Set when the door stopped against her. */
  blocked = false;
  readonly units: CutUnit[] = [];
  /** A door that's a ramp when fully open: the walkable slope then replaces its collider. */
  walkway: { setEnabled: (on: boolean) => void } | null = null;

  constructor(
    readonly name: string,
    /** The door's own object (what's tagged in the file). */
    readonly object: THREE.Object3D,
    /** The hinge: rotating it swings the door. */
    readonly hinge: THREE.Object3D,
    readonly axis: THREE.Vector3,
    readonly openAngle: number,
    readonly collider: MovingCollider | null,
  ) {}

  toggle(): void {
    this.open = !this.open;
  }

  /** Per frame: ease toward open or closed. A door that would swing into her stops where it is. */
  update(dt: number, force = false): void {
    const target = this.open ? 1 : 0;
    if (!force && this.amount === target) return;
    const before = this.amount;
    const step = dt / settings.doorSeconds;
    this.amount = force ? target : target > this.amount ? Math.min(target, this.amount + step) : Math.max(target, this.amount - step);
    this.pose();
    if (this.collider && !force && this.collider.overlapsCharacter()) {
      this.amount = before;
      this.pose();
      this.blocked = true;
      return;
    }
    this.blocked = false;
    this.collider?.sync();
    if (this.walkway) {
      const open = this.amount === 1;
      this.walkway.setEnabled(open);
      this.collider?.setEnabled(!open);
    }
    for (const unit of this.units) prepareRaycasts(unit);
  }

  private pose(): void {
    const t = this.amount;
    this.hinge.quaternion.setFromAxisAngle(this.axis, this.openAngle * t * t * (3 - 2 * t));
    this.hinge.updateMatrixWorld(true);
  }
}

/**
 * The doors in the ship: a hinge for each (the part attached to it), its open angle (for `toGround`,
 * the first angle at which it touches the ground), and a collider for the big ones.
 */
export function createDoors(ship: THREE.Object3D, physics: Physics, hingeAt: (ship: THREE.Object3D, part: THREE.Object3D) => THREE.Object3D): Door[] {
  const tagged: THREE.Object3D[] = [];
  ship.traverse((o) => {
    if (o.userData.door) tagged.push(o);
  });
  return tagged.map((object) => {
    const data = object.userData.door as { axis: [number, number, number]; angle: number; toGround: boolean; startOpen?: boolean };
    const hinge = hingeAt(ship, object);
    const axis = new THREE.Vector3(...data.axis).normalize();
    const openAngle = data.toGround ? angleToGround(hinge, axis, data.angle) : data.angle;
    const walkway = data.toGround ? physics.addStaticTriangles(...walkwayTriangles(hinge, axis, physics)) : null;
    hinge.quaternion.identity();
    hinge.updateMatrixWorld(true);
    const collider = COLLIDES.some((n) => named(object, n)) ? physics.addMovingConvex(hinge) : null;
    const door = new Door(object.name, object, hinge, axis, openAngle, collider);
    door.walkway = walkway;
    door.open = data.startOpen === true; // posed by the ship's first (forced) update
    return door;
  });
}

/** Steepest the stand-in slope may be (her controller climbs up to 45°). */
const WALKWAY_SLOPE = THREE.MathUtils.degToRad(42);

/**
 * The walkable stand-in for a door that opens down to the ground (it's at its open angle when this
 * is called), in world space and as wide as the door: a slope up to the top of the doorway's sill,
 * then flat across the sill into the ship. The door's own steps would be bumpy, and the sill stands
 * above both the door's hinge and the floor inside, so the slope aims at the sill's outer edge, at
 * most WALKWAY_SLOPE steep: its foot may lie a little past the door's far end.
 */
function walkwayTriangles(hinge: THREE.Object3D, shipAxis: THREE.Vector3, physics: Physics): [Float32Array, Uint32Array] {
  hinge.updateWorldMatrix(true, true);
  const h = new THREE.Vector3().setFromMatrixPosition(hinge.matrixWorld);
  const axis = shipAxis.clone().transformDirection(hinge.parent!.matrixWorld);
  // The far end (lowest point, brought back to the hinge's line across the door) and the width.
  const v = new THREE.Vector3();
  const far = new THREE.Vector3(0, Infinity, 0);
  let minW = Infinity;
  let maxW = -Infinity;
  hinge.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (v.y < far.y) far.copy(v);
      const w = v.clone().sub(h).dot(axis);
      minW = Math.min(minW, w);
      maxW = Math.max(maxW, w);
    }
  });
  far.addScaledVector(axis, -far.clone().sub(h).dot(axis));
  const outward = new THREE.Vector3(far.x - h.x, 0, far.z - h.z).normalize();
  // The sill: the static surfaces under the doorway, from just outside the hinge to just inside.
  const down = new THREE.Vector3(0, -1, 0);
  const heightAt = (d: number) => {
    const p = h.clone().addScaledVector(outward, d);
    p.y += 0.6;
    const hit = physics.ray(p, down, 1.2, true);
    return hit ? p.y - hit.distance : -Infinity;
  };
  let sillY = h.y;
  for (let d = 0.3; d >= -0.3; d -= 0.02) sillY = Math.max(sillY, heightAt(d));
  let edge = 0; // the sill's outer edge, as a distance outward from the hinge
  for (let d = 0.3; d >= -0.3; d -= 0.02) {
    if (heightAt(d) >= sillY - 0.03) {
      edge = d + 0.02;
      break;
    }
  }
  const top = h.clone().addScaledVector(outward, edge);
  top.y = sillY;
  const inside = h.clone().addScaledVector(outward, -0.3);
  inside.y = sillY;
  const run = Math.max(sillY / Math.tan(WALKWAY_SLOPE), new THREE.Vector3(far.x - top.x, 0, far.z - top.z).length());
  const foot = top.clone().addScaledVector(outward, run);
  foot.y = 0;
  console.info(`[01-walk] side door ramp: sill ${sillY.toFixed(3)} at ${edge.toFixed(2)} m out, hinge ${h.y.toFixed(3)}, foot ${run.toFixed(2)} m out`);
  const corners = [foot, top, inside].flatMap((p) => [p.clone().addScaledVector(axis, minW), p.clone().addScaledVector(axis, maxW)]);
  const vertices = new Float32Array(corners.flatMap((p) => [p.x, p.y, p.z]));
  // Two quads (slope, then flat), both faces: 0-1 foot, 2-3 sill edge, 4-5 inside.
  const quads: [number, number, number, number][] = [[0, 1, 3, 2], [2, 3, 5, 4]];
  const indices = quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d, a, c, b, a, d, c]);
  return [vertices, new Uint32Array(indices)];
}

/** Turning toward `limit`, the first angle at which the part's lowest point reaches the ground. */
function angleToGround(hinge: THREE.Object3D, axis: THREE.Vector3, limit: number): number {
  const v = new THREE.Vector3();
  const lowest = (angle: number) => {
    hinge.quaternion.setFromAxisAngle(axis, angle);
    hinge.updateWorldMatrix(true, true);
    let min = Infinity;
    hinge.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const pos = mesh.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) min = Math.min(min, v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).y);
    });
    return min;
  };
  const steps = Math.ceil(Math.abs(THREE.MathUtils.radToDeg(limit)) * 4);
  for (let i = 0; i <= steps; i++) {
    const angle = (limit * i) / steps;
    if (lowest(angle) <= 0.01) return angle;
  }
  return limit;
}
