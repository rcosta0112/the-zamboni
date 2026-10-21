# The prompt beside the handle (item 56, pass 1)

**Status:** approved 2026-10-21 (owner: "write the plan and run it"); **built 2026-10-21**, the owner's to play (see *As built*).

## Goal and scope

The interaction prompt is placed where it makes sense for each thing: on a door, **beside its handle**. Owner's choices (2026-10-21): a **rule per kind** in the game, with an exception for a single object only where the rule turns out wrong; **the same point from both sides** of a door; **beside** the handle, not over it.

**In:** where the prompt goes, for every target the game offers today. **Out:** which target is chosen when several are in reach (item 56's second pass); the prompt's look; the ladder's own prompt (`ladders.ts`).

## Today

`placePrompt` (`interaction.ts`) sees one box per target (all its parts): the prompt goes beside the box's centre on screen, to the right, pushed out by the box's half-width up to 60 px. A locker's prompt lands in the middle of its door, the roof hatch's between its two parts, the lever's between the panel and the handle.

## The targets (measured 2026-10-21, at load)

| Target | Kind | Hinge |
|---|---|---|
| `Crew_Locker_Door_1`, `_2` (1.80 tall), `Cargo_Locker_Door` (1.61) | `door` | vertical, at one side edge |
| `Galley_Door_1`, `_2`, `_3` (0.45 tall) | `door` | vertical, at one side edge |
| `Floor_Hatch`; `Top_Hatch_Lower` + `_Upper` (one target) | `hatch` | horizontal, at one edge |
| Keypads (ramp, side door), the four bulkhead panels | `keypad`, `door-panel` | – |
| `Engineering_Window_Lever` (panel + its handle) | `lever` | – |
| Boombox, the four jetpacks, the cargo hold ladder | `boombox`, `jetpack`, `ladder` | – |

## The rules

1. **A hinged door (`door`, `hatch`): its handle is at the edge away from the hinge**, halfway along that edge, in the middle of the door's thickness, 5 cm in from the edge. Measured once in the hinge's own space (the door's parts, closed), so the point swings with the door, open or shut.
2. **Doors that open as one target** (the roof hatch's two parts): the middle of their handle points (where the two parts meet).
3. **A lever:** the centre of its handle, not of the panel and handle together.
4. **Everything else** (keypads, panels, boombox, jetpacks, the ladder): the centre of its bounds, as today.
5. **Beside:** the prompt's near edge 18 px from the point (12 touched the lockers' handles). With a handle point (doors, hatches, the lever), on the side of the point away from the door's centre on screen (just outside the edge, by the handle); on anything else, or when the two are nearly in line on screen, to the right. Kept inside the screen's edges, as today.
6. **Exceptions** (owner: "when needed"): added only for a door whose handle isn't where rule 1 puts it, as a point for that id. None until the screenshots show one.

## The work

1. `interaction.ts`: an `Interactable` gets an optional `anchor` (its point, world) and `beside` (`'outside'` for doors, `'right'` otherwise); `shipInteractables` sets them by the rules above; `placePrompt` uses them.
2. A probe with screenshots: she stands in front of each door, the galley cupboards and the hatches; the prompt's point printed against the door's far edge.

## Done when

`npm run check` and `npm run build` pass; screenshots show each door's prompt beside its handle (an exception added for any that isn't); the smoke script passes as before (its prompt checks read `promptAt`). Owner: plays it.

## As built (2026-10-21)

`interaction.ts`: `Interactable.anchor`; `handleOf` (rule 1), `middleOf` (rule 2), `centreOf` (the lever's handle); `placePrompt`. No `beside` field: any target with a handle point gets the outside side. Checked with `tools/prompt-places.js` (screenshots, a red dot on each point): on the handle for the first crew locker, the cargo locker, the galley cupboards (at the height of their handles) and the lever; the floor hatch (open) at its top edge. **Not seen:** the second crew locker (a bunk in the way; the same door as the first, hinged the same side), the roof hatch (no place to stand under it in the probe) and `Galley_Door_3` (the cockpit door's panel was targeted instead: choosing between targets is pass 2). No exception needed so far. `npm run check`, `build` pass; smoke 83 passed, the 3 known failures.

## After

`doc/features/interaction.md`: where the prompt goes. `CODE-MAP.md` if the names change. Backlog item 56: pass 1 built.
