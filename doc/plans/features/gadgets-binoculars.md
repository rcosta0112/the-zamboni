# Gadgets, starting with the binoculars

**Status:** draft 2026-11-16, for review (three passes); controls revised the same day (owner: R / the right mouse button uses a gadget, interact stays interact), then the owner's answers (zoom on ZR / ZL, flying allowed, the tuning panel). **Passes 1 and 2 built 2026-11-16** (owner: "let's do pass 1", then "move on to pass 2").

## Goal

Dr. Green can use **gadgets** while she does the basic things she already does (stand, walk, run, jump, fly). The first one is the **binoculars**: the owner's animation `Dr. Green - Binoculars` in `The Zamboni 1.22.blend` (Dr. Green holding a pair of binoculars to her face), a toggle to take them out and put them away, then a first-person view through them with a zoom.

**In:** a small gadget layer (one gadget out at a time; the binoculars its only gadget); the binoculars' animation layered over her movement (upper body only); the toggle; the first-person view with its zoom; what puts them away by itself (ladder, seat, dialogue, cutscene, scene change).
**Out:** other gadgets, and switching between gadgets (the comm, the camera app: later, each its own plan); anything seen through the binoculars that the story reacts to (spotting things, marking them); a binocular sound; saving whether they're out (a loaded game starts with them away).

## The gadget controls (owner, 2026-11-16): the default for every gadget

**Bring a gadget out with the D-pad, use it with R.** Interact stays interact, so she can still open doors, use keypads and talk while holding a gadget.

| | Pad (Nintendo names, by position) | Keyboard / mouse |
|---|---|---|
| Bring the gadget out / put it away (a toggle) | **D-pad**: one direction per gadget; **up** is the binoculars | a key per gadget: **B** for the binoculars |
| Use the gadget that's out (a toggle) | **R** | **right mouse button** |
| Interact, as always | **A** | **E** |

Later gadgets take the D-pad's other directions (left, right, down) and their own keys; what *use* does is the gadget's own (binoculars: look through them). The D-pad's up and down still choose a dialogue's topics: no clash, since gadgets go away while a dialogue is up.

**The binoculars:**

| | Pad | Keyboard / mouse |
|---|---|---|
| Take them out: she raises them to her eyes (the animation) and holds them there in third person | **D-pad up** | **B** |
| Look through them: first person | **R** | **right mouse button** |
| Back to third person, still holding them | R again | right button again |
| Put them away (from either view) | D-pad up again | B again |
| Zoom in / out (first person) | **L** / **ZL** (owner, 2026-11-16; ZR before, which clashed with the jetpack) | **mouse wheel**, scroll up zooms in (owner, 2026-11-16) |
| Look (first person) | right stick | mouse |

**The sequence:** the toggle plays the animation and she **keeps holding them up in third person**, still able to walk, run, jump, fly and use things. R then switches to first person; pressed while she's still raising them, first person comes when the animation ends, so the animation always comes first. Putting them away from first person cuts back to third person **at once** while she lowers them (the animation backwards), so the player isn't left looking at nothing. R does nothing while no gadget is out.

**What she can do with them out.**

| Action | Third person, binoculars up | First person |
|---|---|---|
| Stand, walk, run | yes (her legs as now, upper body holding them) | no: she stands still and the left stick does nothing |
| Jump | yes | no |
| Fly (jetpack) | **yes** (owner, 2026-11-16); if the flying clip under the hold looks wrong, the animation is fixed after | no |
| Turn | yes | the camera turns her with it, so she faces where she looked when she lowers them |
| Use things (doors, keypads, lockers) | **yes**, the prompts as usual | no (the prompts hidden; back to third person first) |
| Climb a ladder, sit down, talk to the crew | yes: using it puts them away **at once**, then the climb, the seat or the conversation | no |
| A dialogue, a cutscene, a scene change, the pause | they go away **at once** (no animation), first person ends | the same |

## Constraints from the docs

