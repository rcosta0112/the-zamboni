// The Zamboni: exterior, cargo bay and the large interior elements (walls, bunks, couch, galley,
// cockpit seats and consoles, engineering benches...), landed a few metres from the start.
// Exported by app/tools/export-ship.py and compressed with Meshopt: the ship, and its collider
// (`zamboni_col`, positions only) in a separate file, with the collision boxes as objects of their
// own (`*_col` objects tagged `reach: "through"`; they stop her, the reach test passes through them). Everything gets the see-through hull except
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
import { advance, createDoors, updateAutoDoors, type Door, type Pusher } from './doors';
import { downloads } from './loading';
import { named } from './names';
import { newCutUnit, prepareRaycasts, type CutUnit } from './visibility';
import type { MovingCollider, Physics } from './physics';
import { settings } from './settings';

const SHIP_URL = '/test/zamboni-ship.glb';
const COLLIDER_URL = '/test/zamboni-ship-col.glb';
/** The ladder whose collision is switched off while she's above it (ladders.ts). */
const LADDER = 'Ladder Cargo Bay';
/** The ship's collider in its file; every other mesh there is a collision box. */
const COLLIDER = 'zamboni_col';
const RAMP = ['Door Cargo', 'Door_Cargo']; // as exported / as sanitised by GLTFLoader
const CARGO_FLOOR = ['Floor Bottom', 'Floor_Bottom'];

const RAMP_SECONDS = 1.5; // time to open or close

export interface Ship {
  object: THREE.Object3D;
  collider: THREE.Mesh;
  /** The collision boxes (every mesh in the collider file but the collider): shown with the colliders. */
  boxes: THREE.Mesh[];
  /** Their colliders, once added. */
  boxColliders: { count: number; setEnabled: (on: boolean) => void } | null;
  ramp: THREE.Object3D;
  /** Hinge angle (radians) at which the ramp is closed: 0 if the file has it closed. */
  rampClosedAngle: number;
  /** Hinge angle (radians) at which the ramp's far edge touches the ground. */
  rampOpenAngle: number;
  /** 0 = closed, 1 = open. */
  rampAmount: number;
  /** Stopped against her: waiting until she's clear. */
  rampWaiting: boolean;
  /** Each ladder's own collider, by the ladder's name (null: it's part of the ship's). */
  ladderColliders: Record<string, { setEnabled: (on: boolean) => void } | null>;
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
  /** The same for its glass (windows, windshield): casts only while the sun isn't let through. */
  glassShadowCaster: THREE.Mesh;
}

/** Layer of the merged shadow caster: the sun's shadow camera renders it, the view camera doesn't. */
export const SHADOW_LAYER = 1;

/**
 * @param scale the same scale as the characters (ship and crew share units in the Blender files)
 * @param onProgress the share of the two files that has been downloaded
 */
