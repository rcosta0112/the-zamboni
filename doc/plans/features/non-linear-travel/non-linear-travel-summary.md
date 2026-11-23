# Summary: non-linear travel (as discussed, 2026-11-22)

**Status:** *discussion*, nothing built. A short summary of four discussion docs; the details, the agent's notes and the open questions are in them: [the non-linear game](non-linear-travel.md), [the travelling interface](travel-interface.md), [the planet's map](planet-map.md), [taking off and landing](take-off-and-landing.md). Open items: SC-191, SC-192, SC-193 in [`tasks.md`](../../../tasks.md).

## The idea

- The game becomes **non-linear**: the player **visits locations** instead of playing scenes in a fixed order.
- **The goal:** a feeling of control, of moving around and exploring the planet, **without unnecessary friction or fail states**.
- Proposed shape (to decide): a linear start (to the temple), an open middle, a fixed end.

## Travelling: the cockpit

- **All the flight happens from inside the cockpit.** Dr. Green sits in **her seat (the co-pilot seat)** and switches between stations with the **bumpers**; the camera frames each station so its controls show.
- **The navigation and signal stations work through the crew:** each action is spoken to whoever sits there (*"Adam, please set a course to …"*, *"I got a signal from quadrant …"*). **Her seat's controls she works herself**, with no dialogue.
- **Two versions of the interface:** a 2D overlay, or the **stations' physical controls** (D-pad to select, A to use; the station models get the controls). To decide.
- **She can get up and walk around**; Adam flies the ship meanwhile. **B gets up** while her seat is selected.
- **An ETA clock.** **The exterior cutscenes stay for specific story moments.**
- **After the course is set and the ship turns, an external cutscene shows time passing**; then back to the cockpit view (owner, 2026-11-23).
- **Masking the loading:** low-poly versions of the sites (the temple, …), and an establishing shot of the area on landing if needed (owner, 2026-11-23).
- **The crew change places sometimes:** in one scene Dr. Ogawa works on the sensor array in engineering, Adam Red takes the signal station and Dr. Kaufman navigates.
- **References for the design:** *Elite Dangerous*, *Star Citizen*.

## The stations

| Station | Controls and displays |
|---|---|
| **Her seat** | Engines' position (a lever, animating between up and forward) · thrust (looks like a slider, a switch, animating between its extremes) · landing gear · **engines on / off** (a control of its own; owner, 2026-11-23) · cargo ramp · external lights · each control's state · **an altimeter** · **external views of the landscape** (parking-camera style, one looking down; very low resolution, every 10th frame) |
| **Navigation** | The map: pan, zoom out to the whole globe; the nav points; selecting one sets the course |
| **Signal** | **A band switch for the sensor array: signal or infrared** (owner, 2026-11-23) · two dials, like tuning a radio; a waveform display; **a radar screen**; tuning in finds signals, which become nav points |

## The map

- **Made from the intro shot's planet.** A **meridian picked at random once and kept**.
- **Quadrants of 1°**, named in **hexadecimal**: north–south **0–180** (0 the north pole), east–west **0–359** (eastward), three capital digits, a **dash** between: e.g. **`05A-0F3`**.
- A grid every 16° (`010`) on the globe; the agent keeps a table of the story's places and their quadrants.

## Taking off and landing

- **The player takes off and lands; Dr. Green flies the ship from her seat, but the player has no direct control** ([decision log](../../../decision-log.md), 2026-11-22).
- **The motion is simple:** up and down a fixed amount; forward in flight; a small bank when turning.
- **Take-off:** (engines on →) engines up → thrust up (the ship rises, then hovers) → engines forward → gear up. **Landing:** engines up (the ship stops and hovers) → gear down → thrust down (it settles on the ground) (→ engines off). Thrust works only with the engines up.
- **No fail states:** the ship can't crash (except in a cutscene or story beat). **Wrong orders are made impossible**; a character stepping in (*"Extending landing gear"*) is the last resort.
- **She can get up while the ship hovers.**

## Where the ship goes and lands

- **Landing at nav points only, at a fixed landing place each**; no empty spots so far. Never in the ocean, on mountains, over boulders or sites.
- **More points of interest:** signal spots, infrared spots (wildlife), and **random events that make the ship land** (spotting something): defined later.
- **Events on the route** between nav points: e.g. the penguins, where an infrared blip makes Dr. Kaufman change the course.

## Still open

- The game's shape; going back to visited sites; what moves the story on; the scene files' numbering (SC-191).
- Overlay or physical controls; the dials' design and how one turns on the pad; the map's pan and zoom on the pad; how the infrared band shows; where engines on / off falls in the order (SC-192).
- How many external views (waiting; SC-193). The ETA's place and the legs' length; skipping the wait; the time-passing cutscene: one shot or one per leg, the whole leg or part of it (SC-191).
