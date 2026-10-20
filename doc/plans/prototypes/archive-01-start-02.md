# Plan: Archive prototype 01 as 0.0.1, start 0.0.2 (item 51)

**Status:** *in progress*: pass 1 done 2026-10-20 (3efdd2e); pass 2 done 2026-10-20; pass 3 done 2026-10-20 (*As built* below); pass 4 next. Drafted 2026-10-20; owner's answers of 2026-10-20 folded in (versions as the numbering, the low-res prototype skipped, the version in the tuning panel, the archive is the latest `.blend` with its textures packed). Two questions left (below). A big task (CLAUDE.md, *Keeping the work cheap* 5): four passes, a stop to assess after each.

## Goal

- **Prototype 01 is frozen as version 0.0.1** and keeps working: it runs, builds, deploys and passes the same checks as today, so it can be used as a reference.
- **Version 0.0.2** starts as an exact copy. It will address the architecture (item 49, [components](../architecture/game-architecture/components.md)) and the exports (item 48, [robust exports](../features/robust-exports.md)); otherwise it looks and plays the same as 0.0.1.
- **The two are isolated:** a change to one (code, game files, export scripts, checks, source art) can't reach the other.
- **Both run at the same time** and each has its own Vercel link.

## Scope

**In:** the split, the version numbering, the archive of the ship file, scripts, docs, the second Vercel project (set up by the owner).
**Out:** any change to how the game behaves. The component model and the robust exports get their own plans, written once 0.0.2 exists.

## Versions as the numbering (owner, 2026-10-20)

Prototypes are numbered by version from here on, `0.0.1`, `0.0.2`…, instead of `NN-<slug>`.

| Where | Form | 0.0.1 | 0.0.2 |
|---|---|---|---|
| Folder | `app/prototypes/<version>` | `app/prototypes/0.0.1` (renamed from `01-walk`) | `app/prototypes/0.0.2` |
| Package | `@zamboni/prototype-<version>`, `version` field the same | `@zamboni/prototype-0.0.1` | `@zamboni/prototype-0.0.2` |
| Dev port | one per version, in the table in `prototypes.md` | 5201 (kept) | 5202 |
| Scripts in `app/` | **the current version takes the plain names**; an archived one gets its version as a suffix | `dev:0.0.1`, `smoke:0.0.1`, `probe:0.0.1`, `export:0.0.1:ship`… | `dev`, `smoke`, `probe`, `export:ship`… (the habit `npm run export:ship` keeps working, on the current version) |
| Git tag | `v<version>` | `v0.0.1` | when it's archived |
| Console prefix | `[<version>]` | `[0.0.1]` (was `[01-walk]`) | `[0.0.2]` |
| Plan | `doc/plans/prototypes/<version>.md` | | |

**Renaming `01-walk` to `0.0.1`** changes the Vercel project's *Root Directory* (the owner changes it once; the link stays). Every path in the docs and tools that names `01-walk` follows. The alternative, keeping the folder name and only adding the version, avoids that but leaves two naming schemes side by side.

**The low-resolution prototype (02) is skipped** (owner): its plan is renamed `low-res.md`, marked *set aside; its features later*, and becomes a backlog line. Nothing is built for it.

**The version in the tuning panel** (owner): a line at the top of the panel (`tuning.ts`), read from the prototype's `package.json` at build time (Vite's `define`), so it can't drift from the folder.

## Constraints from the docs, and two conflicts

- [`architecture/prototypes.md`](../../architecture/prototypes.md) rule 4: a prototype no longer maintained gets a git tag before it's frozen. Kept, as `v0.0.1`. Its naming table (`NN-<slug>`, port 5200 + NN, `dev:NN`) is replaced by the one above.
- **Conflict 1: shared assets.** Rule 5 of that page says *assets are shared through `app/assets/`*, and both versions would read the same `.glb` files. Isolation needs **each version to have its own game files**. Proposed: rule 5 becomes "each version has its own `public/`". **Git stores identical files once**, so the copy adds nothing to the repo until 0.0.2's files change.
- **Conflict 2: shared code.** 0.0.1 imports `@zamboni/ui` (`Button`, `ProgressBar`, `tokens.css`), imported as source. A change made for 0.0.2 would change 0.0.1. Proposed: **0.0.1 gets its own frozen copy** of those files in its `src/ui/`; `packages/ui` carries on with 0.0.2. *Promote on second use* still applies to new code.
- Three.js stays pinned at `0.186.1` in both; every dependency is pinned exactly, so the shared lockfile doesn't move 0.0.1's versions.
- `resources/` stays out of git.

## What's shared today, and what each piece becomes

| Today (shared) | 0.0.1 (frozen) | 0.0.2 (current) |
|---|---|---|
| `app/assets/` (game files, fonts, UI images, 18 MB) | `prototypes/0.0.1/public/` | `prototypes/0.0.2/public/` |
| `packages/ui` | copied into `0.0.1/src/ui/` | `packages/ui` |
| `app/tools/` (exports, lists, smoke, probe, the Blender scripts) | `prototypes/0.0.1/tools/` | `prototypes/0.0.2/tools/` |
| `app/.export/` | `0.0.1/.export/` | `0.0.2/.export/` |
| `resources/models/The Zamboni 1.21.blend` + its textures | the archive (below) | the owner's working file, from 1.21 on |

## The archive: the latest `.blend`, textures packed (owner: that's all)

