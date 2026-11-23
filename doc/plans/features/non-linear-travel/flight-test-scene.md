# Plan: a test scene for the flight interfaces

**Status:** *approved* (owner, 2026-11-23: "Let's build this"); **pass 0 built 2026-11-23**, for the owner's look. A **big task**: seven passes (0–6), a stop to assess after each.

**A prototype to find the design** (owner, 2026-11-23): not checked against the other docs. If it works, the docs change to follow it.

## Goal and scope

A test scene to try every flight action from the cockpit: **taking off, landing, navigating, tuning the signal, and the crew's dialogue**, with **physical controls** (owner, 2026-11-23). It loads straight into the cockpit, with no start screen.

**In:** a copy of the first playable scene (`chapter-1`) with what isn't needed taken out; the owner's cockpit controls from **their own `.blend`**, imported once ready; the stations and controls, the ship's simple motion, the course-change cutscene, test lines in Ink; the relevant checks copied for the page.
**Out:** walking the rest of the ship (*B gets up* stands her up in the cockpit), the real sites (the travel terrain outside), final art, the real script, the game's structure (hub, locations, saving), the external views beyond one bottom view to measure.

## Ground rules

- In 0.0.2, as a dev page (`flight-test.html`, listed in `tools.html`); its files in `public/test/flight-test/`.
- The ship's exports untouched: the scene uses `zamboni-ship.glb` and `zamboni-crew.glb` as they are; the controls come in as a separate file placed in the ship's coordinates.
- Test lines are placeholders, marked as such, in a test Ink file (`public/test/`); never the owner's copy.
- Gamepad first, keyboard second.

## The work

