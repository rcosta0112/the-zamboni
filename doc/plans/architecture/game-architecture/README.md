# Plan: Game architecture — overview

**Status:** *draft*, 2026-10-08; refactored into topic files the same day after the owner's review notes. Part of [Step 1](../../../steps/01-docs-and-architecture.md). Numbers marked *estimate* are to be confirmed by measurement (see "Checking the estimates").

## Goal

Decide how the game is put together so it **runs smoothly as a web app, with loading times and transitions the player doesn't notice**, can be **installed and played offline**, and lets the player **stop and continue later**. Be clear about what each of those costs.

## The plan in brief

- **Three layers.** The ship and the crew load once and never unload; only the exterior (the travel terrain or one landing site) is swapped. Going inside ↔ outside is never a load. → [levels](levels.md)
- **The story is linear, so loading is predictable.** Each landing site downloads during the travel section before it; the ship downloads during the opening cutscene. The only visible wait is about 1–3 s before the title screen. → [loading](loading.md)
- **About 60–90 MB for the whole game** plus music (~1 MB per minute, streamed). The ship is measured and light (~107k triangles); unique ruins are the main variable. Collision shapes are included and small. → [budgets](budgets.md)
- **One shared skeleton, already in the crew file**, used by every human, every outfit and Adam; animations mostly unique. Characters are a few hundred triangles each, so the cast is cheap: ≈ 1.5–3 MB for everyone in both outfits, ≈ 2–5 MB of animation for the whole game, loaded per scene. → [characters](characters.md)
- **30 fps on the Intel MacBook, 60 on the PC.** Integrated GPUs run out of pixels first, so the 3D resolution is controlled (capped, dynamic, or low-resolution as a style). The real threat to smoothness is stutter, handled by few materials and compiling ahead. → [performance](performance.md)
- **Checkpoint saves** of story state, mission data and chat history; props reset on reload. → [saving](saving.md)
- **An installable web app** that can download everything and play offline, hosted on Vercel (probably). → [offline](offline.md)
- **Code outline:** world, asset manager, modes, input, physics, characters, save, offline, Svelte UI and the bridge between game and UI. → [code](code.md)

## Constraints from the docs

- About one hour of play; one ship; 6–10 landing scenes with some repeat locations; travelling inside the flying ship ([`architecture/scope.md`](../../../architecture/scope.md)).
- Three.js r186, `WebGPURenderer` (WebGL2 fallback), TSL; Svelte 5 for the UI; Rapier for physics ([`architecture/stack.md`](../../../architecture/stack.md)).
- Gamepad first; keyboard and mouse secondary.
- Immersive sim: most small objects can be picked up, which means many separate objects.
- Cutscenes in-engine; pre-rendered video only as a fallback.
- Platform and targets: [`architecture/platform.md`](../../../architecture/platform.md).

## Story levers

The owner controls the story and script, and is open to changing them when that relieves a technical problem. Where the script directly affects performance or loading, each topic file flags it in a **Story lever** box. In short:

| Script choice | Technical effect |
|---|---|
| Opening cutscene long enough (~15 s+) | Hides the ship download on slow connections |
| Travel sections between landings | Hide each landing site's download |
| A landing/take-off cutscene at every site change | Hides the exterior swap |
| Repeat locations, shared ruin pieces | Smaller total download |
| Fewer characters or big objects in one shot | Higher frame rate |
| Natural breaks (scene starts, landings) | Good checkpoint positions for saving |

## Checking the estimates

1. **Budget script** (`npm run budget`): sizes, triangles, draw calls, materials, texture memory and collision size of every exported file, against the [budgets](budgets.md).
2. **[Prototype 02](../../prototypes/02-low-res.md)**: the real ship on both test machines, at native and low resolution; first real frame times.
3. **A measurement prototype** (later): the ship through the full export pipeline (palette material, Meshopt, KTX2) and the tiered loader, measured on throttled connections; checks Vercel's compression and range requests.

## Trade-offs at a glance

| Want | Costs |
|---|---|
| Unnoticeable loading | A story order the loader can rely on; travel sections and cutscenes long enough to cover downloads |
| Rich interior lighting | Download size (lightmaps) or authoring time (vertex lighting); no moving lights in the ship |
| Everything interactable | Draw calls and physics bodies, kept in check with BatchedMesh and sleeping bodies |
| Few materials | Blender materials converted at export; special effects need their own material |
| Unique ruins at each site | Download size per site |
| Endless travel terrain | Generated, so less authored detail during travel |
| Runs on modest hardware | Quality tiers, resolution control, the budgets |
| Offline play | ≈ 100 MB of storage on the player's machine; service-worker update logic; Vercel bandwidth per new player |
| Simple saving | Props reset on reload; the player restarts at the last checkpoint |

## All open questions

- How long the travel sections are between landings ([loading](loading.md)).
- Lightmaps or vertex lighting; low-resolution rendering as a style ([performance](performance.md)).
- One automatic save, or manual slots too ([saving](saving.md)).
- Which Vercel plan; where "Download for offline play" lives ([offline](offline.md)).

## After

Decided parts move into the documentation as they're confirmed: [`architecture/platform.md`](../../../architecture/platform.md) (done for the owner's decisions of 2026-10-08), `architecture/loading.md`, `architecture/budgets.md`, `architecture/saving.md`, and the character setup guidance into [`architecture/asset-pipeline.md`](../../../architecture/asset-pipeline.md). Each decision gets a decision-log entry.
