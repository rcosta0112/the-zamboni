# Plan: the planet map's test page (flight test, pass 4)

**Status:** *approved* (owner, 2026-11-24: "step 1 is next"); **steps 1–2 built** (2026-11-24), for the owner's look. Open: whether the planet's code and preset count as "game assets" (assumed not). Pass 4 of the [flight test scene](flight-test-scene.md) (owner, 2026-11-24: a pass before navigation, its own page). A prototype: not checked against the other docs. Naming and quadrants: [planet-map.md](planet-map.md).

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

## Open (yours, can wait for the look)

- The five zoom steps' widths.
- Heading up turns the grid with the map: step 3 will put the edge labels on the grid lines where they cross the screen's edges (they won't stay in neat rows); say if heading up should drop them.
- Which coastline and contour style matches the nav display (the page has sliders; I'll copy your values in).