- **Gamepad first; every UI usable with the pad** (CLAUDE.md). The pad's buttons are named as on a Nintendo controller ([decision 2026-10-28](../../decision-log.md)). D-pad up is already used, as a menu's *up*, for the dialogue's topics: no clash, since the binoculars are put away whenever a dialogue is up. R (5), ZL (6), the B key and the right mouse button are free today (`input.ts`); the right button needs the browser's context menu turned off on the canvas. ZR (7) flies: zooming on it only in first person, where she can't fly.
- **The decision of 2026-10-08** (*See-through hull rules*: "Camera: fixed distance indoors and outdoors, **no zoom**") stands: **the binoculars' zoom is separate, and the third-person camera doesn't change** (owner, 2026-11-16; recorded in the [gadget controls decision](../../decision-log.md)).
- [Characters architecture](../architecture/game-architecture/characters.md): animations are matched to bones **by name**; "layering the talk nod over other animations" and "objects held in `Hand_r`" are planned as engine code written once. The upper-body layer built here is that code: the nod can use it later.
- Her walk, run, jump, stand and fly are **Part 1's clips retargeted** (`retarget.ts`); the ladder and piloting clips are hers, from the ship file, baked by `export-crew-character.py`. The binoculars' clip is hers too, so no retargeting.
- **The camera indoors and the see-through** (`camera.ts`, `visibility.ts`): first person must turn the see-through off (nothing between the camera and her) and hide her (`AnimatedModel.setShown(0)`, already there for the camera close to her).
- Prototypes default to **inverted Y**: first-person look follows `settings.invertY`.
- Small Blender edits are the owner's; the agent exports with the `npm run export:player` command only.

## How the animation fits with the others (the recommendation)

Today one `AnimationMixer` drives her whole body: walk/run/stand blended by speed, the jump, the fly clip eased over them, and the ladder or piloting clip replacing everything (`model.ts`, `AnimatedModel.update`).

**Options:**

1. **An upper-body layer in the same mixer** *(recommended)*. Each of her movement clips is split in two at load, by a list of bones: the legs and hips (`Body`, the leg chain) and the upper body (from the spine up: chest, neck, head, both arms and hands). The legs' halves play exactly as now. On the upper body, the movement's halves are weighted by `1 − g` and the binoculars' clip by `g`, where `g` eases from 0 to 1 as she raises them. The lowest spine bone takes the binoculars' pose only partly (about half), so her walk still sways her a little and the hold doesn't look bolted on. Cost: twice as many actions on her mixer (cheap: one character). It's the general "a gadget, or a nod, over whatever she's doing" layer.
2. **Additive blending** (three.js `AdditiveAnimationBlendMode`): the binoculars' pose added on top of the walk. Keeps all the walk's movement, but her arms would still swing with the walk while holding the binoculars: wrong for a held object. Fine later for a nod, not for this.
3. **The pose written onto the bones after the mixer** (as `look.ts` does for heads). Works, but bypasses the mixer's blending and timing; harder to reverse the animation or reuse for the next gadget.

**The clip.** It plays **once** and holds its last frame while they're up (`LoopOnce`, clamped). Putting them away plays it **backwards** from where it is (the same clip, time scale −1), so taking them out and putting them away halfway through both look right. A breathing or shaking loop while held can come later, as a second clip.

**The binoculars themselves**: `Binoculars.001` (see *What's in the file*), exported with her model, hidden until she takes them out, shown at the animation's first frame and hidden at its last when put away.

**Their own turn (`Binoculars`) in step with hers: one clip in the game.** The export bakes both actions together, frame by frame, into the one clip `Dr. Green - Binoculars`: her bones (the IK solved) and the binoculars' place and turn **relative to her right hand's bone** (`Hand_r`), the mesh hung on that bone. One clip means taking them out, putting them away (played backwards) and stopping halfway keep the two together with no extra code, and it settles Q4 without touching the file: the mesh's parent in the file (`Hand_r.IK`) stays as it is. *(Re-parenting it in Blender instead would change the space the `Binoculars` action's rotations are in, so its keys would turn the binoculars differently.)*

**Her export.** `export-crew-character.py` exports one `--clip` (the ladder) and one `--loop` (piloting) today. A new repeatable `--action <name>` bakes any further action the same way (IK solved, a key every few frames), with no tag; `export.mjs`'s `player` job names `Dr. Green - Binoculars`. Her clips are then found by name in `model.ts` as the pilot clip is.

## What's in the file (read 2026-11-16, `The Zamboni 1.22.blend`)

