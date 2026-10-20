# Plan: The ladder with a climbing animation (item 44)

**Status:** *draft*, 2026-10-17; owner's notes 2026-10-19, answered below (`[Agent note]` under each); revised for a second review. **Split in two passes (owner, 2026-10-19):** pass 1, the scale, is done ([scale-normalization.md](scale-normalization.md)): the game's proportions kept, the file 1:1, so option C and stage 0 below are superseded. **Pass 2a built 2026-10-19** (see *As built, 2a* at the end); 2b next. **This plan is pass 2**, after the owner re-keys the animation in `The Zamboni 1.21.blend` (`Body` rising 2.26, floor to floor; the clip as it is rises 1.81). The ladder is longer since 1.20 (0.2 m below the floor above). **2026-10-19:** at the owner's request, `Dr. Green - Ladder x1.25` (a copy, on `Dr. Green Jump suit`; the original kept) moves 1.25 times as far from frame 1 ([`scale-ladder-action.py`](../../../app/tools/scale-ladder-action.py)): she starts as posed, rises 2.252 and ends with her feet on the upper floor (3.500 against 3.503). Limbs keep their length, so the owner touches up the poses where a hand or foot falls short. Asked by the owner on 2026-10-17, with the new climbing animation in `The Zamboni 1.20.blend`.

## Goal

The cargo bay ladder becomes a **button action** that plays the owner's climbing animation:

1. Near the ladder's foot, the prompt **Climb** shows (same prompt and button as every other interaction).
2. Pressed: she **slides to the animation's starting position** (and turns to face the ladder).
3. The animation plays; she rises with it.
4. At the end she **is where the last frame left her**: on the crew quarters floor beside the opening, and control comes back.
5. **If the trapdoor is closed, it opens by itself when her head touches it.**

The current system (stick-driven climbing, held at the top, the float) is **kept in the code, not in use**, so it can be rolled back. No switch on the tuning panel (owner).

**Out:** climbing down (open question 2); the cockpit rungs (removed in 2026-10-09); an animation for the current system (only a suggestion, at the end).

## What's in the file (read from 1.20, 2026-10-17; nothing saved)

