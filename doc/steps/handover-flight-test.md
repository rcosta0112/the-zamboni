# Handover: the flight interfaces' test scene

> **[Agent note]** For the next session (written 2026-11-23). Delete once pass 0 is built and `current.md` carries it.

## What to build

**The plan: [`flight-test-scene.md`](../plans/features/non-linear-travel/flight-test-scene.md)** (approved 2026-11-23, "Let's build this"). Start with **pass 0**, then stop for the owner's look before pass 1.

## What the owner decided (2026-11-23)

- **A prototype to find the design: don't check it against the other docs** or flag conflicts with them. If it works, the docs change to follow it.
- **No separate cut-down `.blend`:** a copy of the first playable scene (`public/scenes/chapter-1.json` → `public/test/scenes/flight-test.json`) with what isn't needed taken out. The ship's and crew's exports used as they are.
- **The cockpit controls:** the owner models them in **a separate `.blend`**; imported when ready (pass 1). Until then, stand-in boxes made in code with the same ids.
- **Physical controls** (not the 2D overlay) in this build. The ids in the plan's table are fine. The time-passing cutscene: a flyby reused.
- **Copy the checks relevant to the page** (pass 0): to confirm which (the plan names piloting, look, seat, conversation probes).
- **No start screen:** the page loads straight into the scene.

## Where to look first

- `app/prototypes/0.0.2/CODE-MAP.md`: `main.ts` (start-up, `?scene=`, the start button), `scenes.ts` / `commands.ts` (scene data: `setup`, `begin`, `getUp`, `sitDown`, `whenClosed`), `crew.ts`, `story.ts`, `input.ts` (the pad's naming: A is the right face button, B the bottom one), the dev pages (`planet.html`, `shot-editor.html`, `tools.html`).
- `tools/README.md`: the probes (`npm run probe -- <file>`; `node tools/probe-01.mjs <file> --game --query …`) and `export.mjs` (for pass 1's `export:flight-controls`).
- The design: the discussion docs in [`plans/features/non-linear-travel/`](../plans/features/non-linear-travel/) (the summary first).

## To find out early

- How `main.ts` skips the start screen for a dev entry (the `?test` and `?scene=` paths), so `flight-test.html` doesn't need a click (audio may need a first input: browsers' autoplay rule).
- What in chapter 1 is tied to the game rather than the scene file (the coffee, the opening watch, the save) and how to switch it off for the page without touching the game.

## Owner's tasks waiting

- **SC-196:** the cockpit controls' `.blend` (the plan's table). Pass 1 waits on it; passes 0, 2 and 3 don't.

Dev server: http://localhost:5202/ (`npm run dev` in `app/`). Weekly budget: about 0.1% used on 2026-11-23.
