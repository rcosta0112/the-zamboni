# Tools

> **[Agent note]** Every script run outside the browser, what it's for and where it's described. Each script's header comment has the details; this is the index. Commands are run in `app/`.

## Exporting to the game

| Command | Script | Does | Described in |
|---|---|---|---|
| `npm run export:ship` | [`export.mjs`](export.mjs) | The whole ship export in one go: Blender, textures capped at 512 px, dedup, Meshopt, into `assets/test/zamboni-ship.glb` and `zamboni-ship-col.glb`; then a short summary of what changed. Nothing is saved to the `.blend` (Blender may be open). Raw files, baked images and Blender's log: `app/.export/ship/` (not in git) | Here; [asset pipeline](../../doc/architecture/asset-pipeline.md#before-the-next-export) (what to check) |
| `npm run export:crew` | [`export.mjs`](export.mjs) | The same for the crew placed in the ship: `assets/test/zamboni-crew.glb` | Same |
| (run by the two above) | [`export-ship.py`](export-ship.py) | The Blender side of the ship export: parts, props, light markers, doors, the collider. Every tag is read from the reference file | Its header; [naming contract](../../doc/architecture/asset-pipeline.md#naming-contract-proposed) |
| (run by `export:crew`) | [`export-ship-crew.py`](export-ship-crew.py) | The Blender side of the crew export: Dr. Kaufman skinned with her action, the others as static poses, resized | Its header; [ship contents plan](../../doc/plans/features/ship-contents.md) |
| (imported by both) | [`bake_materials.py`](bake_materials.py) | Bakes to images what the glTF exporter can't follow in a material (ramps, mixes, procedural textures before the colour, glow or alpha); prints `NODES:` lines | Its header; [decision log](../../doc/decision-log.md), 2026-10-13 |
| `blender -b … --python tools/export-crew-character.py` | [`export-crew-character.py`](export-crew-character.py) | One character from a crew `.blend` (the player's model, `green-parka.glb`) | Its header; [prototype 01 plan](../../doc/plans/prototypes/01-walk.md) |
| `blender -b --python tools/export-part1-character.py` | [`export-part1-character.py`](export-part1-character.py) | Part 1's Dr. Green from its FBX, with her animations (`part1-dr-green.glb`) | Its header; [prototype 01 plan](../../doc/plans/prototypes/01-walk.md) |
| `node tools/encode-audio.mjs` | [`encode-audio.mjs`](encode-audio.mjs) | The audio masters → `assets/test/audio/` (AAC, with ffmpeg) | [Audio](../../doc/architecture/audio.md); `assets/test/audio/SOURCES.md` |

## Checking

| Command | Script | Does | Described in |
|---|---|---|---|
| `npm run smoke` | [`smoke-01.mjs`](smoke-01.mjs) | The whole scripted check of prototype 01 in headless Chrome: a `PASS` / `FAIL` line per check, about three and a half minutes. **Once, at the end of a session's changes** | [Prototype 01's README](../prototypes/01-walk/README.md#scripted-check) |
| `npm run probe -- <file.js>` | [`probe-01.mjs`](probe-01.mjs) | One question to the running prototype (about 20 s): runs the file's code in the page and prints what it returns; `--shot <out.png>` saves a screenshot. For looking at one thing after a change, and for trying a check out before it goes into the smoke script | Its header |
| (used by both) | [`browser.mjs`](browser.mjs) | Starts headless Chrome and talks to it | Its header |
| `node tools/compare-glb.mjs <before> <after>` | [`compare-glb.mjs`](compare-glb.mjs) | What differs between two `.glb` files, object by object. Run by the export commands. It counts only a node's own mesh: a door with something hanging on it shows 0 triangles | Its header |

## Records

Scripts that changed the ship's reference file once, kept to show what was done. Not part of any export. Run again on the saved file, each reports "0 changes".

| Script | What it did | Described in |
|---|---|---|
| [`build-ship-reference.py`](build-ship-reference.py) | Made `The Zamboni 1.19.blend` from 1.18 (2026-10-12): the old export lists turned into tags in the file | [Asset pipeline](../../doc/architecture/asset-pipeline.md#the-ships-reference-file) |
| [`tag-ship-pass4.py`](tag-ship-pass4.py) | Tagged the bulkhead doors, panels, window and lever, and closed the doors (2026-10-13) | [Bulkhead doors plan](../../doc/plans/features/bulkhead-doors.md) |
| [`fit-bulkhead-doors.py`](fit-bulkhead-doors.py) | Closed the bulkhead doors' leaves edge to edge and into their frames (2026-10-13) | [Asset pipeline](../../doc/architecture/asset-pipeline.md#before-the-next-export) |
| [`parent-polaroid.py`](parent-polaroid.py) | Made `Polaroid` a child of `Locker Door.003` (2026-10-13) | [Asset pipeline](../../doc/architecture/asset-pipeline.md#before-the-next-export) |

No new record script for a small change (owner, 2026-10-13): a line in the asset pipeline's checklist is enough.