export async function loadShip(scene: THREE.Scene, physics: Physics, scale: number, onProgress: (share: number) => void = () => undefined): Promise<Ship> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const [a, b] = downloads(2, onProgress);
  const [gltf, colGltf] = await Promise.all([loader.loadAsync(SHIP_URL, a), loader.loadAsync(COLLIDER_URL, b)]);
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
  const meshes: THREE.Mesh[] = [];
  colGltf.scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  const collider = meshes.find((m) => named(m, COLLIDER)) ?? null;
  const boxes = meshes.filter((m) => m !== collider);
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
  const boxMaterial = new THREE.MeshBasicNodeMaterial({ color: 0x33ddff, wireframe: true });
  for (const box of boxes) {
    box.material = boxMaterial;
    box.visible = false;
  }

  scene.add(object);
  object.updateMatrixWorld(true);
  // The ladder's triangles become a collider of their own, which ladders.ts switches off while she's
  // above its foot. (Found by its bounds, until the export leaves it out of the ship's collider.)
  const ladderColliders: Record<string, { setEnabled: (on: boolean) => void } | null> = {};
  let ladderBox: THREE.Box3 | undefined;
  object.traverse((o) => {
    if (named(o, LADDER)) ladderBox = new THREE.Box3().setFromObject(o).expandByScalar(0.02);
  });
  ladderColliders[LADDER] = physics.addStaticMesh(col, ladderBox);
  if (!ladderColliders[LADDER]) console.warn(`[01-walk] no collision triangles found for "${LADDER}": it can't be switched off`);

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
  const rampClosedAngle = closedAngle(rampDoor);
  const rampOpenAngle = findRampOpenAngle(rampNode, rampClosedAngle);
  console.info(`[01-walk] cargo ramp: closed at ${THREE.MathUtils.radToDeg(rampClosedAngle).toFixed(1)}°, open at ${THREE.MathUtils.radToDeg(rampOpenAngle).toFixed(1)}° (0° = as in the file)`);
  const rampWalkway = physics.addStaticTriangles(...walkwayTriangles(object, rampNode, cargoFloor, physics));
  rampNode.rotation.x = 0;
  rampNode.updateWorldMatrix(true, true);
  const rampCollider = physics.addMovingConvex(rampNode);
  const doors = createDoors(object, physics, hingeAt);
  for (const door of doors) door.units.push(...cutUnits.filter((u) => isInside(u.object, door.hinge)));

  const ship: Ship = {
    object,
    collider: col,
    boxes,
    boxColliders: null,
    ramp: rampNode,
    rampClosedAngle,
    rampOpenAngle,
    rampAmount: 0,
    rampWaiting: false,
    rampCollider,
    rampWalkway,
    ladderColliders,
    interior,
    upperFloorY,
    cutUnits,
    hullUnit: cutUnits.find((u) => named(u.object, 'Hull_Merged')),
    rampUnits: cutUnits.filter((u) => isInside(u.object, rampDoor)),
    doors,
    ...mergeShadowCasters(object, [rampNode, ...doors.map((d) => d.hinge)]),
  };
  scene.add(ship.shadowCaster, ship.glassShadowCaster);
  updateShip(ship, 0, true);
  return ship;
}

/**
 * The collision boxes' colliders: added after everything that measures the ship with rays (the
 * ladders, the ramp's walkway), as each box is convex and the rays would stop at it.
 */
export function addCollisionBoxes(ship: Ship, physics: Physics): void {
  if (ship.boxes.length === 0) console.warn("[01-walk] the ship's collider file has no collision boxes");
  ship.boxColliders = physics.addStaticConvex(ship.boxes, false);
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

/**
 * One fixed step: the doors and the ramp toward open or closed, pushing her out of their way, their
 * colliders with them. `force`: jump there (at load).
 */
export function updateShip(ship: Ship, dt: number, force = false, pusher?: Pusher): void {
  ship.collider.visible = settings.showColliders;
  for (const box of ship.boxes) box.visible = settings.showColliders && settings.collisionBoxes;
  ship.boxColliders?.setEnabled(settings.collisionBoxes);
  ship.glassShadowCaster.castShadow = !settings.sunThroughGlass;
  if (pusher) updateAutoDoors(ship.doors, pusher.feet(), settings.zamboniHeight);
  for (const door of ship.doors) door.update(dt, force, pusher);
  const target = settings.cargoRampOpen ? 1 : 0;
  if (!force && ship.rampAmount === target) {
    ship.rampWaiting = false;
    settings.cargoRampByKeypad = null;
    return;
  }
  // Moved from its keypad, she's inside the ship and can't be under it: it doesn't stop for her
  // (owner, 2026-10-14: touching it on its way down stopped it, and she was stuck between it and
  // the pallet). Moved any other way (the tuning panel, later from outside), it stops as doors do.
  const unstoppable = settings.cargoRampByKeypad === settings.cargoRampOpen;
  const step = dt / RAMP_SECONDS;
  const next = force ? target : target > ship.rampAmount ? Math.min(target, ship.rampAmount + step) : Math.max(target, ship.rampAmount - step);
  const pose = (t: number) => {
    ship.rampAmount = t;
    ship.ramp.rotation.x = THREE.MathUtils.lerp(ship.rampClosedAngle, ship.rampOpenAngle, t * t * (3 - 2 * t));
    ship.ramp.updateMatrixWorld(true);
  };
  if (force || !pusher) {
    pose(next);
  } else {
    const moved = advance(ship.rampCollider, pose, ship.rampAmount, next, pusher, ship.rampWaiting, unstoppable);
    ship.rampWaiting = moved.waiting;
  }
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
 * draws it. Both faces cast: with back faces only (until 2026-10-12), a wall facing the sun cast
 * nothing, and the sun leaked in along the seams between the inner walls once it was let in at all.
 * The glass (transparent materials: windows, the windshield) is a second mesh, so the sun can be let
 * through it into the rooms (owner, 2026-10-12: the crew quarters and cockpit were too blue).
 */
function mergeShadowCasters(ship: THREE.Object3D, moving: THREE.Object3D[]): { shadowCaster: THREE.Mesh; glassShadowCaster: THREE.Mesh } {
  ship.updateMatrixWorld(true);
  const solid: number[] = [];
  const glass: number[] = [];
  const v = new THREE.Vector3();
  ship.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.castShadow || moving.some((m) => isInside(mesh, m))) return;
    const material = mesh.material as THREE.MeshPhysicalMaterial;
    const positions = material.transparent || (material.transmission ?? 0) > 0 ? glass : solid;
    const position = mesh.geometry.getAttribute('position');
    const index = mesh.geometry.getIndex();
    const count = index ? index.count : position.count;
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(position, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
      positions.push(v.x, v.y, v.z);
    }
    mesh.castShadow = false;
  });
  const material = new THREE.MeshBasicNodeMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
  material.shadowSide = THREE.DoubleSide;
  const caster = (name: string, positions: number[]) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    mesh.layers.set(SHADOW_LAYER);
    return mesh;
  };
  console.info(`[01-walk] ship shadow: ${solid.length / 9} triangles, glass ${glass.length / 9}`);
  return { shadowCaster: caster('ship shadow caster', solid), glassShadowCaster: caster('ship shadow caster (glass)', glass) };
}

