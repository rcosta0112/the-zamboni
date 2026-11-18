// A trace of the shader builds at load (SC-180, the first-load compile's pass 1), run in the page
// before the game's own code (probe-01.mjs --init). Changes nothing in the game: it wraps the WebGPU
// calls that make shaders and pipelines, and notes the main thread's long tasks and the game's
// console.info lines (their times mark the compiles: "ship shaders compiled in …"). Read by
// compile-probe.js from window.__compileTrace.
(() => {
  const trace = { modules: [], pipelines: [], longTasks: [], infos: [], code: new WeakMap() };
  window.__compileTrace = trace;
  const now = () => performance.now();
  const info = console.info.bind(console);
  console.info = (...args) => {
    trace.infos.push({ at: now(), text: args.map(String).join(' ') });
    info(...args);
  };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) trace.longTasks.push({ at: e.startTime, ms: e.duration });
    }).observe({ type: 'longtask', buffered: true });
  } catch {
    trace.longTasks = null;
  }
  if (typeof GPUDevice === 'undefined') return;
  const P = GPUDevice.prototype;
  const createShaderModule = P.createShaderModule;
  P.createShaderModule = function (desc) {
    const at = now();
    const module = createShaderModule.call(this, desc);
    trace.modules.push({ at, ms: now() - at, label: desc.label ?? '', length: desc.code?.length ?? 0 });
    trace.code.set(module, desc.code);
    return module;
  };
  // A copy of the descriptor (three resets its own after the call), for compile-parallel-probe.js.
  const copy = (d) => ({
    ...d,
    vertex: d.vertex && { ...d.vertex, buffers: d.vertex.buffers?.map((b) => b && { ...b, attributes: [...b.attributes] }) },
    fragment: d.fragment && { ...d.fragment, targets: d.fragment.targets?.map((t) => t && { ...t, blend: t.blend && { color: { ...t.blend.color }, alpha: { ...t.blend.alpha } } }) },
    primitive: d.primitive && { ...d.primitive },
    depthStencil: d.depthStencil && { ...d.depthStencil, stencilFront: { ...d.depthStencil.stencilFront }, stencilBack: { ...d.depthStencil.stencilBack } },
    multisample: d.multisample && { ...d.multisample },
  });
  const label = (desc) => desc.label ?? `${desc.vertex?.module?.label ?? '?'} + ${desc.fragment?.module?.label ?? '?'}`;
  const createRenderPipelineAsync = P.createRenderPipelineAsync;
  P.createRenderPipelineAsync = function (desc) {
    const entry = { at: now(), sync: false, label: label(desc), done: null, desc: copy(desc) };
    trace.pipelines.push(entry);
    const promise = createRenderPipelineAsync.call(this, desc);
    promise.then(
      () => (entry.done = now()),
      () => (entry.done = -1),
    );
    return promise;
  };
  const createRenderPipeline = P.createRenderPipeline;
  P.createRenderPipeline = function (desc) {
    const at = now();
    const pipeline = createRenderPipeline.call(this, desc);
    trace.pipelines.push({ at, sync: true, label: label(desc), done: now() });
    return pipeline;
  };
})();
