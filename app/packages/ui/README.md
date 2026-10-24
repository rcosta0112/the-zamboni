# @zamboni/ui

The design system's code version: tokens (`src/tokens.css`) and Svelte 5 components, kept in step with the Figma design system ([`doc/design/`](../../../doc/design/README.md)). Consumed as source by prototypes and the game; no build step.

What's in it (2026-10-13, from the start screen: [`doc/design/start-screen.md`](../../../doc/design/start-screen.md)):

| File | What |
|---|---|
| `src/tokens.css` | Colours, the two fonts, the controls' shape, timings. Written by hand from the mockup (the Figma file has one variable). Imported once by the app: `import '@zamboni/ui/tokens.css'` |
| `src/Button.svelte` | The outlined button, with its states: default, hover (also `highlighted`: the control a gamepad is on), pressed (also `pressed`) |
| `src/ProgressBar.svelte` | A strip 4 px tall, as wide as its container, filling from the left in white over a darker track (`value`, 0..1) |
| `src/DialogueBox.svelte` | The dialogue box, a placeholder (2026-10-21): white, low in the middle, the speaker, the line typed out, the button prompt (*Skip*, *Next*, *End*, *Choose*); a conversation's topics, her lines, in the box in place of the line, the selected one marked (2026-10-22). The game drives it with `show(view)` ([dialogue plan](../../../doc/plans/features/dialogue.md)) |

Sizes are in `--ui-unit`, one pixel of the mockup: a screen that scales with the window sets it. The fonts are files in `app/assets/ui/fonts/`, served at `/ui/fonts/` (an app that uses this package serves `app/assets` as its public folder).
