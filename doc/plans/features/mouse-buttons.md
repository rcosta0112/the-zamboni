# Interact on the left mouse button, skip on the right

**Status:** approved 2026-11-18 (E kept for the scripts in dev builds; ordinary conversations not skippable); built 2026-11-18.

## Goal and scope

On mouse and keyboard (owner, 2026-11-18):
- **Left click interacts.** It also moves the dialogue box on (it does that today). **E is no longer used.**
- **Holding the right button skips** a cutscene, the ones with dialogue included. Today the left button does that.
- **Prompts show mouse icons:** the left-button icon for interact and the dialogue box, the right-button icon for the skip.

Out of scope: the gamepad (A interacts, X held skips: unchanged); Enter and Space still move the dialogue box on.

## Constraints from the docs

- **The right button already uses the gadgets** (scanner held, binoculars; [gadgets-scanner](gadgets-scanner.md)). No clash: gadgets are put away in cutscenes and conversations. A right button already held when a cutscene starts doesn't count: the skip only reacts to a press made during the cutscene (`skip-prompt.ts`).
- On the pad, interact and skip are two separate buttons (decision 2026-10-28). The mouse now matches that: left interacts, right skips.

## The work (one pass)

1. **`input.ts`**
   - Left click → interact, **counted only while the mouse is captured**. Otherwise the click that takes the mouse back (at the start, after Esc, after switching windows) would also open a door. The same condition goes on the dialogue's click.
   - `skipHeld` reads the right button instead of the left.
   - E removed.
2. **Icons**
   - The left-button icon (now in `skip-prompt.ts`) and the right-button one (already drawn for the binoculars, `binocular-view.ts`) move to one helper beside `pad-glyph.ts`, `mouseGlyph('left' | 'right' | 'wheel')`.
   - Interaction and dialogue prompts: left. Skip prompt: right. Binoculars: unchanged.
3. **The scripted checks**
   - About 20 probes and the smoke script press `KeyE`. See the options below.
4. **Text**
   - The controls line in the dev overlay (`main.ts`) and the comments.

*Agent build:* about 30 min, checks included. *Review rounds:* 1, about 5 min (click to interact, hold right in cutscene 1 and cutscene 2).

**As built (2026-11-18):** as planned, option A. `input.ts` (left click captured only; `skipHeld` the right button; E behind `import.meta.env.DEV`), `mouseGlyph` in `pad-glyph.ts` (the binoculars' and skip prompt's icons moved there), the dialogue box sizes a mouse icon by its own width (`packages/ui` `DialogueBox.svelte`). `mouse-buttons-probe.js` 11/11. Actual time: about 25 min.

## Options: how the scripted checks interact

- **A (recommended).** E kept **in dev builds only**, for the scripts: never shown in a prompt, gone from the production build. No probe changes.
- **B.** Every probe sends a scripted click instead. Script-sent clicks are let past the capture condition (a player can't make one). About 20 files edited, and the smoke run checks them.

## Done when

- `npm run check` and the build pass.
- A probe: a click while captured interacts, a click while not captured doesn't, holding right skips cutscene 1.
- Screenshots of the three prompts with their icons.
- Smoke passes once.
- **Owner:** play the start, a door, a conversation and the cutscenes on mouse.

## Open question

- "Skip dialogue": I read this as holding right in a **cutscene with dialogue** (cutscene 2's cockpit conversation) skips the whole cutscene, while left click moves through it line by line. Should holding right also end an **ordinary conversation** (talking to the crew in play)? That's new behaviour, and not in this plan unless you want it.

## After

- `doc/features/interaction.md`, `doc/features/dialogue.md` (input, the skip)
- Decision log (an *Update* on 2026-10-28's skip button)
- `CODE-MAP.md`, `doc/steps/current.md`, `doc/tasks.md`