1.21 links **31 textures by relative path, only 16 of them inside `resources/`**; the others are in `Desktop/The Zamboni.archive/Resources/…` (13), `Desktop/Work/8-bit Texture Test/…` (1) and an HDR folder outside the project (1). It also links the Windows font `GOTHICB.TTF` and Blender's own `geometry_nodes_essentials.blend`.

A Blender script, tried on a scratch copy first, opens 1.21 (only read; the owner's file isn't saved), **packs every texture and the font**, and saves `resources/archive/0.0.1/The Zamboni 1.21 (0.0.1).blend`. It then reopens the archive and checks that nothing is missing. The node-group library ships with Blender 5.2 and can't be packed: noted in the archive's README.

0.0.1's exports (`export:0.0.1:ship`, `crew`, `player`) read the archive and write only into 0.0.1's `public/`. Part 1's Dr. Green (`part1-dr-green.glb`, from another file) isn't re-exportable from the archive; its game file stays in 0.0.1's `public/`, which is all 0.0.1 needs to run.

## The work

**Pass 1: isolate 01 in place, as 0.0.1** (the riskiest pass, so it comes first)
1. The baseline: `smoke` run once before anything moves (today: 7 failed).
2. `01-walk` → `0.0.1` (folder, package name, `version`, console prefix). `app/assets/` → `0.0.1/public/` (`publicDir` back to Vite's default). `@zamboni/ui` copied into `0.0.1/src/ui/`, the imports changed.
3. `app/tools/` → `0.0.1/tools/`, paths fixed; root scripts `dev:0.0.1`, `smoke:0.0.1`, `probe:0.0.1`, `export:0.0.1:*`, `see-through:0.0.1`.
4. The version line in the tuning panel.
5. **Check:** `npm run check`, `npm run build`, `smoke:0.0.1` with **the same results as the baseline**; screenshots of the start screen, the ship and the tuning panel.

**Pass 2: the archive**
6. The packing script on a scratch copy, then for real; the check that nothing is missing.
7. 0.0.1's exports read the archive. **Check:** `export:0.0.1:ship` and `crew` into `.export/` only, compared with the game's files by `compare-glb.mjs`: the same.

**Pass 3: create 0.0.2**
8. Copy `0.0.1` to `0.0.2` (without `node_modules`, `dist`, `.export`): name, port 5202, `version`, back on `@zamboni/ui` (its `src/ui/` removed). Its tools export **from the working file** into its own `public/`. The plain root scripts point at it.
9. **Check:** both dev servers running together; 0.0.2's smoke matches 0.0.1's; a change to a file in 0.0.2's `public/` or `tools/` doesn't show in 0.0.1.

**Pass 4: freeze, deploy, document**
10. Git (on the owner's go-ahead, rule 7): tag `v0.0.1` on the commit that ends pass 2. (The branch is already in `main`: done 2026-10-20, a4ae02b.)
11. Vercel (owner): 0.0.1's project keeps its link, *Root Directory* `app/prototypes/0.0.1`, and an **ignored build step** `git diff --quiet HEAD^ HEAD -- .` so pushes for 0.0.2 don't rebuild it. A new project for 0.0.2 (*Root Directory* `app/prototypes/0.0.2`).
12. Docs: `prototypes.md` (naming, rules 4 and 5, the table), `app/README.md`, CLAUDE.md (commands, ports, paths, the dev link now 5202), `tools/README.md`, both READMEs and code maps ("0.0.1: frozen, reference only"), `asset-pipeline.md` (the archive), the low-res plan, the decision log, the backlog, `current.md`.

## Done when

- **Agent:** `check` and `build` pass in every workspace; `smoke:0.0.1` gives the baseline's results; 0.0.2's smoke the same; both servers run together; 0.0.1's export from the archive matches its game files; nothing in 0.0.1 reads a path outside its folder (a search for `assets/`, `tools/`, `packages/`).
- **Owner:** both pages side by side (http://localhost:5201/ and http://localhost:5202/) look and play the same, each with its version in the tuning panel; both Vercel links work.

## Open questions

1. **Which state is frozen as 0.0.1.** *Merged first* (owner, 2026-10-20): `see-through-from-scratch` fast-forwarded into `main` at a4ae02b and pushed. Still to confirm: freeze `main` as it is (ladder 2b not built; 7 known smoke failures, written into 0.0.1's README), or build ladder 2b first.
2. **What happens to the open work** after the freeze: all of it in 0.0.2, 0.0.1 changed only if it stops running (recommended), or fixes carried back to 0.0.1.

## As built

**Pass 2 (2026-10-20).** A Blender script opened 1.21 (not saved), packed 35 images (4 were already packed) and the font, and saved `resources/archive/0.0.1/The Zamboni 1.21 (0.0.1).blend` (21 MB; the script is kept beside it as `pack_archive.py`, with a `README.md`). Tried first into the scratchpad. Reopened: 35 images, 1 font, 458 objects, nothing missing. **The node library's path is stored absolute** (Blender 5.2's install): a relative one breaks as soon as the archive sits at another depth (it did in the trial). `BLEND` in `0.0.1/tools/export.mjs` points at the archive. **Exported from it: the ship, its collider and the crew are byte-identical to 0.0.1's game files.** The player's file differs, but so does every export of it, from either file: four runs gave four different files, her mesh at 5286 or 5287 vertices (the player export isn't deterministic; item 48's subject). The committed `green-parka.glb` is kept.

## After

`prototypes.md`, `app/README.md`, CLAUDE.md, `tools/README.md`, both code maps, `asset-pipeline.md`, the decision log (*Prototypes numbered by version; 01 frozen as 0.0.1; each version isolated: its own game files, tools and source art*), the backlog and `current.md`.
