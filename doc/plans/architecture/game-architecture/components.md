# Plan: The ship's things as components (game architecture)

**Status:** *draft, saved for later* (owner, 2026-10-20: "let's save these plans"; no action). Raised by the owner on 2026-10-19 after a day of export breaks: "this is a question of architecture instead of process or data". Part of the [game architecture plan](README.md). May supersede pass A of [`../../features/robust-exports.md`](../../features/robust-exports.md).

## Goal

**Every element of the ship (and later of the landing sites) is a component-based object with its own properties and default states, defined in the game.** The mesh and the animation data are only one part of it. A door's closed pose, its axis, its sounds, its prompt and its starting state come from its definition, never from how the Blender file happens to be posed, hidden or organised when it's exported.

## The owner's words (2026-10-19)

> My thought is that this type of problem would not occur if each object in the ship was treated as a component with default states for its props. [...] I feel like we need to build an OOP model of the ship with its elements as components with props and states, where the mesh and animation data are just a part of it.

## Where we start from (prototype 01, 2026-10-20)

- **One module per feature** (`src/`, about 30 files: movement, doors, ladder, boombox, rack, sound, camera, see-through, lights, crew), each a class or functions with an `update()`. **`main.ts` builds and wires everything** and runs one frame loop that calls them in a fixed order ([`CODE-MAP.md`](../../../../app/prototypes/01-walk/CODE-MAP.md)).
- **The Blender file is the world.** The game keeps three.js's scene graph from the glTF; at load each feature walks it and finds its objects by tag (`interact`, `doorAxis`, `device`…) or by name (`Ladder Cargo Bay`, `Boombox.001`). Behaviour lives in the features: `doors.ts` makes a `Door` of every tagged door and takes its pose in the file as "closed".
- **Patterns in use:** the Game Loop with a fixed 60 Hz step and interpolated rendering; the Update Method; `main.ts` as composition root, dependencies passed as small functions; one shared interface close to a component (`Interactable`: `verb`, `act`, `available`); data-driven parts (`cues.json`, the file's tags, the export lists); a global `settings` object; polling instead of events (sounds start on a state change seen between frames); composition over inheritance.
- **The gap:** in effect the scene graph is the entity list, the tags are the data and the features are systems over them (an informal Entity–Component), but **nothing defines what a kind of thing is**. So every default comes from the file's current state.

## Patterns that cover it

- **Entity–Component** (Unity's GameObjects, Unreal's Actors): a thing is an entity made of components (mesh, hinge or slide, state, interactable, collider, sound).
- **Prototype / archetypes / prefabs:** a kind is defined once with its defaults; each instance overrides a few. Looking Glass's Dark Engine (*Thief*, *System Shock 2*), the immersive-sim lineage, was built on archetypes with properties.
- **Type Object:** kinds as data. **State:** each component owns its states and transitions.
- Reference: Robert Nystrom, *Game Programming Patterns* (free online): Component, Prototype, Type Object, State, Game Loop, Update Method.

## Fit with the scope ([`architecture/scope.md`](../../../architecture/scope.md))

- **Good fit.** Using devices and picking up most small objects are *Core* (the immersive-sim pillar); the scanner adds a *Scannable* component; checkpoint saves reset doors and props on reload, which is "the definition's defaults"; it answers the asset pipeline's open question (placement in Blender, behaviour in data); kinds repeat (about 17 doors, lockers, hatches, many pickables, repeated landing sites).

| Pattern | Fit | At this game's size |
|---|---|---|
| Components on plain objects | good | a few hundred entities at most: plain TypeScript classes, no framework |
| Prototype / archetypes | good | about 10–15 kinds (door, sliding door, hatch, locker, keypad, ladder, rack, pickable, scannable, seat, screen…) |
| Type Object | partly | kinds in typed TypeScript in the repo, checked by the compiler; no data editor |
| State | good, small | closed / open / moving / locked, in the component |
| **Full ECS** | **out of scope** | for thousands of entities and tight performance: complexity with no gain here |

**Recommendation:** plain component objects, archetypes with defaults in TypeScript, a state per component; Blender stays the tool for meshes, animation and placement; no ECS, no editor.

## Constraints and conflicts

- **Conflict:** the decision log's *The ship's reference file* (2026-10-12) puts behaviour in tags on the file's objects. With components the file carries only each object's **kind and id**; behaviour moves to the game's definitions. A decision-log entry when this is approved.
- **Story state stays in Ink** (the single source of truth, [`architecture/README.md`](../../../architecture/README.md)): a door locked until a story beat reads Ink, not a second copy in a component.
- **Draw calls** (60 fps on the PC, 30 on the MacBook, [`performance.md`](performance.md)): small props are merged per room today; pickables must be objects of their own. The plan for pickables has to weigh the cost.
- **Gamepad first**, as everywhere.

## The work (to plan when it's taken up)

1. The component list for the ship's interactables today (doors, sliding doors, hatches, lockers, keypads and panels, lever, window, ladder, rack, boombox), with each one's properties and defaults.
2. The definitions format (TypeScript), and how an instance is matched to its object in the file (kind + id).
3. Recording each instance's rest pose once (from the last good export) as part of its definition.
4. Moving today's tags and name lookups over, one kind at a time, with the probe and the smoke script showing no change in the game.
5. When: in prototype 01 now, or straight into the game's own architecture instead of retrofitting.

## Open questions for the owner

1. In prototype 01, or only in the game proper?
2. Which kinds first (doors and hatches, the source of the breaks, or all of today's)?
3. Does pass B of the robust-exports plan (a baseline with `--accept`, a check after every export) still come first, on its own?

## After

`architecture/README.md` (the code outline, levels and placement), the asset pipeline's naming contract, the decision log, `features/interaction.md`, the code map.
