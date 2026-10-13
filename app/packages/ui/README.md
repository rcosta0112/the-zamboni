# @zamboni/ui

The design system's code version: tokens (`src/tokens.css`) and Svelte 5 components, kept in step with the Figma design system ([`doc/design/`](../../../doc/design/README.md)). Consumed as source by prototypes and the game; no build step.

What's in it (2026-10-13, from the start screen: [`doc/design/start-screen.md`](../../../doc/design/start-screen.md)):

| File | What |
|---|---|
| `src/tokens.css` | Colours, the two fonts, the controls' shape, timings. Written by hand from the mockup (the Figma file has one variable). Imported once by the app: `import '@zamboni/ui/tokens.css'` |
| `src/Button.svelte` | The outlined button, with its states: default, hover (also `highlighted`: the control a gamepad is on), pressed (also `pressed`) |
| `src/ProgressBar.svelte` | A bar the size of a button, filling from the left (`value`, 0..1) |

Sizes are in `--ui-unit`, one pixel of the mockup: a screen that scales with the window sets it. The fonts are files in `app/assets/ui/fonts/`, served at `/ui/fonts/` (an app that uses this package serves `app/assets` as its public folder).
