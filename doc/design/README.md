# Design

**Status:** *set up 2026-10-08*. No design work yet.

All interface design for The Zamboni: the brand, the game screen, the game's interfaces, and the interfaces of in-game devices. Everything is built on one **design system**, documented in full in Figma, with a matching **code version** that the game uses.

## What the design system covers

| Area | Includes |
|---|---|
| **Brand** | Logo and wordmark, colour, type, voice; title screen, store and web presence |
| **Game screen** | Everything drawn over the 3D view: interaction prompts, barks, subtitles, notifications, the crosshair or focus marker (if any) |
| **Interfaces** | The VN-style dialogue box, menus (title, pause, settings, save/load), loading and transitions |
| **In-game devices** | The screens of objects in the world: **PCs** and ship displays (CRTs, nav display, monitors), **handhelds** (the scanner), and the **comm** with its home screen and apps (chat, mission data, camera) |

## How it works

The same flow as Eigodojo:

1. **Figma** for mockups and the design system itself: variables (tokens), components, and the screens built from them. Figma is the source of truth for how things look.
2. **Figma MCP + Claude Code** for automation: generating and updating Figma files, and turning Figma designs into code.
3. **Code version:** the tokens and components in code, kept in step with Figma. Used by every prototype and the game.

## Constraints from the docs

- UI is Svelte 5 components rendering HTML/CSS over the 3D canvas ([`../architecture/stack.md`](../architecture/stack.md)).
- The comm is laid out like a smartphone with app icons ([`../story/world.md`](../story/world.md), [`../overview.md`](../overview.md)).
- Dialogue: a horizontal box at the bottom of the screen with dialogue options ([`../overview.md`](../overview.md)).
- **Gamepad is the main input.** Every interface must be fully usable with a gamepad (focus navigation with the D-pad/stick); the mouse is optional. Button prompts need glyph sets for gamepads and keyboard ([`../architecture/scope.md`](../architecture/scope.md)).

## Starting material

- **The look of the UE prototype:** retro tech: Kaypro/TRS-80 style keyboards, green CRTs, teal and grey panels, cassettes (from the original handover, [`../_archive/HANDOVER.md`](../_archive/HANDOVER.md)).
- **Fonts** in `resources/fonts/`: Minecraftia, PICO-8, DepartureMono.
- **Visual reference** in `resources/media/` (81 files, renders and screenshots from earlier work) and `resources/reference/`.
- **In the archive** (`The Zamboni.archive`): `Zamboni 3000.ai`, `zamboni.png`, the `tehzamboni.com` folder, the Monogatari visual-novel prototype (`Prototype/`).
- **Part 1:** dialogue UI with character portraits and Montserrat ([`../reference/big-moon-tiny-moon.md`](../reference/big-moon-tiny-moon.md)); `Dialog UI 1.01.ai` / `1.02.ai` in `D:\Work\Big Moon Tiny Moon\Build Files\`.

## Docs to come

Added to this folder as the work happens: brand, tokens, components, the in-game device interfaces, a captioned index of reference images, and links to the Figma files. Plans for building the design system go in [`../plans/`](../plans/README.md).

## Open questions

- ~~Which UI framework the code version uses~~ **Decided 2026-10-08: Svelte 5** ([`../architecture/stack.md`](../architecture/stack.md)).
- How in-world screens (PCs, ship displays) are shown in 3D: see [`../architecture/README.md`](../architecture/README.md) once decided.
- Do Figma files for The Zamboni already exist?
