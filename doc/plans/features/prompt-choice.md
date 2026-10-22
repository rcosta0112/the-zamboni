# Which prompt, when several things are in reach (item 56, pass 2)

**Status:** *approved* (owner's answers 2026-10-22, below); **built 2026-10-22** and adjusted with the owner the same day (notes below). What exists: [interaction](../../features/interaction.md#targeting). Defined by the owner on 2026-10-22 (below). Follows pass 1, [prompt placement](prompt-placement.md) (where a prompt goes).

## Goal

At her open locker with the camera at its usual height, **no prompt shows for the parka** (owner, 2026-10-22: feet 3.668, 3.462, -14.043; yaw -3.064; pitch 0.578). The owner's answer:

1. **More room vertically:** a thing counts as aimed at over a wider vertical angle than horizontal. The camera can't tilt up indoors (taken out for the see-through), so things high up (the parka) or low down must still be reachable.
2. **Every usable thing nearby shows, in the direction she's facing:** a **simple white circle** where its prompt would be; the **active one shows its full prompt** (in the owner's example: the boombox and the door as circles, the parka with *Put on parka*). Only what's usable right now: the parka only while her locker is open.
3. **The prompt is white with black text**, matching the dialogue box.

**Out:** a button to cycle targets; priorities by kind; where a prompt is placed (pass 1, unchanged); the ladder's own prompt (`ladders.ts`) gets the new look, nothing else.

## What exists (`src/interaction.ts`)

A target must be **within reach** (1.0 m from her chest to its bounds), **in sight** (no collider between her chest and it) and **within 30° of the screen centre** (`interactMaxAngleDeg`); the one nearest the centre wins (0 when the centre line crosses its bounds), ties to the nearest. The angle is one cone, so up/down counts as much as left/right. At the owner's view the camera looks 33° down, and the parka, high in the locker, is outside the cone: **no target at all**, so nothing shows. (A probe of 2026-10-22, facing the parka: it's the target up to pitch 0.3–0.4; the open door takes over beyond it.)

The prompt is one element (`#prompt`, `style.css`): white text on translucent black.

## Constraints from the docs

- **Gamepad first** (CLAUDE.md): nothing here needs a pointer; the active target is still chosen by where the camera points.
- **No highlight on the objects** ([interaction](../../features/interaction.md): the highlight that came first was removed, 2026-10-14). The circles are screen marks, not a highlight on the thing: **not a conflict as I read it**, but flagged.
- **Every prompt names its thing** (owner, 2026-10-21; `labels.ts`): unchanged; a circle has no text.
- The dialogue box's look comes from the design system (`app/packages/ui`, tokens `--color-white`, `--color-ink`, `--font-text`).

## The work

**1. The angle, split** (`interaction.ts`, `settings.ts`). The direction to a thing (its prompt's point: a door's handle, otherwise the centre of its bounds) is measured from the camera's centre line as two angles: across and up/down. A thing is aimed at within **30° across** (as now) **and 60° up/down** (new, `interactMaxVerticalDeg`, in the tuning panel). The active one is the one with the smallest **across + up/down × ⅓** (the vertical counts a third), ties to the nearest. Measured to the prompt's point rather than "0 inside its bounds", so a big box (an open door) doesn't swallow what's in it.

**2. The marks** (`interaction.ts`, `style.css`). *Nearby, in the direction she's facing:* within reach, in sight, available (the parka: locker open) and **in front of her body** (within 90° either side of where she faces). Each one that isn't active gets a white circle (about 12 px, a faint shadow so it reads on the white walls) at its prompt's point; the active one gets its full prompt there instead. The active one is chosen among these by step 1; **when none is within the angles, the nearest-to-centre of them is active anyway**, so a prompt shows whenever anything is nearby. A small pool of elements, reused; nothing shows while she climbs, in a conversation or a cutscene (as now).

**3. The look** (`style.css`). The prompt: white background, black text, rounded, the font of the dialogue box; the button's letter in a small outlined box as the dialogue box's key hint. The tokens from `packages/ui`.

