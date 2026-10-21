# Plan: A second collision pass, every place she gets stuck (item 55)

**Status:** *approved* 2026-10-20; **passes 1 and 2 built 2026-10-21, with the owner's follow-ups the same day** (*As built* at the end); **set aside by the owner 2026-10-21** ("let's leave this for now"). Open: steep exits from the doorway into the cockpit; pass 3 (the lower deck).

## Goal

She walks, runs, jumps and flies through the ship without catching on anything: wherever the way looks open, she gets through, and against a wall she slides along it instead of stopping dead. **The upper deck first** (owner: most of the problems are there): the crew quarters, the cockpit, the top of the ladder.

**Out:** the camera (its own task, next); picking things up and getting into seats; the outside of the ship; how the collision boxes look or fit as props (only where she goes).

## Constraints from the docs

- **Boxes are `*_col` objects in `Game Collision`**, `reach: "through"` ones convex ([asset pipeline](../../architecture/asset-pipeline.md)); `collider: "none"` takes a part out. The ship file is changed by a record script tried on a scratch copy first, or by the owner; **saving the owner's `.blend` is flagged first**, with a copy next to it; then `npm run export:ship` after *Before the next export* (CLAUDE.md, *Keeping the work cheap*).
- **She can't climb onto furniture** (item 42, decided 2026-10-15): boxes go up to the ceiling. **No flying indoors in the game** (`scope.md`).
- Doors move through her only while she climbs (decision log, *The ladder by button*); otherwise they stop for her capsule.
- **Check narrowly while working** (the probe), the smoke script once at the end.

## The work, in three passes (a stop after each)

