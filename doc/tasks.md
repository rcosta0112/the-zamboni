# Tasks

> **[Agent note]** The owner's list: what to work on next, at a glance (owner, 2026-10-28; replaces Linear). **Kept current by the agent at the end of every session.** Tick a box or say "done" in chat; the agent removes done items at the next session (history is in git). Details stay in the linked docs. Numbers: `SC-n` are the old Linear issues (and `77 ·` the backlog item numbers); **new tasks continue from SC-146**.

*Updated 2026-10-28.*

## Next up

1. **SC-141** · Look at cutscene 2's hand-held drift; tune it on the panel (*Camera* › *hand-held*). The values you settle on become the defaults.
2. **SC-139** · Decide: swap the two Adam cameras or the bodies (below, *Decision*).
3. **SC-120** · Answer the four questions on cutscene 2's exterior shot: it blocks the flying scene's pass 4c.
4. **SC-13, SC-14, SC-15** · The Blender tasks that block the flying scene's pass 1, second half.

## Look at (built, yours to try)

At http://localhost:5202/ (reload; NEW GAME, or `?scene=opening` / `?scene=chapter-1`).

- [ ] **SC-141** · Cutscene 2's cameras held by hand (free drift). [Plan](plans/features/handheld-cutscene-camera.md)
- [ ] **SC-140** · Quality switch (P), anti-aliasing off, cutscene 2's wide shot held 4 s, chapter 1's start lines, Ogawa's conversation.
- [ ] **SC-138** · 1.22's cockpit and crew poses; cutscene 2 on your cameras.
- [ ] **SC-129** · Dr. Green seated in cutscene 2 and at chapter 1's start, *Get up* (E / B). [Plan](plans/features/piloting-loop.md)
- [ ] **SC-137** · Cutscene 1's sound: wind faded in, the ship's noise mixed in with the zoom; a click shows the skip prompt.
- [ ] **SC-135** · Start screen fades in; the progress bar a 4 px strip at the bottom.
- [ ] **SC-134** · The *wrong* sound at a locked door.
- [ ] **SC-132** · Black screen after NEW GAME instead of the freeze.
- [ ] **SC-125** · Cutscene 1 (the fly-by copied from 1.10).
- [ ] **SC-124** · The outside's own light; the glass a bit darker (`?scene=chapter-1`).
- [ ] **SC-44** · 63 · Engineering seen from above: 110 ms a frame in the test browser. Check it on your GPU (the frame readout).
- [ ] **SC-118, SC-119** · Pass 1's first try and cutscene 2's angles: **probably superseded** by SC-138 (your own cameras in 1.22). Tick them off if so.

## Decision

- [ ] **SC-139** · Cutscene 2: `cutscene-2-adam-red` frames Adam Blue (front right) and `cutscene-2-adam-blue` frames Adam Red (back left); the script puts Red in the pilot seat. **Swap the bodies** (in Blender, then `export:crew`) **or the camera names** (in Blender, or I swap them in `cutscene-cameras.py`)?
- [ ] **SC-120** · Cutscene 2's exterior shot (the ship changing course). Proposed: no line, a fixed camera outside, the ship banks and levels out, the ground's heading turns with it. Your answers: (1) the angle; (2) the length, in seconds; (3) a small correction or a real change of heading; (4) does the horizon tilt through the windows after the cut back (the no-sway rule indoors says no)? Or write the description into `02-opening.md` yourself.
- [ ] **SC-24** · The coffee, four questions (before pass 3): (1) the ladder takes both hands: hide the mug during the climb (recommended), refuse with a line, or a one-handed climb? (2) keep the mug until she sits, or finished after some sips? (3) a galley mug (`Mug.005`…) or a new one? (4) talking with the mug in her hand (proposed)?
- [ ] **SC-144** · Dr. Kaufman's mesh got a Subdivision in 1.22 (1,020 → 4,300 triangles): meant?
- [ ] **SC-43** · 61 · Window frames half-cut by the see-through hole: (1) leave the frames out of the cut, or (2) let *hull gap black* cover them? *(low priority)*
- [ ] **SC-40** · 70 · Objects clipping into the hull's wall: fix by hand, or a Blender script (Shrinkwrap)? `npm run probe -- tools/hull-clipping.js` lists them. *(low priority)*

## Blender

The flying scene's tasks: [flying-scene-blender.md](plans/features/flying-scene-blender.md) has the specs. Tell me what changed in the file when you're done.