**Pass 0: the scene and the page** (agent build ≈ 45 min · 1 round)
- `public/test/scenes/flight-test.json`, copied from `public/scenes/chapter-1.json`: the crew seated, her seated, the travel terrain; out: the opening watch (`begin`), `getUp`/`sitDown`'s story and scene change, the viewport's `whenClosed`, the coffee and anything else of chapter 1's that gets in the way.
- `flight-test.html`: starts the game straight into that scene (no start screen, no save read or written), the tuning panel on.
- **The checks copied** for the page: the probes that cover what it uses (to confirm: `piloting-probe.js` (seated, the joystick, getting up), `look-probe.js` (the crew looking at her), `seat-probe.js`, `conversation-probe.js`), run with the page instead of `?scene=`; then a `flight-test-probe.js` that grows with each pass.
- > **[Agent note]** Built 2026-11-23. Those four probes run on the checks' story or chapter 1's (Kaufman on the couch, the save, chapter 1's lines), so their parts that fit the page went into one `flight-test-probe.js` (22/22) instead of copies; `probe-01.mjs` takes `--page flight-test.html`. The page still shows the start screen's bar while loading, then goes in by itself. The game's story is used (the crew's *Talk to* lines are chapter 1's) until pass 6's test Ink. She can still walk the whole ship.

**Pass 1: the controls file** (≈ 45 min · 1 round; when the owner's file is ready)
- `npm run export:flight-controls`: the owner's controls `.blend` → `public/test/flight-test/controls.glb` (Meshopt, the palette; no gate at first). Loaded onto the ship, found by id.
- Until it's ready, passes 2–3 run on stand-in boxes made in code, with the same ids, at the stations.

**Pass 2: the stations** (≈ 1 h · 1–2 rounds)
- Bumpers: previous/next station, the camera to the station's camera.
- > **[Agent note]** Started 2026-11-23 (owner): **Tab / Shift+Tab** cycle the game camera → pilot → navigation → signal; each camera at the seated character's head bone root, turned to centre the console; nudges on the tuning panel (*Flight test: stations*, *Copy values*); lens 90° by default, and the player looks round from the station (mouse, right stick; owner, 2026-11-23). Then (owner, 2026-11-23): R1 / L1 switch stations too; the third-person view out of the cycle (seated: a station's camera, the pilot's first; standing: the game camera); the owner's camera values the defaults (second round too); each station's look kept when switching; *Get up* only at the pilot's station. In this scene the left console (the map's side) has Adam Red and the right one (the receivers) Dr. Ogawa, so those are navigation and signal for now (pass 6 seats Dr. Kaufman and Adam Red there). Bumpers not yet (L1 / R1 are the gadgets' zoom and use). D-pad: select a control (highlighted); A: use it; B at her seat: stand up in the cockpit, A on the seat sits her back. Keyboard equivalents.
- **Selecting controls (owner, 2026-11-23):** the **meshes already in place**, no stand-in boxes: the consoles' objects kept out of the per-room merge on this page only, split into their loose parts at load, the obvious ones (a few cm to half a metre, nested parts one control) made controls, each its own mesh so it can move. **The D-pad moves by direction** (the nearest control that way on screen); each station keeps its selection. **The highlight: an outline** round the selected control, a yellow in the palette's key (the palette texture has no yellow; tunable on the panel). **The mouse:** a 2 × 2 light grey cursor at the screen's centre; the control under it is highlighted; a click uses it, click and drag turns a dial. **A** uses (a dial: A grabs, the D-pad turns, A or B lets go); **B** lets go of a dial, otherwise gets up (pilot's station only; *Get up* no longer on A). A real list of controls once the owner has redesigned the panels. Also: the joystick keeps her piloting loop's motion while her model is hidden at the pilot's station.
  > **[Agent note]** Built 2026-11-23 (`src/flight-test/controls.ts`): pilot 83 controls, navigation 25, signal 77 (some panel frames and decorative arcs among them: fine for a test). The D-pad steps, A / Enter, a dial grabbed and turned, B / C / Backspace; the mouse's cursor, hover and drag built but only tried by the agent's pick, not with a captured mouse. Dials are told by name or shape (round, many-sided), so gauges count as dials. The joystick already followed her loop while hidden (measured, 6.9° to 8.6°): nothing changed there. Probe 50/50; smoke 83 + the 4 known. Then (owner, 2026-11-23): **a small label next to the selected control**, placeholder text (its kind and number) until the controls are named; probe 51/51.
  > **[Agent note]** **Approved** (owner, 2026-11-23). The owner: "the joystick does not move". The turning node was hidden: the per-room merge (SC-180 step 3, 2026-11-18) drew a still copy of it, in the game too, because the joystick wasn't among the ship's moving parts. Fixed in `ship.ts` (the `Joystick` node is now with the parts that move; its shadow moves too); the probe checks that the drawn stick is the turning one, 52/52.

**Pass 3: her seat: taking off and landing** (≈ 1.5 h · 2 rounds)
- Each control animates between its two poses; the locks (a control won't move until the step before it is done, a light shows why); Adam's step-in line as the last resort.
- The motion: up/down the fixed amount, hover, forward, the engines' tilt; the altimeter; engines on/off driving the flames and noise. One bottom view (tiny, every 10th frame), measured.
- > **[Agent note]** **Pass 3a built 2026-11-23, approved by the owner the same day** (`src/flight-test/flight.ts`). Owner, 2026-11-23: **the controls on the tuning panel for now** (folder *Flight test: her seat*), until the controls file (SC-196): engine power, engine tilt (down / forward), thrust (0–1), gear up, ramp open, lights (no lights in the ship yet: does nothing). It starts landed on the travel terrain, engines off. **Tilted down**, thrust sets the hover height (0 → the ground, 1 → 30 m); **tilted forward**, it climbs to the cruising height (110 m) and thrust is its speed; with the gear up it stops at 4 m. Climb up to 8 m/s, at least 1.2 m/s until it's there; engines spool 2.5 s, gear and tilt 4 s each. **Locks** (refused, the control put back, the reason on the panel's *lock* line and a red note on screen for 4 s): engines on only with the ramp closed, off only on the ground; thrust only with the engines up; gear up from 4 m, down only tilted down; tilt forward only with the gear up and from 10 m; the ramp only landed with the engines off. Drives the gear, the turbines (the landing's 90° / 115° down), the engine noise and the flames (seen only from outside). The *altimeter*, *climb*, *speed* and *state* readouts on the panel until the screens exist. Probe 79/79 (refusals, take-off, cruise, landing). **Not yet:** the controls' two poses (they need the file), Adam's step-in line (with pass 6's test Ink), the bottom view (pass 3b). The ship over hills and rocks lands wherever it is (a rock can go through it).

- > **[Agent note]** **A 2D overlay** (owner, 2026-11-23: "a quick 2d overlay for the controls: just buttons and sliders with text labels in them, semi-transparent, each station its own"; built the same day, `src/flight-test/overlay.ts`). Pilot: the six controls above, through the locks; navigation (nav points 1–3, map zoom) and signal (band, dial 1, dial 2): placeholders for passes 4–5, driving nothing yet. While it's on it takes the D-pad and A and the 3D controls step aside; the panel's *Flight test: overlay* turns it off (the 3D selection back). Probe 87/87.

**Pass 4: navigation** (≈ 1.5 h · 2 rounds)
- The map on its screen: the globe from the intro planet's preset, the quadrant grid every 16°, test nav points; pan (left stick), zoom (triggers).
- Selecting a point: the spoken order (test line) → the ship turns, banking → **the time-passing cutscene** (a flyby reused) → back to the cockpit; the ETA shown; arriving.

**Pass 5: the signal station** (≈ 1.5 h · 2 rounds)
- The band switch (signal / infrared), the two dials (A grabs, D-pad turns, A or B lets go), the waveform clearing as they near, the radar; a lock → the spoken line → a new nav point (an infrared spot in infrared).

**Pass 6: the crew and dialogue** (≈ 1 h · 1–2 rounds)
- Who sits where as Ink state: Dr. Kaufman at navigation, Adam Red at signal, Dr. Ogawa away (a switch on the page); the spoken lines picked by who's seated; a test conversation while flying.

Total ≈ 8.5 h of agent build, about 10 review rounds of 10–20 min.

## The controls file (the owner's Blender work)

A separate `.blend`, in the ship file's coordinates and scale (1.22's), the cockpit appended or linked for reference only (not exported). One object per control, origin at its pivot, at rest; custom properties `id`, `kind: flight-control`, `station` (`pilot`, `navigation`, `signal`). Levers and switches: their two poses as an action. Screens: flat meshes with a UV square (the game draws into them).

