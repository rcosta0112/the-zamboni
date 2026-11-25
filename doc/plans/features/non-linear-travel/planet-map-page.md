# Plan: the planet map's test page (flight test, pass 4)

**Status:** *approved* (owner, 2026-11-24: "step 1 is next"); **steps 1–3 built** (2026-11-24), for the owner's look. Open: whether the planet's code and preset count as "game assets" (assumed not). Pass 4 of the [flight test scene](flight-test-scene.md) (owner, 2026-11-24: a pass before navigation, its own page). A prototype: not checked against the other docs. Naming and quadrants: [planet-map.md](planet-map.md).

## What

The interface on the **navigation station's big screen**, built alone on a dev page: a very barebones map of the planet, green lines on black. Pass 5 (navigation) then puts it on the station's screen in the flight test.

## The page

- **`planet-map.html`** (dev only, listed in `tools.html`), the shot editor's template: the sidebar on the left (`tools.css`), the screen top right, the status line at the bottom.
- **Loads nothing from the game:** no `.glb`, no textures, no sounds. It reuses the planet's code and preset (`planet/planet.ts`'s noise, `presets.json`), so the map has the 0050 planet's land and sea.
- **The screen at the station screen's shape:** the aspect ratio measured once from `Navigation Display` in the ship file and written as a constant.
- **Sidebar:** the zoom step, the view's centre (as a quadrant name), *Follow ship* on/off, the simulated ship (heading, speed, moving on/off), waypoints (add at the centre, clear), the look's values (line colour, thickness, how many contour lines).

## The map

- **The globe, drawn in the nav display's style:** black background; the **coastline** (where the height crosses sea level) as a bright green line; a few dim **contour lines** on the land; the sea left black. One shader on a quad, the planet's height worked out per pixel, lines from the height's slope (thin at every zoom).
- **The projection:** an **orthographic globe** at every zoom. Zooming scales the globe; panning turns it. Zoomed out, the whole planet is on screen as in 0050; zoomed in, it looks flat. No stretching at the poles. (The other choice, a flat Google-style map, stretches the poles and doesn't look like 0050's globe.)
- **The meridian:** picked once at random now and written into the preset beside the seed (decided 2026-11-22, not done yet).

## Zoom, pan, follow

- **Zoom in fixed, chunky steps**, no easing between them: **whole globe → 64° wide → 16° → 4° → quadrants (≈ 2° wide, each quadrant labelled)**. Triggers (L2 out, R2 in); keyboard Q / E; mouse wheel.
- **Pan:** left stick, WASD. Speed is a share of the screen per second, so every step feels the same.
- **Follow the ship:** it starts centred on the ship and moves with it. Panning switches following off; a button turns it back on (pad: R3 / keyboard F, a placeholder).

## Grid, labels and icons

- **The grid follows the zoom:** every 16° (`010`) zoomed out, 4° in the middle, 1° at the quadrant step.
- **Sector names around the edges, like a chart's coordinates:** north–south (`000`–`0B4`) down the left side, east–west (`000`–`167`) along the top, on the lines shown. At the quadrant step, each quadrant's name is in its cell.
- **The ship:** a triangle pointing along its heading. **Waypoints:** circles. **Placeholders:** a square for a signal, an × for a visited site, more as they come up. All drawn by the page on a 2D overlay, same green.
- **What's tested is the map following the ship** (owner, 2026-11-24): while the ship moves, the map scrolls to keep it at the screen's centre, unless the player has panned away. The ship on this page is simulated (a heading and a speed in the sidebar) only to make it move. At some zoom steps the scrolling may be too slow to notice; if so, following is dropped.

## Steps

1. The page, the screen at its aspect, the globe in green lines (≈ 1 h).
2. Zoom steps, pan, follow, the simulated ship (≈ 30 min).
3. The grid, edge labels, icons, quadrant names (≈ 1 h).
4. A probe (`tools/planet-map-probe.js`): the page loads with no game files, every zoom step, the quadrant name at the centre matches the hex rule; then your look.

