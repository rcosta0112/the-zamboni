# Plan: the landing cutscene (0600)

*Written 2026-11-07; **rewritten 2026-11-10 from the owner's reference and notes** (the 2026-11-07 version is in git). **Pass 1 built and approved 2026-11-10** (the framing moved by the owner: the ship ends just left of the middle) ([what exists](../../features/scenery.md)); **pass 2 built 2026-11-10**, the owner's to look at; passes 3–4 for later. Replaces the placeholder landing shot (`public/cutscenes/landing.json`, [landed scene plan](landed-scene.md) pass 2) and is pass 6 of [the flying scene](flying-scene.md).*

## What it is

The owner's [`0600 - Cutscene exterior - Landing.md`](<../../story/scenes/0600 - Cutscene exterior - Landing.md>), two shots:

1. **Above and behind the ship**, flying over the icy plain; the temple coming into view on the horizon.
2. **The landing** (owner, 2026-11-10, with a reference render: Dr. Green on a ledge, the ship hovering to the right): **the reference's angle** (Dr. Green and the ledge ignored) as the ship slowly flies down:
   - the camera about level with the ship, a little under its belly so its underside shows; off its front quarter, the nose toward the frame's right; a long lens (the ship looks flat, little perspective); the ship in the frame's right half, room on the left;
   - **a bit of hand-held** on the camera;
   - **the engines pointing down**, their flames blooming as in the reference (a white-hot core, a warm halo);
   - **the landing gear unfolding** on the way down;
   - **the ship rocking a little on its gear** as it settles;
   - **clouds near the ground** (suggestions below; the owner picks).

It plays where the placeholder plays now: after cutscene 3 (*What's that?*), as the landed scene's `intro`; skipped, the landed scene as it is.

## What exists, what's missing (checked in 1.22 and the code, 2026-11-10)

- **The turbines** (`Turbine Left`, `Turbine Right`, `Turbine.001`, `Turbine.002`) are separate objects, each pivoted near its middle, no action: **the game can turn them** (90° about the ship's cross axis). The front pair's collision boxes are their children.
- **The flames** (`flames.ts`) are one mesh of four cones, a child of the ship, pointing back. To turn with their turbines they're split per cone (each already carries its cone's number) and each made a child of its turbine.
- **Bloom:** none in the game (post-processing is a later pass, SC-136). As with the jetpack's exhaust (2026-10-14) and the temple's shaft (2026-11-07), **the bloom is painted in**: an additive sprite per nozzle, a white core and a warm halo sized in pixels, flickering with its cone. This follows the decision log; real bloom would mean deciding SC-136 first.
- **The landing gear** (`Landing Gear Back Left/Right`, `Landing Gear Front`) are three single meshes; the game slides them up 0.75 m in flight. **Unfolding needs the file:** see question 2.
- **A hand-held camera** exists for cutscene 2 (`watched.ts`: a slow noise on position and turn, `handheld*` settings). The landing reuses it, gentler, with its own strength on the track.
- **The ship's movement in a cutscene** (`cutscene.ts`: the sway keys move the ship and what follows it) carries the descent and the settle; the ground stays still (the treadmill parked at 14,697 m as now).

## Passes

Estimates are build time only; each pass ends with screenshots and a stop for the owner to look.

**Pass 1: the angle and the descent (about 30 min).** Shot 2 only, in `landing.json`: the camera placed to match the reference (by hand; the owner corrects it). The ship comes down from about 20 m above its landed height to it over about 10 s, slowing to a stop (eased), drifting forward a little; its existing small sway while it hovers. The hand-held on the camera (a `handheld` strength on the shot). Gear and turbines as they are now (gear slid down over the last 3 s as a placeholder; turbines pointing back, flames on until touchdown). Wind as the other exterior shots, the engine fading out at touchdown. The scene starts as today after it.
*Check:* the landed probe (the landing plays, the ship ends at the parked height, gear down, flames off; skip gives the same end); screenshots at a few points, set beside the reference.
> **[Agent note]** *As built (2026-11-10):* `tools/landing-cutscene.mjs` writes the track; the track's new `flight` keys (gear, flames, noise) and a shot's `handheld`. The first try (camera 1.8 m up throughout, 34 m off) looked steeply up at a black belly with the ship too big: the camera now comes down with the ship (80% of its height), 42 m off, 32° toward the nose. The descent eased at 1.6 (2 hung near the ground for 2 s). The landed probe passes (17).

**Pass 2: the engines down, the flames' bloom (about 30 min).** The four turbines turned down (keyed on the track: `turbines` 0 → 1 before the shot starts, or turning in shot; question 3), the flames split and turned with them, the painted bloom per nozzle. What happens after touchdown: question 4.
*Check:* screenshots; the turbines' collision boxes where the landed scene expects them.
> **[Agent note]** *As built (2026-11-10):* the track's `turbines` (back 90°; front 115°, flames down and forward, 5° toward straight down per degree of nose-down pitch: the owner's correction of the first build, 62° with the flames down and back), `front` (0.6), `reach` (the flames shortened to end 0.3 m over the ice) and `glow` keys; the shot lengthened to 16 s (owner: the turbines turn back in it, 11–15 s). Each flame cone its own mesh on its turbine; the bloom as sprites (`flames.ts`). The collision boxes aren't the turbines' children in the game and the turbines are back at rest when the landed scene takes over: nothing to move. Probes: landed 17/17; the turbines at rest after the shot. First glow: the front pair's, dimmed by their 0.6, vanished against the sky; both pairs now at the same brightness, the front smaller. The owner's look: too small, a circle above the flame: now 0.3 of the screen's height, centred 1.2 m down the flame. [What exists](../../features/scenery.md).

