# Discussion: the travelling interface (the cockpit's stations)

**Status:** *discussion* (owner, 2026-11-22). Not a plan yet: nothing gets built from it. Part of [the non-linear game](non-linear-travel.md) (choosing where to go); split out of it on 2026-11-22 (owner).

> **[Agent note]** Everything below is the owner's (2026-11-22) unless it's tagged as the agent's.

## The idea

- **The player works the cockpit's stations from her seat**, moving between them; every action at the navigation and signal stations is **spoken to the crew member sitting there** (*"Adam, please set a course to …"*; *"I got a signal from quadrant …"*). Her own seat's controls she works herself, with no spoken order.
- **Two versions were drafted:** a 2D overlay with the stations' screens, or the **stations' physical controls** in 3D (the alternate). In the physical one, the **D-pad** selects a dial or button, **A** uses it, the **bumpers** switch station, the **camera** is placed so the station's controls are visible, and the **station models** get the controls added.
- **References for the design:** *Elite Dangerous* and *Star Citizen* (their in-cockpit screens and controls). Reference only; the interface stays the game's own.

## The stations

| Station (who sits there) | Controls | What using it does |
|---|---|---|
| **Her seat**, the co-pilot seat (Dr. Green) | **Engine rotation** (the thrusters' tilt) · **engine power** · landing gear (up / down) · **engines on / off** (a control of its own on the dashboard; owner, 2026-11-23) · cargo ramp (open / close) · external lights on / off | **She takes off and lands with the rotation and the power** ([take-off and landing](take-off-and-landing.md)). She works every control herself: no order, no dialogue. **B gets up** while this station is selected. **Displays:** each control's state, **an altimeter**, external views of the landscape, like a parking camera (one looking down), tiny and every 10th frame |
| **Navigation station** (Adam Red; Dr. Kaufman while Dr. Ogawa is in engineering) | The **map**: pan around it, **zoom in and out until the whole globe shows**; the known nav points; select a point | Selecting a point: *"Adam, please set a course to …"*; the ship turns that way, then **an external cutscene shows time passing** and the game comes back to the cockpit view (owner, 2026-11-23; [notes](non-linear-travel.md#after-setting-a-course-owner-2026-11-23)) |
| **Signal station** (Dr. Ogawa; Adam Red while he's in engineering) | **A band switch** for the sensor array: **signal** or **infrared** (two bands for now; owner, 2026-11-23) · **two dials**, like tuning a radio with two dials instead of one; a display showing a **waveform**; **a radar screen** | Tuning in finds a signal: *"I got a signal from quadrant …"*, and a new point on the map. The band picks what the array listens for: portal signals, or heat (the infrared spots: wildlife) |
| **Between stations** | The bumpers: previous / next station | The camera moves to that station's framing |

## The quadrants

Moved to its own doc (owner, 2026-11-22): **[planet-map.md](planet-map.md)**. Decided: north–south 0–180, east–west 0–359, hexadecimal, a dash between (e.g. `05A-0F3`); the meridian picked at random once and kept; the map made from the intro shot's planet.

## The agent's notes (no action yet)

- **Taking off and landing** (owner, 2026-11-22): **the player takes off and lands; Dr. Green flies the ship while she's in her seat, but the player has no direct control** (no stick steering: the rotation and power controls, and the ship answers). [Decision log](../../../decision-log.md). The engine power already drives the flames and the engine noise (the [landing shots](../landing-takeoff-shots.md)); the rotation needs the thrusters to tilt (in the ship file?). It can't go wrong: no fail states ([take-off and landing](take-off-and-landing.md#no-fail-states)).
- **The map:** a globe drawn from the intro planet's preset, on the navigation station's own screen (rendered by the game into the screen's texture). Pan and zoom need inputs while the station is selected: *proposed*, the left stick pans, the triggers zoom, the D-pad still steps between the station's controls. The nav points and the quadrant grid drawn over it; the ship's position and course too.
- **The signal station:** *proposed*, one dial coarse and one fine (or frequency and phase); the waveform goes from noise to a clean wave as both come close, and a locked wave gives the signal. The synth (as for the scanner) could make the radio's hiss and the tone. Turning a dial with the D-pad needs a rule (A grabs, the D-pad turns, A or B lets go; or one press, one step).
- **The band switch** (owner, 2026-11-23: signal and infrared for now): *proposed*, a two-position switch beside the dials, a step of the D-pad like the other controls; switching it is spoken too (*"Switching to infrared"*, by whoever sits there; lines yours). Each band finds its own kind of point (signal spots, infrared spots: [take-off and landing](take-off-and-landing.md#where-the-ship-can-land)). How the two bands look on the station's displays (the same waveform and radar, recoloured? a heat picture on the radar for infrared?) is open; more bands later would make it a rotary switch.
- **B is read in the game's naming:** the pad's **bottom** button (jump today; A, the right one, interacts), as `input.ts` names them. Jump does nothing while she's seated, so no clash. Related: SC-169 (0300's *[Y Get up]*).
- **The bumpers are free while she's seated** (they're the gadgets' buttons, and gadgets are put away when she sits).
- **Blender work for the owner:** the new controls on each station as separate objects with ids (the rotation and power levers and the switches on her seat; the two dials; the screens), so the game can select, highlight and animate them. Today's file has `Navigation Display`, `Signal Receiver.001`, `.002` and dials (`Dials.001`, `.003`, `Dial.008`, `.009`), the joysticks.

## Open questions for the owner

1. The overlay or the physical controls? (Physical in the [test scene](flight-test-scene.md), owner 2026-11-23.)
2. ~~The quadrants~~: decided ([planet-map.md](planet-map.md)).
3. ~~Take-off and landing by the player~~: yes, no direct control, and it can't go wrong (owner, 2026-11-22: [take-off-and-landing.md](take-off-and-landing.md)).
4. The dials: coarse and fine, or two different things? And the pad: how a dial turns.
5. The map's pan and zoom on the pad: the left stick and the triggers?
6. The sensor array's bands: does infrared use the same dials and displays as signal, shown differently, or its own? Is switching spoken, or does she work the switch herself (it's on the signal station, so spoken by the rule above)?
7. The engines on / off: where it falls in taking off and landing (see [take-off and landing](take-off-and-landing.md#the-controls-her-seat)).
