# Dr. Green piloting: cutscene 2 and the start of chapter 1

**Status:** approved 2026-10-24 (owner: "go"); **built 2026-10-24** (both passes), for the owner's look. Two passes, about 3 hours in all.

> **[Agent note]** Owner, 2026-10-24: *"I added a piloting animation for Dr. Green (`green_piloting`): a 200-frame loop made with noise modifiers; not super precise, so when baking, don't keep too many keyframes; as long as it loops perfectly we're fine. Several changes to the mesh of her seat; the joystick is now a separate object with its own armature, which points at Dr. Green's hand bone. There will probably be differences on Adam's seat etc.; we'll address those next; it's ok to export them like this."* Then: *"For chapter 1, Dr. Green should start the scene on the piloting loop and have a prompt to get up. We don't have the get-up animation yet, so just place her in the corridor behind the chair and give control to the player (I think that's what we have now)."* It is: chapter 1 starts her at (−0.2, −2.6, 3.74), the aisle behind her seat.

## Goal and scope

- **Cutscene 2** (the watched conversation, `opening`): she sits in her seat playing the piloting loop, instead of standing behind it; the joystick follows her left hand.
- **Chapter 1** starts the same way, with the camera behind her as usual and a **Get up** prompt. Pressed: she's placed in the aisle behind the seat (today's start) and the player has control. No animation (the owner's get-up comes later, flying scene pass 2).
- **Out:** the get-up and sit-down animations, the seat's refusals and *Sit down* (flying scene pass 2); Adam's seat and the other seats (the owner's next changes); the seat's id rename (`cockpit-seat-copilot`, pass 1's second half).

## What the file has (compared with the last export, 2026-10-24)

- **New collections** `Scenes` › `01-cutscene-flight-2`: Dr. Green's copy `Dr. Green Jump suit.001` (her jumpsuit armature, sitting in `Seat.001`, playing `green_piloting`) and `Joystick Armature` (a damped track on the object, its Z axis to the copy's `Hand_l`). Not in `export-collections.json`: off, flagged.
- **The action:** 180 curves, one key each at frame 1; **4 carry noise**: `Head` and `Body` rotation Y and `Hand_l.IK` X are limited to frames 0–200 and fade in and out, so they loop exactly. **`Hand_l.IK` location Z isn't limited**: frame 200 is 3.5 mm off frame 0 (a small jump of the hand on the stick at each loop).
- **The joystick** (`Joystick`, in `Cockpit`, a child of the armature, its origin at the pivot): **the ship export leaves it out without a note** (its parent is in a collection that's off). Its vertex group is `bone` and the bone `Bone`: the armature modifier deforms nothing; the stick moves only because the armature *object* turns (that's enough).
- **The seats:** `Seat.005` and `Back seat.003` new, tagged parts, not in `ship-export-list.json`; `Seat.006` gone; `Seat.003` now a child of `Seat`. The comparison's triangle counts for the seats are confused by shared meshes; the files are fine (checked by hand).

## Pass A: the export (about 1 hour)

1. **`export-collections.json`:** `Scenes` and `01-cutscene-flight-2` off for the ship and crew (the copy is read by the player export by name).
2. **`ship-export-list.json`:** `Seat.005` and `Back seat.003` added as the file tags them, `Seat.006` removed, **`Joystick` added as a moving part**, exported at rest (its armature's constraint off for the export, so it stands as modelled, not leaning to frame 1's hand). The export notes a listed object whose parent is in a collection that's off (today it says nothing).
3. **The player export takes a second clip:** `green_piloting`, baked like the ladder's (IK solved into the bones) onto the parka's armature, **frames 0–200, a key every 4 frames** (51 keys; the glTF's interpolation between them), **made to loop**: each baked curve's last 30 frames eased onto its frame 0, so whatever the noise does the end meets the start (today only the one curve needs it). Where she sits: the copy's place and facing, tagged `pilot` on the armature (as `climb` is). Tried on a scratch copy first; the summary gives the clip's keys and the seam's largest jump before and after.
4. `npm run export:ship`, `export:player` through the gate; the differences above are the expected ones, then accepted.

*Check:* the summaries; `compare-glb` on the player files (the new clip, its length 200 frames at 24 fps, 8.33 s).

> **[Agent note]** **Pass A built 2026-10-24.** Both exports taken; the after-export check passes. Found while building: **`Seat.005` carries `Seat.001`'s `id` and `kind`** (duplicated): the ship was exported from a scratch copy with those two tags removed; the owner removes them in the file (Linear). **`green_piloting` has two slots**, the first (`OBDr. Green Jump suit Baked.001`) the same curves without the noise: the bake takes the slot an object playing the action uses (the copy's). The seam: 0.0507 at the worst bone after the IK (the unlimited `Hand_l.IK` Z) → 0. The clips are NLA tracks now, each animation named after its action: the ladder's is `Dr. Green - Ladder x1.25` (was `Animation`), its values identical; the game still takes `animations[0]` (the ladder) until pass B looks clips up by the tags' names. The thinning is a step of its own (`thin-clip.mjs`), as Blender's exporter samples every frame of every clip.

## Pass B: in the game (about 2 hours)

1. **model.ts:** the `pilot` clip as a loop (like the climb, played alone while she sits); `AnimatedModel.pilot(on)`.
2. **Sitting** (main.ts, a small `seated.ts` if it grows): she's placed at the `pilot` tag, physics and movement held (as during a cutscene), the clip looping. **The joystick** turns each frame so its Z points at her `Hand_l` (the file's damped track, done in the game: always in time with her, and upright when she's gone).
3. **Cutscene 2:** she's seated for it; her shots aim at her head bone (today worked out from her feet, standing).
4. **Chapter 1:** a scene setup command `seat` (`{ "do": "seat", "id": "green" }`) starts her seated; the prompt **Get up** on her seat (the seat's interaction while she sits, E / B); pressed: she's placed at today's start in the aisle, facing as today, and control is hers. The seat's other uses (`use_cockpit_seat_pilot`) wait until she's up.
5. **The save:** unchanged: a checkpoint at the chapter's start, so *Continue* before or after getting up starts her seated again (one press). Ink keeps nothing new.

*Check:* a probe (`piloting-probe.js --game`, `?scene=opening`): she's seated through cutscene 2 at the tag, the clip playing, the joystick turning; chapter 1 starts seated, she can't move; the prompt reads *Get up*; pressed, she's in the aisle and walks. Screenshots from cutscene 2's Green shot and from behind her in chapter 1. `cutscene-1-probe`, `opening-probe`, `flight-probe` again (they start chapter 1); the smoke once at the end.

> **[Agent note]** **Pass B built 2026-10-24.** As planned, with these differences and finds:
> - **Her place:** the `pilot` tag's (her feet, the armature's place) through the same conversion as the climb's start (`tagPlace` in main.ts). The scene's setup `{ "do": "seat", "id": "green" }` adds her to the command target's `seated` set (cleared at each scene start, as `locked`); the director's placing puts her at the seat instead of the start, and keeps the start for *Get up*. **She was drawn 27 cm back from her seat at first:** the render step eases her from her last simulated place to the new one, and seated no step runs; `Character.settle()` now draws her where she's placed at once.
> - **She sat 5 cm low** until the player was re-exported: the copy's `Body` is raised 5 cm by a pose value that `green_piloting` doesn't key, and the bake played the action alone. The bake now starts from the playing copy's pose (`export-crew-character.py` `bake`): her bones within 1 cm of Blender's at frame 1. Taken (the export's only difference, the known vertex count of `Dr. Green Mesh.004`).
> - **The joystick:** the file's damped track aims at the hand bone's **tail** (`head_tail` 1: 0.141 m along the bone), not its head; with the head it leaned 45–100°, with the tail 7–8°, as in Blender (7.8° at frame 1). Its rest axis is the ship's up (the armature's rotation is zero in the file). `src/joystick.ts`.
> - **Get up:** while she's seated it's the only target (`Interaction.only`), wherever the camera looks; the prompt sits on the seat's middle. Her seat's own knot (`use_cockpit_seat_pilot`) is offered again once she's up.
> - **Cutscene 2's shot of her:** aimed at her `Head` bone plus 0.415 m (the bone stands 0.695 m above her feet standing; the old guess, 1.11, kept as the framing the owner saw). Her shot was the pilot seat's guess backed out 2.3 m through the side glass, where **the exterior look turned the glass into the sky's mirror** and washed it out: she now has her own shot in `opening.json`, Adam Red's mirrored about the cockpit's middle (owner, 2026-10-22: hers mirrored), and the exterior look stays off during cutscene 2 (its shots are of the cockpit even when the lens backs out of a window).
> - **The clips by name:** `climb.clip` and `pilot.clip`; the tracks of bones her skeleton doesn't have (`Hand_r.IK`) dropped at load (they only warned).
> - *Check:* `piloting-probe.js` 11 checks pass; `opening-` (10), `flight-` (18), `cutscene-1-probe` (20) pass, updated for her seated start; smoke 83 passed, the 3 known failures. Screenshots: cutscene 2's shot of her (seated, her hand on the stick), chapter 1 from behind her seat.

## Options

- **The joystick: followed in the game (recommended)** or a baked clip of its own, played with hers. Followed costs nothing to export and can't drift out of time with her; baked would also need its own clip in the ship file.
- **The loop's seam: eased in the export (recommended)** or the owner limits that curve's noise to 0–200 in Blender (one tick). The export's way covers any curve added later.

## Done when

The owner sees her piloting in cutscene 2 and at chapter 1's start at http://localhost:5202/ (NEW GAME, or `?scene=opening`), presses Get up and walks off; no visible jump at the loop.

## Open questions

1. The prompt's word: **Get up** (assumed).
2. *Continue* after she's got up starts her seated again (assumed fine until pass 2's saves).

## After

[dialogue.md](../../features/dialogue.md) (cutscene 2), the scenes' doc (the `seat` command), [asset-pipeline.md](../../architecture/asset-pipeline.md) (the second clip, the joystick), `tools/README.md`, the code map; [flying-scene.md](flying-scene.md) a note under pass 2 (her start in the seat done this way).
