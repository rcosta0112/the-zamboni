// One animation of an exported file thinned to a key every few frames, linear between (a step of
// export.mjs: `node tools/thin-clip.mjs <in.glb> <out.glb> <animation> <step> [fps]`). Blender's
// exporter samples every frame of every clip; her piloting loop is baked with a key every `step`
// frames (export-crew-character.py `--loop`), so the frames in between are dropped here and the
// other clips (the ladder) keep theirs. Plan: doc/plans/features/piloting-loop.md (pass A).

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [, , input, output, name, stepArg, fpsArg] = process.argv;
const step = Number(stepArg);
const fps = Number(fpsArg ?? 24);
if (!input || !output || !name || !(step >= 1)) {
  console.error('thin-clip: node tools/thin-clip.mjs <in.glb> <out.glb> <animation> <step> [fps]');
  process.exit(2);
}
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const animation = doc.getRoot().listAnimations().find((a) => a.getName() === name);
if (!animation) {
  console.error(`thin-clip: no animation ${JSON.stringify(name)} in ${input}`);
  process.exit(1);
}
let before = 0;
let after = 0;
for (const sampler of animation.listSamplers()) {
  const times = sampler.getInput().getArray();
  const values = sampler.getOutput().getArray();
  const size = sampler.getOutput().getElementSize();
  const start = times[0];
  const keep = [];
  for (let i = 0; i < times.length; i++) if (Math.round((times[i] - start) * fps) % step === 0) keep.push(i);
  before = Math.max(before, times.length);
  after = Math.max(after, keep.length);
  const t = new Float32Array(keep.map((i) => times[i]));
  const v = new Float32Array(keep.length * size);
  keep.forEach((i, k) => v.set(values.subarray(i * size, i * size + size), k * size));
  sampler.setInput(doc.createAccessor().setType('SCALAR').setArray(t).setBuffer(sampler.getInput().getBuffer()));
  sampler.setOutput(doc.createAccessor().setType(sampler.getOutput().getType()).setArray(v).setBuffer(sampler.getOutput().getBuffer()));
  sampler.setInterpolation('LINEAR');
}
// The old accessors are left with no user: dropped.
for (const accessor of doc.getRoot().listAccessors()) if (accessor.listParents().length <= 1) accessor.dispose();
await io.write(output, doc);
console.log(`THIN: ${name}: ${before} -> ${after} keys a channel (a key every ${step} frames at ${fps} fps)`);
