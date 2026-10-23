# Plan: Basic interaction (doors, hatches, lockers, the cargo panels)

**Status:** *built*, 2026-10-09 (approved with answers the same day); owner play-test pending. What was built: [`doc/features/interaction.md`](../../features/interaction.md). In prototype 01, like the ship so far.

## Decided (owner, 2026-10-09)

1. **The side door (`Door`) is hinged at the bottom** (its origin in the file). Open, its inside has steps: **it becomes a ladder**.
2. **Upper keypad (`Plane.004`) → the ramp; lower (`Plane.006`) → the side door.**
3. **The roof hatch is in.** Two hatches: the top one (`Top Hatch`) flips open (up), the bottom one (`Top Hatch Bottom`) flips down.
4. **All doors open and close, and all start closed** (including `Galley Door.002`, and the trapdoor and galley doors modelled open in the file).
5. **Targeting and highlight:** try the recommendations (reach + screen centre; prompt + faint highlight).
6. **Ladders, if there's a quick solution** (they work in the UE prototype); otherwise next pass. **No button: walking into a ladder is enough** (owner): walking toward a ladder's foot attaches her to it; pushing toward it climbs, pushing away climbs down; at the top she steps off onto the floor above, at the bottom onto the ground; walking from the floor above toward the opening attaches her at the top; jump lets go. A closed hatch above stops her below it, and she can open it from the ladder. No climbing animation yet. Ladders: `Ladder Cargo Bay` (to the crew quarters through the trapdoor), `Ladder Crew Quarters` (to the roof through the two hatches), and the open side door.
7. **After the first look (owner, 2026-10-09):** the side door, open, works as a **ramp**, not a ladder; the cargo locker door was flipped (export bug: fixed); the trapdoor **starts open** for now (hard to aim at from below); the roof hatch: an unfolding ladder later, or nothing (they have jetpacks).

## Notes for picking things up and using them (owner, 2026-10-15)

> **Update, 2026-10-23 (owner): superseded.** No free pick-up of small objects: objects are picked up only as **curated events** (the coffee mug), added case by case; physics props (drop, throw, rigid bodies) open, kept for a future interaction ([decision log](../../decision-log.md)). The notes and the prop list below are kept as history and as a source for choosing curated objects; the conflicts in the agent note at the end of this section are resolved by it.

Not built yet; for the plan that adds them.

1. **The player will pick up small objects and look at them.** Any object where that makes sense has to be considered (collision boxes, the export, the see-through rules).
2. **We control the setting:** objects that would cause performance or other problems can be removed or replaced. Example: each chess piece interactable could be a problem; the board could be removed and replaced by something else, maybe holographic.
3. **Dropped objects could go back to where they were**, so we don't have to deal with physics.
4. **Some objects are picked up and used**, like the jetpacks.
5. **Changing clothes:** one plan is to let the player go to the closet and change their clothes.
6. **Which objects (owner, 2026-10-15):** anything obviously made to be picked up (comms, game consoles, cups, books); objects made to be used on a table (a microscope, a keyboard) are left out. For now the collision boxes cover every object, so she can't climb on tables ([collision-boxes.md](collision-boxes.md)); adjusted when this feature is designed.

