# Black after NEW GAME, until cutscene 1 runs smoothly (SC-132, SC-131)

> **[Agent note]** Owner, 2026-10-24: *"NEW GAME: the screen freezes for a while before cutscene 1; a black screen instead"*, then *"go for 132"* (taken as the go-ahead to build). Status: **built 2026-10-24**; the owner's to look at.

## The problem

Measured (a probe timing every frame after the press, twice): **one frame of 1.5–1.7 s**, about half a second into cutscene 1 (its time 0.3–0.5 s). Something seen outside for the first time builds its shaders then (SC-131). The start screen's own warm-up runs under the screen with the game's camera, so it never sees the outside. Every other frame in the first 6 s is quick.

## Goal and scope

In: on NEW GAME, the screen goes black (under the start screen as it fades) and stays black while cutscene 1 runs behind it, until its frames are quick again; then the cutscene goes back to its start and the black fades out. Out: *Continue* and `?scene=` (no cutscene 1); building the shaders ahead of time (a possible later fix for the stall itself, SC-131).

## Constraints from the docs

- Skipping stays as it is (SC-126): a hold during the black skips too, and the black goes at once.
- No frame of the ship's inside before cutscene 1 (fixed 2026-10-24): the black covers the press onwards.
- Gamepad first: nothing here needs input.

## The work

1. A black cover (`#black` in `index.html`, above the canvas and the bars, below the start screen and the skip prompt), shown on NEW GAME when the animatic starts with cutscene 1.
2. While it's up, cutscene 1 runs as usual. It comes down when the cutscene's time has passed **1 s** (past the stall's place) and **5 quick frames** in a row have followed (the start screen's warm-up rule, `WARM_FRAMES`), or after **6 s** at most. Then the cutscene's time goes back to 0 (it has no events) and the cover fades out over **0.6 s** (CSS, as the start screen's).
3. Its sound: the ship's noise starts with the press, as now, under the black.

## Done when

A probe (run from the scratchpad, not kept: small enough): the cover up on the press; no frame over 100 ms once it has started fading; the cutscene at under 0.1 s when it fades; a skip during the black takes it down. A screenshot during the black and after. The owner: NEW GAME at http://localhost:5202/.

## Open questions

- The fade's length (0.6 s), the 1 s held: the owner's to judge.

## After

`doc/features/scenery.md` (cutscene 1's section): the black; SC-131 stays open for the stall itself.
