# Tasks

> **[Agent note]** The owner's list: what to work on next, at a glance (owner, 2026-10-28; replaces Linear). **Kept current by the agent at the end of every session.** Tick a box or say "done" in chat; the agent removes done items at the next session (history is in git). Details stay in the linked docs. Numbers: `SC-n` are the old Linear issues (and `77 ·` the backlog item numbers); **new tasks continue from SC-188**. **No "try this" list** (owner, 2026-10-28): something built is listed only when checking it blocks another task, and then the agent says so in chat.

*Updated 2026-11-20 (the flight shots: pass 2b, framing rules, built; passes 1–2, the generator and the shot editor, built; pass 0, the tools page; the plan, SC-187; the viewport closed: Dr. Ogawa's lines; the flyby, 0400, built; 0500 its own scene); 2026-11-18 (the pond water's shader on a test page; optimisation: steps 1–4 done, every view within the draw-call budget; the file's images relinked); earlier 2026-11-10, end of session (the landing cutscene's pass 4, the clouds, switched off for now; committed); earlier 2026-11-10 (passes 1–3).*

## Next up
0. **SC-184** · The coffee, built ([what exists](features/interaction.md#the-coffee)): try it at http://localhost:5202/?scene=chapter-1 (get up, *Sit down* refuses, *Pour coffee* at the galley's pot, walk, wait for a sip, the ladder, *Put cup in sink*, the pot again, *Sit down*). Confirm: dropping through the floor hatch keeps the mug in her hand (a fall, not the climb). Your three lines are in the Ink; should they go into the 0300 scene file too (yours to edit)?

0. **SC-189** · The [flame editor](plans/features/flame-editor.md), built: http://localhost:5202/flame-editor.html (or from the tools page). Pick a saved shot, nudge the flames (amber: changed, the saved value under it), tick *bloom on* / *hold* to judge them, *Save* writes the defaults in `settings.ts` (reload the game to see them). Say what to change.
0. **SC-190** · The flames' new shape, [pass 1](plans/features/thruster-flame-shape.md#as-built-pass-1) built: look at http://localhost:5202/flame-editor.html (shot `flyby-81785` is the closest side view) or ?scene=0600. Tune on the panel's *Flight: thruster flames* (the new values until SC-189 lists them). Say go for pass 2 (bloom always on, the intensity).
0. **SC-180** · Optimisation ([plan](plans/features/optimization.md)): **steps 1–4 done** (WebP; the palette; merged per room; [the crew in the palette](plans/features/optimization.md#as-built-step-4-2026-11-18): outside 895 → 257 draw calls, rooms 122–228, **every view within the 300 budget**; pipelines 87; compile ≈ 12 s cold). Nothing should look different. **Next session (owner, 2026-11-18): SC-180 goes on. Pick the step:** Static entities merged too (about −20 draws); a step on the first load's ~12 s compile (now the largest load cost); KTX2 textures (step 5, only if GPU memory matters on the MacBook); or stop (agent's pick: the compile). If you want the `Scanner Array` name, redo the rename in 1.22 (the agent's relinked version) and say so before the next export.
0. **SC-164** · The landing (0600): pass 4, the clouds, built from your `Cloud.blend` and **switched off for now** (your word; the panel's *Landing: clouds › shown* brings them back). Still to look at: the heavier rocking (http://localhost:5202/?scene=0600, ~9.5–11 s). Still open: shot 1 now or later. [plan](plans/features/landing-cutscene.md)
0. **SC-176** · Binoculars, [passes 1–2](plans/features/gadgets-binoculars.md) built: try D-pad up / 1 (in her hands; B before), R1 / right click (to her eyes, first person), L1 / L2 / wheel (zoom); **set the zoom's range** on the panel's *Binoculars* folder (now 2×–10×; the only folder while this is built). Pass 3 (the far view at full zoom, docs) on your go.
0. **SC-177** · Scanner, [passes 1–2](plans/features/gadgets-scanner.md) built: D-pad left / 2 (in her hands), hold R1 / right button (she scans: the turn, the ray, the sound). Two answers taken as recommended, change them if you like: her body turns only while she stands (the head always); she can still interact with it out. Turn size, speed and the ray's brightness on the panel's *Scanner* folder. **Pass 3 built:** while scanning it turns onto the closest interaction point in reach (try by a keypad or a locker, standing and walking); *aim: …* on the same folder.
0. **SC-178** · Listen to the scanner's synth in the game (your *Scanner* patch in place of the recorded loop; hold R1 with the scanner out). Further tuning: http://localhost:5202/scanner-synth.html, *Save as default* (the game picks it up). [plan](plans/features/scanner-synth.md)
0. **SC-187** · [Reusable flight shots](plans/features/flight-shots.md): passes 0–2, **2b (framing rules)** and **2d (0100 as a saved shot) built**; **2e: the game now plays 0100 from the saved shot** (an edit saved in the editor under `0100` shows in the game). **Watch** http://localhost:5202/?scene=0100: the camera's path is an orbit within 2.2 m of the Blender one (the ship within 2.4% of its place); the handheld wobble is in. **Try the shot editor** at http://localhost:5202/shot-editor.html (or from http://localhost:5202/tools.html): pick seeds (◀ ▶, the plans below), tick *Guides* (the ship's box, its travel arrow, the lead room shaded, size now vs target) and watch a few loop; every seed changed with 2b. Say what to change (e.g. more close shots: 15% of usable ones now, not 25%), then go for pass 3 (the `# shot:` tag, random play, 0400 as a saved shot). Still to talk over: [the cockpit shot](plans/features/flight-shots.md#open-questions).
0. **SC-185** · The flyby (0400), built as you described ([plan](plans/features/flyby-0400.md)): 0100's middle frame in the middle, the camera orbiting left to right, 90°; now trimmed to your two frames (7.5 s), the ship centred vertically. Watch at http://localhost:5202/?scene=0400 (then 0500 and the landing follow), and once from chapter 1 (sit back down). Say if the orbit, its length or its even pace should change (`tools/flyby-orbit.mjs`).
0. **SC-186** · The viewport in chapter 1, built: close it with engineering's lever at http://localhost:5202/?scene=chapter-1; once it's shut Dr. Ogawa asks for it open, you say *"Sorry"*, and it opens again when the box closes, every time. Your message said "opens" then "close automatically"; built as the script and your last sentence read (closing triggers it, it reopens): say if you meant otherwise. Also copied your new Ogawa line (*"not a communication signal"*, without *beacon*). [what exists](features/dialogue.md)
0. **SC-181** · The pond water and the ice ([plan](plans/features/ice-and-water.md)), both on the test page, **not in a scene yet**: http://localhost:5202/water-test.html. Your water look is the default. **Tune the ice** on the panel's *Ice* folder (the icebergs), then *Copy ice look* and paste it to me. When your pond scene exists, say so and they go in.
2. **SC-151** · Decision: in the landed scene, should the crew's lockers open too? (below, *Decision*)
3. **SC-15** · Dr. Kaufman's book: the Blender task that blocks the flying scene's pass 1, second half.

## Decision

- [x] **SC-162** · Answered by the owner 2026-11-07: the column shows on cutscene 3's horizon; a placeholder is in (`light-column.ts`), to be swapped for the temple's shaft after its pass 2.
- [ ] **SC-151** · The landed scene unlocks every door the flight locks (outer doors, hatches; the jetpacks and her parka are free). Kaufman's and Ogawa's lockers still refuse with your lines (2026-10-21) in every scene: keep that, or open them landed? [plan](plans/features/landed-scene.md#conflicts-with-the-docs-flagged)
- [x] **SC-153** · Answered by the owner 2026-11-10: nobody moves; Adam Blue pilots (front seat), Adam Red navigates (back). Script 0200 and its Ink copy say so; the cameras already framed the right bodies.
- [ ] **SC-169** · 0300's script now says *[Y Get up]* (was *O*). *Get up* is on the interact button today (the pad's right face button, E). Is Y a change of button, and which position: top (Xbox Y) or left (SNES Y)? Not built until answered.
- [ ] **SC-170** · Script to write (0300): Dr. Kaufman's one-liner after her exchange, and Adam's after their second interaction (a third talk). Placeholders in the game until then. Also Dr. Ogawa's, as before.
- [ ] **SC-174** · *(when the clouds come back)* The landing's clouds are lit from the camera's upper left, as in your `Cloud.blend`, not by the scene's sun (behind them from this camera: flat teal). Keep the cheat, or move the shot's sun (it would light the ship and belly too)?
- [ ] **SC-182** · The ice ([plan](plans/features/ice-and-water.md)): built with wrapped light tinted blue and blue at glancing angles. Do you also want it to glow when the sun is behind it (three's `MeshSSSNodeMaterial`, a thickness per vertex baked in Blender)?
- [ ] **SC-40** · 70 · Objects clipping into the hull's wall: fix by hand, or a Blender script (Shrinkwrap)? `npm run probe -- tools/hull-clipping.js` lists them. *(low priority)*

## Blender

The flying scene's tasks: [flying-scene-blender.md](plans/features/flying-scene-blender.md) has the specs. Tell me what changed in the file when you're done.

- [ ] **SC-156** · Adam Blue's armature is now `Adam Blue.001` and their mesh `Adam Blue` (the other way round from Red's `Adam Red` / `Adam Red Mesh`). Swap them if it wasn't meant; the crew export names it, one line to change. *(low priority)*
- [ ] **SC-15** · Dr. Kaufman's book, a prop she holds while reading. *(blocks pass 1)*
- [x] **SC-175** · Done by the owner 2026-11-16: the temple's `Rock.002` folded into `Rock`; exported and taken.
- [x] **SC-16** · Done in 1.22 (owner, 2026-11-10): Adam Blue flying (`Adam - Piloting Idle`).
- [x] **SC-17** · Done in 1.22 (owner, 2026-11-10): Adam Red navigating (`Adam - Navigation`).
- [ ] **SC-18** · Animation: Dr. Kaufman reading on the couch (loop).
- [ ] **SC-19** · Animation: Dr. Ogawa working on the sensor array (loop).
- [ ] **SC-146** · Animation: Adam Red talking (a nod on their loop). *(low priority)*
- [ ] **SC-147** · Animation: Adam Blue talking (a nod on their loop). *(low priority)*
- [ ] **SC-148** · Animation: Dr. Kaufman talking (a nod on her loop). *(low priority)*
- [ ] **SC-149** · Animation: Dr. Ogawa talking (a nod on his loop). *(low priority)*
- *Later:* **SC-30** the landing gear lowering (only if a shot shows it).

## Script

In `doc/story/scenes/`; until written, the game shows `[Placeholder]`. Spec: [flying-scene-script.md](plans/features/flying-scene-script.md).

- [ ] **SC-31** · Chapter 1: the crew's conversations (Adam Red and Blue, Kaufman, the rest of Ogawa's), topics, one-liners.
- [ ] **SC-32** · Chapter 1: the coffee remark entering the crew quarters; a line at the seat (optional). (The refusal without coffee: given 2026-11-18.)
- [ ] **SC-33** · Chapter 1: a line when she pours, and her comment after the first sip: still wanted? (*Pouring again* given 2026-11-18.)
- [x] **SC-34** · Described by the owner 2026-11-07 (two shots; a reference render for the second). Plan: [landing cutscene](plans/features/landing-cutscene.md).
- *Later:* **SC-35** cutscene 1's description; **SC-36** her remarks on things in flight (optional).

## Figma

Nothing open.

## Review and setup


- [ ] **SC-42** · Review the game structure's decision-log updates (passes 3, 4, 5b, 6); confirm the signal receiver belongs in the export list. *(low priority)*
- [ ] **SC-66** · Vercel for 0.0.1 (*Root Directory* `app/prototypes/0.0.1`), and both versions side by side. *(low priority)*
- *Watch:* **SC-61** · 62 · A lit face in the cargo hold's wall by the side door (seen once): note where she and the camera were if it comes back.

---

## The agent's queue (for the overview; not yours)

**Now:** **SC-142** the dashboard soft-shaded in the game, faceted in Blender (the game's lighting, likely).

**The flying scene** (77 · SC-5; [plan](plans/features/flying-scene.md)):

| Pass | State | Waits on |
|---|---|---|
| 1 · the ship in flight (SC-7) | half built | SC-15 |
| 2 · the loop and its end (SC-8) | partly built (piloting, SC-129) | SC-31, SC-32 |
| 3 · the coffee (SC-9) | built 2026-11-18 ([coffee plan](plans/features/coffee.md)) | SC-33 |
| 4 · the scenery (SC-10) | 4a, 4b, 4c built (4c: cutscene 2's exterior shot, 2026-10-28) | the owner watches 4c |
| 5 · the kit from Blender (SC-11) | dropped (owner, 2026-10-28) | |
| 6 · the landing cutscene (SC-12) | the landed scene and a placeholder shot built 2026-11-06 ([plan](plans/features/landed-scene.md)); sitting down goes there without the requirements | SC-34 |

**Also in progress:** SC-37 (71 · the dialogue system), SC-63 (41 · the see-through hull), SC-49 (66 · door edges stop her, partly done).

**Small, open:** SC-45 (73 · a door closing on her), SC-46 (60 · the thrusters' gap), SC-47 (67 · the front thrusters' collision), SC-48 (65 · trapdoor onto the ladder), SC-50 (64 · ramp smoke flake), SC-51 (74 · boombox check), SC-52 (43 · camera vs the closed ramp), SC-53 (68 · metal without reflections), SC-54 (47 · more export checks). SC-168 (smoke's 5 old failures, seen 2026-11-08 on the commit before the hologram too: walking under the hull, under `Turbine.001` (SC-47?), the single-sided switch's 4 double-sided materials, the boombox's cassette sound twice).

**Later:** SC-123 (40 MB/s garbage), SC-127 (flaky probe checks), SC-131 (cutscene 1's first-second stall), SC-133 (saving back on), SC-136 (is post-processing worth it), SC-55 (53 · player export not deterministic), SC-56 (10 · crew quarters too blue, on hold), SC-57 (45 · IK), SC-58 (52 · low-res rendering), SC-59 (58 · her fade without grain), SC-60 (59 · the fade on the crew), SC-62 (76 · Kaufman's locker), SC-116 (the circle-mask idea).
