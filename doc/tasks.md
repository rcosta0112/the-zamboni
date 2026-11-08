# Tasks

> **[Agent note]** The owner's list: what to work on next, at a glance (owner, 2026-10-28; replaces Linear). **Kept current by the agent at the end of every session.** Tick a box or say "done" in chat; the agent removes done items at the next session (history is in git). Details stay in the linked docs. Numbers: `SC-n` are the old Linear issues (and `77 ·` the backlog item numbers); **new tasks continue from SC-167**. **No "try this" list** (owner, 2026-10-28): something built is listed only when checking it blocks another task, and then the agent says so in chat.

*Updated 2026-11-08.*

## Next up

0. **SC-164** · Review the [landing cutscene plan](plans/features/landing-cutscene.md) and answer its four questions (turbines down: in the file or the game? cameras by hand or in Blender? the clouds tried or not, which images? shot lengths 6 s / 8 s?).
0. **SC-153** · Decision: your 1.22 animations have Red navigating and Blue piloting: are SC-16/17 done that way (the animation follows the seat)? (below, *Decision*)
1. **SC-155** · Blender: the action `Dr. Geen - Piloting` (typo): the player export stops until it's fixed or I point the export at it (below, *Blender*).
2. **SC-151** · Decision: in the landed scene, should the crew's lockers open too? (below, *Decision*)
3. **SC-15** · Dr. Kaufman's book: the Blender task that blocks the flying scene's pass 1, second half.

## Decision

- [x] **SC-162** · Answered by the owner 2026-11-07: the column shows on cutscene 3's horizon; a placeholder is in (`light-column.ts`), to be swapped for the temple's shaft after its pass 2.
- [ ] **SC-151** · The landed scene unlocks every door the flight locks (outer doors, hatches; the jetpacks and her parka are free). Kaufman's and Ogawa's lockers still refuse with your lines (2026-10-21) in every scene: keep that, or open them landed? [plan](plans/features/landed-scene.md#conflicts-with-the-docs-flagged)
- [ ] **SC-153** · Adam's seats (2026-11-07): Blue sits in the front seat with the joystick, Red at the back. SC-16 says *Red flying*, SC-17 *Blue navigating*, and the script says *Adam Red (in the pilot seat)*, *Adam Blue (in the nav seat)*. Should the animation follow the seat (Blue flies), or the body (move them in the file)? Change the script's directions? *2026-11-07:* your 1.22 gives Red `Adam - Navigation` and Blue `Adam - Piloting Idle` (now in the game, cutscene 2 to landed): if that's the answer, SC-16 and SC-17 are done with the bodies swapped. [note](plans/features/flying-scene.md)
- [ ] **SC-40** · 70 · Objects clipping into the hull's wall: fix by hand, or a Blender script (Shrinkwrap)? `npm run probe -- tools/hull-clipping.js` lists them. *(low priority)*

## Blender

The flying scene's tasks: [flying-scene-blender.md](plans/features/flying-scene-blender.md) has the specs. Tell me what changed in the file when you're done.

- [ ] **SC-155** · Her piloting action was renamed `green_piloting` → `Dr. Geen - Piloting` (missing *r*): rename it `Dr. Green - Piloting`, or tell me to use the name as it is. Until then `npm run export:player` stops (the game's files are fine).
- [ ] **SC-156** · Adam Blue's armature is now `Adam Blue.001` and their mesh `Adam Blue` (the other way round from Red's `Adam Red` / `Adam Red Mesh`). Swap them if it wasn't meant; the crew export names it, one line to change. *(low priority)*
- [ ] **SC-15** · Dr. Kaufman's book, a prop she holds while reading. *(blocks pass 1)*
- [ ] **SC-16** · Animation: Adam Red flying the ship (loop).
- [ ] **SC-17** · Animation: Adam Blue navigating (loop).
- [ ] **SC-18** · Animation: Dr. Kaufman reading on the couch (loop).
- [ ] **SC-19** · Animation: Dr. Ogawa working on the sensor array (loop).
- [ ] **SC-25** · Animation: Dr. Green pouring the coffee.
- [ ] **SC-26** · Animation: holding the mug (arm pose) and a sip.
- [ ] **SC-27** · The mug and where it sits in her hand.
- [ ] **SC-146** · Animation: Adam Red talking (a nod on their loop). *(low priority)*
- [ ] **SC-147** · Animation: Adam Blue talking (a nod on their loop). *(low priority)*
- [ ] **SC-148** · Animation: Dr. Kaufman talking (a nod on her loop). *(low priority)*
- [ ] **SC-149** · Animation: Dr. Ogawa talking (a nod on his loop). *(low priority)*
- *Later:* **SC-30** the landing gear lowering (only if a shot shows it).

## Script

In `doc/story/scenes/`; until written, the game shows `[Placeholder]`. Spec: [flying-scene-script.md](plans/features/flying-scene-script.md).

- [ ] **SC-31** · Chapter 1: the crew's conversations (Adam Red and Blue, Kaufman, the rest of Ogawa's), topics, one-liners.
- [ ] **SC-32** · Chapter 1: her refusal at the seat without coffee; the coffee remark entering the crew quarters; a line at the seat (optional).
- [ ] **SC-33** · Chapter 1: the coffee's lines (pouring, after the first sip, pouring again).
- [x] **SC-34** · Described by the owner 2026-11-07 (two shots; a reference render for the second). Plan: [landing cutscene](plans/features/landing-cutscene.md).
- [ ] **SC-165** · Scene file name (2026-11-08): `0400 - Cutscene exterior- Flyby.md` lacks a space before its second hyphen. [scenes README](story/scenes/README.md)
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
| 3 · the coffee (SC-9) | not started | SC-25…27, SC-33 |
| 4 · the scenery (SC-10) | 4a, 4b, 4c built (4c: cutscene 2's exterior shot, 2026-10-28) | the owner watches 4c |
| 5 · the kit from Blender (SC-11) | dropped (owner, 2026-10-28) | |
| 6 · the landing cutscene (SC-12) | the landed scene and a placeholder shot built 2026-11-06 ([plan](plans/features/landed-scene.md)); sitting down goes there without the requirements | SC-34 |

**Also in progress:** SC-37 (71 · the dialogue system), SC-63 (41 · the see-through hull), SC-49 (66 · door edges stop her, partly done).

**Small, open:** SC-45 (73 · a door closing on her), SC-46 (60 · the thrusters' gap), SC-47 (67 · the front thrusters' collision), SC-48 (65 · trapdoor onto the ladder), SC-50 (64 · ramp smoke flake), SC-51 (74 · boombox check), SC-52 (43 · camera vs the closed ramp), SC-53 (68 · metal without reflections), SC-54 (47 · more export checks).

**Later:** SC-123 (40 MB/s garbage), SC-127 (flaky probe checks), SC-131 (cutscene 1's first-second stall), SC-133 (saving back on), SC-136 (is post-processing worth it), SC-55 (53 · player export not deterministic), SC-56 (10 · crew quarters too blue, on hold), SC-57 (45 · IK), SC-58 (52 · low-res rendering), SC-59 (58 · her fade without grain), SC-60 (59 · the fade on the crew), SC-62 (76 · Kaufman's locker), SC-116 (the circle-mask idea).