- [ ] **SC-13** · Move Adam: Red into the pilot's seat, Blue into the navigator's. *(blocks pass 1; may settle SC-139)*
- [ ] **SC-14** · A copy of each character per scene: a collection per scene id (`chapter-1`, `landed`), linked copies (Alt+D), placed and animated. *(blocks pass 1)*
- [ ] **SC-15** · Dr. Kaufman's book, a prop she holds while reading. *(blocks pass 1)*
- [ ] **SC-145** · Dr. Ogawa at the signal processing station (your script edit): his place in `01-cutscene-flight-2`. Yours, or shall I?
- [ ] **SC-21** · Animation: Dr. Green sitting in her seat (loop).
- [ ] **SC-22** · Animation: Dr. Green getting up from her seat. *(the seat waits for it)*
- [ ] **SC-23** · Animation: Dr. Green sitting back down.
- [ ] **SC-16** · Animation: Adam Red flying the ship (loop).
- [ ] **SC-17** · Animation: Adam Blue navigating (loop).
- [ ] **SC-18** · Animation: Dr. Kaufman reading on the couch (loop).
- [ ] **SC-19** · Animation: Dr. Ogawa working on the sensor array (loop).
- [ ] **SC-25** · Animation: Dr. Green pouring the coffee. *(after SC-24)*
- [ ] **SC-26** · Animation: holding the mug (arm pose) and a sip. *(after SC-24)*
- [ ] **SC-27** · The mug and where it sits in her hand. *(after SC-24)*
- [ ] **SC-20** · Animation: each of the crew talking (a nod on their loop). *(low priority)*
- [ ] **SC-29** · The kit file (`Flight Kit 1.0.blend`) with the ice-boulder set. *(low priority; pass 5)*
- *Later:* **SC-30** the landing gear lowering (only if a shot shows it).

## Script

In `doc/story/scenes/`; until written, the game shows `[Placeholder]`. Spec: [flying-scene-script.md](plans/features/flying-scene-script.md).

- [ ] **SC-143** · `02-opening.md` has Ogawa *"(over the comms)"* while he's now in the cockpit: keep it?
- [ ] **SC-31** · Chapter 1: the crew's conversations (Adam Red and Blue, Kaufman, the rest of Ogawa's), topics, one-liners.
- [ ] **SC-32** · Chapter 1: her refusal at the seat without coffee; the coffee remark entering the crew quarters; a line at the seat (optional).
- [ ] **SC-33** · Chapter 1: the coffee's lines (pouring, after the first sip, pouring again).
- [ ] **SC-34** · `04-cutscene-landing.md`: the landing cutscene's description. *(low priority)*
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
| 1 · the ship in flight (SC-7) | half built | SC-13, SC-14, SC-15 |
| 2 · the loop and its end (SC-8) | partly built (piloting, SC-129) | SC-21…23, SC-31, SC-32 |
| 3 · the coffee (SC-9) | not started | SC-24, SC-25…27, SC-33 |
| 4 · the scenery (SC-10) | 4a, 4b built | 4c: SC-120 |
| 5 · the kit from Blender (SC-11) | not started | SC-29 |
| 6 · the landing cutscene (SC-12) | not started | SC-34 |

**Also in progress:** SC-37 (71 · the dialogue system), SC-63 (41 · the see-through hull), SC-49 (66 · door edges stop her, partly done).

**Small, open:** SC-45 (73 · a door closing on her), SC-46 (60 · the thrusters' gap), SC-47 (67 · the front thrusters' collision), SC-48 (65 · trapdoor onto the ladder), SC-50 (64 · ramp smoke flake), SC-51 (74 · boombox check), SC-52 (43 · camera vs the closed ramp), SC-53 (68 · metal without reflections), SC-54 (47 · more export checks).

**Later:** SC-123 (40 MB/s garbage), SC-127 (flaky probe checks), SC-131 (cutscene 1's first-second stall), SC-133 (saving back on), SC-136 (is post-processing worth it), SC-55 (53 · player export not deterministic), SC-56 (10 · crew quarters too blue, on hold), SC-57 (45 · IK), SC-58 (52 · low-res rendering), SC-59 (58 · her fade without grain), SC-60 (59 · the fade on the crew), SC-62 (76 · Kaufman's locker), SC-116 (the circle-mask idea).
