# A faster load, and a bar that tells the truth (item 50)

**Status:** stage 1 answered and **stage 2 built** 2026-10-20 (*As built*, at the end); **stage 3 built** the same day (option A); dropping unused UVs in the export later (owner). Asked by the owner on 2026-10-20: "it's taking a long time to load every time even on the dev server. is there any caching going on? is there anything we can do to improve it? related issue: the progress bar goes very quickly to around 95% and then stops there for most of the loading time."

## What was measured (2026-10-20, headless Chrome on this machine, dev server, ship of 1.21)

| From navigation | What happens |
|---|---|
| 0 – 1.5 s | Every file downloaded (the ship's 4.5 MB in 50 ms; three and Rapier are 10 MB each, pre-bundled by Vite and already cached by it) |
| 1.5 – 2.0 s | The ship set up: colliders, BVH, doors, see-through units, crew, lights (about 0.4 s of work) |
| **2.0 – 16.4 s** | **`renderer.compileAsync`: 14.4 s.** The page's own thread is busy for about 3 s of it (three.js turning TSL into WGSL); the rest is the GPU process compiling pipelines |
| 16.4 – 20 s | Frames made under the screen until five are quick (the see-through's first-use shaders), then the button |

**What it compiles:** 789 meshes, 124 materials → 57 fragment and 64 vertex shaders → **116 pipelines**, median 34 KB of WGSL each. Many are near twins: the closest two differ by one line (`DiffuseColor.w = 1.0`), and 19 pairs by six lines or fewer. 51 materials are `MeshPhysical*` with no clearcoat, transmission or sheen.

**Caching.** Vite already caches the libraries (`node_modules/.vite`) and the files come back 304. **Chrome also caches compiled shaders on disk** (`DawnWebGPUCache` in the profile): three loads in one kept profile took 13.3 s, then 3.0 s, then 3.0 s to compile (button at 18, 7, 7 s). What it can't cache is three.js's own WGSL building (the 3 s left). So "slow every time" means the owner's Chrome isn't hitting that cache, and we don't know why yet (see stage 1).

**Why the bar stops at 95 %:** the shaders have 35 % of the bar and take about 80 % of the time; their share creeps as if they took 4 s, so the bar is at 0.95 by 13 s and inches from there. The warm-up frames after it aren't in the bar at all.

## Goal and scope

- **In:** fewer, cheaper pipelines; making sure a reload uses Chrome's cache; a bar that moves with the real work.
- **Out:** changing what the ship looks like (any visible change is shown to the owner first); streaming the ship in parts (the game's loading plan, later); WebGL2.

## Constraints from the docs

- [`start-screen.md`](start-screen.md), *As built*: the button waits for the first quick frames so the game moves as soon as it's pressed. Kept.
- [`loading.md`](../architecture/game-architecture/loading.md): the title after about a second, the opening loading behind it. A first-time player on Vercel never has the cache: **the cold load is the one that matters for players**, so stage 2 counts more than stage 1.
- Materials come from the owner's file. Merging them **in the file** is the owner's work; merging them **at load, in the game**, isn't, but must not change the look.

## The work

1. **Why the owner's reloads miss the cache.** *Answered 2026-10-20:* the owner's Chrome: 5.5 s, then 11.2 s on a reload. Reproduced in headless Chrome: **only the first load of a browser session hits the cache** (2.7 s); every later one, reloaded in the same tab or after leaving the page, compiles again (8.5–11.7 s), in a fresh profile as in a warm one. That is Chrome's doing, not ours, and the usual way of working (reload after a change) never gets it. So the cache can't be relied on, and stage 2 is the fix. Kept below for the record: the steps that were planned.
   Planned (small; mostly asking). The console already says `ship shaders compiled in … ms`. The owner reloads twice in their usual Chrome and reads it: about 3 s the second time means the cache works and the slow loads are after something changed (a new export, a code change touching shaders); about 14 s both times means it's missed. Then check, in that order: DevTools' *Disable cache* (may reach the GPU cache too), an incognito or guest window, a value that changes between loads and ends up in a shader (to find with the probe: compare the WGSL of two loads).
2. **Fewer pipelines** (the real gain, cold and warm). *Approved by the owner 2026-10-20, in the game at load. Pass 1 (the inventory) done the same day; findings below, then the planned text.*
   - **Shaders are already shared** across materials of the same kind (one shader serves 15 materials). What multiplies is the **pipeline**: in WebGPU it's fixed to a vertex layout and to the facing, so one shader can make up to 9 pipelines.
   - **Two UV layouts:** 597 ship meshes have their UVs compressed (16-bit), 118 are uncompressed floats, 37 have none. If the layout didn't count there would be **86 pipelines instead of 116**. Fix at load: every ship mesh gets the same layout (UVs as floats, and empty ones where there are none). Costs a little GPU memory (UVs twice the size), no visible change.
   - **Mirrored objects** (negative scale): 9 objects, 70 meshes, **13 pipelines** of their own: `Bench`, `Monitor001`, `Monitor003`, `Signal_Receiver001`, `Turbine_Right`, `Turbine002`, `Walls_and_seat001`, and two moving parts, `Door hinge` and `Top_Hatch_Bottom hinge`. Cleanest fix: their scale applied in the file (the owner's); the two hinges need care (their axes are what the doors turn about). Or at load, the seven static ones baked into their geometry.
   - **Physical vs standard:** the physical materials can't become standard ones: almost all have a *specular* level other than 1 (from Blender), which standard materials can't show. The other way works: a standard material is a physical one at the defaults, so turning the standard ones into physical ones looks the same and lets them share shaders. Gain not measured yet; each pixel costs a little more.
   - Untouched: the characters' materials and the shadow pass (separate layouts; later if needed).
   - **Estimate:** about 116 → 60 pipelines, so roughly half the compile (11 s → 5–6 s on a reload). Less than the 40 first guessed.

   Planned text: first an inventory by the probe: for each shader, which materials use it and what makes it differ from its twin (opacity, `transparent`, `side`, vertex colours, physical vs standard, the see-through copies). Then, in the game at load, materials that differ only in a value become one shader with that value as a uniform, and physical materials with nothing physical in use become standard ones, **if the screenshots of every room (`npm run see-through`) show no difference**. Target: 116 → about 40 pipelines; the time should fall about in proportion.
3. **The bar.** Options:
   - **A. Real progress (recommended):** compile in about ten batches of the ship's objects (`compileAsync(batch, camera, scene)`) and move the bar by batches done; give the warm-up frames their own small share. Cost: a few lines in `main.ts` and `loading.ts`; to check that batches don't make the compile slower (one probe).
   - **B. Shares from the last load:** remember each part's time in `localStorage` and use it next time. Right from the second load only, and wrong after the cache changes.
   - **C. Shares by hand:** shaders 75 %. One line, but wrong once the cache hits (then the downloads would crawl and the shaders fly).
4. **Smaller gains, only if 2 isn't enough:** start compiling the character models while the ship downloads (under 0.5 s); compile what the start view sees first and the rest while the start screen is up (would change *the button waits*; owner's call).

## Done when

- Cold load (fresh profile) and warm load (kept profile) timed by a probe before and after; the numbers in this plan's *As built*.
- The bar: its value logged every 200 ms through a load; no stretch of more than 3 s without it moving.
- Every room's screenshot unchanged after stage 2 (`npm run see-through`), and the owner looks.
- `npm run check`, `npm run build`, then the smoke once.

## Open questions for the owner

1. Stage 1: what the console line says on your second reload.
2. Stage 2 merges materials in the game at load. Would you rather the file had fewer materials instead (fewer to manage in Blender too)? The inventory would give you the list either way.
3. Stage 3: A, B or C.

## After

`start-screen.md`'s *As built* and [`design/start-screen.md`](../../design/start-screen.md) (what the bar measures); the code map's line for `loading.ts`; [`asset-pipeline.md`](../../architecture/asset-pipeline.md) if materials get rules (what makes a new shader); a decision-log entry for the merging.

## As built (stage 2, 2026-10-20)

- **`pipelines.ts`**, called by `loadShip` before the see-through copies and the BVHs: `sameLayouts` drops the UV sets no texture reads (498 of them; anisotropic materials keep their first set, which gives the highlight its direction) and stores the rest as floats (30); `unmirror` gives the 51 mirrored meshes mirrored copies of their geometry (faces reversed) and a positive scale. Always a copy: the export shares vertex data between meshes, and mirroring it in place turned the cockpit's map display inside out (found by the screenshots). Meshes with children, skinned or without an index are left (none today). The console says what was done (`vertex layouts: …`).
- **`cutaway.ts`:** every see-through copy is a `MeshPhysicalNodeMaterial`; the reflection texture gets a fixed coordinate (it's sampled by direction).
- **Pipelines 116 → 78**, fragment shaders 57 → 53, vertex shaders 64 → 60.
- **Timings** (headless Chrome, fresh profile, one tab): first load 13.2 → 11.7 s of compiling (button 18 → 16 s); **reloads 10.9 → 2.1 s (button 14.7 → 4.0 s)**. Reloads now get Chrome's cache, which they didn't before; why the pipeline count decides that isn't known (perhaps a size limit on Chrome's cache).
- **Checked:** every room's screenshots against the ones before (`npm run see-through`): the differences left are thin outlines spread evenly over the views (the camera's sub-pixel position between runs), no object changed. `npm run check`, `npm run build`; the smoke: the same 8 failures as before, none new.
- **Not done:** the characters' materials and the shadow pass (separate layouts, about 25 pipelines); the first load is still about 12 s of compiling.

## As built (stage 3, 2026-10-20)

- **Option A, without batches:** three r186's `compileAsync` already builds the scene object by object and reports each one (`onProgress`), so `main.ts` passes that to the bar; no batching was needed. The creep is gone from `loading.ts`.
- **Shares by time** (`loading.ts`): shaders 62 %, the warm-up frames 10 % (new part: quick frames in a row out of five, or the time out of six seconds), the rest 38 %. Written up in [`design/start-screen.md`](../../design/start-screen.md).
- **Checked:** the bar logged every 200 ms: the longest it stood still was 1.9 s on a cold load, 1.5 s on a cached one. It moves unevenly through the shaders (objects whose pipeline already exists are instant: on a cold load it goes 0.29 → 0.36 in 5 s, then 0.36 → 0.84 in 4 s). `npm run check`, `npm run build`; the smoke: the same 8 failures, the start screen's checks pass.
