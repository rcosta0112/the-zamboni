# The scenery round the camera, not the ship

> **[Agent note]** Owner, 2026-10-23: *"should we make the rock band be relative to the camera position so we don't need to adjust this on every shot?"* — then *"write the plan and run it"* (approved to build). Follows cutscene 1, whose camera, high and looking back, saw the band's edges: the rocks popped in and out until the band was widened to 3.2 km each way ([flying scene plan](flying-scene.md), cutscene 1). What exists today: [the scenery](../../features/scenery.md).

> **[Agent note]** **Built 2026-10-23** ([what exists](../../features/scenery.md)). One change while building: the copies are shown within `reach` of the camera as a circle, not the cells' square (the haze is round: the square drew about 680 rocks, the circle 476 at the same density). `scenery-cells-probe.js` (4 checks); the CPU's part 0.2 ms a frame (was about 1 ms); from outside about 1.5 ms a frame more than with the old band's 50 rocks, within the measurement's spread.

## The problem

A pool's copies live in a box round the ship (`ahead`, `behind`, `width`); one passing the rear edge comes back at the front, somewhere new at random. A camera far from the ship, or looking back, sees those edges unless the box is sized for that shot. A cut between two cameras can't promise the same rocks either: the layout is a running random state.

## What changes

**The plain is a grid of cells, each cell's copies made from its own position** (a hash of the cell's two indices and the pool): how many (the density × the cell's area, the fraction decided by the hash), where in the cell, the shape, size, turn, tilts and height. Nothing is stored and nothing is random over time: a cell always holds the same rocks.

**Each frame, the cells within `reach` of the camera being drawn are shown** (a square round it, along the ground): the game's camera behind her, a watched conversation's or a cutscene's, whichever renders. The ground under them moves by the distance travelled (the treadmill as before: the ship never moves), so a cell's rocks slide back with it; cells leaving the square at the back and entering it at the front do so `reach` from the camera, past the full haze.

- **Every camera sees the same rocks in the same places**; a cut keeps them.
- **No band to size per shot**: `reach` is a property of the terrain (the haze's full distance plus a margin, 3.4 km for the icy plain).
- **No repetition**: each cell is its own.
- **The clear lane stays on the ship's line**: `clear` (a backdrop's) is measured from the ship's line, not the camera.
- **Long flights:** the cell indices are worked out on the CPU in doubles from the distance travelled (10 minutes is about 72 km); what goes to the GPU is near the group's origin, as now.
- **The panel's *Flight: rocks* › *count*** becomes the rocks in the camera's square at the file's density; changing it scales the density.
- **Clouds' fade** (the code kept, no terrain uses it) measured from the camera instead of the ship.
- **The ground plane stays on the ship** (7.2 km across): a cutscene camera stays within about 150 m of it, well inside its 600 m margin past the haze. A shot further off would need it moved (noted, not built).

**The terrain file:** a pool gives `density` (per m²), `cell` (m) and `reach` (m) instead of `count`, `ahead`, `behind`, `width`. The icy plain: density 1.32 × 10⁻⁵ /m² (the owner's 50 rocks in the old 2.1 × 1.8 km band), cells 400 m, reach 3,400 m: about 610 rocks shown.

**Cost:** about 330 cells and 610 copies written a frame, as many as are moved today; each shape's mesh holds room for its share of the panel's maximum (`ROCKS_MAX`) and draws what's filled.

## Not in it

Moving the copies on the GPU instead (the 1 ms of CPU: SC-123's neighbour); the ground plane following the camera.

## Check

- `cutscene-1-probe.js`, `scenery-probe.js`, `flight-perf-probe.js`: as before (the frame time no worse).
- A probe: the same rock (the same cell and index) at the same ground place seen from two cameras far apart; every copy shown within `reach` of the drawing camera; a rock's place the same after 10 s of flight minus the distance flown; the count about the density's.
- `npm run check`, `npm run build`.

## After

[`features/scenery.md`](../../features/scenery.md) rewritten for the cells; the code map; `tools/README.md`; the decision log (*The scenery*: an update).