**Pass 3: the gear unfolding, the rocking (about 30 min after the file's ready).** The gear played from the file (question 2) over the last 4–5 s before touchdown; the settle: on touchdown the ship dips about 5 cm and tips a degree or two, springing back in two or three fading rocks over about 1.5 s (a damped spring on the ship's height and tilt, in code; tunable on the panel).
*Check:* screenshots; the gear's feet on the ground at the end.

**Pass 4: the clouds near the ground (one of the options below; 30–60 min).**

**Shot 1 (above and behind, the temple coming into view)** is the 2026-11-07 plan's: the treadmill driven by the track (distance and height keys), the temple riding the treadmill until parked. **After pass 1 or with pass 4** (question 1).

## The clouds near the ground: options

The reference's clouds are soft and bright, a bank lying on the ground with the ship coming down into it. Ranked by look against cost:

- **A. Soft sprites from the owner's cloud images (recommended first).** 10–20 camera-facing cards on the ground round the landing spot, alpha-blended, lit by a fixed tint (sun side brighter). A few lie still as the bank; under the thrusters, new ones puff out and drift outward as the ship comes down (the downwash). **Soft edges against the ground and the ship** (faded by depth, so no hard line where a card cuts the ice). Cheap (a draw or two). Risk: up close, cards can look flat or turn visibly as the camera moves; the hand-held is small, so likely fine.
- **B. Ground fog in the haze.** A thin noisy fog layer up to 1–2 m over the ice, drawn into the existing haze (the ice and anything low get whiter); the thrusters blow a hole in it as the ship lands. Very cheap and it covers the whole plain, but it's a mist, not a bank of cloud. Good **with** A (the cards for the shapes, the fog to blend them into the ground).
- **C. A real cloud volume (raymarched in TSL).** A box under the ship filled with 3D noise, lit by the sun (light on top, soft shade under), pushed out by the thrusters. It looks closest to the render, from any angle, but costs a few ms a frame even at half resolution, and is the most work (a few hours, more tuning). Only in this cutscene, so the cost may be fine.
- **D. Soft meshes.** A few lumpy shapes (as the removed cumulus, 2026-10-23) with a soft rim fading to see-through; they match the ship's shapes but read as solid more than as cloud.

Recommendation: **A, with B if the cards need blending into the ice**; C only if A doesn't read.

## The owner's answers (2026-11-10): pass 1 approved

- **The turbines balance the ship:** its back half is heavier, so **the back pair does most of the lifting** (pointing straight down, the strongest flames) **and the front pair keeps it upright** (less tilted down, smaller flames, correcting as it rocks). The animation shows it (pass 2).
- **The bloom:** the reference's colour (a white-hot core in a warm orange-pink halo). **The flames flare up as the ship slows down** (keyed from pass 1: the flames' strength rises through the braking, then dies at touchdown).
- **The gear:** designed to move only up and down: **the existing slide is all it needs**, keyed on the track (no Blender work; question 2 answered). Pass 3 is the rocking alone.
- **The turbines are already down when the shot starts** (question 3), and **after touchdown they turn back slowly once the engines are off** (question 4; owner, 2026-11-10): the landed scene has them as now, pointing back. The shot ends 1.5 s after touchdown: the slow turn needs the shot lengthened (a few seconds), or it finishes in the landed scene after the hand-back; settle it in pass 2.
- Questions 1, 5, 6 still open.

## Questions for the owner

1. **Shot 1:** build it after pass 1 (recommended), or drop it for now and keep only this shot?
2. **The gear unfolding:** the legs are single meshes with no hinge. Would you split each into parts with their pivots and key an unfold action in Blender (the export brings the action, the game plays it; recommended: it'll look as you mean it), or should the game fake it (each leg swung up about one hinge as a whole)?
3. **The turbines:** already down when the shot starts (recommended: the shot is short), or turning down during it?
4. **After touchdown:** turbines stay down in the landed scene (her walking under the front ones: their collisions turned too), or turn back to point back?
5. **The clouds:** which option (A recommended)? And the cloud images' path under `resources/`.
6. **Length:** about 10 s for the descent, fine?

## Noted, not changed

- **Cutscene 3's placeholder column** (`light-column.ts`) stands 3 km ahead, 6° right; the temple stands straight ahead of the parked spot. Swapping the column for the real shaft (temple plan, SC-162) would make the two agree; until then shot 1 may show the shaft in a different place from cutscene 3's column.
- **The scene file says** shot 2 is *"a shot from below"*; the reference is near level with the ship, a little below its belly. Built as the reference.
