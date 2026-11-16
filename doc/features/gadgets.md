# Gadgets

**Status:** pass 1 of the [plan](../plans/features/gadgets-binoculars.md) built 2026-11-16: the binoculars brought out and put away, in third person. First person and the zoom (pass 2), the put-away rules and the panel (pass 3) still to come. Decision: [gadget controls](../decision-log.md).

## Controls

| Action | Gamepad | Keyboard / mouse |
|---|---|---|
| Binoculars out into her hands / away (a toggle) | **D-pad up** | **B** |
| Use the gadget that's out: the binoculars raised to her eyes / back to her hands (a toggle; first person once up: pass 2) | **R** | **right mouse button** |
| Zoom in / out (first person) | **ZR** / **ZL** *(pass 2)* | **mouse wheel** *(pass 2)* |

The default for every gadget (owner, 2026-11-16): the D-pad brings one out (a direction each), R uses it; interact stays interact.

## The binoculars

- **Out:** they come into her hands over a quarter of a second, held as in the clip's first frame (`Dr. Green - Binoculars`, frames 1–12 of the ship file). **Used (R):** she raises them to her eyes over half a second (the clip), R again lowers them back to her hands (the clip backwards). Held or up, she can stand, walk, run, jump and fly. **Away:** lowered first if they're up, then out of her hands; hidden at the end.
- **Put away at once** (no clip) while she's seated, climbing, in a conversation, or a cutscene or watched conversation plays.
- **On her upper body only:** her arms, hands and head (`model.ts` `UPPER_BODY`; her skeleton has no spine, `Body` stays the movement's). Each movement clip is split in two at load; the upper halves hand over to the binoculars' clip as they're raised (eased), the legs' halves play as before.
- **The binoculars themselves** (`Binoculars.001`, on `Hand_r.IK` in the file) hang on her right hand's bone in the game; their own turn (the file's `Binoculars` action) is baked by the export into her clip, so the two never drift apart.

## Files

`src/gadgets.ts` (the state: which gadget is out, how far it's raised), `src/model.ts` (the upper-body layer), `src/input.ts` (`consumeGadget`), main.ts (puts it away while her hands are taken). Export: `export-crew-character.py --action "<action>=<object>:<its action>:<bone>"`. Check: `node tools/probe-01.mjs tools/binoculars-probe.js --shots .export/binoculars` (14 checks, about 45 s).
