# Landing and take-off shots in the shot editor

**Status:** approved 2026-11-21 (owner: "plan is approved… go"); pass 1 building. Draft 2026-11-20 (SC-187; replaces passes 4–5 of [flight-shots.md](flight-shots.md)). Three passes, a stop after each.

## Goal

The shot editor makes landings and take-offs as it makes flybys: a **Type** dropdown under the title (*Flyby*, *Landing*, *Take-off*); seeds, values, nudges, trim, checks, buckets, save, all per type.

## The design

- **The dropdown** swaps the generator, the value fields, the plan from above and the saved shots shown (only that type's). The type is remembered in the browser. Names `landing-<seed>`, `takeoff-<seed>`.
- **Shots file:** each shot gets a `type`; a shot without one is a flyby (the saved flybys stay unchanged).
- **The ship's motion is fixed per type** (flight-shots.md), not drawn: the landing's is today's 0600 (`tools/landing-cutscene.mjs`: the descent, drift, sway, gear, flames, turbines, the rocking on the gear, the clouds), moved into `src/flight-shots/landing.ts` so the editor and the game share it. The take-off's is new: engines and turbines up, the clouds kicked up, lift-off, gear up, a climb that speeds up forward.
- **The engines' power** (owner, 2026-11-21): the flames' intensity rises before the ship lifts off and is held high in the last seconds before touchdown, then drops. One curve per shot, the track's `flames` key, fixed per type like the motion (the take-off's: a spool-up of a few seconds on the ground, peak at lift-off, easing to cruise on the climb; the landing's: 0600's keys, 0.7 → 1.7, off at touchdown). **Needs the parked part of [SC-190 pass 2](thruster-flame-shape.md#passes):** today the key only brightens the flames and widens the bloom a little; it should also lengthen the spike and widen the core, so more power reads at a distance. Built here, in pass 1. The editor shows the curve as an *engine power* row under the trim bar; it can be nudged per shot (start of the spool-up, peak).
- **The camera** comes from the short list in flight-shots.md: *tripod operator* (0600's: aims a little late), *low ground angle*, *drone pull-back*, *distant telephoto*. A shot is **1–3 camera shots cut on an action** (gear, touchdown / lift-off), never the same type twice in a row, all on one side of the line. Each camera shot has its own values (side, distance, height, lens, framing: the flyby's framing rules where they fit).
- **The preview** shows the ship on the landed plain (the stopped ground, not the treadmill), with the gear, turbines, flames and clouds moving as the track says.
- **The editor:** the camera shots listed in order (type, cut time), each one's values in its own fold; the cuts marked on the trim bar.
- **Checks:** camera above the ground and clear of the ship, the ship's box in frame, a minimum distance. **Buckets:** the camera types and their order, side, lens, the sun.

## The work

1. **The dropdown, and 0600 as a saved landing.** The type in the editor and the shots file; the landing's motion in `landing.ts`; the preview on the plain; the tripod operator only; the flames' intensity (the key driving length, core and bloom; the *engine power* row). Check: 0600 from its saved values matches `landing.json` key for key (as 0400 does); probe screenshots of 0600 at low and peak power. *Agent build:* ~55 min. *Review:* 1.
2. **Landing's other camera types and the cuts:** the four types, 1–3 shots, the rules, checks, buckets, the editor's list. Check: 500 seeds usable after re-rolls; no two same types in a row; none across the line. *Agent build:* ~45 min. *Review:* 1–2 (the look of each type).
3. **Take-off:** its motion, the same camera types, cut on lift-off and gear up. *Agent build:* ~45 min. *Review:* 1–2.

## Out

The cockpit shot (still to talk over: flight-shots.md's open questions; it would join the list as a fifth camera type). Playing the shots in the game (flight-shots.md pass 3). Sites other than the temple's plain; hills in the checks.

## Open questions

- **The take-off's motion:** the landing reversed (straight up, then forward), or lifting forward from the start? How long before the gear comes up, and does the shot end on the climb or once the ship is small?
- **Answered 2026-11-21 (owner):** engine power: the flicker gets faster at high power, yes; the turbines' noise follows the same curve, yes.

## As built (pass 1, 2026-11-21)

- `src/flight-shots/landing.ts`: the motion (0600's numbers, unchanged), `LandingValues` (`cameras`: one `TripodCamera` for now, a list for pass 2's cuts; `power`: [s, level] keys; `trim`), `landingTrack` (a trim cuts every key; the clouds keep the movement's time: `CloudTrack.from`), `landingValues(seed)` (side, round, distance, height, lens, where the ship sits, lag, handheld), `checkLanding` (pass 1's: above the ground, 6 m clear, the ship's middle in frame every half second), `landingBuckets` (side, lens, height).
- **0600** saved as `kind: "landing"`, seed 0; cutscene.ts `FROM_SHOTS` `landing: '0600'`. `tools/landing-cutscene.mjs` deleted; its track moved to `tools/sources/landing.json` (the check's reference).
- **The editor:** *Type* under the title (Flyby, Landing; Take-off greyed), remembered; a landing's fields (distance, round, height, follows ship, fov, lag, aim left / under, handheld, trim); its plan from above (the ship's box, nose down, where it came in from dashed; the camera, its view at the kept part's ends); **the engine power row** under the trim bar (the curve, the gear and touchdown marked, the trimmed parts shaded; points dragged, a double-click adds one or removes it); saved shots and names per type (`landing-<seed>`); the guides and pace for flybys only. The preview stands a landing on the landed plain (`ShotPreview.setGround`: the ground parked as the landed scene's, the landed sun, the turbines, gear hold and clouds as the track keys them). The flame editor plays landings too.
- **The power** in `flames.ts` (length, capped by `reach` under 1; core width; flicker speed, its phase now kept on the CPU so a change of speed doesn't jump) and `audio.ts` (`noisePower`: pitch and level, eased 0.4 s). Panel: *Flight: thruster flames › power: …*, *Sound › ship noise: … with power*.
- Checks: `flight-shots-check.mjs` 21/21 (0600 key for key; a 3–12 s trim; 500 of 500 seeds pass); scratch `.export/scratch/landing-editor.mjs` (type switch, 0600, a power point dragged, back to flyby; no console errors); `landing-shots-probe` (0600 in the game, its keys as before); check, build; smoke 83 passed, the known 4 failed.

## After

`doc/features/scenery.md`, the code map, the tools README, current.md, tasks.md.
