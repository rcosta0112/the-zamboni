# The thrusters' flames: a round base, a long thin flame, a white core, bloom always on (SC-190)

**Status:** approved 2026-11-21 (owner: "continue"; the starburst dropped); pass 1 built 2026-11-21. The flame editor's update (SC-189) comes after it.

## Goal

The owner's reference (2026-11-21: two stills of cartoon starfighters): at each nozzle a **round base** joined to a **long, thin flame**; a **solid white core** as the temple's light shaft has; the painted **bloom always on**; the **intensity raised and lowered** in take-off and landing shots. The colour stays (`#f2e4a2`).

## The design

- **The shape: a flat strip per nozzle, drawn by its shader** (`flames.ts`), in place of the fly-by file's cones. It lies on the flame's axis and turns about it to face the camera (the light shaft's ribbon). In it, the outline is worked out per pixel: a disc the nozzle's size, joined smoothly to a spike tapering to a point (`base size`, `length`, `width` values). Seen down the axis the strip thins out and fades; the nozzle's bloom stands in (the view from behind is round anyway).
- **The cones' file stays** as the placement: each nozzle's middle, axis, radius and turbine are read from it as now (no Blender work, no export). The old cones kept behind a panel switch for comparing until the owner drops them.
- **The core:** a white line down the middle of the flame, never under `core px` pixels across (as `shaftCorePx`), brighter than white before tone mapping. **Laid over, not added**, with the colour and the glow added round it: the temple's lesson (2026-11-08), white added to the bright sky came out pink-white.
- **Bloom:** the nozzle's painted glow (core + halo sprite) shows in **every** exterior flight shot, not only where a shot keys it (flybys, 0100 included); keyed `glow` still scales it on the landing. Plus a faint glow round the whole flame, drawn in the strip (a wide soft falloff from the outline, a size in pixels as bloom's is).
- **The flicker and grain carry over:** the flicker shortens the spike and dims it, the base barely; the grain runs along the spike. The landing's `reach` shortens the spike, not the base; `front` as now.
- **Intensity:** the shots' existing `flames` key (0600's track; 0 = off) becomes the intensity: it scales the brightness, the core's width, the spike's length and the bloom's size together, so one curve raises it for take-off and lowers it for touchdown. 0600's current keys are kept, so the landing plays as now until retuned. Editing that curve in the shot editor belongs to the landing and take-off shots plan ([landing-takeoff-shots.md](landing-takeoff-shots.md)): an *intensity* row there.
- **The values** go in the panel's *Flight: thruster flames* folder (new: base size, length, width, core px, core brightness, glow px, glow brightness); old ones that no longer apply removed (`fade` becomes the spike's taper). The flame editor (SC-189) lists them next.

## Passes

1. The strip, the shape, the white core; the old cones behind a switch. Probe screenshots in 0100 and 0600.
2. Bloom always on, the glow round the flame, intensity driving all of it.

Then SC-189: the flame editor shows the new values.

## Done when

The flames read as the reference in 0100 (flyby) and 0600 (landing) on probe screenshots; no console errors; 0600 plays its intensity curve; check and build pass; smoke once at the end. Docs: `features/` flames page, code map, decision log (the strip replaces the file's cones).

## As built (pass 1)

- `flames.ts` `stripGeometry` / `stripMaterials`: two meshes per nozzle on one 24-row strip (flame, core; render order 5, 6), placed in the vertex shader (`frustumCulled` off). Radius and length per nozzle from the cones (back 0.43 m / 7.6 m, front 0.27 m / 2.7 m).
- **Changed from the design: the flame's colour is laid over, not added.** Added, the pale yellow vanished against the bright sky (the temple's lesson again); the glow round it (pass 2) will be the added part.
- Values (settings.ts, panel): `thrusterFlameCones` (old cones), `Base` 1.25, `BaseOut` 0.9, `Length` 1.2, `Width` 0.45, `Taper` 1.2, `Edge` 0.45, `CoreWidth` 0.4, `CorePx` 2, `CoreLength` 0.35, `CoreBrightness` 6. `thrusterFlameFade` now where the flame starts fading to its tip.
- Seen down the axis (from behind, below) the strip fades out: nothing round shows there until pass 2's glow.
