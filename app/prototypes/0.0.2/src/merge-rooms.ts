// The ship's static meshes merged per room and material, once at load (SC-180, step 3):
// doc/plans/features/merge-per-room.md. Fewer draw calls; nothing in the game looks or works
// differently.
//
// - The originals stay where they are, hidden (`visible = false`, `userData.mergedInto`): the
//   see-through's rays (their BVHs), the colliders, the probes and the camera's checks still use them.
// - A merged mesh draws with the originals' material and reads the see-through's per-object values
//   from its first original (cutaway.ts `perObject`). In the see-through mode in use (*hull only*,
//   visibility.ts), those values depend only on the object's deck and flags, so a group never joins
//   objects that could differ: its key holds them. (The old rules mode, unused, would fade a whole
//   group at once: owner, 2026-11-18, decision log.)
// - Its vertices are stored exactly as the file's (quantized, interleaved): a different layout
//   would make new GPU pipelines (pipelines.ts).
// - Its own bounds per room, so a room off-screen is still skipped.

import * as THREE from 'three/webgpu';
import { addHullGapFill } from './cutaway';
import { isDrawn, isHullPart, type CutUnit } from './visibility';

export interface MergeInput {
  object: THREE.Object3D;
  cutUnits: CutUnit[];
  roomsOf: (box: THREE.Box3, side?: number) => string[];
  /** The parts that move (ramp, door hinges, landing gear, turbines): nothing under them is merged. */
  moving: THREE.Object3D[];
}

/** Nodes kept apart by name, set before the ship loads (flight-test.html: the consoles, split into controls by flight-test/controls.ts). */
export const keptApart = new Set<string>();

/** Tags that make an object move (doors.ts): nothing under such a node is merged. */
const MOVES = ['doorAxis', 'doorSlide', 'moving'];

/** Why a mesh stays apart, or null if it can be merged. Each line its reason. */
function leftOut(mesh: THREE.Mesh, unit: CutUnit, input: MergeInput): string | null {
  // The shell: the outside swaps its materials (exterior.ts); also the turbines.
  if (unit.shell) return 'shell';
  // Glass is drawn blended, sorted per object.
  const material = mesh.material as THREE.MeshPhysicalMaterial;
  if (Array.isArray(mesh.material) || material.transparent || (material.transmission ?? 0) > 0) return 'glass';
  // Anything with something under it but its hull-gap fill: hiding it would hide that too.
  if (mesh.children.some((c) => !c.userData.hullGap)) return 'parent';
  for (let n: THREE.Object3D | null = mesh; n && n !== input.object; n = n.parent) {
    // What moves.
    if (input.moving.includes(n) || MOVES.some((k) => n!.userData[k] !== undefined)) return 'moves';
    // Anything with an id (entities.ts): interactions, the jetpacks, clothes, the boombox, props,
    // ladders… shown, hidden, moved or looked up by the game.
    if (n.userData.id !== undefined) return 'entity';
    if (keptApart.has(n.name)) return 'kept apart';
  }
  return null;
}