- **`Dr. Green - Binoculars`**: frames 1–12 (half a second at 24 fps), keys at 1 and 12 only: a raise from her rest pose to the hold. It keys **three bones: `Hand_l.IK`, `Hand_r.IK` (the arms' IK targets) and `Head`**. Assigned to `Dr. Green Parka`, fake user on. The arms come from the IK, so the export bakes it (IK solved into the arm bones) as it does the ladder; the IK targets themselves aren't in the game's skeleton. Nothing below the arms moves: it suits the upper-body layer.
- **`Binoculars`**: frames 1–12, six curves on no bone: **it turns the binoculars, played together with hers** (owner, 2026-11-16).
- **`Binoculars.001`**: the mesh, in `Player`, parented to `Dr. Green Parka`'s bone **`Hand_r.IK`**, shown. Two things follow: (a) the game's skeleton has no `Hand_r.IK` (the export leaves IK targets out), so the mesh needs to hang on a bone that's exported, the right hand's (Q4); (b) it hangs on the parka's armature only. In the game that's fine, both outfits share the parka's skeleton, but `model.ts` would count it as part of the parka outfit and hide it with the jumpsuit on: it's handled as the gadget's, not the outfit's.

## The work

### Pass 1: the animation in the game, the toggle (third person)

1. **The file**: read (above). Before exporting, compare the file with this reading if it was saved since.
2. **Export**: `--action` in `export-crew-character.py`, with `--action-object Binoculars.001:Binoculars` (the object, its action, baked into the same clip relative to `--action-bone Hand_r`); named in `export.mjs`; `npm run export:player`. Checked: the binoculars stay in her hand over the 12 frames (a probe reading the mesh's distance to the hand bone), and a screenshot at the last frame against Blender's.
3. **The upper-body layer** in `model.ts` (option 1): the bone list, the split clips, `g` eased (a setting, `gadgetBlend`, panel *Character*), the clip once forward / backwards. The binoculars' mesh shown and hidden with it.
4. **`gadgets.ts`** (new): the gadget state (`away`, `raising`, `up`, `firstPerson`, `lowering`), one gadget (`binoculars`: its clip, whether it has a first-person view, its zoom range). `input.ts`: `gadgetToggle` (which gadget: D-pad up, B), `gadgetUse` (R, the right mouse button), `zoom` (ZR / ZL, the wheel). main.ts calls it after input and hands `g` to the model.
5. **Check**: a probe that presses B, waits for `up`, walks and jumps, presses B again; screenshots of her walking and jumping with them up. Code map updated.

*Agent build:* ~1 h. *Review rounds:* 1–2 (how the hold looks while walking and running; the spine's share), ~10 min each.

**As built (2026-11-16):** as above, the step-by-step options not needed. The export's `--action` bakes the binoculars' turn into her clip (`Binoculars.001` on `Hand_r` in the game; nothing changed in the file). **Found and fixed on the way:** each bake now starts from the armature's pose in the file (the binoculars inherited piloting's `Body` and sat at her mouth, 4–7 cm low; now within 1 mm of the file); the thinning step used piloting's old clip name. The gadget is put away at once while she's seated, climbing, talking or watching (planned for pass 3; one line). `binoculars-probe.js` 12/12; smoke 83 pass, the 4 known fails, no console errors. *Actual time:* about 40 min of the session's 66 (estimate ~1 h). [What exists](../../features/gadgets.md).

**Changed after pass 1 (owner, 2026-11-16):** out, they sit in her hands (the clip's first frame, blended in over 0.25 s); **R / the right mouse button raises them to her eyes**, a toggle. Pass 2's first person follows the raise. Probe 14/14.

### Pass 2: first person and the zoom

1. **The view**: a first-person camera at her eyes (her head bone, plus an offset tuned on the panel), her model hidden, the see-through and the interaction off. The camera's yaw turns her; pitch limited to about ±80°. Look sensitivity scaled by the zoom so it feels the same at any zoom.
2. **The zoom**: the field of view between `binocularFovWide` and `binocularFovNarrow` (about 2× to 10×, to tune), ZR / ZL held moves it steadily (faster the further an analog trigger is pressed), eased; the wheel steps it.
3. **The tuning panel while this is built** (owner, 2026-11-16): every existing control taken off the panel (commented out in `tuning.ts`, all its folders: Movement to Rendering), and a **Binoculars** folder in their place: **the zoom's minimum and maximum** (sliders, as magnification, e.g. 1×–20×; the field of view worked out from them), so the owner can settle the values. More binocular values (the eye's offset, the zoom speed, the hold's blend) go in the same folder as they come. The other folders come back when the owner says the feature is done; the agent's checks set values through `window.__settings`, which doesn't need the panel.
4. **The overlay** (placeholder): the double-circle mask of binoculars in CSS over the canvas, faded in with the cut. A proper one later in Figma.
5. **The cut**: first person starts once the animation has ended; leaving it (R, or the toggle) cuts back to the third-person camera where it was.
6. **Check**: a probe that enters first person, zooms both ways, leaves; screenshots at both ends of the zoom, indoors and on the plain (`?scene=landed`).

*Agent build:* ~1 h. *Review rounds:* 2 (the eye position, the zoom's range and speed, the overlay), ~10–15 min each.

**As built (2026-11-16):** first person once the raise ends (R), the camera at the binoculars themselves; the zoom as magnification (2×–10×, the panel's two sliders), ZR / ZL at 1.5 doublings a second, 1.25× a wheel notch; the overlay an SVG placeholder; the panel down to its Binoculars folder (`ALL_FOLDERS = false`); help text hidden too. With first person on the raise, she can't walk with them *up* any more (she stands still in first person, as planned): walking, running and jumping are with them in her hands. Probe 24/24; smoke 83 pass, the 4 known fails. *Actual time:* about 25 min.

**Changed after pass 2 (owner, 2026-11-16):** the overlay removed; a prompt at the bottom right instead: *R to Use* while they're out, *ZL / ZR to Zoom* in first person (the mouse's right button and wheel on the keyboard). Probe 29/29. **Then the zoom moved to L (in) / ZL (out)** (owner: ZR clashed with the jetpack). **Then the shoulders and triggers were renamed L1 / R1, L2 / R2** (owner, 2026-11-16), shown as icons in the prompts: R1 uses, L1 / L2 zoom. **Then (owner):** the icons at the face buttons' size; *R1 to Close* over the zoom prompt in first person; **the jetpack keeps working in first person** (it was held with her feet: she can now hover and look at once). Probe 37/37. **Then (owner):** the icons 22 × 22, centred on the text line; **in first person she walks, runs and jumps too** (nothing of hers held; standing she turns with the view). Probe 39/39.

### Pass 3: the rules

1. **Put away at once** when a dialogue, a watched conversation or a cutscene starts, on a scene change, while seated, and at load.
2. **Interaction while they're out**: as usual in third person; a climb, a seat or a conversation puts them away at once; in first person the prompts and dots are hidden.
3. **The far view** (see *Risks*): what shows at full zoom on the plain; if the scenery runs out, flag it with options.
4. **Docs**: a [feature page](../../features/) for gadgets, the code map, `input.ts`'s header, the decision log (the first-person view, the upper-body layer). The smoke script gets the probe's checks; `npm run smoke` once.

*Agent build:* ~45 min. *Review rounds:* 1, ~10 min.

## Risks

- **The scenery at full zoom.** The plain's scatter is drawn within `reach` of the camera, and the haze fades the distance: zoomed in, the far ground may look empty or flat. Options when seen: a longer reach while zoomed (cost: more instances drawn), or the haze doing more of the work. The temple at 3 km should be fine.
- **Flying with them up** may look odd (the flying clip tilts her whole body). She flies with them anyway (owner, 2026-11-16); the animation is fixed after if needed (the fly clip's upper body left out like the walk's, or a flying hold of its own).
- **Indoors, first person in a tight spot**: the camera at her eyes can be inside a low ceiling or a door. Probably fine (she fits where she stands); checked in pass 2.

## Done when

- **Agent:** check and build pass; the probes above pass; screenshots of her walking, running and jumping with them up, and first person at both ends of the zoom, indoors and outdoors; no console errors; smoke once at the end.
- **Owner:** on the pad at http://localhost:5202/ (and `?scene=landed` for the plain): D-pad up takes them out while walking, A still opens a door with them up, R goes to first person, ZR / ZL zoom, D-pad up puts them away; the same with B, E, the right mouse button and the wheel.

## Open questions for the owner

None left (2026-11-16). Answered by the owner: R does nothing while no gadget is out; she stands still in first person; no change to the binoculars' file (the export moves them onto the hand's own bone); `Binoculars` turns the binoculars, played with hers; zoom on ZR / ZL and the mouse wheel (scroll up zooms in); she flies with them out; the third-person camera unchanged; the tuning panel down to the binoculars' folder while this is built. **The plan's review waits** (owner).

## After

`doc/features/gadgets.md` (what exists), the code map, `tools/README.md` (`--action`), `doc/decision-log.md` (first-person view; upper-body layer), the plans index.
