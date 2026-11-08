# Plan: the landing cutscene (0600)

*Written 2026-11-07. For review. Replaces the placeholder landing shot (`public/cutscenes/landing.json`, [landed scene plan](landed-scene.md) pass 2) and is pass 6 of [the flying scene](flying-scene.md).*

## What it is

The owner's [`0600 - Cutscene exterior - Landing.md`](<../../story/scenes/0600 - Cutscene exterior - Landing.md>), two shots:

1. **Above and behind the ship**, flying over the icy plain; the temple coming into view on the horizon.
2. **From below**: the ship lands vertically, its engines pointing down. White clouds of dust and steam (owner, 2026-11-07: **skipped unless very simple**; the owner has the images the reference's clouds were made from). Reference: the owner's render of the ship hovering, turbines down and glowing, gear lowered, a soft white cloud bank under it.

It plays where the placeholder plays now: after cutscene 3 (*What's that?*), as the landed scene's `intro`; skipped, the landed scene as it is.

## What it needs that doesn't exist

- **The treadmill flying again inside a landed scene.** The intro plays after `landed` has parked the ship (14,697 m along, `Treadmill.park`). The track will drive the treadmill itself: **keys of the distance along and the ship's height over the ground** (`travel` keys on a shot: `at`, `height`), eased on a curve; at the end it is exactly at the parked spot and height, so the scene starts as today. Shot 1 starts a few kilometres short of the spot, at the flight speed and height; the cut lets shot 2 start near the spot, already slow and low (no need to show the slowing down).
- **The ship flying while it plays** (`flying` on a shot): the gear raised, the flames on, the wind and engine noise as the other exterior shots, the hull's outside lit. The sun: the landed one throughout (the flight sun differs; cutscene 3 is seen from inside, so the jump shouldn't show; the owner's call if it does).
- **The temple seen from the air.** It's placed only while parked; during the cutscene it rides the treadmill instead (200 m ahead of the parked spot, so 3–4 km ahead at shot 1's start), its shaft drawn to 2,500 m as now, so it comes into view as the shot runs.
- **The gear lowering** in shot 2 (SC-30: the shot shows it): `landingGearUp` keyed from 0.75 m to 0, over about 2 s before touchdown.
- **The engines pointing down** in shot 2: see question 1.
- **The cameras:** written by hand, as the placeholder was (question 2).

## Passes

**Pass 1: the two shots (about 1 hour).** The track's `travel` and `flying` keys (cutscene.ts, terrain.ts: a cutscene's distance and height override the parked ones while it plays); the temple on the treadmill while flying (landmarks.ts); the gear keyed; `landing.json` rewritten: shot 1 about 6 s, high behind the ship looking ahead and down, the temple's shaft rising out of the horizon; shot 2 about 8 s, low under the ship's flank looking up, the ground coming up to the ship (the ship stays put in the world, as in the other cutscenes), the gear coming down, a slow settle; the ship's sway in both (cutscene 1's kind, smaller). Turbines as they are (backwards) until pass 2. Sound as the other exterior shots, the engine fading out at touchdown.
*Check:* the landed probe extended (the landing plays, the treadmill moves then stops at 14,697, the ship's height ends at the parked one, gear down, flames off after; skip gives the same end); screenshots of both shots.

**Pass 2: the engines down (about 30 min, after question 1).** The turbines turned to point down in shot 2 (keyed on the track: `turbines` 0 → 1), the flames turned with them.

**Pass 3 (optional): the clouds (about 45 min).** The simple way: 8–12 soft camera-facing sprites (from the owner's cloud images) on the ground under the four thrusters, appearing as the ship nears the ground, growing outward and fading; drawn only in this cutscene. Unlit and alpha-blended, not real volume or lighting: it won't look like the reference's render up close, but at the shot's distance it may read. If it doesn't read after one try, dropped.

## Questions for the owner

1. **The turbines pointing down:** does 1.22 have them tilting (a pivot or an action), or should the game turn them? If the game: all four (`Turbine Left`, `Turbine Right`, `Turbine.001`, `Turbine.002`), about which axis, by how much (90°)?
2. **The cameras: by hand now** (recommended: I place them, you tell me what to change), or do you want to animate them in Blender (a file with the ship, the ground and the two cameras; the existing camera script copies them, as for cutscene 2's exterior shot)?
3. **The clouds:** try pass 3, or leave them out? If tried, which images (a path under `resources/`)?
4. **The lengths:** about 6 s and 8 s, fine?

## Noted, not changed

- **Cutscene 3's placeholder column** (`light-column.ts`) stands 3 km ahead, 6° right; the temple stands straight ahead of the parked spot. Swapping the column for the real shaft (temple plan, SC-162) would make the two agree; until then shot 1 may show the shaft in a different place from cutscene 3's column.
