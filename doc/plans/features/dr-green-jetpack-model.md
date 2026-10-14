# Taking a jetpack from the rack (Dr. Green's model from the ship file)

**Status:** draft, 2026-10-14, for review. Second version: the owner set the feature's final shape the same day (below); the first version's three loose switches are replaced. **Approved and built 2026-10-14** (owner's answers: taken off at the rack; jumping allowed with it, docs fixed; the collections renamed; a placeholder sound; the agent made the blend file's edits). What exists: [`../../features/interaction.md`](../../features/interaction.md#the-jetpack-rack). The owner's to play.

## Goal (owner, 2026-10-14)

She walks up to the **jetpack rack** in the cargo hold and takes a jetpack:

- that jetpack disappears from the rack;
- the jetpack on her back appears, her **little backpack** hides, and the **hood shape key** is applied;
- the **jetpack controls** turn on (flying).

She can also **take it off** again (everything back as it was).

Everything she does now stays: Part 1's animations retargeted onto her, the blending, the jump, the flying clip, the footsteps, **her scale** (owner: keep the prototype's) and the ship's size.

**Out:** the binoculars. A pick-up animation (the swap is instant). "Outdoors only" (the prototype allows the jetpack anywhere).

## What's in the file (looked at 2026-10-14, read-only)

> **[Agent note]** Checked with Blender scripts on the saved `The Zamboni 1.19.blend` and test exports to a scratch folder. Nothing was saved to any `.blend` and nothing in `app/assets/` changed.

- **Dr. Green** (the new `Crew` collection) is the same rig and body as `green-parka.glb` (same 17 bones, rest pose, 409-vertex body), plus `Jetpack` (164 triangles, no straps, parented to the `Body` bone) and the shape key `Key 1` (moves the hood; saved at 1.0). The animations aren't in the file: Part 1's are retargeted by bone name at load, so they carry over unchanged.
- **The rack** (`Cargo Bay`): two shelves, `Jetpack Rack` and `Jetpack Rack.001` (parts), and three rack jetpacks with straps, `Jetpack.001` and `Jetpack.002` on the lower shelf, `Jetpack.004` on the upper (276 triangles each, one shared mesh, untagged).

## Issues found

1. **The shape key is lost in the export as it is.** The export applies her modifiers (Mirror, Auto Smooth, Subdivision), and the glTF exporter then drops shape keys. **Tested fix:** bake the other modifiers into the mesh per shape key, keep only the Armature modifier, export without applying modifiers. The glb then has the morph target with the skin intact. In memory, nothing saved.
2. **Her scale.** The armature is at 1.033 in the ship file, 0.826 in the crew file; the game sizes the ship from her height. **Decided (owner): the prototype's scale.** The export sets 0.826, so she's the same model as today. The `.blend` isn't touched.
3. **The rack jetpacks are merged into `Props Cargo Bay`.** Props under 0.25 units are merged per room, and each rack jetpack is 0.19, so the game couldn't hide one. **Fix:** the ship export keeps every prop tagged `interact` as an object of its own (the boombox needs the same; it's separate today only because it's big enough).
4. **`npm run export:crew` would break:** it reads the collection named `Crew`, now Dr. Green's; Dr. Kaufman's is now `Crew.003`.
5. **`Ship` is excluded in the view layer as the file is saved.** `export:ship` would export nothing: it has to be back on before the export this needs.
6. **A stray `Tape.003`** (the `Boombox` scene) came along in the test export: one exporter option (`use_active_scene`) fixes it.
7. **Jumping while wearing it.** [`scope.md`](../../architecture/scope.md) and [`01-walk.md`](../prototypes/01-walk.md) say she can't jump while wearing the jetpack (jump and fly shared a button). Since 2026-10-12 they're separate buttons (C / Cross jumps, Space / R2 flies: [`../backlog-passes.md`](../backlog-passes.md), *Decided*, 2). Open question 2.
8. **The scripted check flies today without a jetpack.** The seven flying checks will put one on first (a dev hook), or they'd fail.

## Constraints from the docs

