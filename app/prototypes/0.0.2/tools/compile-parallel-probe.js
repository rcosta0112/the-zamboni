// Can Chrome build the game's pipelines in parallel? (SC-180, the compile's pass 1: measure only.)
// three r186's compileAsync builds them one at a time, waiting on each. This takes 12 of the ship's
// real pipelines (copied by compile-trace-init.js), gives their shaders a new comment so nothing is
// cached, and builds them once one after another, once all at the same time. In app/:
//
//     npm run probe -- tools/compile-parallel-probe.js --init tools/compile-trace-init.js
const trace = w.__compileTrace;
if (!trace) throw new Error('no trace: run with --init tools/compile-trace-init.js');
const device = w.__renderer.backend.device;
const picked = trace.pipelines.filter((p) => !p.sync && p.desc && !/Shadow/.test(p.label) && p.done - p.at > 50).slice(0, 12);
const fresh = (desc, tag) => {
  const mod = (m) => device.createShaderModule({ code: `${trace.code.get(m)}\n// ${tag}\n`, label: `${tag}` });
  return { ...desc, label: tag, vertex: { ...desc.vertex, module: mod(desc.vertex.module) }, fragment: desc.fragment && { ...desc.fragment, module: mod(desc.fragment.module) } };
};
const run = Math.random().toString(36).slice(2);
let t = performance.now();
for (let i = 0; i < picked.length; i++) await device.createRenderPipelineAsync(fresh(picked[i].desc, `serial ${run} ${i}`));
const serial = performance.now() - t;
t = performance.now();
await Promise.all(picked.map((p, i) => device.createRenderPipelineAsync(fresh(p.desc, `parallel ${run} ${i}`))));
const parallel = performance.now() - t;
return {
  pipelines: picked.length,
  atLoadMs: Math.round(picked.reduce((a, p) => a + (p.done - p.at), 0)),
  serialMs: Math.round(serial),
  parallelMs: Math.round(parallel),
  cores: navigator.hardwareConcurrency,
};
