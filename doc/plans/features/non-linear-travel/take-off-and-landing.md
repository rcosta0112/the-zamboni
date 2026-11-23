# Discussion: taking off and landing from the cockpit

**Status:** *discussion* (owner, 2026-11-22). Not a plan yet: nothing gets built from it. Part of [the travelling interface](travel-interface.md) (her seat's controls and the displays) and [the non-linear game](non-linear-travel.md) (where the ship can land); the quadrants in [planet-map.md](planet-map.md).

> **[Agent note]** Everything below is the owner's (2026-11-22) unless it's tagged as the agent's.

## The goal

**Give the player a feeling of control:** of being able to move around and explore the planet, **while removing any unnecessary friction or fail states.**

## How the ship moves (kept simple)

- **Take-off and landing:** the ship moves **up and down a fixed amount**.
- **Flying:** the ship moves **forward**.
- **Changing course:** the ship **turns, banking a little**.

## The controls (her seat)

- **The engines' position is a lever** that animates between its two extremes (up, forward).
- **Thrust looks like a slider but is a switch:** it animates between its two extremes too. No speed control in flight.
- **The thrust slider is locked to the engines' position.**
- **When landed, the engines must point up to enable the thrust control.**
- **The engines are turned on and off with a control of their own** on the dashboard (owner, 2026-11-23).
- **The player can get up while the ship hovers** (Adam holds it).

**Taking off**
1. Point the engines up (if they aren't already).
2. Increase thrust: the ship goes up, then hovers.
3. Point the engines forward.
4. Retract the landing gear.

**Landing**
1. Point the engines up: the ship stops moving forward and hovers in place.
2. Extend the landing gear.
3. Decrease thrust: the ship moves down until it touches the ground.

## No fail states

- **The ship can't crash.** If it does, it's part of a cutscene or a story beat. **The player can't fail at flying.**
- **Wrong commands are made impossible** where we can: the controls only work in the right order.
- **A character stepping in is the last resort:** landing with the gear retracted, Adam says *"Extending landing gear."*

## The displays

- **Displays show the state of each control.**
- **A few displays with external views, including a bottom view.** They show **the landscape outside, not the ship**: like a parking camera. **Very low resolution, updated every 10th frame.**
- **An altimeter** at the pilot station (her seat).
- **A radar screen** at the signal station.
- **The external shots** (the exterior cutscenes) **are used at specific moments of the story.**

> **[Agent note]** **Performance (flagged), with the owner's answers:** each external view is the landscape drawn a second time, from a camera on the hull, into the display's texture.
> - **Cheap now:** landscape only (no ship, no interior), tiny (e.g. 160 × 90 or less), every 10th frame: on average a tenth of a view's cost. **One view a frame in turn** (view 1 on frame 1, view 2 on frame 2…), so no frame draws them all at once; on the frame a view is drawn it adds roughly the terrain's draw calls (well under the outside view's 257, [optimisation](../optimization.md)).
> - Also: drawn only while its display is on screen; no shadows in them.
> - **The radar, the altimeter** and the control-state displays are cheap (2D drawings, numbers, lights).
> - How many views: waiting (owner, 2026-11-22). A quick measurement in the cockpit once there's one.

## Where the ship can land

- **Landing at a nav point** (option B of the [discussion](non-linear-travel.md)): landing works once the ship has arrived, **at a fixed landing place** (owner, 2026-11-22).
- **With one caveat: more points of interest on the map:** **signal spots** and **infrared spots** (places with wildlife). And **random events that make the ship land**, like spotting something visually. Those are defined later.
- **No landing** in the ocean or on mountains; **none over boulders or sites** (the fixed places take care of it).
- **No empty spots so far:** every place the ship can land has something there.
- **Events on the route** between nav points can add a point and change the course, e.g. the penguins (owner, 2026-11-22): [non-linear-travel.md](non-linear-travel.md#events-on-the-route-owner-2026-11-22).

## The agent's notes (no action yet)

- **The engines on / off in the order** (*proposed*, to confirm): on is the first step of taking off (before the engines point up; the thrust locked while they're off), off the last step of landing (once the ship is down, thrust at its lowest). Off is locked while the ship is in the air, so it can't fall. Off = no flames, no engine noise (the engine power already drives both). Whether the engines are already on when a scene starts on the ground is story state.
- **The ship's answer to the two switches:** engines up = hover, thrust moves it up or down the fixed amount; engines forward = flight.
- **Making wrong orders impossible:** each control is locked (doesn't move, a light shows why) until the step before it is done; Adam's line only where a lock would feel wrong. One rule per control; the lines are the owner's.
- **The fixed height** shows on the altimeter: a hover height (e.g. 20–40 m, a guess), the same for every take-off and landing, so the outside is drawn knowing the ship never climbs higher than that while hovering.
- **Seen from inside:** with the ship level (no tilt) during take-off and landing, the interior and the characters stay simple; the motion is shown by the outside moving past the windows, the bottom view, the altimeter, a camera shake and the engine sound (which already follows the engine power).

## Open questions for the owner

1. ~~The engines' position~~: a lever animating between its two extremes (owner, 2026-11-22).
2. ~~Thrust in flight~~: a switch that looks like a slider, animating between its extremes; no speed control (owner, 2026-11-22).
3. How many external views, and which besides the bottom one? (Waiting: owner, 2026-11-22.)
4. ~~Empty spots~~: none so far; landing at fixed places (owner, 2026-11-22).
5. ~~Getting up while hovering~~: yes (owner, 2026-11-22).
6. The engines on / off: the first step of taking off and the last of landing, locked in the air (the agent's proposal above)?