/** True if `o` is `ancestor` or below it. */
function isInside(o: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  for (let n: THREE.Object3D | null = o; n; n = n.parent) if (n === ancestor) return true;
  return false;
}

/**
 * The walkable slope for the open ramp, in world space, as wide as the ramp (which is at its open
 * angle when this is called): it follows what's seen, from the cargo floor down the bevel at its
 * rear edge, across the slot at the ramp's hinge and down the ramp, then on to the ground past the
 * lip at the ramp's far end. (Until 2026-10-13 it was one flat slope from the floor's edge to the
 * ramp's end: up to 0.3 m above the ramp near the top, so she floated, and it met the floor with a
 * step up across the slot, where she stuck walking out.)
 */
function walkwayTriangles(ship: THREE.Object3D, ramp: THREE.Object3D, floor: THREE.Object3D, physics: Physics): [Float32Array, Uint32Array] {
  ship.updateMatrixWorld(true);
  const r = new THREE.Box3().setFromObject(ramp); // open: lies outside the back of the ship
  const f = new THREE.Box3().setFromObject(floor);
  const top = f.max.y; // cargo floor surface
  // Outward: from the floor's rear edge toward the ramp's far end (along world z).
  const out = Math.sign(r.getCenter(new THREE.Vector3()).z - f.getCenter(new THREE.Vector3()).z) || 1;
  const edge = out > 0 ? f.max.z : f.min.z;
  const far = out > 0 ? r.max.z : r.min.z;
  // What's seen (the ramp, the floor) and what collides, from above, near each side of the ramp (its
  // middle has a window): the higher of them, every WALKWAY_STEP from a little inside the floor's edge.
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const from = new THREE.Vector3();
  const heightAt = (z: number) => {
    let h = 0;
    for (const share of [0.15, 0.85]) {
      from.set(THREE.MathUtils.lerp(r.min.x, r.max.x, share), top + 0.5, z);
      ray.set(from, down);
      ray.far = top + 0.5;
      for (const hit of ray.intersectObjects([ramp, floor], true)) h = Math.max(h, hit.point.y);
      const solid = physics.ray(from, down, top + 0.4, true);
      if (solid) h = Math.max(h, from.y - solid.distance);
    }
    return Math.min(h, top);
  };
  const start = edge - out * WALKWAY_INSIDE;
  const count = Math.max(2, Math.ceil(Math.abs(far - start) / WALKWAY_STEP));
  let zs = Array.from({ length: count + 1 }, (_, n) => start + ((far - start) * n) / count);
  let hs = zs.map(heightAt);
  hs[0] = top;
  // The ramp's end: the last point with something under it.
  let last = count;
  while (last > 2 && hs[last]! < 0.03) last--;
  zs = zs.slice(0, last + 1);
  hs = hs.slice(0, last + 1);
  // Going out it only goes down: a dip (the slot at the ramp's hinge) is bridged at the height of
  // what comes after it, and a bump (the lip at the ramp's far end) is taken off.
  for (let n = hs.length - 2; n >= 0; n--) hs[n] = Math.max(hs[n]!, hs[n + 1]!);
  for (let n = 1; n < hs.length; n++) hs[n] = Math.min(hs[n]!, hs[n - 1]!);
  // Nowhere steeper than WALKWAY_SLOPE: where the floor ends above the ramp's top (a riser 0.2 m
  // high, which she couldn't walk up), the walkway comes down to the ramp over a longer stretch.
  for (let n = 1; n < hs.length; n++) hs[n] = Math.max(hs[n]!, hs[n - 1]! - Math.abs(zs[n]! - zs[n - 1]!) * WALKWAY_SLOPE);
  // Past the ramp's end, on down to the ground at the ramp's own slope (its end is a lip).
  const a = Math.floor(last * 0.4);
  const b = Math.floor(last * 0.8);
  const slope = Math.max(0.2, (hs[a]! - hs[b]!) / Math.abs(zs[b]! - zs[a]!));
  const end = hs[last]!;
  zs.push(zs[last]! + (out * end) / slope);
  hs.push(0);
  console.info(`[01-walk] cargo ramp walkway: ${zs.length} points from ${hs[0]!.toFixed(2)} m at z ${zs[0]!.toFixed(2)} to the ground at z ${zs[zs.length - 1]!.toFixed(2)}; at the ramp's end (z ${zs[last]!.toFixed(2)}) ${end.toFixed(2)} m`);
  const vertices = new Float32Array(zs.flatMap((z, n) => [r.min.x, hs[n]!, z, r.max.x, hs[n]!, z]));
  const indices: number[] = [];
  for (let n = 0; n < zs.length - 1; n++) {
    const [p, q, s, t] = [n * 2, n * 2 + 1, n * 2 + 3, n * 2 + 2];
    indices.push(p, q, s, p, s, t, p, s, q, p, t, s); // both faces
  }
  return [vertices, new Uint32Array(indices)];
}

