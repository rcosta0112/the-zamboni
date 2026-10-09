// The Zamboni: exterior, cargo bay and the large interior elements (walls, bunks, couch, galley,
// cockpit seats and consoles, engineering benches...), landed a few metres from the start.
// Exported by app/tools/export-ship.py and compressed with Meshopt: the ship, and its collider
// (`zamboni_col`, positions only) in a separate file. Everything gets the see-through hull except
// what's tagged `cuttable: false` in the file (glTF extras → userData): the ramp, the landing gear.
// Objects tagged `structure: true` are cut by the hole; the rest is furniture (visibility.ts), with
// exceptions tagged `seeThrough: "keep"` and `divider: true`. The cargo ramp ("Door Cargo") is a separate
// object hinged at its bottom edge; it opens down to the ground and has its own collider. The other
// doors (side door, hatches, fridge, galley and lockers) are in doors.ts.

import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh';
import { makeCuttable } from './cutaway';
import { createDoors, type Door } from './doors';
import { named } from './names';
import { newCutUnit, prepareRaycasts, type CutUnit } from './visibility';
import type { MovingCollider, Physics } from './physics';
import { settings } from './settings';

const SHIP_URL = '/test/zamboni-ship.glb';
const COLLIDER_URL = '/test/zamboni-ship-col.glb';
const RAMP = ['Door Cargo', 'Door_Cargo']; // as exported / as sanitised by GLTFLoader
const CARGO_FLOOR = ['Floor Bottom', 'Floor_Bottom'];

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
  rampCollider: MovingCollider;
  /** When fully open: a smooth walkable slope from the ground to the cargo floor. */
  rampWalkway: { setEnabled: (on: boolean) => void };
  /** The ship's inside, in world space (both decks): "inside" for the see-through hull. */
  interior: THREE.Box3;
  /** The upper deck's floor height (world): decks for the see-through rules. */
  upperFloorY: number;
  /** The ship's objects, for the see-through rules. */
  cutUnits: CutUnit[];
  /** The hull's object: "is the camera inside the ship?" */
  hullUnit: CutUnit | undefined;
  /** The cargo ramp's objects: cut like the hull while closed, never while open. */
  rampUnits: CutUnit[];
  /** The doors the player opens and closes (not the ramp). */
  doors: Door[];
  /** The static ship's shadow, as one mesh only the sun's shadow camera sees (SHADOW_LAYER). */
  shadowCaster: THREE.Mesh;
}

/** Layer of the merged shadow caster: the sun's shadow camera renders it, the view camera doesn't. */
export const SHADOW_LAYER = 1;

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
  const cuttable: THREE.Mesh[] = [];
  object.traverse((o) => {
    if (RAMP.includes(o.name)) ramp = o;
    if (CARGO_FLOOR.includes(o.name)) cargoFloor = o;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !neverCut(mesh, object)) cuttable.push(mesh);
    if (!mesh.isMesh) return;
    // Props don't cast shadows: inside the hull the sun doesn't reach them, and each shadow-casting
    // mesh is drawn twice.
    mesh.castShadow = !isProp(mesh, object);
    mesh.receiveShadow = true;
  });
  let collider: THREE.Mesh | null = null;
  colGltf.scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) collider = o as THREE.Mesh;
  });
  if (!collider) throw new Error(`${COLLIDER_URL} has no mesh`);
  if (!ramp) throw new Error(`${SHIP_URL} has no cargo ramp ("Door Cargo")`);
  if (!cargoFloor) throw new Error(`${SHIP_URL} has no cargo floor ("Floor Bottom")`);

  // See-through hull: cuttable copies of the materials (one per source material), and a BVH per
  // mesh so the see-through rules' raycasts are fast (the hull and the Contraption are dense).
  for (const mesh of cuttable) {
    makeCuttable(mesh);
    mesh.geometry.boundsTree = new MeshBVH(mesh.geometry);
    mesh.raycast = acceleratedRaycast;
  }
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
  let upperFloor: THREE.Object3D | undefined;
  object.traverse((o) => {
    if (named(o, 'Floor Top.001')) upperFloor = o;
  });
  if (!upperFloor) throw new Error('The ship has no upper floor ("Floor Top.001")');
  const upperFloorY = new THREE.Box3().setFromObject(upperFloor).max.y;
  const cutUnits = groupCutUnits(object, gltf.parser.associations, cuttable, upperFloorY);
  const hullBox = new THREE.Box3().setFromObject(hull);
  const interior = new THREE.Box3(
    new THREE.Vector3(hullBox.min.x, floorBox.max.y - 0.3, hullBox.min.z),
    new THREE.Vector3(hullBox.max.x, hullBox.max.y, hullBox.max.z),
  );

  // The ramp hinges on the door's origin in The Zamboni 1.18.blend, at the bottom of the hull
  // opening (owner, 2026-10-08). The export records it as `hinge`: compression moved the door
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
  const doors = createDoors(object, physics, hingeAt);
  for (const door of doors) door.units.push(...cutUnits.filter((u) => isInside(u.object, door.hinge)));

  const ship: Ship = {
    object,
    collider: col,
    ramp: rampNode,
    rampOpenAngle,
    rampAmount: 0,
    rampCollider,
    rampWalkway,
    interior,
    upperFloorY,
    cutUnits,
    hullUnit: cutUnits.find((u) => named(u.object, 'Hull_Merged')),
    rampUnits: cutUnits.filter((u) => isInside(u.object, rampDoor)),
    doors,
    shadowCaster: mergeShadowCasters(object, [rampNode, ...doors.map((d) => d.hinge)]),
  };
  scene.add(ship.shadowCaster);
  updateShip(ship, 0, true);
  return ship;
}

