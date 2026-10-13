# The displays' materials (what glows, exported as Blender shows it)

**Status:** done: approved and built 2026-10-13 (option A); the owner's to look at. Backlog item 25.

> **[Agent note]** **The owner's answers (2026-10-13):** 1. Option A. 2. "the grid position is not important. bake using Monitor.001 as reference and re-use on the other ones." 3. "bake those too." 4. Yes, 1024.
>
> **As built:** [`app/tools/bake_materials.py`](../../../app/tools/bake_materials.py), used by both export scripts; what it does is in the [decision log](../../decision-log.md) (2026-10-13) and the [asset pipeline](../../architecture/asset-pipeline.md#before-the-next-export). What differs from the plan: `Monitor.001` isn't named in the script (it holds no list of objects): it's chosen as the object with the largest surface in the material, and a `bakeOn` custom property on a material overrides that. The images are baked at 1024 and then capped at 512 with every other texture of the ship (the existing step). Of the non-glow list, only `KF20 Vents` (ship) and `Blue White Stripes` (Dr. Kaufman, crew file) are exported, so those were baked; `Grate_old`, `Keys` and `Ice` aren't in any exported file. The crew file was exported from 1.19 for the first time. Roughness and metallic made by nodes are reported, not baked. **After the owner's look (2026-10-13):** the scanner's ray was solid though its alpha was baked: the game's see-through shader set the colour without the texture's alpha (`cutaway.ts`, `makeCuttable`: fixed for transparent materials with a colour texture; the vents' slits opened with it).

## Goal and scope

The owner, 2026-10-13: the displays' textures "look gray and washed out. You can still see the texture, but looks like the material is not setup correctly" (the map table in the cockpit: dark, with green lines and a grid in Blender; near white in the game).

**In:** every material in the ship file whose glow is made by nodes the glTF exporter can't follow. **Out:** lighting, the screens' brightness against the room (pass 3, set aside), animated screens.

## What's wrong

The game's side is right: it shows what the file holds. The file is wrong. The glTF exporter only understands an image plugged **straight** into the Principled BSDF. With nodes in between, it looks upstream for an image and writes that image **as it is**; with no image upstream, it writes a plain colour.

Read from `The Zamboni 1.19.blend` and the exported `zamboni-ship.glb` on 2026-10-13:

| Material | In Blender, the emission is | In the exported file | Seen in the game |
|---|---|---|---|
| `Topographical Map` (4 objects) | the map image through a colour ramp (paper → black, lines → green), mixed half and half with a Voronoi grid through another ramp | the map image, untouched, at full strength | white paper with gray lines |
| `Keyboard`, `Keyboard Laptop`, `Keyboard TRS-80`, `Keyboard Kaypro.002` | the key image through a ramp: only what's brighter than 0.41 glows | the key image, untouched | the whole keyboard glows, flat |
| `Screen VS Code` | the screenshot through RGB curves | the screenshot, untouched (strength 3 kept) | probably paler than in Blender |
| `Thruster` (4 objects) | a gradient along the UVs, orange to black, strength 10 | plain white, strength 10 | a flat white disc |
| `Scanner Ray` | strength from a noise texture; alpha from a ramp | a constant colour, no alpha gradient | a flat sheet |

`Green CRT`, `DS_Screen_1`, `DS_Screen_2`, `Screen Blue Grid`: an image straight into the emission, exported correctly.

The same thing, not about glow (base colour, alpha or roughness made by nodes: exported as a plain value): `Blue White Stripes` (Dr. Kaufman), `Grate_old`, `KF20 Vents`, `Keys` (the boombox), `Ice`. Listed so they're known; not in this plan unless the owner wants them in.

## Constraints from the docs

- *Fix in Blender, not in the export* was the owner's call for double-sided materials ([asset pipeline](../../architecture/asset-pipeline.md#before-the-next-export)). Option A below fixes this one in the export instead: the owner's to decide whether the same rule applies here.
- The export never saves the ship file; anything it changes is in memory only.
- Texture memory: each baked image is a new texture in the ship file (budgets: [game architecture plan](../architecture/game-architecture/README.md)).

## Options

**A. The export bakes them (recommended).** For each material whose emission isn't a lone image, `export-ship.py` renders the emission to an image (Cycles, *Emit* bake) and exports the material with that image plugged straight in. Nothing changes in the blend file; the materials stay procedural and editable; every later export picks up changes. Cost: export code, a longer export, one more image per material, and the result has a fixed resolution (the ramps are *constant*, so the map's lines get stair-steps unless the bake is larger than the source image).
  - **A catch:** the Voronoi node has nothing plugged into *Vector*, so it uses *Generated* coordinates: the grid depends on each object's bounding box, not on its UVs. Four objects share `Topographical Map`. Either one bake per object (four images, exact) or one bake for all on the UVs (one image, the grid the same on all four, not exactly Blender's). Plugging the UVs into the Voronoi in Blender removes the catch.

**B. The owner bakes them in Blender.** Each material gets an image straight into its emission. No export code; the export only reports the ones it can't follow (as it does `PERF:` for double-sided). Cost: the owner's time, by hand, again when a material changes; the procedural version has to be kept somewhere to edit it.

**C. Rebuilt as shaders in the game (TSL).** Sharp at any distance and can move (scrolling map, flicker). Cost: each material written by hand, and two versions to keep alike. Worth it later for screens that animate; too much for a still image now.

With any option: **the export reports every material it can't follow** (`NODES: material 'X': Emission Color is made by nodes`), so this doesn't come back unseen.

## The work (option A)

1. The report: the `NODES:` lines, for every Principled input.
2. The bake for emission colour, on a copy of the material in memory; the map table first, compared side by side with Blender's viewport.
3. The others in the table (keyboards, VS Code screen, thrusters). `Scanner Ray` needs its strength and alpha too: looked at last, possibly left as it is.
4. Re-export (checklist first), resize, dedup, meshopt; `compare-glb` against the last export: only materials and images differ.
5. `check`, `build`, `smoke`; screenshots of each display in the game next to Blender's.

## Done when

- Agent: the exported materials hold baked images; the map table, the keyboards and the thrusters match Blender's viewport in screenshots; file size and texture count reported.
- Owner: the displays look right in play.

## Open questions

1. A, B or C?
2. The map's grid: plug the UVs into the Voronoi in Blender (the owner), or one bake per object?
3. The base colour / alpha / roughness list above: in or out?
4. Baked size: 1024 for the map table (the source image is 679 × 680)?

## After

[Asset pipeline](../../architecture/asset-pipeline.md): what the export does to materials made with nodes, and the `NODES:` report in the checklist. `export-ship.py`'s header, the code map's line about it, the backlog, `current.md`.