**Cost:** per frame the same loop over the targets as now (about 40), plus a few elements moved. Nothing to load. About 2 hours with the check.

## Done when

- **Agent:** a probe at the owner's spot and view: the parka is active (*Put on parka*), the door and the boombox show circles; the locker shut, no parka circle. Then the locker, the galley's stacked doors (fridge under the cupboard), the cockpit door and its panel, the rack's four jetpacks and a crew member by a door: the target and the circles at each, with screenshots. `npm run check`, `build`, the smoke run once (its prompt checks may need the new rule).
- **Owner:** plays it with the gamepad: the right thing is active without tilting the camera, and the circles help rather than clutter.

## The owner's answers (2026-10-22)

1. **Both:** her facing decides which marks show around her; the camera decides which one is active. The agent's additions: the active one is kept until another scores clearly better (4°), so it doesn't flicker as the camera sways; the circles fade in and out (0.1 s).
2. **Circles only first:** when none is within the angles, no prompt, only the circles (not "the nearest-to-centre is active anyway" of step 2).
3. **1 m**, the same reach as using a thing.

> **[Agent note]** **As built (2026-10-22):** `interaction.ts` (`update` takes her facing; `pointOf`, `showMarks`, `marked` for checks), `settings.interactMaxVerticalDeg` (60, tuning panel *Interaction*), `style.css` (`#prompt`, `.glyph`, `.mark`). At the owner's spot (`tools/prompt-choice-probe.js`): locker open, *Put on parka* active, circles on the boombox, the locker door and Dr. Kaufman; shut, *Open locker* active, the parka's circle gone; turned away, nothing. The other cases of *Done when* (galley, cockpit door and panel, the rack) were covered only by the smoke run's prompt checks. Found on the way: things right at her (the roof hatch overhead, open) were behind her by a few cm, so **within 40 cm across counts as in front** (`AT_HER`); the smoke script now turns her with the camera wherever it aims (it turned only the camera), and its roof-hatch check uses a level camera and widens the up/down angle too. Smoke: 83 passed, the 3 known failures.

> **[Agent note]** **Revised and built 2026-10-22** (owner: "both the camera and her facing should affect the selection; each its own cone; the last one used takes precedence"; then 1. up/down from the camera, 2. a very small, adjustable threshold, 3. the last wins, 5. the fallback to the other cone, to try; the rack: one circle on the top right jetpack, then the next offered; no circles from another room, e.g. Adam (Red) from the crew quarters). `interaction.ts`: `aimBy` (camera or facing), both cones scored per thing, the hold only while the same one aims (`targetBy`), `roomsOf` (from `ship.ts`), `group` (one circle); `jetpack.ts` orders the rack and groups it; settings `interactFacingAngleDeg` 45, `aimByCameraDeg` 0.3, `aimByFacingDeg` 0.3, `aimByStep` 0.003 (tuning panel *Interaction*). `tools/prompt-choice-probe.js`: facing picks the locker door, the camera turned to the parka takes it, a small turn of hers gives it back; no circle on Adam at the owner's doorway spot; the rack's one circle on `jetpack-2`. Smoke: 82 passed, the 3 known failures and the flaky boombox ring (item 74).

> **[Agent note]** **Then (owner, 2026-10-22):** the target's dot stays, full size, with the prompt centred above it; the others 40% smaller at 60%; the dots positioned with CSS `translate` (with `transform`, the smaller dots' `scale` scaled their position: they slid and jumped). **She only uses the rack's bottom right jetpack**, so the rack has one target and one dot; the groups are gone.

> **[Agent note]** **Then (owner, 2026-10-22):** the dots show within 2 m (`interactDotReach`, tunable), and the "in front of her" filter is gone: every prompt close to her shows (owner's spot by the galley: all three galley doors). The two cones still choose the target among what's within reach.

> **[Agent note]** **Then (owner, 2026-10-22):** the dots within 1.2 m; no dot on a character unless it's the target (`dotWhenTarget`).

## After

`features/interaction.md` (*Targeting*, the prompt's look), the code map, the backlog (item 56), `current.md`.