/**
 * Groups the cuttable meshes by the object (glTF node) they belong to: a Blender object with
 * several materials loads as a group of meshes, one per material. Each object gets its group
 * (structure or furniture) from its tags and its deck from its bounds.
 */
function groupCutUnits(
  ship: THREE.Object3D,
  associations: Map<unknown, { nodes?: number }>,
  meshes: THREE.Mesh[],
  upperFloorY: number,
): CutUnit[] {
  const byNode = new Map<THREE.Object3D, THREE.Mesh[]>();
  for (const mesh of meshes) {
    // A mesh is its glTF node, unless it's one material's part of a node with several: then the
    // node is the group around it (GLTFLoader doesn't always record that group as a node).
    const node: THREE.Object3D = associations.get(mesh)?.nodes === undefined && mesh.parent && mesh.parent !== ship ? mesh.parent : mesh;
    const list = byNode.get(node) ?? [];
    list.push(mesh);
    byNode.set(node, list);
  }
  const units: CutUnit[] = [];
  for (const [node, list] of byNode) {
    const box = new THREE.Box3();
    for (const mesh of list) box.expandByObject(mesh);
    const tags = {
      structure: tagged(node, ship, 'structure', true),
      divider: tagged(node, ship, 'divider', true),
      keep: tagged(node, ship, 'seeThrough', 'keep'),
      solid: tagged(node, ship, 'seeThrough', 'solid'),
    };
    const unit = newCutUnit(node, tags, box.min.y >= upperFloorY - 0.4 ? 1 : 0, box.max.y);
    unit.meshes = list;
    prepareRaycasts(unit);
    for (const mesh of list) {
      mesh.userData.cutStructure = tags.structure ? 1 : 0;
      mesh.userData.cutFade = 0;
      mesh.userData.cutWhole = 0;
      mesh.userData.cutSolid = 0;
    }
    units.push(unit);
  }
  markAttachedToBulkheads(units, ship);
  return units;
}

/** How close (m) an object must be to a bulkhead to count as attached to it. */
const ATTACHED = 0.03;

/**
 * Objects attached to a bulkhead behave like the bulkhead (owner, 2026-10-09): any furniture whose
 * surface comes within ATTACHED of a bulkhead's, by the meshes' BVHs.
 */
function markAttachedToBulkheads(units: CutUnit[], ship: THREE.Object3D): void {
  const isBulkhead = (u: CutUnit) => {
    for (let n: THREE.Object3D | null = u.object; n && n !== ship; n = n.parent) if (n.name.startsWith('Bulkhead')) return true;
    return false;
  };
  const bulkheads = units.filter(isBulkhead);
  for (const unit of bulkheads) unit.bulkhead = true;
  const toBulkhead = new THREE.Matrix4();
  const a = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
  const b = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
  for (const unit of units) {
    if (unit.structure || unit.divider || unit.solid) continue;
    search: for (const bulkhead of bulkheads) {
      if (!unit.sphere.intersectsSphere(new THREE.Sphere(bulkhead.sphere.center, bulkhead.sphere.radius + ATTACHED))) continue;
      for (const target of bulkhead.targets) {
        for (const mesh of unit.meshes) {
          toBulkhead.multiplyMatrices(target.toLocal, mesh.matrixWorld);
          const hit = target.bvh.closestPointToGeometry(mesh.geometry, toBulkhead, a, b, 0, ATTACHED * target.scale);
          if (hit) {
            unit.divider = true;
            unit.bulkhead = true;
            unit.attachedTo = bulkheadName(bulkhead, ship);
            break search;
          }
        }
      }
    }
  }
  const attached = units.filter((u) => u.attachedTo).map((u) => `${u.object.name || `(part of ${u.object.parent?.name})`} → ${u.attachedTo}`);
  console.info(`[01-walk] attached to bulkheads (behave like them): ${attached.join(', ') || 'none'}`);
}