| Station | Ids |
|---|---|
| Her seat (`pilot`) | `ctl-engine-tilt` (lever), `ctl-thrust` (slider), `ctl-gear`, `ctl-engines-power` (on/off), `ctl-ramp`, `ctl-lights`; screens `scr-states`, `scr-altimeter`, `scr-view-bottom` |
| Navigation | `scr-map`; any buttons as `ctl-nav-*` |
| Signal | `ctl-band` (signal/infrared), `ctl-dial-1`, `ctl-dial-2`; screens `scr-waveform`, `scr-radar` |
| Cameras | `cam-station-pilot`, `cam-station-navigation`, `cam-station-signal` |

## Done when

- Agent: each pass's probe, `npm run check`, screenshots; the smoke once at the end (the game itself untouched).
- Owner: plays http://localhost:5202/flight-test.html with the pad: takes off, flies to a nav point, tunes in a signal in both bands, lands; hears the crew answer.

## Answered (owner, 2026-11-23)

1. Instead of a separate cut-down `.blend`: **a copy of the first playable scene**, things not needed removed; the cockpit controls in a separate file, imported when ready. The relevant checks copied for the page.
2. **Physical controls** in this build.
3. The ids and properties above: fine.
4. The time-passing cutscene: a flyby reused.

## After

If it works: a `doc/features/` page for the flight interfaces, the discussion docs and the rest of the docs changed to follow it; `tools/README.md`, `CODE-MAP.md`.
