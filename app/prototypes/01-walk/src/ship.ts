// The Zamboni: exterior, cargo bay and the large interior elements (walls, bunks, couch, galley,
// cockpit seats and consoles, engineering benches...), landed a few metres from the start.
// Exported by app/tools/export-ship.py and compressed with Meshopt: the ship, and its collider
// (`zamboni_col`, positions only) in a separate file. Surfaces tagged `cuttable` in the file
// (glTF extras → userData) get the see-through hull. The cargo ramp ("Door Cargo") is a separate
// object hinged at its bottom edge; it opens down to the ground and has its own collider.

import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { makeCuttable } from './cutaway';
import type { Physics } from './physics';
import { settings } from './settings';

const SHIP_URL = '/test/zamboni-ship.glb';
const COLLIDER_URL = '/test/zamboni-ship-col.glb';
const RAMP = ['Door Cargo', 'Door_Cargo']; // as exported / as sanitised by GLTFLoader
const CARGO_FLOOR = ['Floor Bottom', 'Floor_Bottom'];

/** GLTFLoader's node names: spaces become underscores; . : / [ ] are removed. */
const sanitize = (name: string) => name.replace(/\s/g, '_').replace(/[[\].:/]/g, '');
const named = (o: THREE.Object3D, name: string) => o.name === name || o.name === sanitize(name);
const RAMP_SECONDS = 1.5; // time to open or close

export interface Ship {
  object: THREE.Object3D;
  collider: THREE.Mesh;
  ramp: THREE.Object3D;
  /** Hinge angle (radians) at which the ramp's far edge touches the ground. */
  rampOpenAngle: number;
  /** 0 = closed, 1 = open. */
  rampAmount: number;
  /** While moving or closed: a convex collider that follows the ramp. */
  rampCollider: { sync: () => void; setEnabled: (on: boolean) => void };
  /** When fully open: a smooth walkable slope from the ground to the cargo floor. */
  rampWalkway: { setEnabled: (on: boolean) => void };
  /** The ship's inside, in world space (both decks): "inside" for the see-through hull. */
  interior: THREE.Box3;
}

/**
 * @param scale the same scale as the characters (ship and crew share units in the Blender files)
 */
export async function loadShip(scene: THREE.Scene, physics: Physics, scale: number): Promise<Ship> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const [gltf, colGltf] = await Promise.all([loader.loadAsync(SHIP_URL), loader.loadAsync(COLLIDER_URL)]);
  const object = gltf.scene;

  // Landed ahead of the player, back toward them, so the open cargo ramp faces the start.
  object.scale.setScalar(scale);
  object.position.set(4, 0, -17);
  object.rotation.y = Math.PI;

  let ramp: THREE.Object3D | null = null;
  let cargoFloor: THREE.Object3D | null = null;
  const cuttable: THREE.Object3D[] = [];
  object.traverse((o) => {
    if (RAMP.includes(o.name)) ramp = o;
    if (CARGO_FLOOR.includes(o.name)) cargoFloor = o;
    if (o.userData.cuttable) cuttable.push(o);
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
  let collider: THREE.Mesh | null = null;
  colGltf.scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) collider = o as THREE.Mesh;
  });
  if (!collider) throw new Error(`${COLLIDER_URL} has no mesh`);
  if (!ramp) throw new Error(`${SHIP_URL} has no cargo ramp ("Door Cargo")`);
  if (!cargoFloor) throw new Error(`${SHIP_URL} has no cargo floor ("Floor Bottom")`);

  // See-through hull: cuttable copies of the tagged surfaces' materials.
  for (const node of cuttable) node.traverse((o) => (o as THREE.Mesh).isMesh && makeCuttable(o as THREE.Mesh));
  // The collider shares the ship's transform.
  object.add(colGltf.scene);
  const col: THREE.Mesh = collider;
  const rampDoor: THREE.Object3D = ramp;
  col.material = new THREE.MeshBasicNodeMaterial({ color: 0xff3366, wireframe: true });
  col.visible = false;

  scene.add(object);
  object.updateMatrixWorld(true);
  physics.addStaticMesh(col);

  // Inside the ship = within the hull's bounds (both decks), from just below the cargo floor up.
  // (The hull is roughly box-shaped; a proper trigger-volume system comes later.)
  const floorBox = new THREE.Box3().setFromObject(cargoFloor);
  let hull: THREE.Object3D | undefined;
  object.traverse((o) => {
    if (named(o, 'Hull_Merged')) hull = o;
  });
  if (!hull) throw new Error('The ship has no "Hull_Merged"');
  const hullBox = new THREE.Box3().setFromObject(hull);
  const interior = new THREE.Box3(
    new THREE.Vector3(hullBox.min.x, floorBox.max.y - 0.3, hullBox.min.z),
    new THREE.Vector3(hullBox.max.x, hullBox.max.y, hullBox.max.z),
  );

  // The ramp hinges on the door's origin in The Zamboni 1.18.blend, at the bottom of the hull
  // opening (owner, 2026-10-08). The export records it as `pivot`: compression moved the door
  // node's own origin, so a pivot is placed there and the door attached to it.
  const rampNode = hingeAt(object, rampDoor);

  // Find the hinge angle at which the ramp reaches the ground. While it moves (or is closed) it
  // has a convex collider that follows it (a copy of its mesh would keep the window cut through
  // it, which the character falls into). Fully open, a smooth walkable slope replaces it (the
  // modelled ramp has a lip where it meets the ground).
  const rampOpenAngle = findRampOpenAngle(rampNode);
  const rampWalkway = physics.addStaticTriangles(...walkwayTriangles(object, rampNode, cargoFloor));
  rampNode.rotation.x = 0;
  rampNode.updateWorldMatrix(true, true);
  const rampCollider = physics.addMovingConvex(rampNode);

  const ship: Ship = {
    object,
    collider: col,
    ramp: rampNode,
    rampOpenAngle,
    rampAmount: 0,
    rampCollider,
    rampWalkway,
    interior,
  };
  updateShip(ship, 0, true);
  return ship;
}

