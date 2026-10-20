// Fewer GPU pipelines, so the ship's shaders build faster at load. A WebGPU pipeline is fixed to a
// shader, a vertex layout and the way faces point, so meshes that could share a shader but differ
// in those make a pipeline each (116 for the ship in 1.21; building them was most of the load).
// - One vertex layout per kind of mesh: a mesh whose material has no texture loses its UVs (the
//   export leaves them on every mesh, up to eight sets); a textured one keeps the sets it uses, as
//   plain floats (Meshopt stores some 16-bit, some not).
// - No mirrored meshes: a mesh with a negative scale somewhere above it is drawn with its faces'
//   order reversed, which is a pipeline of its own; its geometry is mirrored instead.
// Plan: doc/plans/features/faster-load.md

import * as THREE from 'three/webgpu';

const MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'bumpMap', 'lightMap', 'displacementMap', 'specularIntensityMap', 'specularColorMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'transmissionMap', 'thicknessMap', 'sheenColorMap', 'sheenRoughnessMap', 'iridescenceMap', 'iridescenceThicknessMap', 'anisotropyMap'] as const;
/** GLTFLoader's names for UV sets 0..7. */
const UV_SETS = ['uv', 'uv1', 'uv2', 'uv3', 'texcoord_4', 'texcoord_5', 'texcoord_6', 'texcoord_7'];

/** The UV sets a material's textures read (by channel). */
function channelsUsed(material: THREE.Material): Set<number> {
  const used = new Set<number>();
  const m = material as unknown as Record<string, THREE.Texture | null | undefined>;
  for (const key of MAPS) if (m[key]) used.add(m[key].channel);
  // Anisotropy without tangents takes its direction from the first UV set.
  if (((material as THREE.MeshPhysicalMaterial).anisotropy ?? 0) > 0) used.add(0);
  return used;
}

/**
 * Every mesh under `root` (but skinned ones): UV sets no texture reads dropped, the rest as floats.
 * Meshes sharing a geometry keep the sets any of them reads.
 * @returns how many UV sets were dropped and how many converted
 */
export function sameLayouts(root: THREE.Object3D): { dropped: number; converted: number } {
  const used = new Map<THREE.BufferGeometry, Set<number>>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    const sets = used.get(mesh.geometry) ?? new Set<number>();
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) for (const c of channelsUsed(m)) sets.add(c);
    used.set(mesh.geometry, sets);
  });
  let dropped = 0;
  let converted = 0;
  for (const [geometry, sets] of used) {
    UV_SETS.forEach((name, channel) => {
      const uv = geometry.getAttribute(name);
      if (!uv) return;
      if (!sets.has(channel)) {
        geometry.deleteAttribute(name);
        dropped++;
      } else if (uv.normalized || !(uv.array instanceof Float32Array) || (uv as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) {
        const values = new Float32Array(uv.count * 2);
        for (let i = 0; i < uv.count; i++) {
          values[i * 2] = uv.getX(i);
          values[i * 2 + 1] = uv.getY(i);
        }
        geometry.setAttribute(name, new THREE.BufferAttribute(values, 2));
        converted++;
      }
    });
  }
  return { dropped, converted };
}

/** A copy of a geometry with the same layout (three's clone() would de-interleave its attributes). */
function copyGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const copy = new THREE.BufferGeometry();
  const buffers = new Map<THREE.InterleavedBuffer, THREE.InterleavedBuffer>();
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    const a = attribute as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
    if ((a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute) {
      const ia = a as THREE.InterleavedBufferAttribute;
      let data = buffers.get(ia.data);
      if (!data) {
        data = new THREE.InterleavedBuffer(ia.data.array.slice(), ia.data.stride);
        buffers.set(ia.data, data);
      }
      copy.setAttribute(name, new THREE.InterleavedBufferAttribute(data, ia.itemSize, ia.offset, ia.normalized));
    } else copy.setAttribute(name, (a as THREE.BufferAttribute).clone());
  }
  if (geometry.index) copy.setIndex(geometry.index.clone());
  for (const group of geometry.groups) copy.addGroup(group.start, group.count, group.materialIndex);
  copy.name = geometry.name;
  return copy;
}

/**
 * Mirrored meshes under `root` (call after `root.updateMatrixWorld`): each gets its geometry
 * mirrored in x, its faces' order reversed, and its own scale's x negated, so it's where it was and
 * looks the same, with no negative scale left. Only meshes with no children (a child would be
 * mirrored too), indexed and not skinned; the others are left, and counted.
 */
export function unmirror(root: THREE.Object3D): { fixed: number; left: number } {
  const mirrored: THREE.Mesh[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.matrixWorld.determinant() < 0) mirrored.push(mesh);
  });
  let fixed = 0;
  let left = 0;
  const done = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  for (const mesh of mirrored) {
    if (mesh.children.length > 0 || (mesh as THREE.SkinnedMesh).isSkinnedMesh || !mesh.geometry.index) {
      left++;
      continue;
    }
    let geometry = done.get(mesh.geometry);
    if (!geometry) {
      // Always a copy: the export shares identical vertex data between meshes (dedup), so even a
      // geometry of its own may hold another mesh's positions or indices.
      geometry = copyGeometry(mesh.geometry);
      for (const name of ['position', 'normal', 'tangent']) {
        const a = geometry.getAttribute(name);
        if (!a) continue;
        for (let i = 0; i < a.count; i++) a.setX(i, -a.getX(i));
        if ('needsUpdate' in a) a.needsUpdate = true;
        else (a as THREE.InterleavedBufferAttribute).data.needsUpdate = true;
      }
      // A tangent's w says which way the bitangent goes: mirroring flips it.
      const tangent = geometry.getAttribute('tangent');
      if (tangent) for (let i = 0; i < tangent.count; i++) tangent.setW(i, -tangent.getW(i));
      const index = geometry.index!;
      for (let i = 0; i + 2 < index.count; i += 3) {
        const b = index.getX(i + 1);
        index.setX(i + 1, index.getX(i + 2));
        index.setX(i + 2, b);
      }
      index.needsUpdate = true;
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      done.set(mesh.geometry, geometry);
    }
    mesh.geometry = geometry;
    mesh.scale.x = -mesh.scale.x;
    fixed++;
  }
  root.updateMatrixWorld(true);
  return { fixed, left };
}