function bulkheadName(unit: CutUnit, ship: THREE.Object3D): string {
  for (let n: THREE.Object3D | null = unit.object; n && n !== ship; n = n.parent) if (n.name.startsWith('Bulkhead')) return n.name;
  return unit.object.name;
}

/** True if the object or one of its parents (up to the ship) has `userData[key] === value`. */
function tagged(o: THREE.Object3D, ship: THREE.Object3D, key: string, value: unknown): boolean {
  for (let n: THREE.Object3D | null = o; n && n !== ship; n = n.parent) {
    if (n.userData[key] === value) return true;
  }
  return false;
}

/** True if the mesh or one of its parents (up to the ship) is a prop (tagged `prop: true`). */
function isProp(mesh: THREE.Object3D, ship: THREE.Object3D): boolean {
  for (let o: THREE.Object3D | null = mesh; o && o !== ship; o = o.parent) if (o.userData.prop === true) return true;
  return false;
}

/** True if the mesh or one of its parents (up to the ship) is tagged `cuttable: false`. */
function neverCut(mesh: THREE.Object3D, ship: THREE.Object3D): boolean {
  for (let o: THREE.Object3D | null = mesh; o && o !== ship; o = o.parent) {
    if (o.userData.cuttable === false) return true;
  }
  return false;
}

/** Per frame: animate the ramp toward open or closed, and keep its colliders with it. */
export function updateShip(ship: Ship, dt: number, force = false): void {
  ship.collider.visible = settings.showColliders;
  for (const door of ship.doors) door.update(dt, force);
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
  // See-through: the ramp is the cargo bay's back wall while closed (cut like the hull); open, it's
  // the way in and is never cut. Its raycast data follows it.
  ship.ramp.updateMatrixWorld(true);
  for (const unit of ship.rampUnits) {
    unit.forceSolid = open;
    prepareRaycasts(unit);
  }
}

/**
 * The static ship's shadow as one mesh (positions only, world space): every mesh that casts a
 * shadow, except the moving parts (ramp, doors), joined; those meshes then stop casting. Drawing hundreds of
 * see-through meshes into the shadow map was ~310 draw calls per frame, each with the see-through
 * material's per-draw cost; this is one. It's on SHADOW_LAYER, so only the sun's shadow camera
 * draws it. Back faces cast, as the see-through materials did (shadowSide).
 */
function mergeShadowCasters(ship: THREE.Object3D, moving: THREE.Object3D[]): THREE.Mesh {
  ship.updateMatrixWorld(true);
  const positions: number[] = [];
  const v = new THREE.Vector3();
  ship.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.castShadow || moving.some((m) => isInside(mesh, m))) return;
    const position = mesh.geometry.getAttribute('position');
    const index = mesh.geometry.getIndex();
    const count = index ? index.count : position.count;
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
      positions.push(v.x, v.y, v.z);
    }
    mesh.castShadow = false;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.MeshBasicNodeMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
  material.shadowSide = THREE.BackSide;
  const caster = new THREE.Mesh(geometry, material);
  caster.name = 'ship shadow caster';
  caster.castShadow = true;
  caster.frustumCulled = false;
  caster.layers.set(SHADOW_LAYER);
  return caster;
}

/** True if `o` is `ancestor` or below it. */
function isInside(o: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  for (let n: THREE.Object3D | null = o; n; n = n.parent) if (n === ancestor) return true;
  return false;
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
 * A pivot at the moving part's recorded `hinge` (ship space, from the export), with the part
 * attached to it (keeping its place). Rotating the pivot swings the part around its hinge.
 */
function hingeAt(ship: THREE.Object3D, part: THREE.Object3D): THREE.Object3D {
  // `hinge`, not `pivot`: three's GLTFLoader consumes a `pivot` extra on a node with children.
  const p = part.userData.hinge as [number, number, number] | undefined;
  if (!p) throw new Error(`"${part.name}" has no hinge recorded (re-export with app/tools/export-ship.py)`);
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