/** Per frame: animate the ramp toward open or closed, and keep its colliders with it. */
export function updateShip(ship: Ship, dt: number, force = false): void {
  ship.collider.visible = settings.showColliders;
  const target = settings.cargoRampOpen ? 1 : 0;
  if (!force && ship.rampAmount === target) return;
  const step = dt / RAMP_SECONDS;
  ship.rampAmount = force ? target : target > ship.rampAmount ? Math.min(target, ship.rampAmount + step) : Math.max(target, ship.rampAmount - step);
  const t = ship.rampAmount;
  const eased = t * t * (3 - 2 * t);
  ship.ramp.rotation.x = ship.rampOpenAngle * eased;
  ship.rampCollider.sync();
  const open = ship.rampAmount === 1;
  ship.rampWalkway.setEnabled(open);
  ship.rampCollider.setEnabled(!open);
}

/**
 * The walkable slope for the open ramp, in world space: from the ramp's far edge on the ground up
 * to the rear edge of the cargo floor, as wide as the ramp. Worked out in the ship's own space
 * (the ramp is at its open angle when this is called).
 */
function walkwayTriangles(ship: THREE.Object3D, ramp: THREE.Object3D, floor: THREE.Object3D): [Float32Array, Uint32Array] {
  ship.updateMatrixWorld(true);
  const toShip = new THREE.Matrix4().copy(ship.matrixWorld).invert();
  const boxInShip = (o: THREE.Object3D) => {
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    o.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh) return;
      const pos = mesh.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) box.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(toShip));
    });
    return box;
  };
  const r = boxInShip(ramp); // open: lies outside the back of the ship (more negative z)
  const f = boxInShip(floor);
  const x0 = r.min.x;
  const x1 = r.max.x;
  const top = f.max.y; // cargo floor surface
  const edge = f.min.z; // its rear edge
  const foot = r.min.z; // the ramp's far end, on the ground
  const corners = [
    new THREE.Vector3(x0, 0, foot),
    new THREE.Vector3(x1, 0, foot),
    new THREE.Vector3(x1, top, edge),
    new THREE.Vector3(x0, top, edge),
  ].map((p) => p.applyMatrix4(ship.matrixWorld));
  const vertices = new Float32Array(corners.flatMap((p) => [p.x, p.y, p.z]));
  return [vertices, new Uint32Array([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2])]; // both faces
}

/**
 * A pivot at the moving part's recorded `pivot` (ship space, from the export), with the part
 * attached to it (keeping its place). Rotating the pivot swings the part around its hinge.
 */
function hingeAt(ship: THREE.Object3D, part: THREE.Object3D): THREE.Object3D {
  const p = part.userData.pivot as [number, number, number] | undefined;
  if (!p) throw new Error(`"${part.name}" has no pivot recorded (re-export with app/tools/export-ship.py)`);
  ship.updateMatrixWorld(true);
  const pivot = new THREE.Object3D();
  pivot.name = `${part.name} hinge`;
  pivot.position.set(p[0], p[1], p[2]);
  ship.add(pivot);
  pivot.updateMatrixWorld(true);
  pivot.attach(part);
  return pivot;
}

/**
 * The ramp swings on its hinge (the pivot's X axis). Rotating it outward (negative angle around
 * its X axis, toward the back of the ship), find the first angle at which its lowest point
 * reaches the ground.
 */
function findRampOpenAngle(ramp: THREE.Object3D): number {
  const v = new THREE.Vector3();
  const lowestPoint = (angle: number) => {
    ramp.rotation.x = angle;
    ramp.updateWorldMatrix(true, true);
    let min = Infinity;
    ramp.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const pos = mesh.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) min = Math.min(min, v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).y);
    });
    return min;
  };
  for (let deg = 0; deg <= 180; deg += 0.25) {
    if (lowestPoint(THREE.MathUtils.degToRad(-deg)) <= 0.01) return THREE.MathUtils.degToRad(-deg);
  }
  return THREE.MathUtils.degToRad(-90);
}
