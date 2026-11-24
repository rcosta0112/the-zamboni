# Plan: the planet map's test page (flight test, pass 4)

**Status:** *approved* (owner, 2026-11-24: "step 1 is next"); **step 1 built** (2026-11-24), for the owner's look. Open: whether the planet's code and preset count as "game assets" (assumed not). Pass 4 of the [flight test scene](flight-test-scene.md) (owner, 2026-11-24: a pass before navigation, its own page). A prototype: not checked against the other docs. Naming and quadrants: [planet-map.md](planet-map.md).

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

## Open (yours, can wait for the look)

- The five zoom steps' widths.
- Which coastline and contour style matches the nav display (the page has sliders; I'll copy your values in).
