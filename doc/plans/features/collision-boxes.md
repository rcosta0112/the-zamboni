# Plan: Collision boxes for medium and small objects (item 42)

**Status:** *built*, 2026-10-16 (approved with answers 2026-10-15: owner, the list "ok for the most part", follow the agent's suggestions; the boxes cover everything for now; bevels where they keep corridors clear; answers below). Owner play-test pending. See *As built* at the end.

## Goal

Medium and small objects stop colliding one by one with their detailed shapes: furniture gets a simple box, several things standing together share one (owner's example: the jetpack rack and the fire extinguisher under it in one box). She stops catching on details, **can't climb onto tables, benches or consoles**, and the collider gets lighter.

**Out:** picking things up (its own plan later; which objects, below); the crew quarters (already boxed, 2026-10-14); the hull, floors, landing gear, turbines, the contraption and the main dashboard (big, or convex hulls already); the doors (their own colliders); the cargo ladder (the climbing code measures it); **the camera** (owner: fine as it is in the crew quarters; it doesn't use these boxes).

## Constraints from the docs

- **Boxes are `*_col` objects in `Game Collision`**, tagged `reach: "through"` where she should reach past them, and then **convex** ([asset pipeline](../../architecture/asset-pipeline.md), naming contract). `collider: "none"` takes a part out of the collider.
- **The ship file:** changes by a record script, like [`add-collision-boxes.py`](../../../app/tools/add-collision-boxes.py); saving the owner's `.blend` is allowed but flagged first, with a copy next to it. Export with `npm run export:ship`, after reading *Before the next export*.

## Decided (owner, 2026-10-15)

1. **For now the boxes cover all the objects** on the furniture, so she can't climb on tables; they get adjusted when the object interaction is designed. So a box over a bench or a console goes **up to the ceiling**, like the sledge's and the crew quarters' boxes, and everything on it is inside (jumping or flying, she can't get on top).
2. **Every box over things she can take or use reaches through** (the rack, benches, cabinets, consoles, the head's door).
3. **The head is always solid.** Its interior will be modelled so its door opens, but she can't go in.
4. **The monitor arm** may need a box later; for now it's inside the left bench's box.
5. **The camera** stays as it is (its own boxes and shapes in the crew quarters; over the couch and table it doesn't clip Dr. Kaufman).
6. The closet, the chess table and the jetpack rack need nothing more for picking things up or changing clothes; a pickable small prop will have to stay an object of its own in the export (that's for the interaction plan).

## The boxes (Blender units)

Floors and ceilings: lower deck z 0.82..2.22, upper deck 2.33..3.68 (as the existing boxes). Game size = ×1.486. All reach through except the seats.

| Box | Covers | x | y | z | Takes out of the collider |
|---|---|---|---|---|---|
| Box Jetpack Rack_col | both racks, extinguisher, 2 clamps | −1.47..−1.23 | 0.89..1.38 | 0.82..1.67 | racks, clamps (mesh), extinguisher (hull) |
| Box Cargo Locker_col | the locker's body (door: own collider) | 0.31..0.75 | −0.15..0.09 | 0.82..2.22 | `Locker` |
| Box Head_col | the head (solid) | 0.71..1.56 | −0.20..0.58 | 0.82..2.22 | `Head` |
| Box Bench Left_col | bench, everything on and under it, the monitor arm | −1.51..−0.77 | −2.08..−0.36 | 0.82..2.22 | bench, monitor arm (mesh); 13 props (hulls) |
| Box Bench Right_col | bench, 3D printer, everything on and under it | 0.77..1.41 | −2.30..−0.36 | 0.82..2.22 | bench, printer, power supplies, stand; 6 props (hulls) |
| Box Cabinet_col, Box Cabinet.001_col | one each, on the bulkhead, above the aisle | 0.51..1.03 / −1.05..−0.53 | −0.44..−0.28 | 1.43..1.91 | the cabinets (mesh) |
| Box Extinguisher Engineering_col | extinguisher + clamp | −0.68..−0.54 | −0.40..−0.28 | 0.82..1.37 | both |
| Box Console Left_col | the left console, its monitor, the rear seat and its back, the extinguisher and its clamp | −1.53..−0.57* | −1.58..−0.39 | 2.33..3.68 | `Monitor.001`, `Seat.002`, `Back seat`, `Fire Extinguisher.002`, `Fire Extinguisher Clamp.002` |
| Box Console Right_col | the right console, monitors, keyboards, the rear seat and its back | 0.57*..1.54 | −1.58..−0.39 | 2.33..3.68 | `Monitor.003`, `.004`, `Seat.004`, `Back seat.002`, `Dashboard Body.001`; keyboards (hulls) |
| Box Pilot Seat Right_col | seat + its part (no reach; getting in the seat will be a button: owner) | 0.25..0.76 | −2.76..−1.96 | 2.33..3.22 | `Seat`, `Seat.003` |
| Box Pilot Seat Left_col | seat, back, its part (no reach) | −0.76..−0.25 | −2.76..−1.95 | 2.33..3.22 | `Seat.001`, `Back seat.001`, `Seat.006` |

\* The consoles' inner edges are the monitors'; checked against the console's mesh (part of `Dashboard Body.002`) when the script is written, so the aisle stays as wide as it is.

**Bevels (owner, 2026-10-15: "check where a bevel or two could help keeping corridors clear").** A bevel cuts one vertical corner at 45°, 0.15 along each side (about 0.22 m in the game), as `Box Crew Table_col`'s cut corner; the box stays convex. Found from the boxes' coordinates (to check with a top-down shot of the colliders before saving):

| Box | Corner (x, y) | Why |
|---|---|---|
| Box Jetpack Rack_col | (−1.23, 0.89) | coming in from the side door (its edge at y 0.68), she turns along the rack |
| Box Cargo Locker_col | (0.31, 0.09) | 0.08 from the engineering doorway's edge (x 0.23) |
| Box Head_col | (0.71, 0.58) | sticks out into the hold beside the locker, on the way to the doorway |
| Box Bench Left_col, Box Bench Right_col | (−0.77, −0.36), (0.77, −0.36) | turning from the engineering doorway into the aisle |
| Box Bench Left_col, Box Bench Right_col | (−0.77, −2.08), (0.77, −2.30) | the aisle beside the contraption is 0.49 wide each side, toward the window |
| Box Console Left_col, Box Console Right_col | (±0.57, −0.39), (±0.57, −1.58) | the cockpit aisle is 1.14 wide: in from the bulkhead door, and on to the pilot seats |

The cockpit's extinguisher box is dropped: it stood almost entirely inside the left console's; that box now reaches y −0.39 and holds it.

**Out of the collider, no box** (`collider: "none"`): what stands inside the crew quarters' boxes (galley things, parkas, pillows, the table's and the shelf's things, the boombox, the shelf's extinguisher and clamps) and the sled's load (inside `Box Sledge_col` and `Box Chests_col`); flat or flush things (door panels, ceiling lights, the poster, `Lockers.001`, `Dials.007`). About 13,000 detailed triangles and 50 convex hulls leave the collider.

## The work

1. A record script, `app/tools/add-collision-boxes-2.py`, like the first: makes the boxes in `Game Collision` (tagged as above) and sets `collider: "none"` on what they replace; reports "0 changes" when run again; `--save` writes a copy of the file first. **Flag before saving** (the file may be open).
2. Export (`npm run export:ship`); check the summary's last line (collision pieces 19 → 31, collider triangles down).
3. Check: a probe walks her into each box from the aisle, tries to jump and fly onto the benches and consoles, and reaches for what's behind the reach-through boxes (the jetpacks, the cargo locker's door, the panels); screenshots with the colliders shown; the full smoke once at the end.

## Done when

- **Agent:** every box stops her where its furniture is and nowhere else; she can't get onto a bench or a console; the jetpacks and the doors behind the boxes can still be used; the collider's triangle count has fallen; `npm run check`, `build`, `smoke` pass.
- **Owner:** walks around the cargo hold, engineering and the cockpit with the gamepad.

## Open questions

None left for the boxes. The pickable objects are listed in [`interaction-doors.md`](interaction-doors.md#notes-for-picking-things-up-and-using-them-owner-2026-10-15) for the interaction plan.

## After

- [Asset pipeline](../../architecture/asset-pipeline.md): the boxes, the agent note at the top.
- `doc/steps/current.md`, the backlog (item 42), this plan's status and the index in [`../README.md`](../README.md).

## As built (2026-10-16)

> **[Agent note]**

- **Checked before saving:** a read-only Blender listing of what collides inside each box, and a top-down shot of each deck with the boxes drawn over the collider (a probe, not kept). The bevels sit where the table above says.
- **The cockpit consoles' inner edges are the console mesh's**, `Dashboard Body.002` (one mesh, both consoles, nothing in the aisle): x −0.549 and 0.560, not the monitors' ±0.57. The aisle stays as wide as it was (1.11). `Dashboard Body.002` leaves the collider with the rest.
- **The cargo locker's box comes 0.08 in front of its door** (y to 0.20, the door's front at 0.12; bevel at (0.31, 0.20)). With the box flush with the locker (0.09), flying into the door's edge she hung in the air: the door has its own moving collider, and touching one her controller hardly moves her (the rule in the [asset pipeline](../../architecture/asset-pipeline.md)'s note on the boxes). The script rebuilds a box whose shape it changes; the file was saved twice (owner's go-ahead both times), and the copy next to it is the file from before the first save: `The Zamboni 1.19 (before collision boxes 2, 2026-10-15).blend`.
- **Out of the collider:** 96 objects (`collider: "none"`): what the twelve boxes replace, what stands inside the crew quarters' and the sled's boxes, and the flat things (the six door panels, the ceiling lights, the poster, `Lockers.001`, `Dials.007`). The door panels are still found by the reach test, which measures to their own bounds.
- **Export:** collision pieces 19 → 31 (20 reach through); collider triangles 49,842 → 19,862; the ship's own file unchanged.
- **Checked** (probe): walking into each box from the aisle stops her 0.02–0.06 from its face (the consoles 0.06: the main dashboard's base along them stops her first, as before); jumping and flying at the rack, the locker, the head, the benches, the engineering extinguisher, the consoles and the pilot seats, she ends on the floor (in front of the pilot seats that's the raised step, z 2.49, where she walks too). The locker door and the rack's jetpacks are still offered. `npm run smoke`: all 90 checks pass.
- **The smoke check of the ramp keypad** stood her 0.55 from it *along the wall*, toward the bulkhead: beside the rack, where the jetpacks (no longer hidden by the rack's bars) are nearer, so it targeted `Jetpack004`. It now stands her in front of the keypad, out from the wall (`aimAt(rampPad, 'x')`); from there the keypad is the target at every pitch.
- **Left as it was:** the jetpack rack's box stops at z 1.67 (0.85 above the floor), as planned; she might fly onto it (the racks' own shapes allowed that too). The sledge and the pallet keep their own colliders.
