# Plan: the start screen

**Status:** *built* 2026-10-13 (the owner chose among the options the same day: *Decided*). What exists: [`design/start-screen.md`](../../design/start-screen.md). What differs from the plan: *As built*, at the end. Backlog item 28. Asked for by the owner on 2026-10-13: "add a start screen following this layout […] The start should have similar states to these […] but follow the colors on the zamboni mockup. The start button should be hidden and in its place a progress bar should be visible until everything is loaded. Add a click sound to the start button. Play the soundtrack from the big moon tiny moon project."

- Layout: [The Zamboni, node 1-19](https://www.figma.com/design/3x6wVCPPBUmzOp6IucXxsh/The-Zamboni?node-id=1-19)
- Button states: [Eigodojo, node 274-838](https://www.figma.com/design/vYxN400FtsLyLYiRTzvlCg/Eigodojo?node-id=274-838)

## What the mockups show

**The Zamboni, *Desktop - 4*** (1440 × 1024):

| Part | In the mockup |
|---|---|
| Background | A blue image filling the frame (a soft gradient, about `#3ab0de` to `#45b8dc`); over it a tiling pattern of white lines on black, blended as *screen* at 24 %. A third layer (a radial gradient) is at 0 %: left out |
| *Big Moon Tiny Moon* | Afacad Regular 36 px, white, letter spacing 10.8 px (0.3 em), centred, 83 px above the title's centre |
| *The Zamboni* | Digital Desolation Plus Regular 96 px, white, centred a little above the frame's middle (y 511 of 1024). Behind it: the same text in `#26a3ca` at 50 %, blurred 11 px, 2 px right and 9 px down (a glow); and the same text as a thin white outline at 59 %, 6 px right and 8 px down |
| The button | 226 × 55, 163 px under the title's centre. A white 1 px outline, corners 8.4 px, **no fill**; inside it a second outlined box, the *body*, that stops 2 px short of the bottom: the 2 px lip under the body is the button's depth. *START*: Afacad Bold 24 px, white |

The only variable in the file is `White` (`#ffffff`). **The 3D view isn't in the mockup**: the screen covers it.

**Eigodojo, *AnswerButton*, four states**, and how each is carried over (its colours are teal fills; the Zamboni's button is white outlines on blue, so the *movement* is kept and the fills become white tints):

| State | Eigodojo | Here |
|---|---|---|
| Default | Body up, a 4 px darker lip under it | As the mockup: body up, 2 px lip |
| Hover | The body a shade darker; a hand cursor | The body filled white at 14 %; a hand cursor. **Focus (gamepad, keyboard) looks the same**: with a gamepad the button is always focused |
| Active (pressed) | The body moves down onto the lip | The body moves down 2 px, filled white at 26 % |
| Disabled | Grey, down, smaller text | Not used: while loading, the button isn't there |

**The progress bar** isn't in either mockup. Proposed: the button's own outer outline (same place, size and corners), with a white fill at 26 % growing from the left; when the load ends the fill fades and the body and *START* appear in it, so nothing moves.

**Fonts.** Neither is in the repo. Afacad is on Google Fonts (open licence). Digital Desolation Plus is installed on the owner's machine (`Digital-Desolation-Plus.otf`, 22 kB). See *Options*, 4.

## Decided (owner, 2026-10-13)

1. **Svelte components in `packages/ui`** (option 1A).
2. **The font file in the repo, the title as text** (option 4A).
3. **The soundtrack on the start screen only** (option 2B). "The soundtrack should play only on the start screen": option 3 (the boombox) no longer arises.

## Goal and scope

Prototype 01 opens on a start screen: the mockup's layout, a progress bar while the game loads, then a *Start* button in the bar's place. Using the button plays a click, starts the game and starts Part 1's soundtrack.

- **In:** the screen; the button with its states; the progress bar and what it measures; the click; the soundtrack; the checks' way past the screen.
- **Out:** settings, *Continue*, *Download for offline play* (all on the title screen in the [game architecture plan](../architecture/game-architecture/README.md), none asked for here); the benchmark that picks a quality tier; the pause overlay's look (it stays as it is); the rest of the design system.

## Constraints from the docs

- **It replaces *Press any button*.** The game opens paused on that line because browsers keep the sound off until a button, a key or a click ([`audio.md`](../../architecture/audio.md#what-exists-prototype-01-2026-10-13)). The start button is that moment from now on; the pause overlay is only for pauses after it.
- **Gamepad is the main input** ([`design/README.md`](../../design/README.md)): the button has the focus as soon as it appears; A / ✕ uses it, as do Enter, Space and a click. A stick alone can't (the browser doesn't count it).
- **UI is Svelte 5, on the design system** ([`stack.md`](../../architecture/stack.md), [`design/README.md`](../../design/README.md)): tokens come from Figma variables, components live in `packages/ui`. **Prototype 01 has no Svelte**: its overlays are plain HTML and CSS. See *Options*, 1.
- **The loading plan says the title appears after about a second and the opening loads behind it, with no loading screen** ([`loading.md`](../architecture/game-architecture/loading.md)). A bar on the title screen fits that (the title covers the wait). Prototype 01 loads everything at once, and building its shaders takes several seconds: the bar will be longer here than the plan's numbers for the game. Flagged, not a conflict.
- **Audio:** names and cues as data ([`audio.md`](../../architecture/audio.md)): `ui_click`, `mus_part1_theme`. The proposal has a **ui bus**; it doesn't exist yet, and this is the first UI sound, so it's added. Files are placeholders: `app/assets/test/audio/`, a line each in `SOURCES.md`. **Licensing isn't raised** (owner, 2026-10-13).
- **Masters:** Part 1's soundtrack stays in Part 1's project, as its running loop did for the steps: `C:\Users\31658\Projects\Big Moon Tiny Moon\Assets\Audio\Background Music.wav` (2 min 17 s, 44.1 kHz, 24-bit stereo, 35 MB).
- [`audio.md`](../../architecture/audio.md#open-questions) has **the game's music as an open question**. Playing Part 1's soundtrack here is a placeholder, not an answer to it.

## The work

1. **Assets.** The background image and the pattern tile from Figma, and the two fonts (as *Options*, 4 is decided), to `app/assets/ui/` (production assets: they're the design, not placeholders).
2. **Tokens and components** (as *Options*, 1 is decided). The colours and type above as tokens; `Button` (its states) and `ProgressBar`.
3. **The screen in prototype 01.** Covering the canvas, as the mockup does. Sizes scale with the window's height from the mockup's 1024, so the composition holds from a phone on its side to a wide monitor. The button is hidden and the bar shown until loading is done, then the reverse, in the same place and size so nothing moves.
4. **What the bar measures.** `main.ts` reports each part of the load to one place: Rapier, the two character models, the ship file, the crew file, the decoded sounds, the shader compile. Downloads report bytes where the server gives a total; each part has a fixed share of the bar. **The shader compile can't report progress** (one call, several seconds): the bar holds at its share's start, then jumps. If the load fails (today: "the capsule stays"), the button still appears, and the console says why.
5. **Starting.** Using the button: the sound is turned on, `ui_click` plays, the screen fades out, the game leaves its pause, the soundtrack starts. With a click, the mouse is captured too (as clicking the view does now). The first frames after the context resumes can drop a sound: the click waits for the context to be running.
6. **The click.** `ui_click`, made by `make-placeholder-sounds.mjs` from tones, as the panels' beeps are (short, soft). New `ui` bus with its volume in the tuning panel.
7. **The soundtrack.** `mus_part1_theme.m4a` from Part 1's file, by `encode-audio.mjs` (128 kbit/s stereo, about 2.2 MB, streamed: nothing at load). On the music bus, looping with the crossfade the ship's noise uses (`StreamLoop`, which becomes usable by a cue). It stops with the pause like every sound.
8. **The checks.** `probe-01.mjs` and `smoke-01.mjs` send a key to start the game: they wait for the button, then use it. New checks, tried with the probe first: the bar is there and the button isn't before the load ends; the reverse after; `ui_click` and `mus_part1_theme` started once.

## Options

**1. Where the button and bar are built.**

- **A. In `packages/ui`, as Svelte components with tokens (recommended).** What the docs ask for, and the first use of the design system. Cost: Svelte comes into prototype 01's build (the Vite plugin, `svelte-check` in its `check`; the versions are already pinned at the root), and tokens are written by hand from the mockup unless the Zamboni file has variables.
- **B. Plain HTML and CSS in prototype 01**, like the prompt and pause overlays. Half the work; redone when the design system starts.

**2. When the soundtrack plays.** A browser won't play it before the button is used, so it can't be heard on the start screen itself on a first visit.

- **A. From the button on, through the game, looping (recommended, as the request reads).**
- **B. On the start screen only when the browser allows it** (a returning visitor often is allowed), fading out when the game starts.

**3. The soundtrack and the boombox** (both music).

- **A. The soundtrack fades out while a cassette plays, and comes back after (recommended).**
- **B. Both play.**

**4. The title's font.** Digital Desolation Plus has to reach the player's browser somehow.

- **A. The font file in the repo, the title as text (recommended).** 22 kB; the glow and the outline are CSS, as in the mockup. The file is then public with the game: the font's licence has to allow web embedding (the owner's to know).
- **B. The title exported from Figma as an SVG.** No font file ships; any other text in that font needs another export.

Afacad is bundled either way (its files in the repo, not fetched from Google: the game is to work offline).

## Done when

- **Agent:** `npm run check`, `npm run build`; the new checks with the probe; `npm run smoke` once at the end; screenshots of the screen while loading and when ready, at 16:9 and a narrow window, compared with the mockup; each button state forced and captured. **The agent can't hear**: levels are the owner's.
- **Owner:** the screen against the mockup; the button with a gamepad, the keyboard and the mouse; the click's sound and level; the soundtrack's level, its loop and what happens with the boombox.

## Open questions

1. Options 1 to 4.
2. **The hover and pressed tints** (14 % and 26 % white) and **the progress bar's look** are the agent's proposals, not the mockup's: to look at.
3. **Dev:** a way past the screen for the owner's own play (`?start` in the address)? The tuning panel is reachable only after *Start* otherwise.

## As built

Where the result differs from the stages above, or adds to them.

- **The button waits for the game's first frames, not only for the files** (stage 4). Tried first as planned: the button came when the load ended, and the game stood still for about 2.4 s after it was used (the see-through shaders are built in the first real frames; before, that happened behind *Press any button*). So once everything is loaded, frames are made in full under the screen with nothing simulated, and the button comes after five quick ones in a row (or 6 s). The bar's last part covers this too.
- **Shares of the bar:** physics 5 %, sounds 5 %, models 15 %, ship 30 %, crew 10 %, shaders 35 %. From the dev server the downloads take a second or two and the shaders the rest (about 18 s in all in headless Chrome), so most of the bar's time is the part that creeps. Changing the shares is one line in `loading.ts`.
- **The button is centred** (stage 3): in the mockup it's 17 px left of the title's centre.
- **Keys:** Enter and Space, read from the window; any gamepad button. Not "any key", as *Press any button* was: the checks' key (Q) no longer starts the game, so `browser.mjs` got `useStartButton`, used by the probe (`--stay` to leave the screen up) and the smoke script.
- **With a gamepad or a key the button is shown pressed for 0.12 s** before the game starts; a click starts it at once.
- **The tuning panel is hidden until the game starts** (it lay over the screen). Open question 3 (a way past the screen for dev) wasn't built: Enter does it.
- **The music is a cue that repeats** (`setLoop` in `audio.ts`, reusing the ship noise's crossfade), not a change to `play`.
- **A bug found on the way:** the first frame's time step can be below zero, which made the music's fade run backwards for a frame and start the file once while the sound was still off. The fade's step is now never negative.
- **Checks added to the smoke script** (five): a bar and no button while it loads; the button, and Enter starting the game; the screen gone; the click once; the music started once and stopped 2.5 s after the button.
- **Not done:** a design for narrow screens (on a phone held upright the button is 61 px wide); the button's disabled state.

**Checked by the agent:** `check`, `build`; in headless Chrome at 1440 × 1024, screenshots while loading, ready, hovered, pressed and after, compared with the mockup's render (the title's box is the mockup's to the pixel; the pattern's tile lines up); at 1920 × 1080 and 390 × 844; a click and Enter both start the game, which runs at 60 fps from the first frame. **Not checked:** a gamepad (none in the test browser); the mouse being captured by the click (headless Chrome doesn't); Firefox and Safari; what anything sounds like.

## After

- `doc/design/start-screen.md` (what exists; links to the Figma nodes), and the answer to `design/README.md`'s open question "Do Figma files for The Zamboni already exist?" (they do).
- [`audio.md`](../../architecture/audio.md), *What exists*: the ui bus, the click, the soundtrack, starting the sound from the button.
- `CODE-MAP.md`, prototype 01's `README.md`, `packages/ui/README.md`, `SOURCES.md`, `app/tools/README.md` if a script changes.
- [`backlog.md`](../backlog.md): a new item. [`current.md`](../../steps/current.md).
