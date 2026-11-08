# Cutscene 2's exterior shot: the ship changing course

**Status:** *draft*, 2026-10-28; **the owner's answers the same day, built** (below).

> **As built (2026-10-28):** the owner answered the issues: (1) the camera's swing is the course change; (2–3) the shot ends just after the ship leaves the frame; (4, 5, 7, 8) match the game as it is (halved wobble and shake, 110 m, Green hidden as in cutscene 1, the sound unchanged: wind only, as the lens doesn't zoom); (6) no motion blur or depth of field. *"The only important thing on the file is the camera animation. Everything else should be re-used from the first cutscene"*; nothing re-created. So: `flyby-cutscene.py` takes an id and `out` (end 6 frames after the ship's box leaves the picture between the bars: frames 1–180, 7.5 s; cutscene 1's track re-made byte for byte the same); `WatchedConversation.onEnded(skipped)`; `main.ts` plays the track after the conversation unless it was skipped. Green follows no wobble and no noise share was added (both proposals dropped). What exists: [scenery.md](../../features/scenery.md#cutscene-2s-exterior-shot-the-ship-changing-course-2026-10-28).

The draft, as reviewed: Replaces the guesses of the flying scene's pass 4c ([plan](flying-scene.md), *The exterior shot, proposed*): the bank and the treadmill turning are dropped, since the owner's reference has neither.

## Goal and scope

The script (`0200 - Cutscene dialogue - Opening.md`, after Green's *"Hang on."*): *"External view of the ship changing course."* The owner (2026-10-28): the animation reference is `resources/models/The Zamboni - Opening Cutscene - Part 2 1.01.blend`, a copy of `The Zamboni 1.11 - fly by animation ACES.blend` with its camera animation replaced; **the ship's wobble and the treadmill stay the same; all the animation is on the camera.**

- **In:** one exterior shot at the end of cutscene 2, after the watched conversation's last line, before chapter 1 starts in the cockpit. The camera copied from the file as cutscene 1's was (`flyby-cutscene.py` → a track for `CutscenePlayer`). Skip, sound, the exterior look and the flames as in cutscene 1.
- **Out:** a bank, or a real change of heading (the treadmill turning). Neither is in the reference (see question 1).

## What the file holds (read 2026-10-28, not saved)

Compared with 1.11: **only the camera differs.** Same objects, collections, ship, ground, sun (energy 7.5, 13.4° up), world (strength 2), ACES 1.3.

- **The camera:** two keys, **frames 1 and 194** (8.0 s at 24 fps), Bézier. The lens is fixed at 44.8 mm (36 mm sensor: 43.8° across, 25.4° tall at 16:9). The *Track To* is gone, so the camera no longer follows the ship. It starts ahead of the ship, to its left and high (about 80 m off in the game's units, 50 m above), and drifts back and down past its left side while panning 66° (yaw −62° to −129°). It ends behind and to the left (about 114 m off, 32 m above), looking along the flight. The roll changes a little, −3° to +0.9°.
- **The camera's shake:** *Camera Shakify*, the same as 1.11 (rotation influence 0.1, which is 0.025 after the add-on's driver).
- **The ship's wobble:** 1.11's Noise modifiers at full strength (a roll up to about ±5.5°, sampled 5.6°).
- **The ground:** 1.11's keys (frames 1–513, Bézier). The ship flies toward −Y.
- **The scene still runs to frame 430** (1.11's range), so frames 194–430 hold the camera still (9.8 s).
- **Also on:** depth of field (focus on the ship, f/0.5) and Eevee's motion blur, as in 1.11.

## Issues found

1. **Nothing in the file changes the ship's course.** The ship and the ground both go straight; the 66° pan around the ship is the only turn. The sun and the boulders' shadows stay fixed while the camera swings, so it may read as the camera circling the ship rather than the ship turning. *(question 1)*
2. **The camera stops dead at frame 194.** The first key is eased (flat handles), but the last isn't: at frame 194 it's still moving at about 13 m/s (in the file's units) and turning at about 10°/s, then the curve holds. If the shot cuts at 194, nobody sees the stop. If it holds on past 194, it jolts to a halt. *(question 2)*
3. **The shot's length:** 194 frames of movement, but the scene's range is still 430. *(question 2)*
4. **The wobble and the shake at full strength.** For cutscene 1 the owner halved both (2026-10-23). This file has the full values. **Assumed: halved here too**, so the two exterior shots match. *(question 3)*
5. **Height:** the file flies at 13.6 m (the belly about 14 m above the ice). The game flies at 110 m (`ice-plain.json`, the owner's call for cutscene 1). At 110 m the ice is much farther below the camera than in the file. The boulders look smaller, and the ship's shadow (about 460 m off with the low sun) is out of frame. **Assumed: the game's 110 m**, as for cutscene 1. *(question 4)*
6. **Depth of field and motion blur:** the game has neither. Motion blur was left out on purpose (owner, 2026-10-23), and depth of field would be post-processing (SC-136). A render from this file will show the ice blurred; the game will show it sharp. Not built in this plan.
7. **Dr. Green in her seat:** in cutscene 2 she is seated in the co-pilot seat, and from this angle the cockpit glass faces the camera. In cutscene 1 she was hidden (she couldn't sit then), but here she'd be missing from a visible seat. She isn't the ship's child, so she wouldn't wobble with it either: with a 2–3° roll she'd lean out of her seat. **Proposed:** she follows the ship's wobble during exterior shots, like the merged shadow casters (the player's `followers`). *(question 5)*
8. **Sound:** the ship's noise in exterior shots rises with the zoom (`CutscenePlayer.zoomed`). This lens is fixed, so the shot would play wind only, with no ship noise. **Proposed:** a fixed ship-noise share for the track (first value 0.5, on the panel). *(question 6)*
9. **The ground's speed:** the file's ground is eased (Bézier from frame 1), so a render starts with the ice nearly still. The game keeps the plain's constant speed, as cutscene 1 does. No action needed.

## How it's built

- **The track:** `tools/flyby-cutscene.py` takes the file, the frame range, the output and the halving (`SWAY`, `SHAKE`) as arguments, instead of a copy of the script. Run on the new file, it writes `public/cutscenes/cutscene-2-exterior.json`: the camera every frame (shake included), the ship's wobble, the fixed fov, near 5 m, in 1.22's coordinates (×1.4856, the ship moved down 13.6). Cutscene 1's own output is re-made and compared, to show nothing changed.
- **The order:** the watched conversation `opening` ends → `cutscene.play('cutscene-2-exterior')` → chapter 1, as cutscene 1 → cutscene 2 is chained today (`main.ts`, `ANIMATIC_STEPS`). Loaded with the game, so there's no stall at the cut. The cut is hard, both into the shot and back to the cockpit.
- **Skipping:** one skip during the conversation skips the whole of cutscene 2, the exterior shot included (it's part of cutscene 2). A skip during the shot goes straight to chapter 1. `?scene=opening` still starts at the conversation.
- **After the cut back:** the ship hasn't turned, so the cockpit looks as it does now (the no-sway rule indoors holds).
- **Green follows the wobble** (issue 7) and **the track's ship-noise share** (issue 8).

## The work

**One pass.** Agent build about 45–75 min; review rounds 1–2 with the owner (about 10 min each), watching it at http://localhost:5202/?scene=opening.

1. The script's arguments; the new track; cutscene 1's track re-made and diffed.
2. `main.ts`: the chain, the skip, the load. Green's follow, the noise share, the panel row.
3. `opening-probe.js`: the shot plays after the last line, the camera's first and last frames within 1 cm of the file, Green's seat offset unchanged while the ship rolls, a skip in the shot lands in chapter 1. Screenshots at the start, middle and end of the shot.

## Done when

- Agent: `npm run check`, `npm run build`, the opening and cutscene 1 probes pass, the screenshots looked at.
- Owner: watches cutscene 2 to its end and through chapter 1's start.

## Open questions

1. **The course change:** does the camera's swing alone read as *"changing course"* (build it as the file has it, look, then decide), or should the ground also turn under the ship during the shot? If the ground turns, it stays turned after the cut, and the light comes in through the windows from a new side.
2. **The length:** end the shot at frame 194 (8 s, cut while the camera's still moving), or hold it on? If it holds, the last key's handles need easing in the file (your edit), and how long should it hold: to 430, or shorter?
3. **The wobble and the shake halved,** as in cutscene 1?
4. **The height:** the game's 110 m (as cutscene 1), or the file's 14 m for this shot?
5. **Dr. Green** seen in her seat, following the wobble (recommended), or hidden as in cutscene 1?
6. **The ship's noise** under the wind in this shot: a fixed share (0.5 to start), or wind only?

## After

`doc/features/scenery.md` (cutscene 2's exterior shot, next to cutscene 1's section), `tools/README.md` (the script's arguments), the code map, an update note in the flying scene plan's pass 4c, `doc/steps/current.md`.
