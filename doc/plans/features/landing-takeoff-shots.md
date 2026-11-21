# Landing and take-off shots in the shot editor

**Status:** draft 2026-11-20, for review (SC-187; replaces passes 4–5 of [flight-shots.md](flight-shots.md)). Three passes, a stop after each.

## Goal

The shot editor makes landings and take-offs as it makes flybys: a **Type** dropdown under the title (*Flyby*, *Landing*, *Take-off*); seeds, values, nudges, trim, checks, buckets, save, all per type.

## The design

- **The dropdown** swaps the generator, the value fields, the plan from above and the saved shots shown (only that type's). The type is remembered in the browser. Names `landing-<seed>`, `takeoff-<seed>`.
- **Shots file:** each shot gets a `type`; a shot without one is a flyby (the saved flybys stay unchanged).
- **The ship's motion is fixed per type** (flight-shots.md), not drawn: the landing's is today's 0600 (`tools/landing-cutscene.mjs`: the descent, drift, sway, gear, flames, turbines, the rocking on the gear, the clouds), moved into `src/flight-shots/landing.ts` so the editor and the game share it. The take-off's is new: engines and turbines up, the clouds kicked up, lift-off, gear up, a climb that speeds up forward.
- **The camera** comes from the short list in flight-shots.md: *tripod operator* (0600's: aims a little late), *low ground angle*, *drone pull-back*, *distant telephoto*. A shot is **1–3 camera shots cut on an action** (gear, touchdown / lift-off), never the same type twice in a row, all on one side of the line. Each camera shot has its own values (side, distance, height, lens, framing: the flyby's framing rules where they fit).
- **The preview** shows the ship on the landed plain (the stopped ground, not the treadmill), with the gear, turbines, flames and clouds moving as the track says.
- **The editor:** the camera shots listed in order (type, cut time), each one's values in its own fold; the cuts marked on the trim bar.
- **Checks:** camera above the ground and clear of the ship, the ship's box in frame, a minimum distance. **Buckets:** the camera types and their order, side, lens, the sun.

## The work

1. **The dropdown, and 0600 as a saved landing.** The type in the editor and the shots file; the landing's motion in `landing.ts`; the preview on the plain; the tripod operator only. Check: 0600 from its saved values matches `landing.json` key for key (as 0400 does). *Agent build:* ~40 min. *Review:* 1.
2. **Landing's other camera types and the cuts:** the four types, 1–3 shots, the rules, checks, buckets, the editor's list. Check: 500 seeds usable after re-rolls; no two same types in a row; none across the line. *Agent build:* ~45 min. *Review:* 1–2 (the look of each type).
3. **Take-off:** its motion, the same camera types, cut on lift-off and gear up. *Agent build:* ~45 min. *Review:* 1–2.

## Out

The cockpit shot (still to talk over: flight-shots.md's open questions; it would join the list as a fifth camera type). Playing the shots in the game (flight-shots.md pass 3). Sites other than the temple's plain; hills in the checks.

## Open questions

- **The take-off's motion:** the landing reversed (straight up, then forward), or lifting forward from the start? How long before the gear comes up, and does the shot end on the climb or once the ship is small?
- **Order:** these passes before pass 3 (shots in the game), as asked, or pass 3 first?

## After

`doc/features/scenery.md`, the code map, the tools README, current.md, tasks.md.
