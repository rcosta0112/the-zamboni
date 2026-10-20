// Compares two .glb files object by object and prints what differs: which objects exist, their
// parent, triangle and vertex counts, bounds in the file's space, materials and custom properties
// (glTF extras), and the animations (their names, lengths and what they move). Used to prove an
// export change changes nothing else, and by the exports' gate (export.mjs) (in app/):
//
//     node tools/compare-glb.mjs <before.glb> <after.glb> [--tolerance 0.002]
//
// Works on compressed files too (Meshopt). Bounds are compared, not node origins: compression
// moves origins. Exit code 1 if anything differs.

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const args = process.argv.slice(2);
const at = args.indexOf('--tolerance');
const tolerance = at >= 0 ? Number(args.splice(at, 2)[1]) : 0.002;
const [beforePath, afterPath] = args;
if (!beforePath || !afterPath) {
  console.error('usage: node tools/compare-glb.mjs <before.glb> <after.glb> [--tolerance 0.002]');
  process.exit(2);
}

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

function transformPoint(m, [x, y, z]) {
  return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
}

async function summarise(path) {
  const document = await io.read(path);
  const nodes = new Map();
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    const matrix = node.getWorldMatrix();
    let triangles = 0;
    let vertices = 0;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const materials = new Set();
    for (const primitive of mesh ? mesh.listPrimitives() : []) {
      const position = primitive.getAttribute('POSITION');
      const indices = primitive.getIndices();
      vertices += position.getCount();
      triangles += (indices ? indices.getCount() : position.getCount()) / 3;
      materials.add(primitive.getMaterial()?.getName() ?? '(none)');
      const p = [0, 0, 0];
      for (let i = 0; i < position.getCount(); i++) {
        const world = transformPoint(matrix, position.getElement(i, p));
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], world[k]);
          max[k] = Math.max(max[k], world[k]);
        }
      }
    }
    const parent = node.getParentNode();
    const name = node.getName();
    if (nodes.has(name)) console.log(`NOTE  ${path}: two objects named "${name}"`);
    nodes.set(name, {
      parent: parent ? parent.getName() : null,
      triangles,
      vertices,
      // An object with no mesh (a light marker) is compared by where it is.
      bounds: mesh ? [...min, ...max] : [...matrix.slice(12, 15), ...matrix.slice(12, 15)],
      materials: [...materials].sort().join(', '),
      extras: node.getExtras(),
    });
  }
  return { nodes, animations: summariseAnimations(document) };
}

/** Each animation: its length (s) and what it moves (node and property). */
function summariseAnimations(document) {
  const animations = new Map();
  for (const animation of document.getRoot().listAnimations()) {
    const length = Math.max(0, ...animation.listSamplers().map((s) => s.getInput()?.getMax([])[0] ?? 0));
    const targets = new Set(animation.listChannels().map((c) => `${c.getTargetNode()?.getName()}.${c.getTargetPath()}`));
    animations.set(animation.getName(), { length, targets });
  }
  return animations;
}

function sameValue(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-4;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((k) => sameValue(a[k], b[k]));
  }
  return a === b;
}

const { nodes: before, animations: clipsBefore } = await summarise(beforePath);
const { nodes: after, animations: clipsAfter } = await summarise(afterPath);
let differences = 0;
const differ = (name, what) => {
  differences++;
  console.log(`DIFF  ${name}: ${what}`);
};

for (const name of [...before.keys()].sort()) {
  if (!after.has(name)) differ(name, 'only in the first file');
}
for (const name of [...after.keys()].sort()) {
  if (!before.has(name)) differ(name, 'only in the second file');
}
for (const [name, a] of [...before].sort()) {
  const b = after.get(name);
  if (!b) continue;
  if (a.parent !== b.parent) differ(name, `parent ${a.parent} -> ${b.parent}`);
  if (a.triangles !== b.triangles) differ(name, `triangles ${a.triangles} -> ${b.triangles}`);
  if (a.vertices !== b.vertices) differ(name, `vertices ${a.vertices} -> ${b.vertices}`);
  if (a.materials !== b.materials) differ(name, `materials [${a.materials}] -> [${b.materials}]`);
  const moved = Math.max(...a.bounds.map((v, i) => Math.abs(v - b.bounds[i])));
  if (moved > tolerance) {
    const show = (v) => v.map((x) => x.toFixed(3)).join(' ');
    differ(name, `bounds moved by up to ${moved.toFixed(3)}: [${show(a.bounds)}] -> [${show(b.bounds)}]`);
  }
  for (const key of new Set([...Object.keys(a.extras), ...Object.keys(b.extras)])) {
    if (!sameValue(a.extras[key], b.extras[key])) {
      differ(name, `property ${key}: ${JSON.stringify(a.extras[key])} -> ${JSON.stringify(b.extras[key])}`);
    }
  }
}

for (const name of [...new Set([...clipsBefore.keys(), ...clipsAfter.keys()])].sort()) {
  const a = clipsBefore.get(name);
  const b = clipsAfter.get(name);
  if (!a || !b) {
    differ(`animation "${name}"`, `only in the ${a ? 'first' : 'second'} file`);
    continue;
  }
  if (Math.abs(a.length - b.length) > 1e-3) differ(`animation "${name}"`, `length ${a.length.toFixed(3)} -> ${b.length.toFixed(3)} s`);
  const gone = [...a.targets].filter((t) => !b.targets.has(t));
  const added = [...b.targets].filter((t) => !a.targets.has(t));
  if (gone.length || added.length) differ(`animation "${name}"`, `moves ${[...gone.map((t) => `-${t}`), ...added.map((t) => `+${t}`)].slice(0, 6).join(', ')}${gone.length + added.length > 6 ? ' …' : ''}`);
}

const total = (nodes, key) => [...nodes.values()].reduce((sum, n) => sum + n[key], 0);
console.log(`first:  ${before.size} objects, ${total(before, 'triangles')} triangles`);
console.log(`second: ${after.size} objects, ${total(after, 'triangles')} triangles`);
console.log(differences ? `${differences} difference(s)` : 'SAME');
process.exit(differences ? 1 : 0);
