# Reusable flight shots (flyby, landing, take-off) and the tools page

**Status:** draft 2026-11-20, reviewed once by the owner the same day (answers below; the pass order changed: the editor early, today's shots replaced). The cockpit shot to talk over. **Passes 0–2 built 2026-11-20** (the tools page; the flyby generator's core; the shot editor, on the owner's "start on step 2"), for the owner's look; pass 3 on the owner's go.

## Goal

Flybys, landings and take-offs happen between most playable scenes (owner, 2026-11-20; the count isn't decided). Instead of directing each one, a generator makes the shots from ranges; **the owner picks the good ones in a shot editor** (by seed, nudged if needed) and names them in the script. A random shot stays available. Plus a dev-only page linking every editor.

## Scope

- In: a tools page (dev only); a runtime shot generator (flyby first, then landing, then take-off); a shots file; the `# shot:` tag; random play with a memory of recent shots; the shot editor; a lens flare.
- In too: a cockpit shot for take-off (to talk over, below).
- Out: other interior shots for now; the ship's motion for landing and take-off beyond adapting today's landing to a site; new sites or terrain.

## Constraints from the docs

- Script files: tags and comments only, never the copy (CLAUDE.md, owner 2026-10-22). `# shot:` is a tag.
- Cutscene track format as it is (`src/cutscene.ts`: `shots`, `camera` keys, `ship`, `flight`); today's generators `tools/flyby-orbit.mjs` (0400) and `tools/landing-cutscene.mjs` (0600) become the starting points.
- Every UI usable with a gamepad (the tools page; the editors' own controls stay mouse-first, as the existing tuning pages).
- No post-processing yet (SC-136): the flare must not need it. The landing's bloom halo, cut by the hull, will show more with a flare.

## The design

- **The ship flies a straight line in a flyby** (owner); **the camera orbits it**, worked out relative to the ship. The ranges: start angle and turn direction, sweep (30°–180°), pace (even or eased), distance (with an optional push or pull), height (above, level, below), lens, the ship's place in frame (its centre held, as in 0400), a slight roll, length.
- **Landing and take-off:** the ship's motion fixed per type and adapted to the site; the camera from a short list of shot types (tripod operator, low ground angle, drone pull-back, distant telephoto), 1–3 shots cut on an action (gear, touchdown, lift-off), never the same type twice in a row, one side of the line.
- **The cockpit shot (owner: "possible", to talk over):** a wide shot of the ship lifting off, from inside the cockpit. The camera rides with the ship (fixed in the ship's space), so the lift-off reads from the horizon dropping past the windows, a shake and the sound. Ranges: where it stands (behind the pilots' seats, the aisle, a corner), lens (wide), height, a slow push-in, shake strength. Its checks: inside the cockpit and clear of furniture (the indoor camera's `furnitureAt`, `CAMERA_BOXES`), the windows in frame; no see-through cut (the cockpit is never cut). Needs the crew seated (as in the `whats-that` scene) and the site's ground outside. It can open a take-off and cut to an exterior shot on the climb.
- **Checks on every shot:** the camera above the terrain, the ship not hidden by hills or rocks, in frame, at a minimum distance; a failing shot is re-rolled. **Into the sun and backlit shots are allowed** (owner).
- **Shots file** (`public/cutscenes/shots.json`): a name → seed **and every value it produced**, so a later change to the generator never changes an approved shot (the editor shows "this seed now" beside it).
- **In the script:** `# shot: flyby-arrival` plays a saved shot; `# shot: random flyby` generates one at runtime.
- **Repetition:** each shot is described by buckets (side, turn direction, sweep size, height, lens, framing, direction against the sun; shot types and order for landings). The editor warns when a saved shot is close to its neighbours in script order; random play penalises buckets shared with recent shots (directed ones included), newest weighing most. **The memory is per playthrough, kept in the save** (owner, 2026-11-20).
- **Lens flare:** sprites on a line through the sun (no post-processing), fading as the hull covers the sun; a switch in the editor, a strength per saved shot.
- **Tools page** `tools.html`: every editor and test page by category (Scenery: planet; Materials: water and ice; Sound: synth, scanner synth; Cutscenes: shot editor; The game: each `?scene=` number), a line each, from one list in one file; D-pad and A to move and open; a "← Tools" link on each page. **Dev only** (owner): served by the dev server, not in the build (the build takes `index.html` only today; the page also refuses to draw outside `import.meta.env.DEV`), never linked from the game.

## The work

The editor comes early (owner, 2026-11-20); it needs the generator's core first. Today's 0400 and 0600 are then **replaced by saved shots** (owner: likely, to keep one code path; their values can be stored as saved shots, so they can look the same).

0. **The tools page**, as above. *Agent build:* ~15 min. *Review:* 1, short. **Built 2026-11-20:** `tools.html`, `src/tools-page.ts` (the list: `TOOLS`; the shot editor shown greyed until pass 2; the game's scene numbers and `?test`); "← Tools" on planet, water, synth and scanner-synth pages (not on the game). Checked by a scratch script (a made-up pad: down, up, A opens; back selects the same row; no console errors); `dist/` has `index.html` only.
1. **The flyby generator's core** (`src/flight-shots/`): ranges, seeds, the checks; today's `flyby-orbit.mjs` settings reproduce today's `flyby.json` (the check). *Agent build:* ~30 min. *Review:* none (checked by script). **Built 2026-11-20:** `src/flight-shots/flyby.ts` (plain maths, no three.js: `flybyValues`, `flybyTrack`, `checkFlyby`, `generateFlyby`, `flybyBuckets`, `shared`); `tools/flight-shots-check.mjs`: 0400 from values matches `flyby.json` key for key (181, difference 0), the sway the same; 500 seeds: 476 pass at once, all after re-rolls (the failures: camera near the ground). **The ground is flat** (14 m under the belly) in the checks for now: hills not counted (the treadmill moves them); a `ground` callback is ready for them.
2. **The shot editor** for flybys (`shot-editor.html`, on the tools page): event, site, sun and heading; seeds by next/previous and thumbnails; the values shown and nudged; save under a name; play in context; the repetition warnings. *Agent build:* ~1 h. *Review:* 1–2. **Built 2026-11-20:** `shot-editor.html`, `src/flight-shots/editor-page.ts`. **The preview is the game itself** in a frame (`/?scene=shot-editor`, a test scene: everyone seated in flight, nothing begins; dev hook `__cutscene().playTrack(track)`), so a shot is seen with the real ship, scenery, light and sound (the owner presses the game's start button once). The thumbnails are **plans from above** (the camera's path and view round the ship), not renders. Saved with `POST /__shots` (vite.config.ts) into `public/cutscenes/shots.json` (seed, values, date); a saved shot loaded shows "this seed now" beside a changed value. Warnings: a saved shot sharing 5 of the 7 buckets, against every saved shot until the `# shot:` tag gives a script order (pass 3); the sun's bucket once the game has loaded. *Event, site* left out: only flight flybys exist today. Checked by a scratch script (seeds, nudge, play in the frame, save without the frame reloading, no console errors). **Changed 2026-11-20 (owner): not the game in the editor**, only the shot's assets, the shot looping (no skip): `src/flight-shots/preview.ts` (ship, sky, sun, scenery, flames; no crew or sound); a nudge shows at once; Play, Pause, From the start; the frame and `public/test/scenes/shot-editor.json` gone.
3. **Shots in the game:** the shots file, the `# shot:` tag, random play with its memory in the save; 0400 played from a saved shot (`flyby-orbit.mjs` retired if the owner agrees). *Agent build:* ~45 min. *Review:* 1.
4. **Landing** in the generator and the editor; 0600 as a saved shot. *Agent build:* ~1 h. *Review:* 1–2.
5. **Take-off** (new: the landing reversed, gear up, the clouds kicked up when they're back), **with the cockpit shot** once talked over. *Agent build:* ~1.5 h. *Review:* 1–2.
6. **The lens flare.** *Agent build:* ~30 min. *Review:* 1–2 (the look).

Each pass stops for the owner's look.

## Options

- **Repeats played shorter** (a story lever, the owner's call): a repeated event in full the first time, a 5–6 s cut later. Not built unless asked.

## Done when

- Agent: pass 1's regression check (0400 identical), and again once 0400 plays from a saved shot; probes for the tag, random play and the memory; check, build, smoke once at the end; screenshots of the tools page and the editor.
- Owner: http://localhost:5202/tools.html; picks a flyby in the editor and hears it named in the script; plays a few random ones.

## Open questions

- **Answered 2026-11-20 (owner):** how many: not decided, between most playable scenes; interior: possible, a cockpit wide shot of the lift-off, to talk over; hand-directed: not decided, the editor first, then likely replace today's shots to keep the code consistent; the random memory: per playthrough.
- **The cockpit shot, to talk over:** who sits where at take-off (all five, as in `whats-that`?), and is Dr. Green in frame? Do the crew react (a lean, the pilots' hands on the controls: Blender animations, the owner's), or the seated loops and the shake only? The cockpit at landing too?

## After

`doc/features/scenery.md` (the generator, the shots file, the editor), `doc/features/dialogue.md` (the `# shot:` tag), the code map, the tools README, the decision log entry's status.
