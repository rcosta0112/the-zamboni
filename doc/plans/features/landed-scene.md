# The landed scene, reached by sitting back down

**Status:** *built 2026-11-06* on the owner's "go" (the owner asked for passes, not a review first). See the agent note at the end.

The owner (2026-11-06): *"let's add the landed scene. If the player sits back down the game transitions to the next scene (the intended requirements, talking to the whole crew, drinking coffee etc, on another pass). A placeholder external cutscene (the animation reference later): a simple external shot of the ship landed on the treadmill, the treadmill stopped and the exhaust flames out. A new scene with the ship landed: a spot of the treadmill with enough room for the ship, used for the external cutscene too. Unlock all doors and allow the player to change their clothes."*

## Goal and scope

- **In:** chapter 1's seat offers *Sit down* once she's up; sitting goes to the landed scene, which opens on a placeholder exterior shot. The landed scene: the ship on the icy plain (the travel terrain, stopped at a chosen spot), gear down, no flames, no engine noise, nothing locked, her parka and the jetpacks free.
- **Out:** the flying scene's requirements for sitting (Ogawa, the coffee: pass 2 of [the flying scene](flying-scene.md)); the sit-down and stand-up animations; the real landing cutscene (the owner's reference, later); what happens in the landed scene (no story yet).

## Conflicts with the docs (flagged)

1. **The landing site.** The flying-scene plan says the landed scene keeps *today's ground* (the flat snow) and the landing cutscene swaps the exterior from the travel terrain to it. The owner now asks for the ship landed **on the treadmill**. Taken as the new decision (decision log); the exterior swap isn't needed for now.
2. **`landed` is also the checks' scene.** `?test` starts there (her outside by the open ramp, flat ground), and the smoke script is written for it. The checks keep that version as their own file (`public/test/scenes/landed.json`); with `?test` the checks' scenes are read first. The game's `landed` is the new one.
3. **"Unlock all doors":** the outer doors, hatches, jetpacks and parka are locked only by the flight rules, so a scene without `travel` has nothing locked. **The crew's lockers stay as they are** (Kaufman's and Ogawa's refuse with the owner's lines, 2026-10-21, in any scene): say if they should open too.

## The spot

`.export/landing-spot.mjs` (scratch) runs the treadmill's own maths (the hills' grid, the scatter's hash) along the flight line: **14,697 m along**, the ground under the ship (14 × 20 m, a margin round its 11.4 × 15.6 m) within 0.52 m, no rock within 60 m, 4.6 m of rise and fall over 80 m round. The ship stands with its centre on the ground there; its corners can float or sink up to about 25 cm (a placeholder; levelling a pad under it is an option).

## How

**Pass 1: the scene and the way in.**
- `SceneData.ground: { terrain, at }`: the ship landed on a terrain, shown stopped `at` metres along it (`travel` stays the flying one). The director hands it to the treadmill as `onTravel(terrain, parked)`.
- `Treadmill.park(at)`: speed 0, `travelled = at`, heading 0, the ground's height at the ship's centre put at the ship's feet (y 0). **Her ground follows the hills:** a triangle collider made from the same grid (`Physics.setGround`), replacing the flat 500 m one while parked; the camera kept above it.
- Scene fields `getUp` and `sitDown` (commands): chapter 1's `getUp` runs her line (`got_up`, which main.ts ran by name before); its `sitDown` is `{ "do": "scene", "id": "landed" }`. While she stands in a scene with `sitDown`, her seat offers *Sit down* (instead of its knot); using it seats her and runs the commands.
- A new command `scene` (start a scene). A scene's `intro` (a cutscene's id) plays from its first frame when it's reached by `scene` (both fetched first, so there's no frame of the old scene's state in between); not under the start screen, from a save or from `?scene=`.
- `public/scenes/landed.json`: `ground` (ice-plain, 14697), her seated, the aisle as her start for *Get up*, `intro: landing`.

**Pass 2: the placeholder shot.** `public/cutscenes/landing.json`, written by hand (no Blender file yet): one shot from the ice ahead of the ship and to its left, low, a slow push-in over 6 s; the scenery's speed 0; her hidden (as in the other exterior shots). Sound as the other exterior shots (wind; no engine noise landed).

## Check

A probe: chapter 1 → *Get up* → *Sit down* → the landing shot plays (the treadmill stopped, no flames, gear down) → the landed scene, seated; *Get up*: no chapter-1 line; the side door and her parka open; she stands on the ice outside (on the hills' collider). `npm run check`, `build`, screenshots. The scenes, scenery and flight probes updated for the checks' `landed`.

## Estimate

Agent build: about 1 hour both passes. Owner review: one round.

> **[Agent note]** **As built, 2026-11-06 (both passes, one session; about 1 hour of agent time, as estimated).** As planned. Pass 1 checked before pass 2: the scene parked, seated, flames off; the collider matches `groundY` exactly at four points. Pass 2's camera: Blender (16, −26, 2.64) to (12.5, −20.5, 2.34), aimed at (0, 2.67, 2.8), 1.6 m above the ice there. `landed-probe.js` 11/11; `scenes-probe.js` 14/14 (its file path updated); `flight-probe.js --game` 18/18 after a fix to the probe itself (since 2026-10-28 it started chapter 1 under cutscene 2's exterior shot, so Adam's line came late: *Get up* failed on the committed code too). Also: chapter 1's `got_up` now runs from its `getUp` (main.ts ran it by name); a silent `got_up` in the test story. What exists: [scenery.md](../../features/scenery.md#the-landed-scene-the-ship-on-the-stopped-plain-2026-11-06).

> **[Agent note]** **Pass 3, 2026-11-06 (owner, after the first two): the rocks nearest the ship collide and cast proper shadows.** Built without a plan of its own (owner: "continue" after a re-assessment). Convex colliders for the 13 rocks within 500 m; every rock casting into the shadow map while parked, the shadow camera 260 m deep; the flattened shadows cut round her (they floated over the hills' dips). Longer than expected: the colliders were first built before the rocks' world matrices existed (at the origin), and a first try with hidden caster copies left the floating flattened shadows. `landed-probe.js` 13/13. Not checked: the seam where the real shadows meet the flattened ones, on the move.