- Action **`Dr. Green - Ladder`**, frames 1–72 at 24 fps: **3.0 s**. It's on **`Dr. Green Jump suit`** (in `Player`), posed at the ladder's foot: armature at (−0.908, 0.159, 0.84), not rotated. The player's model is exported from **`Dr. Green Parka`**: same bones (the parka adds `Hood`), same rest pose except the thighs (5° apart). So the action plays on the parka's skeleton **without retargeting**.
- **Root motion is in the `Body` bone** (the armature object doesn't move). `Body` rises 1.52 Blender units (her feet: 0.84 → 2.36, floor to floor), then, from frame ~58, moves 0.37 sideways (+X in Blender) and **turns 90°** to face +X: she steps off beside the opening, facing away from it.
- **Hands and feet are IK** (`Hand_l.IK`, `Hand_r.IK`, `Foot_l`, `Foot_r` keyed). The export has to bake the solved pose onto the deforming bones (the game has no IK).

*** Note from owner: should we add IK? there will be lots of character animations in the game. Would IK be useful and worth the time to develop? ***

> **[Agent note]** **Not for this ladder; yes later, on its own plan.** For a fixed clip like this one, baking the IK in the export is exact and costs nothing at run time: the game would only re-solve what Blender already solved. IK in the game earns its place where the pose has to adapt to something the animator can't know in advance:
> - **Feet on uneven ground** (the cargo ramp, the terrain outside, steps): two rays per frame, the legs bent to meet them. The most visible gain.
> - **Hands on what she uses** (keypads, the window's lever, picking things up, rungs on a ladder of any spacing): a target marker on the object in the ship file, the arm reaches it while the action plays.
> - **Look-at** (her head turning toward the crew, a sound, the pointed-at object): the cheapest, and much life for its cost.
> 
> **Cost:** the solver itself is small (a two-bone solver with a pole, for arms and legs, about a day with checks; three's `CCDIKSolver` add-on exists but is less stable for limbs). The real cost is per use: the markers in the file, blending in and out, tuning. Recommendation: a backlog item now (**item 45**), built when the first case comes (likely look-at, or the feet on the ramp). The export keeps baking either way: glTF carries no IK.

- Her head reaches the trapdoor's underside (`Hatch.002`, z 2.263) around frame 30, moving about 1.1 Blender units/s (1.6 m/s in the game).

## ⚠ Conflict: her size in the file and in the game

The animation was made with her at the **ship file's size** (armature scale 1.033). **The game uses the crew file's size** (0.826, decision log, *Taking a jetpack from the rack*: "everything stays at the prototype's scale"), so in the game she is **0.8× the size she has in the file, next to the same ladder.** Played as is, the root motion would lift her 1.81 m instead of the 2.26 m between the decks: 0.45 m short, and her hands would miss the rungs.

| Option | Cost | Result |
|---|---|---|
| **A. The game takes the ship file's size** (1.033): she's 25% bigger in the ship | Agent: small (the ship's scale in the game is measured from her; the export's `--scale` goes). Owner: play again, since doorways, the camera, the jump, the collision boxes all feel different | The animation fits exactly, and so will every future animation made in the ship file |
| **B. The owner remakes the animation at 0.826** | Owner: Blender work | Fits; the game's size is unchanged |
| **C. The export stretches the root motion** (×1.25: `Body`'s translation and the IK targets, so she rises the full height) | Agent: small | Fits the decks; her limbs are 0.8 the length, so hands and feet don't land exactly on the rungs. A placeholder |

**Recommendation:** build with **C** now (cheap, nothing else changes), and the owner chooses **A or B** for the real thing; the game's code is the same in all three, only the export changes. If A: it's a decision-log update.

*** Comments from owner: 
1. Would A cause distortion in any other animations? 
2. Should we normalize the scale from both so the character size is 1 in both the file and the game?
***

> **[Agent note]** **1. No distortion.** A scales the ship around her, uniformly: she keeps her 1.23 m and every animation stays as it is (Part 1's walk, run, jump and flight are retargeted to her model, whose proportions don't change). What changes is the ship **around** her: about 20% smaller than now (one Blender unit becomes 1.19 m instead of 1.49), so it's the feel that needs a replay: doorways and ceilings closer, the indoor camera distances, the indoor jump against the ceilings, the walking speed through the rooms. Everything in the code that's placed from the file (the collision and camera boxes, the ladder, the doors) follows by itself. **A also fixes the crew in the ship:** they're shrunk around their hips at export today to match her 0.826 (`export-ship-crew.py`); with A they're exported at the size the owner placed them.
> 
> **2. Yes, for Dr. Green, together with A.** Measured: her rig at scale 1.0 is **1.00 Blender unit tall**. So normalized, she's 1 in the file, and the game uses a fixed **1 Blender unit = 1.23 m** (her height) instead of measuring her model at load; no `--scale` in any export, and any animation made on her in the ship file fits the game as made. How: a record script (agent) applies the scale on her armatures (`Dr. Green Parka`, `Dr. Green Jump suit` and the placed ones at 1.033) **and scales her actions' location keys by 1.033**, so the motion in the file is unchanged (Blender's *Apply Scale* doesn't scale the keys: the ladder's rise would shrink). She becomes 3% smaller next to the ship than now in the file; the ladder clip still lands on the upper floor (its keys were scaled), hands 3% off the rungs: not visible. Saving the file is flagged first, as always. **The other characters** (Adam at 1.25 and 1.185, Dr. Ogawa…) have their height in their scale, and some share actions at different scales (Adam's `Walking`): normalizing them is for when their animations come into the game.
> 
> **Revised recommendation: A with Dr. Green normalized** (one script on the file, one change in the game's scale, then the owner's replay). Option C is dropped. If agreed: a decision-log entry updating *Taking a jetpack from the rack* (the size), and the asset pipeline's open question on units is answered (1 unit = 1.23 m, her height).

## Constraints from the docs

- **Gamepad first**; the prompt is the existing one ([interaction](../../features/interaction.md)), button E / Circle / B.
- **The owner's file**: read only; the export opens it read-only ([asset pipeline](../../architecture/asset-pipeline.md#before-the-next-export): read before exporting). The export path moves from 1.19 to **1.20** (`export.mjs`). The owner moved assets between collections in 1.20: the ship export is run once and its summary checked for anything unexpected.
- **Doors in the file are closed and not animated**: the trapdoor (`Hatch.002`) is tagged `doorStartOpen`, so the game starts it open; nothing changes there.
- **The camera moving by itself should stay minimal** (owner): the camera follows her as it does now; nothing scripted.

*** note from owner: we take control from the player while she climbs, but the player should keep control of the camera ***

> **[Agent note]** Agreed, written into stage 3: during the slide and the climb only her movement is locked; the right stick turns the camera as usual, and the camera follows her as she rises (its indoor collisions on, as now).

## The work

0. **Her size (A, normalized)**, if agreed: the record script on the file (her armatures at scale 1, her actions' location keys ×1.033; a copy of the file next to it, saving flagged first); the game's ship scale becomes a fixed 1.23 per Blender unit; `--scale` and the crew's resize to 0.826 go from the exports; `npm run export:ship`, `export:crew`, `export:player` once each, summaries checked. Then a quick look at the doorways, ceilings and camera in every room (the `see-through` screenshots), and the owner's replay.
1. **Export the clip** (`export-crew-character.py`, run by `npm run export:player`; reads 1.20): assign `Dr. Green - Ladder` to the parka's armature in memory, bake it (constraints evaluated, IK into the bones) at 24 fps, export it with the model in `green-parka.glb`. Also record **where the clip starts relative to the ladder** (the jump suit's armature against `Ladder Cargo Bay`'s origin) as an extra on the clip, so the game needs no hand-typed position; if the ladder moves in the file, the jump suit moves with it. The export summary prints the clip's length and rise.
2. **Root motion in the game** (`model.ts`): at load, take `Body`'s translation out of the clip (the model plays it in place) and keep it as a curve. While the clip plays, the **character is moved by that curve** each frame: the camera, the see-through rules and the ladder's collider switch all follow her real position, and at the last frame she is already where it ends. Her facing turns with `Body` (the 90° at the end).
3. **The climb** (`ladders.ts`, new `LadderClimb`): an interaction target on the ladder, verb **Climb**, offered only while she stands on the floor at its foot (not from the floor above, not while flying). Pressed: she **slides** to the start (straight line, about 0.25 s, turning to face the ladder; collisions off, as climbing is now); then the clip; then she's placed on the floor under the end position (a short ray, so a few cm of difference don't leave her floating), and the clip blends into standing. During the slide and the climb her movement, jump and jetpack do nothing (owner: no cancelling); **the camera stays the player's**.
4. **The trapdoor** (`ladders.ts`): if it's closed when the climb starts, its usual opening (`doorSeconds`, its sound) is **started at a fixed time in the clip**: the latest start at which the swinging lid never meets her head. That time is **calculated once at load**, not by rays during the climb: for each frame of the clip, her head (a sphere round the top of the `Head` bone, from the clip's pose placed at the ladder) is tested against the lid in the pose it would have at that moment; the latest start with no overlap wins, so it opens as close to her head as it can without stopping the climb. The console prints it (*trapdoor opens at frame N*), and it follows by itself if the clip or `doorSeconds` changes.

*** owner: too complicated. just play the trapdoor open animation when her head touches it (or a bit earlier to avoid any clipping). the animation is always the same length, so fire the trapdoor open animation at the correct frame. ***

5. **Keep the old system**: the free-climbing class moves to `ladders-free.ts` (`FreeLadders`, unchanged; its header says it's not in use since 2026-10-17 and how to put it back: two lines in `main.ts`). Finding the ladders and the collider switch stay shared. It keeps type-checking with the rest.
6. **The sound** (owner: yes): the rung sound plays on the clip's hand contacts (at fixed times found by the export: when a hand's IK target stops rising), instead of every 0.35 m.

### The trapdoor and her head

Her head moves 1.6 m/s; the trapdoor takes 0.6 s to open (`doorSeconds`), so opened exactly at the touch, her head would go through the lid while it swings.

*** owner: calculate how to open the hatch as close to her head as possible without interrupting the climb animation ***

> **[Agent note]** Done that way (stage 4): the latest start time with no overlap, worked out at load. The options of the first draft (faster opening, a fixed lead, pausing the clip) are dropped.

## Done when

- Agent: `npm run check`, `npm run build`; a probe: at the foot the prompt says *Climb*; pressed, she ends on the crew quarters floor, facing as the last frame, within 0.05 m of the floor, in 3.0 s + the slide; with the trapdoor closed it opens and she ends in the same place; from the floor above there's no prompt and she still drops through the opening. Screenshots at the start, middle and end; the console clean. The smoke script's ladder checks rewritten for the button, run once at the end.
- Agent, for stage 0: every room's screenshots at the new size, doorways passable (the smoke script's walks), the console clean.
- Owner: climbs it with the gamepad, turning the camera during the climb; looks at the slide, the hands on the rungs and the trapdoor; replays the ship at the new size.

## Open questions for the owner

> **[Agent note]** 2, 3 and 4 are decided (owner, 2026-10-19), and written into the stages. One question left:

1. **Her size:** A, B or C above (C for now, recommended). *** Owner: look at notes above.*** → **A with Dr. Green normalized** (revised recommendation, after the size section). Agreed? Stage 0 then comes first, and its replay is a step of its own before the ladder.
2. **Climbing down:** from the floor above she drops through the opening, as now. Should there be a **Climb down** prompt there? It could play the same clip backwards as a placeholder (often passable on a ladder, but the step-off turned backwards looks odd), or wait for its own animation. *** owner: no climb down ***
3. **Can she cancel the climb** (jump off, the jetpack)? Recommended: no, 3 s is short. *** owner: no ***
4. **The rung sound** from the clip's hand contacts (stage 6), or leave it out until the sound pass? *** owner: yes. do this ***

## Suggestion: animating the current system (the free climb), if it comes back

The free climb moves her by the stick, at any speed, both ways, and stops anywhere, so a fixed clip can't be played; it has to be **driven by her position on the ladder**, the way the walk is driven by her speed:

- **A climbing cycle, in place**: one loop of two rungs (left hand and right foot, then the other pair), with no root motion, keyed so the first and last frames match. The game sets the clip's time from how far up she is (`s` × the ladder's length ÷ the cycle's rise, modulo 1): climbing up plays it forward, climbing down backward, stopping freezes the pose with both hands on rungs. Exactly as `AnimatedModel` sets the walk's time from its phase today.
- **Getting on** (a short clip from standing to the first rung) and **getting off at the top** (from the cycle's pose to standing on the floor: the end of the new clip, frames ~56–72, is close to it). In the free system she leaves the top by walking off; the get-off clip would play as the float starts, and walking blends in over it.
- **The rise per cycle must match the rungs**, so the hands land on them: the cycle's rise = 2 × the rung spacing (in the game's size: see the conflict above).
- The owner's new clip may already contain a usable cycle in its middle (frames ~11–51), if one stretch of it repeats; otherwise it's a new one in Blender.

*** owner: what if we had IK for the hands and fee? that would simplify the placement ***

> **[Agent note]** Yes, this is where IK in the game pays off most. The cycle would only set the timing and the body's motion; each hand and foot would be placed on the nearest rung by IK (rungs found from the ladder's mesh, or a `rungs` spacing tag on it). So the cycle needn't match the rung spacing, the same cycle works on any ladder, and she can stop at any height with her hands on rungs. It needs the solver of item 45 first; the cycle is still a Blender clip (in place, two rungs).


## After

- [`features/interaction.md`](../../features/interaction.md#ladders): the ladder as it is now; the free climb under *kept, not in use*.
- [`architecture/asset-pipeline.md`](../../architecture/asset-pipeline.md): the reference file is 1.20; the player's export carries the ladder clip and where it starts.
- `app/tools/README.md` (`export:player`), `CODE-MAP.md` (`ladders.ts`, `ladders-free.ts`, `model.ts`).
- Decision log: the ladder by button with an animation, the free climb kept (and, if A, her size).
- `backlog.md` item 44; `steps/current.md`.

## As built, 2a (2026-10-19)

Owner, 2026-10-19: implement it with the current animation (`Dr. Green - Ladder x1.25`); no edits in the file. Split by the agent into **2a** (now) and **2b** (the trapdoor at the computed moment, the rung sounds, the smoke checks), with a stop between.

- **Export** (`npm run export:player`, `--clip`, `--clip-start`): the clip played on the parka's armature and baked (`nla.bake`, visual keying: the IK solved into the bones), 72 frames at 24 fps (3.0 s), exported with her model; `climb` on the armature: the start (`Dr. Green Jump suit` at frame 1) and facing, in the ship's space. The glTF exporter names it `Animation`; it's her model's only one.
- **The game:** `model.ts` plays it in place and hands `Body`'s translation to `LadderClimb` (`ladders.ts`), which moves her by it, turned to her facing; at the end she's snapped to the floor (a short ray) and turned by `Body`'s turn (a quarter). The interaction is off while she climbs. The free climb is in `ladders-free.ts`, not in use.
- **Probe** (scratch): she slides from 0.4 m back to the start (5.348, 1.247, −16.764: 2 cm above the floor, as in the file), rises to 3.50 in 3 s, ends at (4.802, 3.462, −16.855) on the floor (3.461), facing turned by 1.571; the camera follows; screenshots at the start, middle and end look right.
- **Not checked through the prompt:** Dr. Kaufman, exported with the ladder clip and no pose of her own (1.20 lost her action), stands at the ladder's foot, and her box hides the ladder from the target test. In the probe the climb was started as E does. In reach (0.73 m of 1.0) and 4° from the screen centre with the camera behind her, it becomes the target once she's gone.
- **The crew export** takes only each character's own action since this pass (`export_animation_mode='ACTIVE_ACTIONS'`) and notes one without: the next `export:crew`, after the owner's fix.
- Found: she ends 9 cm from the opening's edge (walking back toward it, she drops through): the clip's step-off. The smoke script's ladder checks are for the free climb: rewritten in 2b.

## As built, 2b (2026-10-20)

- **The trapdoor:** each ladder knows the hatch over it (`hatch`: the one whose box meets its top end). A shut one is opened (`open = true`, its usual 0.6 s and sound) **1.0 s into the animation** (frame 24), as the owner asked: a fixed frame, the latest at which the lid misses her. Measured by `tools/ladder-times.js` (kept, a probe): one climb with the lid shut, her skinned vertices recorded each frame, then for each start the lid posed as it would be and tested against them in its own space. The latest clean start is 1.10 s (her hood at 1.47 s); 1.0 is two frames earlier. A shut and locked trapdoor: no prompt.
- **What the open lid touches anyway** (a hand by its hinge from 1.47 s, her side as she steps off, a few vertices within 5 cm) is left out of the choice: it doesn't depend on the moment. Not visible in the screenshots.
- **Doors move through her while she climbs** (doors.ts `advance`): the lid's collider met her capsule (bigger than her body) and stopped at 0.81 open, then pushed her 0.42 m at the end. The climb's end already clears her of the doors. Decision log, 2026-10-20.
- **The rung sound** at five hand contacts (0.27, 0.67, 1.18, 1.77, 1.85 s; a hand landing = it stops rising after a reach, below the floor above + 0.15), measured by the same probe; none at the slide's end any more.
- **The smoke script's ladder checks** rewritten for the button: the prompt says Climb and she ends upstairs; with the trapdoor shut it opens at its moment and she ends in the same place; from above no prompt, and she drops through; the ladder collides again below; five rung sounds. Tried with the probe: all pass.
- Screenshots at 1.25, 1.45 and 1.65 s with the lid shut at the start: the lid open ahead of her as her head passes, no clipping seen.
- Not done: the three console warnings for `Hand_r.IK`'s tracks (the IK target isn't in her model; present since 2a, harmless).
