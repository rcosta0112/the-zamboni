# Changing clothes at the locker (item 72)

**Status:** *approved* (owner, 2026-10-21: "lets do the locker outfits"). **Built 2026-10-21:** pass 1 approved by the owner (with the little backpack off with the jumpsuit too), pass 2 for the owner's look (notes below each pass). What exists: [interaction](../../features/interaction.md#her-lockers-clothes).

## Goal

At **her own locker**, Dr. Green swaps the indoor **jumpsuit and sneakers** for the outdoor **parka and boots**, and back (owner, 2026-10-21).

## What exists

- **Her model in the game is the parka** (`public/test/green-parka.glb`, from the armature `Dr. Green Parka` by `npm run export:player`). It carries the jetpack (`Gadget.004`, `Gadget.005`) and the hood's `jetpack` shape key. The file also has **`Dr. Green Jump suit`**, never exported.
- **The lockers:** `crew-locker-door-1` (crew quarters, on the left: **hers**, labelled *locker*) opens and closes. `crew-locker-door-2` (Dr. Kaufman's) and `cargo-locker-door` (Dr. Ogawa's) give her remark instead (`# instead`) and stay shut. **Three parkas hang in the crew quarters** (`Parka.001` to `.003`), and two boots sit in `Stuff` (`Boot`, `Boot.001`).
- One skeleton for every outfit ([characters](../architecture/game-architecture/characters.md#outfits)).

## The owner's answers (2026-10-21)

1. **Her own locker only:** `crew-locker-door-1`. **The other two keep their doors' opening and closing** even though the player can't open them, so a later scene can open one (e.g. Dr. Kaufman leaves hers open). They already work this way: the remark replaces only the player's action, not the door.
2. **The prompt is on the parka hanging in the open locker,** not on the door: *Put on parka* hides it from the locker, and *Take off parka* (while she wears it) shows it there again. The door stays a door.
3. **An instant swap.** No fade, no animation.
4. **Only one parka:** the one in her locker, which she puts on and takes off. **The owner removes the others in Blender.** The same goes for **boots and sneakers**; the owner adds those.
5. **The shoes go with the parka:** one action swaps the parka and the boots (*Put on parka* leaves the sneakers in the locker; *Take off parka* puts the boots back).
6. **What she wears:** the jumpsuit and sneakers are the indoor clothes, worn while the ship is flying; the parka is for going outside when it lands. **This describes what normally happens; it's not a rule**, and there can be exceptions. So: **no rule in code**. She starts in the jumpsuit, and a scene's setup can set her outfit.
7. **The jetpack goes over both outfits.** The owner adds it to the jumpsuit in Blender.
8. **The conflict with `characters.md` is resolved:** the player changes Dr. Green's clothes at her locker; the crew change off-screen or in a cutscene (the line is updated).
9. **The jumpsuit is ready to export** once those edits are in ("but check the scale"): see below.

## The jumpsuit's scale (checked 2026-10-21, `The Zamboni 1.21.blend`, read only)

- **Scale 1, the same skeleton** (16 bones; the parka has one more, `Hood`). Feet at the same height (the lowest vertex: −0.010 for the jumpsuit, −0.013 for the parka).
- **It stands 1.241 tall, the parka 1.230**: the jumpsuit's head (hair, no hood) is 1.4 cm higher. This is the mesh, not a wrong scale. The export's scale check (1.23 ± 0.01) will measure each outfit against its own height.
- **`Leg_l` and `Leg_r` are 1.4 cm off** from the parka's. On one shared skeleton, the jumpsuit's legs would be drawn 1.4 cm from where they were modelled. **Question 1.**
- The jumpsuit's mesh is named **`Dr. KaufmanMesh.005`** (a copy of Dr. Kaufman's, renamed or not?). It exports either way; a name like `Dr. Green Jumpsuit Mesh` would read better in the logs.

## Constraints

- **Anything saved is in Ink** ([game structure](../architecture/game-architecture/game-structure.md#who-owns-each-piece-of-state)): what she wears is an Ink variable, `green_outfit` (`jumpsuit` | `parka`). The save, *Continue* and the story agree on it, and a later rule (*"Too cold out there"*) would be a line of Ink, not code.
- **Gamepad first.** The parka's prompt follows item 56's placement rules (a new kind, by its centre).
- **Edits to the `.blend` are announced** (CLAUDE.md): I compare the new file with 1.21 before exporting.

## The work

**Before pass 1, the owner's Blender edit:** one parka, boots and sneakers in her locker (the other parkas and boots removed); the jetpack on the jumpsuit; the legs (question 1). Then announce the file.

**Pass 1: both outfits in the game** (about 2 hours)
1. Compare the new file with 1.21 (objects, collections, the two armatures).
2. `export:player` exports both armatures: `green-jumpsuit.glb` beside `green-parka.glb`. The scale check runs on each at its own height; the jetpack and the hood's shape key on each that has them.
3. The ship export takes the locker's three things (`ship-export-list.json`); the removed parkas and boots leave the list.
4. `model.ts` loads both outfits at start on one skeleton, mixer and set of clips. A swap shows one mesh and hides the other, with no reload. The see-through, her fade and the low-res rules take both outfits' materials.
5. A command `outfit` (`set`: `jumpsuit` | `parka`) and a dev hook `__outfit()`.
- **Check:** a probe swaps the outfits in the corridor, on the ladder and with the jetpack, with screenshots; the load's pipeline count (item 50) before and after.

> **[Agent note]** **Pass 1, as built (2026-10-21):** `export:player` runs Blender once per outfit (`green-parka.glb`, `green-jumpsuit.glb`, 0.13 MB); the parka's export took the merged materials' names (`Teal.001` → `Teal`…). `model.ts` `dress` moves the jumpsuit's things onto the parka's skeleton at load; `settings.outfit` (start: `jumpsuit`; the tuning panel's *Jetpack* folder), the command `{ do: 'outfit', set }`, `__outfit(set?)`. Found on the way: the first swap stalled 0.7–1 s (the hidden outfit's see-through and shadow shaders), so both are drawn through the shader build and the warm-up (82 pipelines at load, 78 recorded before with the parka alone); the jumpsuit's jetpack is the same pack modelled 10× larger with straps, so the glow takes its nozzles from the rings' part (`Teal Dark`) instead of shares of the height. Checked by `tools/outfit-probe.js` (swaps 18–20 ms, both outfits flying and climbing). Step 3 was done in the last session.

**Pass 2: the locker** (about 1.5 hours)
1. The parka in her locker becomes an interactable (kind `outfit`): only while her locker door is open, *Put on parka* / *Take off parka*. The locker's three things are shown or hidden by `green_outfit`.
2. The Ink variable `green_outfit` (start: `jumpsuit`) and an `outfit:` line in a scene's setup. Chapter 1 starts in the jumpsuit.
3. The save keeps it; *Continue* restores the clothes and the locker.
- **Check:** a probe opens her locker, puts on the parka, reloads (*Continue*), takes it off. Then the whole smoke run once.

> **[Agent note]** **Pass 2, as built (2026-10-21):** the five things tagged in 1.22 by [`add-locker-clothes-ids.py`](../../../app/prototypes/0.0.2/tools/add-locker-clothes-ids.py) (`id`, `kind` `outfit` / `clothes`, `outfit`; the parka `behind: crew-locker-door-1`), so the export keeps them as objects of their own and passes `outfit` and `behind` through. `src/clothes.ts` (the rack's pattern: the hidden parka stays the target for *Take off parka*); Ink's `VAR green_outfit = "jumpsuit"`, kept with `settings.outfit` once per frame in main.ts (Ink changed: she follows; otherwise Ink follows her), so the existing `outfit` command is the scene setup's line. Checked by `tools/locker-probe.js` / `locker-probe-after.js`: all 12 pass, screenshots. No check added to the smoke run.

**Cost (estimates):** about 0.2–0.5 MB more to download; perhaps 4–8 more shader pipelines at load (both outfits through the see-through and the fade, a fraction of a second); the two passes as above, plus your Blender edit.

## Open questions for the owner

> **[Agent note]** Answered 2026-10-21, with 1.22: **1.** the agent snapped the legs (`tools/fit-jumpsuit.py`, rest matrices with the roll, which was about 6° off too; every shared bone now matches); **2.** the names are `Parka Hanging`, `Boot Left`, `Boot Right`, `Sneakers Left`, `Sneakers Right`, in the collection `Locker Dr. Green`. The jumpsuit's jetpack keeps its straps (owner), its rack tags dropped; the parka's is `Jetpack` again (owner). For pass 1: the jumpsuit's jetpack is `Jetpack With Straps` (renamed 2026-10-21; the game looks for it under the jumpsuit), and the boots and sneakers are merged into `Props Crew Quarters` in the export today: pass 2 keeps them as objects of their own, to show and hide.

1. **The legs, 1.4 cm apart:** (a) **you snap the jumpsuit's `Leg_l` and `Leg_r` to the parka's** in your edit (recommended: one skeleton, as `characters.md` says); (b) each outfit keeps its own skeleton and both play the same clips (it works, but every animation runs twice, and the item-44 ladder work has two rigs to fit); (c) leave the 1.4 cm.
2. **Names for the locker's three things**, so the code can find them: e.g. `Locker Parka`, `Locker Boots`, `Locker Sneakers` (any names; tell me which).

## After

`features/interaction.md` (the lockers), `characters.md` (*Outfits*, as built), the code map, `tools/README.md` (the player export), the backlog.