> **[Agent note]** Every prop in the ship file sorted by rule 6 (2026-10-15, from `The Zamboni 1.19.blend`; 174 props, the jetpacks already taken and worn):
>
> - **Picked up (28):** `Comm`, `Comm.001`; `DS Lite`, `iPod`; `Mug.001`, `Mug.002`, `Mug.005` (in the cup holder); `Cup Ramen Closed`, `.001`, `Cup Ramen Open.001`; `Book` … `Book.009` (10, on the shelf); `Tape.001`, `.002`, `Cassete Case`, `.001` (cassettes, as books); `Coffee Can.001` … `.003`; `Camping Light` (a lantern, on the pallet).
> - **Left out (used on a table, fixed or part of something):** the keyboards (`.001` … `.003`), `Microscope` (+ `Slide`, `.001`), `Centrifuge` (+ `Cylinder.004`), `Osciloscope` (+ `Cube.010`), `Kaypro` (+ `TRS-80.025`), `TRS-80`, `TRS-80.001`, `Braun KF20`, `Grinder` + `Grinder Holder`, `Cup Holder`, the fridge grates, `Seat.003`, `.006`, `Dials.007`, `Lockers.001`, `Gojira poster`, `Hand` (the printer's), `Text.001`, `Plane.003`, `.005` (cockpit labels), `Boombox.001` (a device, used in place).
> - **Can't classify (the owner's call):** the laptops (`Laptop.002` + its lid `Laptop.001`: portable, but used on a table); the power cells (8: carried to swap?); crates and chests (8: cargo); the fire extinguishers (4); clothes: `Parka.001` … `.003`, `Boot`, `.001` (the closet, note 5); `Pillow`, `.002`; the pots (2); the galley's jars and containers (5); the engineering cabinets' contents (8 jars, 10 containers, 8 racks); the test tubes (13, in racks and the centrifuge) and `Test Tube Rack`; the chess board and its 32 pieces (note 2); `Polaroid` (on a locker door).
>
> **Owner, 2026-10-15:** the list is good for now. **Later** (for the interaction plan, flagged as the costly parts): (1) changing clothes means exporting her outfits and swapping them on the character (`export:player`, her materials); (2) each pickable object has to stay an object of its own in the export (a draw call and a see-through entry each: 28 now, about 100 more with the chess pieces, test tubes and cabinet contents; shared meshes help); (3) objects in or on other things (the mug in the cup holder, the test tubes in the centrifuge and racks, the Polaroid on a swinging locker door) need attaching; (4) back in place on drop vs *throw* in the scope (conflict above). **Getting into a seat will be a button interaction** (so the seats' collision boxes and the cockpit dashboard's convex hull don't stand in the way).

> **[Agent note]** Conflicts with the docs, flagged for the owner, not resolved: (a) [`scope.md`](../../architecture/scope.md) lists *Pick up small objects (carry, drop, throw)* as core, and [`architecture/README.md`](../../architecture/README.md) plans *Physics objects* as Rapier rigid bodies; note 3 (back to their place, no physics) would drop *throw* and the rigid bodies. (b) The pillar "everything interactable" ([`overview.md`](../../overview.md)) and note 2 (removing objects that cost too much) pull in different directions; the owner decides case by case. Also for the export: small props are merged per room today ([asset pipeline](../../architecture/asset-pipeline.md)), so a pickable one has to stay an object of its own (as the jetpacks do, with `interact`).

## Goal

A first interaction, like the UE prototype's: **point at an object and press a button** to use it (owner, 2026-10-09). **E** on the keyboard, **Circle** on a PS4 controller (B on Xbox; standard-mapping button 1).

**Targets (owner, 2026-10-09):**

| What | Object in `The Zamboni 1.18.blend` | Does |
|---|---|---|
| Every door in the ship **except the bulkhead ones** (`Door Cockpit`, `Door Cockpit 2`, `Door Engineering`, `Door Engineering 2` stay as they are) | `Door` (the small side door in the cargo hold) | Opens / closes |
| Two control panels next to the small door in the cargo hold | `Plane.004` (upper keypad) and `Plane.006` (lower keypad), beside `Door` | One opens/closes the **cargo ramp** (`Door Cargo`), the other the **small door** |
| The trapdoor to the crew quarters | `Hatch.002` | Opens or closes **completely** on one press |
| Fridge doors | `Galley Door.001`, `Galley Door` (the two compartments with `Fridge Grate`s behind them) | Open / close |
| Locker doors | `Locker Door` (cargo bay), `Locker Door.001` and `Locker Door.003` (crew quarters) | Open / close |

> **[Agent note]** `Galley Door.002`, the third door under the galley counter, has no fridge grate behind it (a cupboard). Proposed: interactable too (it's a door). See open questions.

**Out:** picking things up, the boombox and other devices, Dr. Green's head turning toward interesting objects ([architecture note](../../architecture/README.md)), sounds, the bulkhead doors, the design-system prompt (a plain text prompt for now), ladders and climbing.

## What the UE prototype does

Read from the `.uasset` files' names (the graphs themselves aren't extracted): `BP_Door` implements `BPI_Interact`; it keeps `isOpen`, `openAngle`, `closedAngle` and runs a **timeline on the door's yaw** (`SetRelativeRotation`) toward the target angle; variants for fridge, galley, hatch, internal and lockers. `BP_Lever_Panel` moves a part with a timeline when used. So: **each press toggles open/closed, animated by rotation around a hinge.** Same here.

## Constraints from the docs (conflicts flagged)

- **Conflict: prototype 01's plan lists interaction as *out*** ("each of those gets its own prototype", [`01-walk.md`](../prototypes/01-walk.md)). The see-through hull and the ship's contents were built into prototype 01 anyway, with the owner's approval. **Proposed: build this in prototype 01 too** (it needs the ship, the character and the camera that are already there), and note it in the prototype's plan.
- **Art drives behaviour through names and custom properties** ([`architecture/README.md`](../../architecture/README.md), naming contract in [`asset-pipeline.md`](../../architecture/asset-pipeline.md)): `interact: <verb>`, `device: <type>`. The file's doors aren't named `door_*` as the contract proposes; as with the see-through tags, **the export script sets the tags from a list** until they're set in Blender. One new property for the panels: `controls: "<object name>"` (added to the contract).
- **Compression moves node origins**: each moving part's hinge travels as a custom property, as the ramp's does (renamed `hinge` while building: three r186's GLTFLoader consumes a `pivot` extra on nodes with children) ([checklist](../../architecture/asset-pipeline.md#before-the-next-export)).
- **Gamepad first; prompts follow the last device used** ([`design/README.md`](../../design/README.md), [`architecture/README.md`](../../architecture/README.md)): the prompt shows ◯ or E depending on the last input. `Input.lastDevice` already tracks it.
- **Input is action-based** (`input.ts`): a new *interact* action, not raw keys in game code.

## The work

1. **Export** (`export-ship.py`), re-run together with the texture fix of 2026-10-09:
   - Every target above becomes a **moving part**: its own object, left out of the static collider, with its hinge point (the object's origin: in the file, each target's origin sits on its hinge edge) and a `door` property: hinge axis (in the object's own axes) and the open angle.
   - The two keypads are kept as **separate objects** (today they're merged into `Props Cargo Bay`), tagged `interact: "use"`, `device: "panel"`, `controls: "Door Cargo"` / `"Door"`.
   - Every target is tagged `interact: "open"` or `"use"`.
2. **Doors** (`doors.ts`, new): for each object tagged with `door`, a hinge at its hinge point (the ramp's `hingeAt`), a state (open/closed) and an amount eased over ~0.6 s (smoothstep, like the ramp). The **starting state is what the file shows** (the trapdoor, `Galley Door.001` and `Galley Door.002` are modelled open). The ramp keeps its own code (ground contact, walkway) and is driven by its panel; the *Cargo ramp open* checkbox stays in sync.
3. **Collision:** the side door, the trapdoor and the locker doors get a **convex collider that follows them** (`addMovingConvex`, as the ramp). The fridge doors are small and low: no collider. A door doesn't open if it would swing into her (a check against her capsule before starting; otherwise it would push her through the wall); it just doesn't move.
4. **See-through and shadows:** moving doors refresh their raycast data while they move (as the ramp does) and are left out of the merged shadow caster (they cast their own shadow).
5. **Targeting** (`interaction.ts`, new), see option 1: candidates are the interactable objects within **reach** of her (≈ 1 m from her chest to the object's nearest point; tunable); the one closest to the **centre of the screen** wins. No crosshair.
6. **Prompt:** a small label at the bottom centre, *◯ Open* / *E Open* (*Close* when open, *Use* for the panels), only while something is targeted. The target gets a faint highlight (option 2).
7. **Input:** an `interact` action on E and gamepad button 1, latched like jump; it also resumes from pause like any button, without triggering.
8. **Tuning panel:** an *Interaction* folder: reach, highlight on/off, door speed.

## Options

**1. How "pointing" works in third person.** The UE prototype was first-person with a crosshair; here the camera is behind her.

| Option | How | For | Against |
|---|---|---|---|
| **A. Reach + screen centre** *(recommended)* | Objects within her reach; the one nearest the screen centre wins | Aiming is the camera (it's "pointing"); forgiving; no crosshair on screen; works the same on gamepad and mouse | With two doors side by side (the lockers), the camera picks; usually what the player means |
| B. Crosshair ray | A ray from the camera through a centre dot; must hit the object, and the hit must be within reach | Exactly the UE behaviour | Hard with a gamepad at third-person distance on small targets (the keypads are ~0.2 m); a dot on screen all the time |
| C. Her facing only | The nearest object in front of her | No aiming at all | You can't pick between close neighbours (the two keypads) without walking around |

**2. Showing what's targeted.**

| Option | Cost |
|---|---|
| **Prompt + faint highlight** (emissive lift on the target's materials) *(recommended)* | Small: the see-through materials are already per object; one uniform |
| Prompt only | Nothing; but with the two keypads 0.2 m apart it's unclear which one is targeted |
| Outline | A post-process pass: more cost, and it fights the see-through cut |

## Done when

- **Agent:** `npm run check` and `npm run build` pass; in the browser (screenshots + console): every target shows the prompt when aimed at from within reach and not otherwise; each opens and closes; the keypads move the ramp and the side door; she can walk out through the open side door and can't through the closed one; the closed trapdoor can be walked over; no console errors. Report what wasn't checked (gamepad: no controller in the test browser).
- **Owner:** play-tests with the PS4 controller.

## Open questions

1. **How does the side door (`Door`) open?** Its origin is at its **bottom edge**, like the ramp's, so I'd guess it **drops outward** like an airstair. Or is it hinged on the side, or does it slide?
2. **Which keypad does what?** Proposed: the **upper one (`Plane.004`) the ramp**, the lower one (`Plane.006`) the side door.
3. **The roof hatch (`Top Hatch` + `Top Hatch Bottom`)**: it's a door too, but it's in the upper deck's ceiling, about 2.6 m above the floor, out of her reach, and there's no climbing yet. Leave it out for now?
4. **Galley:** interact with the cupboard door (`Galley Door.002`) too? And should the doors **start as in the file** (trapdoor and two galley doors open) or all closed?
5. **Option 1 (targeting) and option 2 (highlight):** OK with the recommendations?

## After

- `doc/features/interaction.md` (new): what was built.
- Naming contract ([`asset-pipeline.md`](../../architecture/asset-pipeline.md)): `door`, `controls`, the moving parts.
- `app/prototypes/01-walk/README.md`: controls table (interact), the new objects.
- Prototype 01's plan: interaction is now in it.
- This plan's status, and the index in [`../README.md`](../README.md).