**Pass 1: find them (no change to the game or the file).** About a third of the remaining budget at most.
1. **A sweep probe** (`tools/stuck-sweep.js`): on a grid every 0.25 m over the upper deck's floor (and a ring round the top of the ladder and the cockpit doorway), she's placed, faces a direction and walks 0.6 s that way, eight directions per spot. A spot is reported when:
   - **snag:** she moves less than half of what an open floor gives, while a cast of her capsule along that way finds nothing within that distance (she stopped on nothing she should stop on);
   - **wall stop:** walking at 45° into a wall, she stops instead of sliding along it;
   - **trapped:** she can't leave the spot in any of the eight directions;
   - **lifted:** her feet rise on flat floor (a step-up onto an edge), or she ends off the floor.
   Each report names the collider she touched (Rapier's contact: a part of the ship's mesh, a box, a door, a crew member's box), so the cause comes with it.
2. **The owner's two spots**: the top of the ladder (where the climb leaves her, then walking off in each direction) and just inside the cockpit door, as walks from a fixed start.
3. **The result:** a list of the spots, grouped by cause, with a screenshot of each group, in this plan. Doors open and shut, and with the crew in place. **Stop:** the owner looks at the list and adds the spots they know (*a place and what she was doing* is enough).

**Pass 2: fix them**, by cause, cheapest first:
- **a detail of the mesh** (an edge, a lip, a bolt): a box over it, or the part out of the collider (`collider: "none"`), in the file;
- **two colliders meeting with a gap or a ridge** (a box and the floor, a door's frame): the box resized;
- **the controller** (its step height, its offset, snapping to the floor): a value in `physics.ts`, if many spots share it;
- **a crew member's box** (crew.ts) or **a door stopping for her**: the box or the door's clearance.
The file's changes go in one record script, run by the owner or by me (flagged). **Stop:** the owner plays the upper deck.

**Pass 3: the lower deck and the rest**, with the same probe, only if the owner wants it after pass 2. Then the smoke script once, and the docs (`movement-and-ladder.md`, `collision-boxes.md`) describe what exists.

## Options

- **How to find them: A. the sweep probe (recommended)**, which finds what nobody has walked into yet and gives a cause for each; about 20 minutes of probe time for the upper deck. **B. only the owner's spots**: cheaper, but each spot has to be found by playing and described. A makes the probe reusable for pass 3 and after the next file changes.

## Answered (owner, 2026-10-20; approved: "go")

1. The known spots: **walking in the door area, in the cockpit and in the crew quarters** (both sides of the cockpit's bulkhead door).
2. **She stays in the corridor.** Climbing around things is fun but makes too many places to get stuck; more collision boxes are fine to keep her out. Sitting on a chair will be an animation, like the ladder. So the sweep covers the corridor and the door area, and any reachable spot off the corridor counts as a finding (to close with a box).

## Pass 1, as found (2026-10-21)

`tools/stuck-sweep.js` (the plan's sweep: reach from the cockpit's doorway on a 0.25 m grid, 121 cells; eight 0.6 s walks from each), and a map of the floor's height every 5 cm from the collider (rays down; a scratch probe). World coordinates; the upper floor at y 3.461. The door's leaves and the trapdoor open.

1. **The cockpit's doorway: the floor has a crack and a groove** (the owner's spot). Where the crew quarters' floor (`Floor_Top001`) meets the cockpit's (part of `Dashboard_Body`), at z −17.45 there is **no floor in the collider across the whole doorway** (a strip about 5 cm wide), and at z −17.55 a groove more than 5 cm deep (the doors' track). Her capsule's round bottom drops into them and catches on their edge: the sweep finds her **trapped in the doorway** (a cell from which no direction gets her 0.2 m) and stopped there on walks from both rooms (most of the *snag* cells near the bulkhead on both sides are walks that end in the doorway).
2. **The cockpit's floor isn't flat, and she can walk up its front.** Between the consoles: a hollow 1–5 cm deep (z −18.10 to −18.55, the edges catch her a little), then the floor rises 1–10 cm (z −18.70 to −19.00), a step of 10–20 cm (z −19.05) and one of 20–30 cm (z −19.40, the front by the dashboard). The controller steps up to 0.3 m, so **she climbs to the dashboard** (119 step-ups, up to 0.27 m) and is trapped against it.
3. **Elsewhere on the crew quarters' floor, small things:** step-ups of up to 7 cm in two places (x 5.2–5.7, z about −16.0; x 3.2–3.7, z −14.4 to −13.9; what she steps on not identified yet), one stop at the port wall (x 3.19, z −15.15) touching nothing. Falling through the open trapdoor onto the ladder: expected.
4. **The corridor as she reaches it:** the crew quarters' aisle (x about 3.2–4.9, wider at z −16.2 to −15.9 toward the galley) and the whole space between the cockpit's consoles; the collision boxes keep her off the furniture already.

**For pass 2 (proposed):** one flat box across the doorway and the cockpit's floor (its top flush with the floor, from the crew quarters' side of the door to where the floor starts rising), which fills the crack, the groove and the hollow; and a box up to the ceiling across the cockpit at that line, so she stays in the corridor (the front, the seats and the dashboard behind it). Then the two small step-ups looked at, and the sweep run again.

## Pass 2, as built (2026-10-21)

- **In the ship file** (`add-collision-boxes-3.py`, tried on a scratch copy, then saved into 1.21 by the agent, three times as the fixes went on; the file as it was before the first save is kept next to it): the four boxes proposed above (the corridor ends 1.2 m into the cockpit, at Blender y −1.65; the aisle between the ridge walls is 1.36 wide), and **both doorway corners of the two boxes beside the bulkhead cut at 45°**. Those boxes (2026-10-14) stand 0.2 past the bulkhead into the cockpit; walking along the door's frame at an angle she stopped dead on their square corners, on the cockpit's side and then on the crew quarters'. Listed in `ship-export-list.json`; exported and taken with `export:accept` (only these boxes differed).
- **Checked:** `tools/doorway-walks.js` (new, about 80 s): the game's own movement through the open doorway from both sides, five angles and three aims each, and out of the doorway at ±50° and ±65°: **all through**, none stopped (two walks pass over the open trapdoor beside the door and drop through it, as the game has it). `tools/stuck-sweep.js` again: no step-ups or snags left in the cockpit; what it still lists on the crew side are its own limits (stops where the controller reports no contact, starts within the controller's 3 cm gap of a door leaf), the doorway walks show them clear. The smoke script: 83 passed, the 3 known failures.
- **The smoke script's door check** walks the cockpit's door from inside the cockpit now (0.8 m from it, out into the crew quarters): the corridor is too short to stand far from it or to get far enough past it for it to close.
- **Update 2026-10-21 (owner: "make it so she can walk up the ramp in the cockpit; she should be able to walk behind the front seats"):** the cockpit's floor isn't steps but **a ramp** (about 3 cm every 10 cm from 1.7 m in) up to **a platform 0.24 high behind the front seats** (pass 1 read its rise as step-ups); past it, seats and dashboard are 0.87 high and more. `Box Cockpit Front_col` moved from where the ramp starts to just behind the front seats (Blender y −2.88..−3.00, across the whole width, up to the ceiling: she can't jump onto them), and the ridge walls run on to the platform (y −2.40). Walked with the game's movement: up the ramp to 2.57 m in, 0.24 up, and back out. **Behind the seats she moves sideways only ±0.42 m:** between the consoles' boxes (which hold the rear seats, ending at y −2.35) and the front seats there is 0.53 m, under her width (0.56 and the controller's gap). Smoke: 83 passed, the 3 known failures.
- **Update 2026-10-21 (owner: still stuck after the ladder's climb, first moving, and walking in front of the cockpit's door; a recorded spot, feet 4.635, 3.462, −16.96):** both were her walking at the bulkhead beside the doorway (the doorway is 0.93 wide for her 0.56; the climb ends her 0.27 to its side), so she stopped against the wall. **The two boxes beside the doorway are one convex shape each now** (`DOORWAY` in the script): the doorway's side, cut at 45° on the crew quarters' side, then **a guide** standing 0.15 off the bulkhead that turns her into the doorway, and on the cockpit's side a turn in two facets of 22.5° to the cockpit's side walls, covering the bulkhead's own edge (its mesh collides, 1 cm behind the boxes' face). Tried on the way, in this order: the guide as boxes of their own, first slanted the wrong way (it pushed her away from the door); a wedge over the boxes' square corner (Rapier's controller treats overlapping shapes apart: the corner still stopped her); a 45° turn; a retry of the move along the surface in `physics.ts` and Rapier's *normal nudge factor* (neither held; the code is as it was). Walked with the game's movement: from beside the door (0.3 m behind the recorded spot, which is inside the guide now) she slides into the doorway and up the ramp; off the ladder's top toward the door, the same. **Still stopping:** walking out of the doorway into the cockpit at 50° to 65° from straight, she stops 0.3 m in, on the turn toward the consoles. Smoke: 83 passed, the 3 known failures.
- **Update 2026-10-21 (owner: something blocks the galley's corner by the bulkhead; feet 3.16, 3.461, −16.81, facing the galley):** the guide on the galley's side stood 0.15 into that corner: **taken off** (kept on the ladder's side, where she got stuck). She now walks into the corner (to 3.16, −16.96). Facing the galley she still stops where she did: against `Box Crew Galley_col` (2026-10-14), whose face is 0.13 in front of the counter (0.08 proud of the cupboard doors, as the asset pipeline says), with her capsule (0.28) narrower than her body (0.31 to 0.35 with arms and parka): about 0.12 between her and the counter.
- **Left:** the step-ups of 6 cm in the crew quarters are her riding up the floor's curved edge against the hull's wall; nothing to get stuck on, left alone. **If the doors' automatic opening comes back** (`autoDoors`, off since 2026-10-13): the cockpit's door would stay open while she's in the cockpit, all of which is within its 1.5 m.