type Attribute = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
type Typed = Float32Array | Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array;
type TypedClass = new (n: number) => Typed;
const isInterleaved = (a: Attribute): a is THREE.InterleavedBufferAttribute => (a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute === true;

/** An attribute's storage: type, size, normalisation, interleaving. */
function signature(a: Attribute): string {
  const interleaved = isInterleaved(a) ? `i${a.data.stride}+${a.offset}` : '';
  return `${(a.array as Typed).constructor.name}${a.itemSize}${a.normalized ? 'n' : ''}${interleaved}`;
}

/** The same storage as `like`, for `count` vertices. */
function storageLike(like: Attribute, count: number): Attribute {
  const Type = (like.array as Typed).constructor as TypedClass;
  if (isInterleaved(like)) {
    const buffer = new THREE.InterleavedBuffer(new Type(count * like.data.stride) as unknown as THREE.TypedArray, like.data.stride);
    return new THREE.InterleavedBufferAttribute(buffer, like.itemSize, like.offset, like.normalized);
  }
  return new THREE.BufferAttribute(new Type(count * like.itemSize) as unknown as THREE.TypedArray, like.itemSize, like.normalized);
}

const isUnsigned = (a: Typed) => a instanceof Uint8Array || a instanceof Uint16Array || a instanceof Uint32Array;

/**
 * The meshes' geometry in the ship's space, joined, stored as the first one's. A quantized position
 * gets a uniform scale and an offset (the merged mesh's own transform) so it fits its integer range.
 * Null if it can't be stored that way.
 */
function join(meshes: THREE.Mesh[], toShip: THREE.Matrix4): { geometry: THREE.BufferGeometry; centre: THREE.Vector3; scale: number } | null {
  const names = Object.keys(meshes[0]!.geometry.attributes);
  let vertices = 0, indices = 0;
  for (const m of meshes) {
    const count = m.geometry.getAttribute('position').count;
    vertices += count;
    indices += m.geometry.index ? m.geometry.index.count : count;
  }
  // Everything as floats, in the ship's space.
  const floats: Record<string, Float32Array> = {};
  const sizes: Record<string, number> = {};
  for (const name of names) {
    sizes[name] = meshes[0]!.geometry.getAttribute(name).itemSize;
    floats[name] = new Float32Array(vertices * sizes[name]!);
  }
  const index = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
  const matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3(), v = new THREE.Vector3();
  let base = 0, at = 0;
  for (const m of meshes) {
    matrix.multiplyMatrices(toShip, m.matrixWorld);
    normalMatrix.getNormalMatrix(matrix);
    const g = m.geometry;
    const count = g.getAttribute('position').count;
    for (const name of names) {
      const a = g.getAttribute(name) as Attribute, out = floats[name]!, size = sizes[name]!;
      for (let k = 0; k < count; k++) {
        const o = (base + k) * size;
        if (name === 'position' || name === 'normal') {
          v.fromBufferAttribute(a, k);
          if (name === 'position') v.applyMatrix4(matrix);
          else v.applyMatrix3(normalMatrix).normalize();
          out[o] = v.x;
          out[o + 1] = v.y;
          out[o + 2] = v.z;
        } else {
          for (let c = 0; c < size; c++) out[o + c] = a.getComponent(k, c);
        }
      }
    }
    if (g.index) for (let k = 0; k < g.index.count; k++) index[at++] = base + g.index.getX(k);
    else for (let k = 0; k < count; k++) index[at++] = base + k;
    base += count;
  }
  // Stored as the first mesh's attributes.
  const geometry = new THREE.BufferGeometry();
  const centre = new THREE.Vector3();
  let scale = 1;
  for (const name of names) {
    const like = meshes[0]!.geometry.getAttribute(name) as Attribute;
    const data = floats[name]!, size = sizes[name]!;
    if (name === 'position' && like.normalized) {
      // Into [-1, 1]: around the bounds' centre, by half the largest side (uniform: normals unchanged).
      const box = new THREE.Box3();
      for (let k = 0; k < vertices; k++) box.expandByPoint(v.fromArray(data, k * 3));
      box.getCenter(centre);
      const side = box.getSize(v);
      scale = Math.max(side.x, side.y, side.z) / 2 || 1;
      for (let k = 0; k < vertices; k++) {
        data[k * 3] = (data[k * 3]! - centre.x) / scale;
        data[k * 3 + 1] = (data[k * 3 + 1]! - centre.y) / scale;
        data[k * 3 + 2] = (data[k * 3 + 2]! - centre.z) / scale;
      }
    }
    if (like.normalized) {
      const min = isUnsigned(like.array as Typed) ? -1e-4 : -1.0001;
      for (let k = 0; k < data.length; k++) if (data[k]! < min || data[k]! > 1.0001) return null;
    }
    const out = storageLike(like, vertices);
    for (let k = 0; k < vertices; k++) for (let c = 0; c < size; c++) out.setComponent(k, c, data[k * size + c]!);
    geometry.setAttribute(name, out);
  }
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  return { geometry, centre, scale };
}

/** How long the last merge took (ms), for the checks (`__ship().mergedInMs`). */
export let mergedInMs = 0;

/** Merges; returns the merged meshes (already added to the ship). */
export function mergeRooms(input: MergeInput): THREE.Mesh[] {
  const started = performance.now();
  const { object } = input;
  object.updateMatrixWorld(true);
  const toShip = new THREE.Matrix4().copy(object.matrixWorld).invert();
  const groups = new Map<string, { meshes: THREE.Mesh[]; hull: boolean }>();
  const reasons = new Map<string, number>();
  const box = new THREE.Box3();
  for (const unit of input.cutUnits) {
    for (const mesh of unit.meshes) {
      const why = leftOut(mesh, unit, input);
      if (why) {
        reasons.set(why, (reasons.get(why) ?? 0) + 1);
        mesh.userData.mergeApart = why;
        continue;
      }
      const geometry = mesh.geometry;
      const layout = Object.keys(geometry.attributes).sort().map((n) => `${n}:${signature(geometry.getAttribute(n) as Attribute)}`).join(',') + (Object.keys(geometry.morphAttributes).length ? '|m' : '');
      const room = input.roomsOf(box.setFromObject(mesh), 0)[0] ?? 'outside';
      const material = mesh.material as THREE.Material;
      // What the see-through and the shadows tell apart (visibility.ts `hullOnly`, `kept`).
      const key = [room, material.uuid, layout, unit.deck, unit.keepOnDeck === true, unit.cameraWall === true, isDrawn(unit), isHullPart(unit), mesh.castShadow, mesh.receiveShadow].join('/');
      const group = groups.get(key) ?? { meshes: [], hull: isHullPart(unit) };
      group.meshes.push(mesh);
      groups.set(key, group);
    }
  }
  const merged: THREE.Mesh[] = [];
  let joined = 0, alone = 0;
  for (const [key, group] of groups) {
    if (group.meshes.length < 2) {
      alone++;
      group.meshes[0]!.userData.mergeApart = 'alone';
      continue;
    }
    const result = join(group.meshes, toShip);
    if (!result) {
      console.warn(`[0.0.2] merge: couldn't store ${group.meshes.length} meshes as their file does (${key})`);
      for (const m of group.meshes) m.userData.mergeApart = 'storage';
      continue;
    }
    const first = group.meshes[0]!;
    const mesh = new THREE.Mesh(result.geometry, first.material);
    mesh.position.copy(result.centre);
    mesh.scale.setScalar(result.scale);
    mesh.name = `merged: ${key.split('/')[0]} (${(first.material as THREE.Material).name}, ${group.meshes.length})`;
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    // Rays use the originals (their BVHs).
    mesh.raycast = () => undefined;
    // The see-through's values, from the first original (the same for the whole group: its key).
    const of = first.userData;
    mesh.userData = {
      get cutStructure() { return of.cutStructure; },
      get cutFade() { return of.cutFade; },
      get cutWhole() { return of.cutWhole; },
      get cutSolid() { return of.cutSolid; },
      mergedFrom: group.meshes,
    };
    if (group.hull) addHullGapFill(mesh);
    object.add(mesh);
    for (const original of group.meshes) {
      original.visible = false;
      original.userData.mergedInto = mesh;
    }
    merged.push(mesh);
    joined += group.meshes.length;
  }
  const apart = [...reasons].map(([why, n]) => `${why} ${n}`).join(', ');
  mergedInMs = Math.round(performance.now() - started);
  console.info(`[0.0.2] merged per room: ${joined} meshes into ${merged.length} in ${mergedInMs} ms; left apart: ${apart}, alone in their group ${alone}`);
  return merged;
}