/** The walkway starts this far inside the cargo floor's rear edge (m): over the bevel there. */
const WALKWAY_INSIDE = 0.7;
/** The walkway's steepest fall, as height over length (about 27°; the ramp itself is about 21°). */
const WALKWAY_SLOPE = 0.5;
/** A point of the walkway's profile every this far (m). */
const WALKWAY_STEP = 0.1;

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
 * The hinge angle at which the ramp is closed. Closed is the door object with no rotation of its
 * own. The file may have it in another pose: the export of 2026-10-09 has the ramp lying open,
 * turned 88° about its hinge, and taking that pose for "closed" left it 4° of travel (backlog 9:
 * "the cargo ramp doesn't close"). So the hinge angle that undoes the door's own turn is used.
 * Call after hingeAt (the door's rotation is then relative to the ship).
 */
function closedAngle(door: THREE.Object3D): number {
  const q = door.quaternion;
  if (Math.abs(q.y) > 0.01 || Math.abs(q.z) > 0.01) {
    console.warn(`[01-walk] "${door.name}" is turned about more than its hinge axis in the file: taking its pose as closed`);
    return 0;
  }
  return -2 * Math.atan2(q.x, q.w);
}

/**
 * The ramp swings on its hinge (the pivot's X axis). Rotating it outward from closed (negative
 * angle around its X axis, toward the back of the ship), find the first angle at which its lowest
 * point reaches the ground.
 */
function findRampOpenAngle(ramp: THREE.Object3D, closed: number): number {
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
    const angle = closed - THREE.MathUtils.degToRad(deg);
    if (lowestPoint(angle) <= 0.01) return angle;
  }
  return closed - THREE.MathUtils.degToRad(90);
}