- **Small edits to the ship file are the owner's** (CLAUDE.md): the tags on the rack jetpacks (stage 1) are the owner's to add in Blender.
- **Exports run through `npm run export:…`**, and *Before the next export* in [`../../architecture/asset-pipeline.md`](../../architecture/asset-pipeline.md#before-the-next-export) is read first.
- **Interaction** works as everywhere else ([`../../features/interaction.md`](../../features/interaction.md)): point at it, E / Circle, the prompt next to the target. Gamepad first.

## The work

1. **In the file (owner):** tag the three rack jetpacks `interact: "pickup"` and `device: "jetpack"`; include `Ship` in the view layer again; rename the collections (open question 3); rename `Key 1` to `jetpack`.
2. **The ship export** ([`export-ship.py`](../../../app/tools/export-ship.py)): props tagged `interact` stay objects of their own. `npm run export:ship`; the summary should show three new objects and `Props Cargo Bay` slightly smaller.
3. **Her export** ([`export-crew-character.py`](../../../app/tools/export-crew-character.py)): keep shape keys (as tested), `use_active_scene`, `--scale 0.826`. A new command, `npm run export:player` in [`export.mjs`](../../../app/tools/export.mjs): body, gadgets, little backpack, jetpack, no binoculars → `assets/test/green-parka.glb`, with the usual summary. Then `export:crew` pointed at Dr. Kaufman's collection, if the names don't go back (open question 3).
4. **The game:**
   - [`model.ts`](../../../app/prototypes/01-walk/src/model.ts): `wearJetpack(on)`: shows `Jetpack`, hides `Backpack.002`, sets the hood morph to 1; off, the reverse. On Part 1's model it changes nothing (its jetpack is built in).
   - [`character.ts`](../../../app/prototypes/01-walk/src/character.ts) / [`input.ts`](../../../app/prototypes/01-walk/src/input.ts): flying (Space, R2) only while she wears it; the jet sound with it.
   - [`interaction.ts`](../../../app/prototypes/01-walk/src/interaction.ts): each rack jetpack is a target, **"Take jetpack"**, offered while she isn't wearing one. Taken, it hides. To take it off: open question 1.
   - A switch in the tuning panel, *wearing jetpack*, and a dev hook, for checks and for trying it without walking to the rack. She starts without it.
5. **Check:** a probe (walk to the rack, take one, fly, take it off); the flying smoke checks put one on first; screenshots with and without; the whole smoke once at the end.

## Done when

- **Agent:** the exports' summaries show the three rack jetpacks as their own objects and her model with one morph target, at today's size. `check` and `build` pass. A probe: taking one hides it on the rack, shows hers, hides the little backpack, raises the hood and lets her fly; taking it off reverses all of it and she can't fly. Without one, R2 and Space do nothing. Walk, run, jump and fly still animate. The whole smoke passes once.
- **Owner:** takes a jetpack from the rack with the gamepad, flies, takes it off: no clipping, the hood clears the jetpack while she runs and flies.

## Open questions

1. **Taking it off: where?** (a) **At the rack (recommended):** pointing at the empty spot shows "Put back jetpack", and it reappears there. Same gesture both ways, and the rack always tells the truth. (b) Anywhere, with a button or from a menu: then where does the jetpack go?
2. **Jumping while she wears it:** allowed (recommended: they're separate buttons now), or blocked as `scope.md` says?
3. **The two `Crew` collections:** rename the new one (e.g. `Player`) and `Crew.003` back to `Crew`? Then `export:crew` needs no change and Blender's renumbering can't break it.
4. **A sound** for taking it and putting it back: a placeholder made like the other interaction sounds (recommended), or none for now?

## After

- [`app/prototypes/01-walk/README.md`](../../../app/prototypes/01-walk/README.md) (*The character models*, the controls), [`../../features/interaction.md`](../../features/interaction.md) (the rack), [`app/tools/README.md`](../../../app/tools/README.md) (`export:player`), [`asset-pipeline.md`](../../architecture/asset-pipeline.md) (props tagged `interact` stay separate; shape keys survive the export; the rack's tags), [`CODE-MAP.md`](../../../app/prototypes/01-walk/CODE-MAP.md), [`../../decision-log.md`](../../decision-log.md) (the player's model comes from the ship file; flying needs the jetpack), [`backlog.md`](../backlog.md), [`../../steps/current.md`](../../steps/current.md).
