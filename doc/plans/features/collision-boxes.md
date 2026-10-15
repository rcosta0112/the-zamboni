# Plan: Collision boxes for medium and small objects (item 42)

**Status:** *draft*, 2026-10-15, for review. The box list was looked at by the owner the same day ("ok for the most part; follow your suggestions"), then changed for the picking-up notes (below).

## Goal

Medium and small objects stop colliding one by one with their detailed shapes: furniture gets a simple box, several things standing together share one (owner's example: the jetpack rack and the fire extinguisher under it in one box). She stops catching on details, and the collider gets lighter.

**Out:** picking things up itself (its own plan later); the crew quarters (already boxed, 2026-10-14); the hull, floors, landing gear, turbines, the contraption and the main dashboard (big, or convex hulls already); the doors (their own colliders); the cargo ladder (the climbing code measures it).

## Constraints from the docs

- **Boxes are `*_col` objects in `Game Collision`**, tagged `reach: "through"` where she should reach past them, and then **convex** ([asset pipeline](../../architecture/asset-pipeline.md), naming contract). `collider: "none"` takes a part out of the collider.
- **Picking things up is coming** (owner, 2026-10-15; notes in [`interaction-doors.md`](interaction-doors.md#notes-for-picking-things-up-and-using-them-owner-2026-10-15)): small objects picked up and looked at, maybe put back in place on drop (no physics), some used (the jetpacks), clothes changed at the closet.
- **The ship file:** changes by a record script, like [`add-collision-boxes.py`](../../../app/tools/add-collision-boxes.py); saving the owner's `.blend` is allowed but flagged first, with a copy next to it. Export with `npm run export:ship`, after reading *Before the next export*.

## How picking things up changes the boxes

1. **A box covers the furniture, not what stands on it.** A box up to the top of the microscope would leave an invisible block where the microscope stood once it's taken. So the benches' boxes stop at the bench top (z 1.16); what's on them is left out.
2. **Pickable objects resting on furniture need no collider at all.** She can't walk onto a bench or a console, and if dropped objects go back to their place, nothing ever falls on the floor. Their convex hulls come out of the collider (`collider: "none"`).
3. **Every box over things she can take or use reaches through** (the rack, cabinets, consoles, lockers), so aiming isn't blocked.
4. **The closet:** the crew quarters' lockers already have a reach-through box (`Box Crew Lockers_col`) in front of their bodies; their doors keep their own colliders. Nothing to change for changing clothes.
5. **The chess board:** the table's box already covers it and reaches through; replacing the board (e.g. a hologram) changes nothing here.
6. **Jetpacks** are objects of their own already (`interact`), not in the collider; the rack's box covers the rack.
7. **The export:** a pickable small prop must stay an object of its own (today small props are merged per room). Not part of this plan, but the list of pickable objects (open question 1) decides it.

## The boxes (Blender units; from the floor unless noted)

Floors: z 0.83 (cargo hold, engineering), 2.33 (upper deck). Game size = ×1.486.

| Box | Covers | x | y | z | Reach | Takes out of the collider |
|---|---|---|---|---|---|---|
| Box Jetpack Rack_col | both racks, extinguisher, 2 clamps | −1.47..−1.23 | 0.89..1.38 | 0.83..1.67 | through | racks, clamps (mesh), extinguisher (hull) |
| Box Cargo Locker_col | the locker's body (door: own collider) | 0.31..0.75 | −0.15..0.09 | 0.83..2.22 | through | `Locker` |
| Box Head_col | the head (*if solid: open question 2*) | 0.71..1.56 | −0.20..0.58 | 0.83..2.23 | – | `Head` |
| Box Bench Left_col | bench and what's under it | −1.38..−0.77 | −1.76..−0.36 | 0.83..1.16 | through | bench (mesh); crate, oscilloscope, 5 power cells, centrifuge, microscope, keyboard, cube (hulls) |
| Box Bench Right_col | bench and the power supplies under it | 0.77..1.38 | −1.76..−0.36 | 0.83..1.16 | through | bench, power supplies, stand (mesh); Kaypro, 2 TRS-80s, comm, power cell (hulls) |
| Box 3D Printer_col | the printer | 0.84..1.37 | −2.30..−1.68 | 0.83..1.71 | through | `3d Printer` (hull) |
| Box Cabinet_col, Box Cabinet.001_col | one each, on the bulkhead | 0.51..1.03 / −1.05..−0.53 | −0.44..−0.28 | 1.43..1.91 | through | the cabinets (mesh) |
| Box Extinguisher Engineering_col | extinguisher + clamp | −0.68..−0.54 | −0.40..−0.28 | 0.83..1.37 | through | both |
| Box Monitor Arm_col | the arm (*open question 3*) | −1.51..−1.10 | −2.08..−1.08 | 1.63..2.22 | – | `Monitor Arm.031` |
| Box Pilot Seat Right_col | seat + its part | 0.25..0.76 | −2.76..−1.96 | 2.33..3.22 | – | `Seat`, `Seat.003` |
| Box Pilot Seat Left_col | seat, back, its part | −0.76..−0.25 | −2.76..−1.95 | 2.33..3.22 | – | `Seat.001`, `Back seat.001`, `Seat.006` |
| Box Rear Seat Left_col | seat + back | −1.19..−0.76 | −1.20..−0.41 | 2.33..3.27 | – | `Seat.002`, `Back seat` |
| Box Rear Seat Right_col | seat + back | 0.78..1.22 | −1.20..−0.41 | 2.33..3.27 | – | `Seat.004`, `Back seat.002` |
| Box Right Monitors_col | the two monitors (on the console) | 0.59..1.41 | −1.43..−1.21 | 2.83..3.31 | through | `Monitor.003`, `.004`; keyboards (hulls) |
| Box Left Monitor_col | the monitor | −1.32..−0.57 | −1.52..−0.95 | 2.68..3.05 | through | `Monitor.001` |
| Box Extinguisher Cockpit_col | extinguisher + clamp | −1.08..−0.61 | −0.52..−0.39 | 2.33..2.77 | through | both |

**Out of the collider, no box** (`collider: "none"`): what stands inside the crew quarters' boxes (galley things, parkas, pillows, the table's and the shelf's things, the boombox, the shelf's extinguisher and its two clamps) and the sled's load (inside `Box Sledge_col` and `Box Chests_col`); flat or flush things (door panels, ceiling lights, the poster, `Lockers.001`, `Dials.007`). About 13,000 detailed triangles and 50 convex hulls leave the collider.

**The camera** uses the crew quarters' boxes from the file (`Box Crew Galley_col`, `Box Crew Lockers_col`, `Box Crew Table_col`) instead of the two it builds at load, and the couch, table and sitting-area walls by shape are dropped (inside `Box Crew Table_col`). Coarser: the camera then stays out of the whole couch corner, up to 3.68.

## The work

1. A record script, `app/tools/add-collision-boxes-2.py`, like the first: makes the boxes in `Game Collision` (tagged as above) and sets `collider: "none"` on what they replace; reports "0 changes" when run again; `--save` writes a copy of the file first. **Flag before saving** (the file may be open).
2. Export (`npm run export:ship`); check the summary's last line (collision pieces 10 → 27, collider triangles down).
3. The camera reads the crew quarters' boxes from the collider file.
4. Check: a probe walks her into each box from the aisle and reaches for what's behind the reach-through ones; screenshots with the colliders shown; the full smoke once at the end.

## Done when

- **Agent:** every box stops her where its furniture is and nowhere else; the jetpacks, cabinets and lockers can still be reached; the collider's triangle count has fallen; `npm run check`, `build`, `smoke` pass.
- **Owner:** walks around the cargo hold, engineering and the cockpit with the gamepad.

## Open questions

1. **Which objects will be pickable?** Candidates: mugs, keyboards, laptops, comms, power cells, the microscope, centrifuge and oscilloscope, extinguishers, the boombox, parkas, pillows, crates, the chess pieces (or a replacement). This plan treats all of them as "no collider, on furniture".
2. **The head:** a solid block, or a room she can step into?
3. **The monitor arm** (z 1.63..2.22, about 1.2 m above the floor in the game): high enough to need no collision at all?
4. **The camera and the couch corner:** OK for it to stay out of the whole corner (the file's box), or keep the couch and table by shape?

## After

- [Asset pipeline](../../architecture/asset-pipeline.md): the boxes, the agent note at the top.
- `doc/steps/current.md`, the backlog (item 42), this plan's status and the index in [`../README.md`](../README.md).
