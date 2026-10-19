# Plan: One scale for the ship file and the game (item 46)

**Status:** *approved* in conversation, 2026-10-19 (owner: "ok, let's do this"); **built 2026-10-19**, see *As built* at the end. Pass 1 of two: the ladder with the owner's animation is pass 2 ([ladder-climb-animation.md](ladder-climb-animation.md)), after the owner re-keys it.

## Goal

**The ship file and the game at the same scale, 1:1, with no correction factor anywhere**, keeping **the proportions the game has today** (owner: making her 25% bigger isn't acceptable).

- 1 Blender unit = 1 m in the game.
- **Dr. Green is 1.23 units tall, at armature scale 1** (owner, 2026-10-19: "around 1.2", so gravity and every tuning in metres stay as they are; 1.23 is her height in the game today).
- Today the game scales the ship by 1.4856 (her height ÷ her exported model's), the player export shrinks her to 0.826 and the crew export resizes the crew around their hips. All three go.

**Out:** the ladder animation (the owner re-keys it after this pass: `Body` must rise 2.26 units, floor to floor); applying the scale on the other characters' armatures (some share actions at different scales: Adam's two bodies; for when their animations come into the game).

## Constraints from the docs

- **Saving the owner's file:** said first, a copy kept. The script **writes a new version, `The Zamboni 1.21.blend`**, and leaves 1.20 as it is. It can be run again (on 1.20 or a later file of the owner's): it checks Dr. Green's scale first and reports "0 changes" on a file that's done.
- [Before the next export](../../architecture/asset-pipeline.md#before-the-next-export): read; nothing in it is affected except the scale entries.

## The work

1. **Baseline**: world positions of a set of objects, the ladder, the crew, the ship's scale (a probe), and the see-through screenshots of every room, before anything changes.
2. **`app/tools/normalize-scale.py`** (record script, run on the file):
   - every object without a parent, in every scene: scaled ×F around the origin, F = 1.485642 (the game's ship scale). Not applied: modifiers, shared meshes and children follow;
   - object-level location keys of the actions those objects use ×F;
   - `doorDistance` ×F (7 objects); area lights: size ×F, power ×F² (Blender renders unchanged; the game doesn't read them); the cameras' clip distances ×F;
   - **Dr. Green's armatures** (`Dr. Green Parka`, `Dr. Green Jump suit`, the placed `Dr. Green Jump suit Baked`, `.001`, `.002`): to the game's size around their origin, then the scale **applied** (bones resized, her meshes and the objects on her bones kept in place), and her actions' bone location keys scaled so the motion is unchanged. Checked: her world bounds the same before and after the apply; her height 1.23;
   - **the crew in the ship** (Dr. Kaufman, Dr. Ogawa, both Adams): resized around their hips as the crew export did, so the file shows them as the game does;
   - prints every change, and what it left alone.
3. **The exports**: the file is 1.21; no `--scale` for the player; no resize for the crew (each character's height relative to Dr. Green is **checked** and reported instead); `BIG` ×F (0.25 → 0.37); every export **stops** if Dr. Green's armature isn't at scale 1 or her height isn't 1.23 (±0.01).
4. **The game**: the ship (and the crew under it) at scale 1, her model at its file size; the boombox's shake (in the ship's units) ×F. No setting changes.
5. **Proof**: the probe and the screenshots again: positions within 1 mm, the screenshots the same; `npm run check`, `npm run build`; the smoke script once.

## Done when

The probe's numbers match the baseline (1 mm), the screenshots match, the smoke script passes, the exports run clean from 1.21 with the new checks. Owner: opens 1.21 and sees her 1.23 tall at scale 1, the ship around her as in the game.

## After

Decision log (one scale; updates *Taking a jetpack from the rack*); asset pipeline (the reference file is 1.21; scale entry; the open question on units answered); `app/tools/README.md`; ladder plan (pass 2, rise 2.26); backlog item 46; `steps/current.md`. Coordinates in earlier plans are in 1.20's units (×F for 1.21).

## As built (2026-10-19)

- **`The Zamboni 1.21.blend`**, written by `normalize-scale.py` from 1.20 (1.20 untouched): 37 changes. Everything ×1.485642; the player's two armatures (`Dr. Green Parka`, `Dr. Green Jump suit`) resized and applied at scale 1: **the parka stands 1.2300**, nothing moved by the apply (≤ 7.5e-6); the ladder clip's bone keys ×1.22714 (its object keys ×F), so it moves as before in the file. Her seated copies and the other crew resized around their hips, not applied (her copies share their armature data with other characters). Her jump suit's mesh is shared, so its scale isn't applied (the object keeps 1.227).
- **The view layer:** the collections switched off in 1.20 are switched off in 1.21. One difference Blender's API can't avoid: `Parts`, `Hull`, `Cockpit.001` and `Cargo.001` were on inside the switched-off `Body`; they're off with it now (switching `Body` on brings them back off).
- **The exports:** read 1.21, no factor; `scale_check.py` in all three (each printed *at scale 1, 1.230 tall: ok*). The crew export checks heights instead of resizing: Dr. Ogawa 1.000 of Dr. Green, Dr. Kaufman 0.785, as before. `BIG` 0.25 → 0.371 and the collider's merge distance 0.005 → 0.0074: the same props stay separate (56 big, 119 small: the 1.19 export had 57 and 115, the difference being the owner's receiver and keyboard), the collider 19,862 → 19,922 triangles.
- **Added on the way** (owner's answer, the same day): **what's exported is a list**, `ship-export-list.json`, made from 1.19's export (decision log, 2026-10-19). In 1.20 most of the ship's collections were switched off, and the export by the old rule lost most props.
- **The game:** the ship at scale 1 (`loadShip` takes no scale), her model at the file's size, the boombox's shake ×F; one fix in `ladders.ts` for the owner's longer ladder (below). No setting changed.
- **Proof:** the probe's positions (the boombox, couch, galley, a rack jetpack, a bulkhead door, the lab window, the roof hatch, the ladder's foot and top, three of the crew) the same within 1.5 mm; the rooms' screenshots the same apart from the owner's changes. `npm run check`, `npm run build`: clean. Smoke script: see `steps/current.md`.
- **Found, the owner's changes in 1.20 (not fixed, for the owner):** the trapdoor rotated open in the file (it now lies the wrong way in the game); Dr. Kaufman's action deleted (she shows un-posed on the lower deck); `Monitor.004` and `Keyboard.002` replaced by `Signal Receiver.001` (in the list now; +0.8 MB of images, 4 double-sided materials); the ladder longer (the game measured her side at its middle and got it wrong: now at her height above its foot). Details: [asset pipeline, *To look at in 1.21*](../../architecture/asset-pipeline.md#before-the-next-export).
