// Where the first load's shader compile goes (SC-180, the compile's pass 1: measure only). In app/:
//
//     npm run probe -- tools/compile-probe.js --init tools/compile-trace-init.js > prototypes/0.0.2/.export/compile.txt
//     ... --reload tools/compile-probe.js        (a warm load after the cold one)
//
// The probe's profile is fresh, so the first load is cold. compile-trace-init.js has timed the
// WebGPU shader modules and pipelines and the main thread's long tasks; this splits each compile
// (the ship's, the hull's outside, the planet shot) into the main thread's work (three building the
// shaders' code: node graphs → WGSL) and the browser's pipeline builds, then lists the programs and
// pipelines by material. Runs in the page (probe-01.mjs).

const trace = w.__compileTrace;
if (!trace) throw new Error('no trace: run with --init tools/compile-trace-init.js');
const renderer = w.__renderer;
const pipes = renderer._pipelines;
const round = (x) => Math.round(x);

// The compiles, from the game's lines: "… compiled in N ms" ends at the line's time.
const windows = [];
for (const { at, text } of trace.infos) {
  const m = /^\[0\.0\.2\] (.*?):? ?shaders compiled in (\d+) ms/.exec(text) ?? /^\[0\.0\.2\] (.*) compiled in (\d+) ms/.exec(text);
  if (m) windows.push({ name: m[1], from: at - Number(m[2]), to: at });
}
const inWindow = (t, win) => t >= win.from && t <= win.to + 1;
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const compiles = windows.map((win) => {
  const mods = trace.modules.filter((m) => inWindow(m.at, win));
  const pls = trace.pipelines.filter((p) => inWindow(p.at, win));
  const longs = trace.longTasks?.filter((l) => l.at < win.to && l.at + l.ms > win.from) ?? [];
  const busy = sum(longs.map((l) => Math.min(l.at + l.ms, win.to) - Math.max(l.at, win.from)));
  const firstPipe = pls.length ? Math.min(...pls.map((p) => p.at)) : null;
  const lastPipe = pls.length ? Math.max(...pls.map((p) => p.at)) : null;
  const lastDone = pls.length ? Math.max(...pls.map((p) => p.done ?? 0)) : null;
  const durations = pls.filter((p) => p.done > 0).map((p) => p.done - p.at).sort((a, b) => a - b);
  return {
    name: win.name,
    ms: round(win.to - win.from),
    shaderModules: mods.length,
    pipelines: `${pls.length} (${pls.filter((p) => p.sync).length} sync)`,
    mainThreadLongTasksMs: trace.longTasks ? round(busy) : 'no long-task data',
    longTasks: longs.length,
    biggestLongTasksMs: longs.map((l) => round(l.ms)).sort((a, b) => b - a).slice(0, 5),
    firstPipelineAfterMs: firstPipe === null ? null : round(firstPipe - win.from),
    lastPipelineAskedAtMs: lastPipe === null ? null : round(lastPipe - win.from),
    lastPipelineDoneAtMs: lastDone === null ? null : round(lastDone - win.from),
    pipelineMs: durations.length ? { median: round(durations[durations.length >> 1]), max: round(durations[durations.length - 1]), sum: round(sum(durations)) } : null,
  };
});

// Everything built over the whole load (also outside the windows: the first frames, later scenes).
const all = {
  sinceNavigation: round(performance.now()),
  shaderModules: trace.modules.length,
  pipelinesAsked: trace.pipelines.length,
  pipelinesCached: pipes.caches.size,
  programs: `${pipes.programs.vertex.size} vertex, ${pipes.programs.fragment.size} fragment`,
  outsideCompiles: trace.pipelines.filter((p) => !windows.some((win) => inWindow(p.at, win))).map((p) => `${round(p.at)} ms: ${p.label}`),
};

// The pipelines by material name (three names a program after the first material that made it).
const byName = new Map();
for (const p of pipes.caches.values()) {
  const key = `${p.vertexProgram?.name ?? '?'} | ${p.fragmentProgram?.name ?? '?'}`;
  byName.set(key, (byName.get(key) ?? 0) + 1);
}
const programsByName = (stage) => {
  const m = new Map();
  for (const p of pipes.programs[stage].values()) {
    const e = m.get(p.name) ?? { count: 0, chars: 0 };
    e.count++;
    e.chars += p.code.length;
    m.set(p.name, e);
  }
  return [...m.entries()].sort((a, b) => b[1].count - a[1].count).map(([n, e]) => `${e.count} × ${n || '(no name)'} (${round(e.chars / e.count / 1000)}k chars)`);
};

// The scene's materials: what kinds there are, and on what kind of object (skinned, instanced…).
const kinds = new Map();
const seen = new Set();
w.__scene?.traverse?.((o) => {
  if (!o.isMesh && !o.isPoints && !o.isLine && !o.isSprite) return;
  for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
    if (!m) continue;
    const obj = [o.isSkinnedMesh && 'skinned', o.isInstancedMesh && 'instanced', o.morphTargetInfluences?.length && 'morph', o.isPoints && 'points', o.isLine && 'line', o.isSprite && 'sprite'].filter(Boolean).join('+') || 'mesh';
    const key = `${m.type} ${obj} side${m.side}${m.transparent ? ' transparent' : ''}${m.alphaTest ? ' alphaTest' : ''}${m.map ? ' map' : ''}${m.normalMap ? ' normalMap' : ''}${m.colorNode || m.outputNode || m.fragmentNode ? ' nodes' : ''}`;
    const e = kinds.get(key) ?? { objects: 0, materials: new Set() };
    e.objects++;
    e.materials.add(m.name || m.uuid.slice(0, 6));
    kinds.set(key, e);
    seen.add(m);
  }
});

return {
  backend: renderer.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL2',
  compileMsHook: w.__shipCompiledIn,
  compiles,
  all,
  pipelinesByProgramNames: [...byName.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} × ${k}`),
  vertexPrograms: programsByName('vertex'),
  fragmentPrograms: programsByName('fragment'),
  sceneMaterials: seen.size,
  materialKinds: [...kinds.entries()].sort((a, b) => b[1].objects - a[1].objects).map(([k, e]) => `${e.objects} objects, ${e.materials.size} materials: ${k} [${[...e.materials].slice(0, 6).join(', ')}${e.materials.size > 6 ? '…' : ''}]`),
};
