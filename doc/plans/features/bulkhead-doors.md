# Plan: bulkhead doors and the engineering window (backlog pass 4)

**Status:** *built* 2026-10-13, owner play-test pending. Approved by the owner the same day, with the answers below. Pass 4 of [`../backlog-passes.md`](../backlog-passes.md): backlog items 6, 7 and 8. All of it in prototype 01.

## Decided (owner, 2026-10-13)

1. **The panel: A1.** It shuts the door and keeps it shut; used again, the door is automatic again.
2. **Tags: a script the owner runs** ("write a python script and I'll run it"): [`app/tools/tag-ship-pass4.py`](../../../app/tools/tag-ship-pass4.py). It sets every tag and moves the four leaves closed; it saves nothing. Until the file is saved with it, the export runs it in memory. (This replaces B1's `ship-pending.py`.)
3. **The lower doorway is off-centre on purpose** (moved to make space for the locker). Each pair closes at the middle of its own doorway.
4. **Distances don't matter**, as long as doors and window open completely and close at the centre. **There is glass behind the window's halves.**
5. **The lever slides**, as in UE: 0.06 along its own Y axis, toward the window. (This replaces "it turns", 2026-10-12.)
6. **Near: a distance (C1)**, with a slider in the tuning panel.

The sections below are the plan as reviewed; where an answer above differs, the answer holds.

## As built (2026-10-13)

- **Stages 1 to 5 and 7** as planned. `npm run check`, `build` and `smoke` pass (the new checks: both doors walked through, each of the four panels, the lever and the window; four runs in a row). Screenshots looked at: both doors open, closed and shut from a panel; the window closed and open from inside and outside (glass behind it, the halves stay inside the hull); no console errors. Gamepad not tested.
- **Values changed from the plan:** the doors slide in **0.3 s**, not 0.6: at a run (3.5 m/s indoors) she reached the leaves before they were open. A longer distance wasn't the fix (at 2 m the cockpit's door stays open for most of the cockpit), so "near" stays 1.5 m.
- **Added:** an opening leaf doesn't push her (it did, sideways into the edge of the doorway).
- **Stage 6 (see-through): looked at, nothing changed.** A closed door hides her from a camera in the next room, as its bulkhead does; she shows through the leaf's glass strip. What that means in play (the door closes between her and the camera) is an open question in [`features/interaction.md`](../../features/interaction.md#open-questions), for the owner and for pass 5.
- **The tags are saved in 1.19** (by the agent, 2026-10-13, with the owner's go-ahead; a copy of the file as it was is next to it). The export from the saved file is the same as the one in the game.
- **After the owner's first look (2026-10-13):** the doors weren't completely closed (the leaves' S-shaped edges fit into each other: 0.11 was left between them) and light showed between door and frame. Fixed by [`app/tools/fit-bulkhead-doors.py`](../../../app/tools/fit-bulkhead-doors.py), saved into 1.19 the same day with the owner's go-ahead.
- **The export** was first made with the tag script run in memory. Compared with the export before: only the tagged objects differ (the leaves' place and tags; the window's tags; the panels and lever, now parts).

## Goal and scope

The two bulkhead doors slide open when she comes near and shut when she leaves; a panel on each side of each bulkhead opens or closes its door. The engineering window opens the same way, from the lever next to it.

- **In:** sliding doors; opening on approach; the four door panels; the lever and the window; colliders for the door leaves; the tags and the export; scripted checks.
- **Out:**
  - **Lights** (owner, 2026-10-13: "ignore any of the lighting stuff for now"): the daylight in engineering from the ramp, the light for the open window, and the lighting rework of item 10. In UE the window fades a light with it: noted below for when lighting comes back.
  - Sounds (UE plays one door sound for the doors and the window).
  - Crew members opening doors: only she does (the crew don't walk yet).

## What was read

### The UE Blueprints

The `.uasset` files are binary. Names (components, variables, events, timeline tracks) can be read; **the numbers can't** (timeline lengths, distances, the trigger box's size). So the logic below is from names, and every number in this plan is a starting value in the tuning panel or a tag.

| Blueprint | What it has | So |
|---|---|---|
| `BP_Door_Internal` | Two meshes (`Door_Left`, `Door_Right`); a `Collision Box` with *begin overlap* and *end overlap* events; one timeline with tracks *Position Left* and *Position Right*, played forward and in reverse; `isOpen`; a sound | The leaves slide apart along one axis when she enters a box around the doorway, and back when she leaves it. **No interaction: the UE door has no panel.** The panels are new |
| `BP_Engineering_Window` | Two meshes (`Lab_Window_Left`, `Lab_Window_Right`); a `ToggleWindow` event; a timeline with *Position Left*, *Position Right* and *Light Intensity*; a rect light; `isOpen`; the same sound | The same two sliding halves, toggled from outside; a light fades in as it opens |
| `BP_Lever_Panel` | Two meshes (`Lever_Panel`, `Lever`); the interact interface; a timeline with *Position Y* and *Position Z*; `isOn`, `IsAnimating`; calls `ToggleWindow` | Using it moves the lever to its other position and toggles the window. Presses are ignored while it moves. In UE the lever **slides** (two position tracks); the owner's instruction is that it **turns** (2026-10-12): the plan follows the owner |

### The ship file (`The Zamboni 1.19.blend`), read on 2026-10-13

| Object | In the file | Tags today |
|---|---|---|
| `Door Cockpit`, `Door Cockpit 2` | The two leaves of the upper door, each 0.363 wide (Blender units), **slid open** into the bulkhead | `part`, `structure`, `collider: "none"` |
| `Door Engineering`, `Door Engineering 2` | The two leaves of the lower door, **slid open** | the same |
| `Door Panel - Cockpit`, `- Crew Quarters` | One on each side of the cockpit bulkhead | none (exported as props) |
| `Door Panel - Engineering`, `- Cargo Hold` | One on each side of the cargo bulkhead | none |
| `Lab Window`, `Lab Window.001` | The window's two halves, **closed** (they meet at the ship's centre line). Materials: `Darkest Teal`, `Dark Teal`, `Black`: no glass | `part`, `structure` |
| `Level Panel`, and its child `Level` | The lever's base and the lever, beside the window | none |

Three things found:

1. **The four leaves are open in the file.** The rule is "doors are closed in the file" ([`asset-pipeline.md`](../../architecture/asset-pipeline.md#before-the-next-export)): the game takes the file's pose as closed. See *Options*, B.
2. **The lower door's leaves aren't centred on their doorway.** The doorway (`Door Boolean.001`) runs from x −0.424 to 0.258, centre −0.083. The leaves sit at −0.722…−0.360 and 0.363…0.726, centred on 0.002, like the cockpit's (whose doorway is centred on 0.0). As placed, the left leaf shows 5 cm inside the doorway and the right one is 12 cm past its edge.
3. **Three panels are in a collection that isn't their room's:** `- Crew Quarters` and `- Engineering` are in `Cargo Bay`. Tagged as parts they're exported as their own objects, so it changes nothing in the game.

## Constraints from the docs (conflicts flagged)

- **Conflict: "the bulkhead doors aren't interactive"** ([`features/interaction.md`](../../features/interaction.md), owner 2026-10-09) against backlog 6 (owner, 2026-10-12). The newer instruction is followed; the decision log gets a dated *Update*.
- **Conflict: "doors are closed in the file"** against the file as it is (finding 1). Not resolved here: *Options*, B.
- **Never save the owner's `.blend`.** Every tag this pass needs is listed for the owner; until the file has them, the export applies them in memory (*Options*, B).
- **Art drives behaviour through tags** ([`architecture/README.md`](../../architecture/README.md)): no object names in the code. The naming contract already has `controls`, `opensWith`, `device: lever`.
- **A door with a panel is used from its panel only** ([`features/interaction.md`](../../features/interaction.md)): holds for the bulkhead doors and the window.
- **A moving door pushes her, or stops and waits** ([`features/interaction.md`](../../features/interaction.md)): the sliding leaves use the same code (`advance`).
- **Gamepad first:** the panels and the lever use the existing *use* button (Circle / E). No new controls.
- **Export checklist** read before the export; `compare-glb.mjs` against the last raw export after it.

## Options

### A. What a panel does to a door that also opens by itself

| Option | Behaviour | Against |
|---|---|---|
| **A1. The panel shuts the door and keeps it shut** *(recommended)* | Two states. *Automatic* (as it starts): opens when she's near, closes when she leaves. Press a panel (*Close door*): it shuts and **stays shut**, whoever is near. Press again (*Open door*): back to automatic, and since she's standing at it, it opens | No way to hold a door open |
| A2. The panel overrides both ways (the proposal in the backlog plan) | Press flips the door and holds it there: shut stays shut, open stays open, until a panel is pressed again | After the first press the door never opens by itself again; getting back to automatic needs a third state or a rule nobody can see |
| A3. The panel flips it until she walks away | Press flips the door; when she leaves its zone it's automatic again | The only thing it can do is shut a door while she stands next to it |

A1 reads as "push the button and the door opens or closes", and gives the panel a use: a shut door (later: one that blocks light, or a scene behind it).

### B. The tags, and the leaves' closed pose, while the file can't be saved by the agent

About twelve objects need tags, and the four leaves need to be closed.

| Option | How | Against |
|---|---|---|
| **B1. A "pending changes" script, applied in memory at export** *(recommended)* | A new `app/tools/ship-pending.py`, run before `export-ship.py` in the same Blender command: sets the tags and moves the leaves closed, in memory. It replaces the `--python-expr` in today's command (and takes over the side-door tag fix). Each change is one line; a line is deleted when the file has it. The owner gets the same list to apply in Blender when convenient | The file and the game differ until the owner catches up |
| B2. The owner edits the file first | The list below, by hand in Blender, before the pass is built | Blocks the pass on about forty custom properties typed by hand |
| B3. A new reference file, `1.20`, written by a script | As 1.19 was made from 1.18 | A third copy of the ship; the owner is editing 1.19 now |

### C. What "near" means

| Option | How | Against |
|---|---|---|
| **C1. Distance to the doorway** *(recommended)* | She's near when she's on the door's deck and within a set distance of the closed leaves (start: 1.5 m, in the tuning panel). Closes 0.3 m further out, so it doesn't flutter at the edge | One distance for every door; a circle, not UE's box |
| C2. Trigger boxes in the file | One box object per door, as in UE (`zone_*` in the naming contract) | Four more objects for the owner to make and keep in place; nothing else uses trigger volumes yet |

## The tags

In the ship file, on the object (Blender's own axes and units, like `doorAxis` and `doorAngle`):

| Tag | Meaning | On |
|---|---|---|
| `doorSlide: "X"` \| `"Y"` \| `"Z"` | **New.** A door that slides along this axis of its own, instead of turning | the four leaves, the window's halves |
| `doorDistance: <units>` | **New.** How far it slides to open; the sign gives the direction | the same |
| `doorAuto: true` | **New.** Opens when she's near | the four leaves |
| `opensWith: "<name>"` | Existing: the two leaves are one door | each leaf and each window half, naming the other |
| `interact: "use"`, `device: "panel"`, `controls: "<leaf>"`, `part: true` | Existing: a panel. `controls` names either leaf | the four door panels |
| `interact: "use"`, `device: "lever"`, `controls: "Lab Window"`, `part: true` | `device: "lever"` is in the contract, unused until now | `Level Panel` |
| `part: true`, `doorAxis`, `doorAngle` | Existing door tags, with no `interact`: **a device's child that's tagged as a door is its handle**, and follows what the device controls | `Level` |

The export writes them into the existing `door` property: `door: {slide: [x, y, z], auto}` (the slide as a vector in the ship's space, its length the distance), next to `{axis, angle…}` for hinged doors. A sliding door is a moving part: its `hinge` is recorded and it's left out of the ship's collider, as hinged doors are. `collider: "none"` on the leaves is then no longer needed.

Starting values, to be corrected by the owner in the file: leaves closed where they meet at the middle of their doorway, sliding 0.34 units (just clear of the doorway); window halves sliding by their own width (0.63); the lever turning 60° about its X axis.

## The work

1. **Export.** `export-ship.py` reads `doorSlide`, `doorDistance`, `doorAuto`. `ship-pending.py` (B1) with the tags above, the leaves moved closed, and the side-door tag. Checklist read first; export, resize, dedup, meshopt; `compare-glb.mjs` against the last raw export: only the tagged objects may differ (the four leaves' place; the panels and lever, from props to parts).
2. **Sliding doors** (`doors.ts`). `Door` gets a second way to pose: moved along its slide vector instead of turned on its hinge. Everything else is shared: easing, the moving collider, pushing her or stopping, the see-through raycast data. A slide time of its own in the tuning panel (start: 0.6 s, as the hinged doors).
3. **Opening on approach** (`doors.ts`, called from the fixed step). For each door tagged `auto`: open when she's near (C1), closed when she isn't, unless it's shut from a panel. Both leaves together. A leaf closing on her pushes her or stops, as any door does. A tuning-panel checkbox turns the automatic opening off (the panels then just toggle).
4. **Panels** (`interaction.ts`). A panel controls a door **with everything it opens with** (today a keypad moves one object). Several panels can control one door. Prompt: *Close door* / *Open door*, by the rule chosen in A.
5. **The window and its lever** (`interaction.ts`, `doors.ts`). The lever panel is one target with its lever (*Open window* / *Close window*); using it moves the window's halves and turns the lever to its other position. A press while either is moving is ignored (as in UE).
6. **See-through.** The leaves and panels must behave like their bulkhead ("bulkheads always visible" covers "their doors"), open and closed; the window's halves like the hull. To check in both poses, from both decks and from outside, and fix what's wrong. This is also the state pass 5 starts from.
7. **Checks.** New lines in `smoke-01.mjs`: each bulkhead door opens as she walks up and closes behind her; she can walk through both; closed from a panel it stays shut with her in front of it, and she can't pass; each of the four panels works; the lever opens and closes the window and turns; the existing "all doors open and close" check covers the new ones. Then `check`, `build`, `smoke`, and a look in the browser (screenshots, console).

## Done when

- **Agent:** `npm run check`, `build` and `smoke` pass with the new checks; screenshots of each door open and closed, and of the window, from inside and through the see-through hull; no console errors.
- **Owner, in play:** walking between the cargo hold and engineering, and between the crew quarters and the cockpit, the doors open and close around her; each panel does what its prompt says; the lever and the window; the timing and the distance feel right (both in the tuning panel); the doors seen through the hull look right.
- Gamepad: untested by the agent (no controller in the test browser).

## Open questions

1. **A:** what the panel does. Recommended: A1 (it shuts the door and keeps it shut; pressed again, the door is automatic again).
2. **B:** recommended B1 (in memory at export, with the list for the file). And: will the leaves be **closed** in the file from here on, as the rule says?
3. **The lower door's leaves are off-centre** (finding 2): is the doorway meant to be off-centre? The plan closes each pair at the middle of its own doorway.
4. **The window:** do the halves slide apart sideways by their own width, as the UE names suggest? What's behind them: an opening, or is glass still to be modelled? (The halves have no glass material.)
5. **The lever:** which way does it turn, and how far? (Start: 60° about its own X axis.)
6. **C:** recommended C1 (a distance, 1.5 m to start).

None of these stops the build: each has a starting value that a tag or the tuning panel changes.

## After

- [`features/interaction.md`](../../features/interaction.md): the sliding doors, opening on approach, the panels, the lever; the door table.
- [`reference/ue-prototype.md`](../../reference/ue-prototype.md): what was read from the three Blueprints, and how (names only).
- [`architecture/asset-pipeline.md`](../../architecture/asset-pipeline.md): the new tags in the naming contract; `ship-pending.py` and the export command; the checklist entries about the sliding doors and the untagged panels.
- [`features/see-through-hull.md`](../../features/see-through-hull.md) if stage 6 changes a rule.
- [`decision-log.md`](../../decision-log.md): an *Update* on the interaction entry (bulkhead doors are interactive; the panel rule), and the lever turning where UE's slides.
- Prototype README and `CODE-MAP.md`; [`../backlog.md`](../backlog.md) (6, 7, 8); [`../../steps/current.md`](../../steps/current.md).