> **[Agent note]** Step 1 as built (2026-11-24): `src/planet/map.ts` (the map's material) and `map-page.ts` (the page). The screen measured in the running game: *Topographical Map*'s face on `Navigation_Display`, 0.806 × 0.677 m, aspect 1.19 (`MAP_ASPECT`). The meridian picked: **111.4°** (`presets.json`, beside the seed). Until step 2, the sidebar sets the zoom step and the centre by number. One difference from 0050: the intro's planet is a low-poly sphere, so its coastlines sit very slightly off the map's (the map's are the true sphere's).

> **[Agent note]** Step 2 as built (2026-11-24): zoom L2 / R2 (pad buttons 6, 7), Q / E, the wheel (up = in); pan with the left stick or WASD at half a screen's width per second (the whole globe as if 120° wide), along a great circle, north kept up; panning stops following, R3 / F toggles it. The simulated ship (sidebar: heading, speed in degrees of arc per second, moving, *Ship to the centre*) holds its compass heading; its triangle is drawn on a 2D canvas over the map, which step 3's grid and labels will share. The page draws every frame while the ship moves or the view pans (about 0.5 ms a frame). The speed is in degrees because the planet has no size yet: a radius would turn it into km/h.

> **[Agent note]** 0050's region (owner, 2026-11-24: "rotate the globe so it matches the last frame on 0050; that's the region they will be exploring"): the page opens centred where 0050's last frame faces, **N–S 74.0°, E–W 199.5°** (`04A-0C7`), the ship starting there, turned **17.5°** as in that frame (north isn't straight up there; a new *roll* in the view, also in the sidebar). The button *0050's last frame* goes back to it. Worked out from shot.ts's pose (`.export/end-frame.mjs`) and checked against a capture of the shot's end. Panning follows the screen (the stick's up is the screen's up, rolled).

> **[Agent note]** North up or heading up, the player's choice (owner, 2026-11-24), replacing 0050's roll: a sidebar choice, pad top face button / keyboard N (placeholders). Heading up turns the map by the ship's heading, so the ship points up when it's centred (following). The 0050 button now only centres the whole globe on the region. **Contours:** six levels (was four), each darker than the one before going inland; the deepest at 0.3 of the first (`deepest`, a slider). A look saved in the browser before this takes the six levels.

> **[Agent note]** Step 3 as built (2026-11-24): `src/planet/map-overlay.ts` (`drawMapOverlay`, so pass 5 can draw it on the station's screen). Grid every 16° at the whole globe and 64°, 4° at 16°, 1° at 4° and the quadrant step (about four lines across); meridians stop at the parallel nearest each pole. Sector names on black boxes: parallels at the left edge, meridians at the top; turned (heading up), a line that misses its edge takes the other one; none on the whole globe (owner, 2026-11-24: hidden there). A name that would cover another is skipped. At the quadrant step each cell's name in it, moved onto the screen when its cell is cut by the edge. Marks: three test marks near 0050's region (one of each kind, not story places); the sidebar adds one at the centre, or clears them. A *grid brightness* in the look (0.3). A 2 px border round the screen in the line colour (owner, 2026-11-24). The overlay takes about 0.5 ms a frame zoomed in, 1.5–3 ms on the whole globe. **Seen:** with heading up, north–south and east–west names land on the same edge and read alike (`049` and `0C7` both on the left): the open question below.

> **[Agent note]** **Step 3b, the same detail at every zoom** (owner, 2026-11-24: "do it; add more noise layers if needed"). Six fixed contour levels left a 2° view empty (one or two levels cross it, none deep inland). Instead:
> - **Contour spacing by zoom step, nested like the grid:** the whole globe's spacing, then each step splits the previous step's gaps into *n* (a value per step in the look, default 2 / 3 / 3 / 2: about the terrain's roughness for the steps' widths). A line seen zoomed out stays put; new ones appear between.
> - **No count:** lines everywhere on land. **Darker by depth** (height below sea level), not by line number, so a line looks the same at every step: full `dim` at the coast, `deepest` from a *fade depth* on.
> - **Main and minor lines:** the lines kept from the step before at full brightness, the new ones at a *minor* fraction. Lines closer than a few pixels fade out (steep ground doesn't turn solid).
> - **Noise layers:** the map's octaves rise with zoom to the preset's 16; more for the map only if the 2° step looks smooth.
> 
> *As built (2026-11-24):* `contourSpacingAt(look, step)` and `map.setContours` (map.ts); the look's new values *minor contours* (0.5), *fade depth* (0.18), *split at* each step (2 / 3 / 3 / 2: spacing 0.03 → 0.015 → 0.005 → 0.0017 → 0.00083, shown in the status line); *contour count* gone. A look saved before this takes the new contour values. **No extra noise layers needed:** at 2° the octaves the pixel needs (≈ 16.5) are about the preset's 16, and the screenshots (`.export/planet-map/after/`, before: `before/`) show fine detail at every step. Draw call unchanged (1–2 ms).
> *Update (2026-11-24):* the owner found the detail too high: the inner levels darker and darker until almost black, by depth (owner's choice over darkening the finer levels): *deepest contour* 0.05 (was 0.3).
> *Update (2026-11-24):* the lines' detail too high, most of all zoomed out (owner: "the lacunarity is too high"). Not the preset's lacunarity (it would reshape 0050's planet, which the map must match): a map-only *smoothing* in the look, 4 noise layers fewer than the pixel could show (`MapLook.smoothing`, subtracted from the octaves' LOD). The big shapes stay; the wiggles go, at every step. The globe's very edge keeps a little speckle where the lines crowd (as before).
> *Update (2026-11-25):* 4 layers everywhere was too far (owner). Smoothing is now **per zoom step**, in a sidebar block *Detail by zoom step* beside each step's contour split: 3 (globe), 2 (64°), 1.5 (16°, 4°, 2°), for the owner to tune.
> *Update (2026-11-25):* **the owner's values, now the defaults:** smoothing 1 / 1 / 1.2 / 1.5 / 1.5 (globe → 2°), contour split 1 / 1 / 3 / 1 (64° → 2°): spacing 0.03 down to 16°, 0.01 at 4° and 2°. Then the globe's spacing set to **0.1** (owner): 0.1 down to 16°, 0.033 at 4° and 2°.

> **[Agent note]** **Step 3c, a CRT look** (owner, 2026-11-25: "let's try scanlines, flicker and noise; keep everything chunky; the noise like the planet scene's over the stars"). The map and the 2D overlay are drawn into one texture (the map only when something changes; the overlay canvas uploaded as a texture), then one cheap pass shows it with the effect, so the grid, names and ship get it too (the game's screen will take the same texture). **Scanlines:** a dark band in each line, a set number of lines across the screen's height (chunky: about 3–4 px each on the page), fading to even grey when they'd be finer than 2 px. **Noise:** grain.ts's (the planet's: cells, a hash, ± a share of the colour, more in the darks; the planet's amount 0.325, response 0.54), its cells one scanline square, new at a stepped rate (12 Hz), plus a faint *on black* option (0: black stays black, as over the stars). **Flicker:** the whole screen's brightness stepped at random (12 Hz, ± 5%). Sliders in a *CRT* block. The pass runs only when a step ticks (about 12 times a second) or the map changes.
> *As built (2026-11-25):* `src/planet/crt.ts` (`createCrt`); the map into a half-float render target, the overlay canvas as a `CanvasTexture` (the canvas hidden). Defaults: 64 scanlines (owner; first 140), *scanline dark* 0.5 (as seen: the band half as bright), noise 0.325 / in darks 0.54 / one line square / 12 Hz, on black 0, flicker ± 5% at 12 Hz; the values in the look (kept in the browser), a *CRT* block in the sidebar. The map's picture unchanged with the CRT off (checked against step 3b's screenshots).

## Open (yours, can wait for the look)

- The five zoom steps' widths.
- Heading up turns the grid with the map: the edge names sit where the grid lines cross the screen's edges, and north–south and east–west names can share an edge and look alike. Keep them, drop them with heading up, or tell them apart (e.g. a dimmer style or a letter for one kind)?
- Which coastline and contour style matches the nav display (the page has sliders; I'll copy your values in).
