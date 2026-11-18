# The first load's shader compile: build the pipelines in parallel (SC-180)

> **[Agent note]** Written 2026-11-18 after pass 1 (measure only; owner: "do it"). For review before building. Part of the [optimisation plan](optimization.md); nothing may change in the game (decision log).

## What pass 1 found

Probes: `tools/compile-probe.js` and `tools/compile-parallel-probe.js`, both with `--init tools/compile-trace-init.js` (a trace of the WebGPU calls, set up before the game loads; the probe's new `--init` option). Output in `.export/compile.txt`, `.export/compile-parallel.txt`. GTX 1070 PC, WebGPU, a cold load.

- **The ship's compile: 11.8 s cold, 1.7 s warm** (the browser's shader cache). **The main thread works 48 ms of it**: three building the shaders' code is not the cost.
- **The cost is the browser building pipelines: 56 of them, median 202 ms, max 424 ms, together 10.4 s**, i.e. almost the whole 11.8 s, because **three r186's `compileAsync` builds them one at a time**: it asks for one, waits until it's done, then asks for the next (`Renderer.js`, "sequentially to avoid freezing").
- **Chrome builds them in parallel when asked:** 12 of the ship's real pipelines, made new: **2.1 s one after another, 0.42 s all at once** (5× faster; 16 cores here).
- Seen too: 87 pipelines in all (74 vertex, 55 fragment programs). 29 of them are the sun's shadow pass, built at the first frame after the start, not in the compile (tiny shaders, a few ms each). The hull's outside: 3 pipelines, 0.57 s.

## What would be built

- **One change where the ship's shaders are built** (`main.ts`, the `compileAsync` call; perhaps a small `src/compile-parallel.ts`): while it runs, three's per-object wait is given nothing to wait on (the pipelines' promises are collected in one list instead, by wrapping `renderer._pipelines.getForRender`), so every pipeline is asked for at once; then the game waits on the whole list before going on, as today. The same for the hull's outside's compile.
- **The loading bar's *shaders* share** counts the pipelines done, not the objects visited (these now finish long before the pipelines).
- **Nothing else changes:** the same shaders, the same pipelines, built before the start screen's button as now.

**Risk:** it reaches into three's internals (`_pipelines`, a private field). three is pinned at 0.186.1, so it holds until an upgrade; a line in `stack.md`'s upgrade notes says to check it then. If the browser busy building stalls the loading screen's animation, the requests go in batches (e.g. 8 at a time).

## Gain

**About 11.8 → 3 s cold on this PC** *(estimate from the 12-pipeline test)*; the warm load (1.7 s) a little less too. On a machine with fewer cores (the MacBook) smaller, but still several times.

## Done when

`compile-probe.js` shows the ship's compile cold and warm, before and after; the number of pipelines is the same (87) and none are built after the start that weren't before; `npm run see-through` screenshots match; the start screen's bar and animation still move; `npm run check`, `npm run build`; the smoke once at the end.

## Later, not in this plan

Fewer pipelines: the player's own colour materials (16, `MeshPhysicalMaterial` / `MeshStandardMaterial`) into the palette as step 4 did for the crew; the shadow pass's 29 built in the compile too. Worth it only if the load is still felt after this.

## Estimate

A short session to build and measure; your look: the load, once.
