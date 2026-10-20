# The start screen

**Status:** *built 2026-10-13* in prototype 01; the owner's to look at and listen to. Plan: [`../plans/features/start-screen.md`](../plans/features/start-screen.md).

The first thing the player sees: the title, a progress bar while the game loads, then the *START* button in the bar's place.

- **Mockup:** [The Zamboni, *Desktop - 4*](https://www.figma.com/design/3x6wVCPPBUmzOp6IucXxsh/The-Zamboni?node-id=1-19) (1440 × 1024).
- **The button's states:** from [Eigodojo's *AnswerButton*](https://www.figma.com/design/vYxN400FtsLyLYiRTzvlCg/Eigodojo?node-id=274-838), in the Zamboni mockup's colours.
- **Code:** the screen is [`StartScreen.svelte`](../../app/prototypes/0.0.2/src/StartScreen.svelte) in 0.0.2; the button, the bar and the tokens are in [`app/packages/ui`](../../app/packages/ui/README.md); images and fonts in `app/prototypes/0.0.2/public/ui/`.

## Layout

Everything is placed on the mockup's 1440 × 1024 frame, and the frame is scaled to fit the window (by its width or its height, whichever is tighter) and centred. The background fills the window beyond it.

| Part | What |
|---|---|
| Background | The mockup's blue image (`start-background.png`, a soft gradient), stretched over the window; over it the line pattern (`start-pattern.png`, a 600 px tile), added to the blue at 24 %. The mockup's third layer (a radial gradient at 0 %) is left out |
| *Big Moon Tiny Moon* | Afacad Regular 36, white, letters 10.8 apart, centred, above the title |
| *The Zamboni* | Digital Desolation Plus 96, white, a little above the middle. Behind it a blurred copy in `#26a3ca` at 50 % (2 right, 9 down); over it a 1 px white outline of the same text at 59 % (6 right, 8 down) |
| Bar, then button | 226 × 55, 163 under the title's centre. **Centred**: in the mockup it's 17 px left of the title's centre, which looked like a slip. **Snapped to whole pixels**, position and size (owner, 2026-10-14), so its 1 px outlines are crisp at any window size; the lip (2 px) and the outlines (1 px) don't scale |

**The 3D view isn't shown**: the screen covers it, and the tuning panel is hidden until the game starts.

## The button

A white outline with no fill; inside it a second outlined box, the *body*, standing 2 px above the outer one's bottom edge. *START*: Afacad Bold 24, white.

| State | Eigodojo | Here | When |
|---|---|---|---|
| Default | Body up, a darker lip under it | As the mockup | The mouse is somewhere else |
| Hover | The body a shade darker; a hand cursor | The body filled white at 14 %; a hand cursor | The mouse is on it, **or no mouse has moved**: with a gamepad or the keyboard, the one button is the one they're on |
| Pressed | The body down on the lip | As the Zamboni mockup's [*Start Button*](https://www.figma.com/design/3x6wVCPPBUmzOp6IucXxsh/The-Zamboni?node-id=21-2) (owner, 2026-10-14): the outer outline goes, the body (same size) comes down to the bottom, leaving 3 px of background above it; no fill. The outer outline's bottom stays (the body lands on it) and its top and sides go only once the body has landed (0.06 s), so the bottom edge never loses its line on the way down | Held with the mouse; for 0.12 s when a key or a gamepad button uses it |
| Disabled | Grey, down, smaller text | Not made | While loading the button isn't there at all |

The hover fill is the agent's proposal: the mockup has only white and the blues, and Eigodojo's hover is "a little darker", which on an unfilled button became "a little filled".

**Using it:** a click or a touch, Enter, Space, or **any gamepad button**. A click also captures the mouse, as clicking the view does. The button makes a click (`ui_click`), the screen fades out over 0.6 s, and the game runs from that moment.

## The progress bar

Not in either mockup; the agent's proposal. The button's outer outline, in the same place, with a white fill at 26 % growing from the left. When the load ends, the bar fades out and the button fades in over it (0.3 s): the outline doesn't move.

What it measures ([`loading.ts`](../../app/prototypes/0.0.2/src/loading.ts)): each part of the load has a fixed share of the bar.

| Part | Share | How it reports |
|---|---|---|
| Physics (Rapier) | 3 % | Done or not |
| The decoded sounds | 4 % | The share of the files that have arrived |
| The two character models | 5 % | Bytes downloaded |
| The ship and its collider | 12 % | Bytes downloaded |
| The crew | 4 % | Bytes downloaded |
| Shaders | 62 % | The share of the scene's objects built (three's `compileAsync` reports each one) |
| Warm-up | 10 % | The first frames made under the screen: quick frames in a row out of five, or the time out of six seconds, whichever is further |

The shares follow time: the downloads take a second or two from the dev server, the shaders about 2 s when Chrome has them cached (a reload) and about 12 s when it hasn't (headless Chrome on the owner's PC, 2026-10-20). **The warm-up:** the first frames stall (the see-through shaders are built when first used); before this screen that stall came right after *Press any button*. The button comes after five quick frames in a row (or six seconds, on a machine where no frame is quick), so the game moves as soon as it's used. The bar moves unevenly through the shaders (an object whose pipeline already exists is instant), but it doesn't stand still for more than about 2 s (2026-10-20).

If the models or the ship fail to load, the button still comes (the game starts with what it has, as before) and the console says why.

## Sound

- **Music:** Part 1's soundtrack, **on this screen only** (owner, 2026-10-13); it dies away over 1.5 s when the button is used. A browser doesn't play sound before the player has pressed or clicked something, so on a first visit it's heard only if they do that before the button; see [`audio.md`](../architecture/audio.md#what-exists-prototype-01-2026-10-13).
- **The click:** a short, soft tick made by the placeholder script.

Both are placeholders; levels are in the tuning panel (*Sound*: *volume: music*, *volume: interface*).

## Tokens

In [`tokens.css`](../../app/packages/ui/src/tokens.css), written by hand from the mockup: the Figma file has one variable (`White`). Colours: white, the background's blue (`#3db3dd`, shown until the image is there), the glow's blue (`#26a3ca`), the two fills. Fonts: **Afacad** (Google Fonts, open licence; the Latin file is in the repo, not fetched from Google, so the game works offline) and **Digital Desolation Plus** (the owner's file, copied from the fonts installed on the PC).

## Open

- **The button on a phone held upright** is 61 px wide (the frame is scaled by the window's width): it works, but it's small. No mockup for narrow screens yet.
- **The button isn't focused** for the browser (Tab reaches it): Enter and Space are read from the window instead, so they work wherever the focus is.
