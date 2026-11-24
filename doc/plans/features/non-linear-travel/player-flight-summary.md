# Summary: the player flies the ship (as discussed, 2026-11-23)

**Status:** *discussion*, nothing built. The details, the agent's notes and the open questions: [player-flight.md](player-flight.md). Open items: SC-197 in [`tasks.md`](../../../tasks.md).

## The idea

- The player **flies the ship**: the flight test's controls plus **steering left and right**.
- **A nav pointer** shows where to go; the player **may fly anywhere** and **land anywhere**.
- **Guardrails** stop crashes; **the flight can be skipped**.
- Conflicts with `scope.md` and the 2026-11-22 decision (no direct control): updated only if adopted.

## Who flies

- **Adam** (co-pilot and navigator, two bodies) sets the course; **nav points show on the pilot's screen too**.
- **Adam is the backup pilot:** getting up hands them the ship. Flying stays optional; she can walk round and talk while travelling.

## The problem: handing over

- **When does the player hand over and walk round?** Many character moments were meant for that time, and **skipping the flight would skip them**.
- **The owner's answer (2026-11-24), for the game** (the flight test keeps to the controls, navigation and signal): a prompt to take a break after the course change; a playable scene in the ship; sitting back down plays the time-passing cutscene; her seat's prompts hold her until the beats are met; available signals steer where she goes; Dr. Green refuses what doesn't fit. Flying isn't the focus.
- Agent's proposal: the player flies locally (search, approach, landing), **long legs are Adam's cruise**; a leg lasts as long as its content and **the skip skips only the waiting**; the crew call her when they want to talk.

## The world

- **The planet is large on purpose:** the game's size doesn't change; it can't all be travelled.
- **Chunks loaded and unloaded** as the ship flies; the neighbours **preloaded**.
- **Low-poly sites** on the treadmill, swapped for the full site close up.
- Agent's proposal: the treadmill as a floating origin carrying the chunks; most chunks made in code from a planet map, authored chunks only round the sites.

## Finding points of interest

- **The signal station finds points of interest in a quadrant**; they're **triangulated** and **handed to navigation**, which makes a **waypoint**.
- **Getting close to something:** **Dr. Ogawa says they've got a signal.**

## Landing

- **Anywhere**, even an empty spot. Each chunk's height field gives the landing check and the ground to walk on: no separate landed scene.

## Passing time

- **Exterior cutscenes** show time passing; **no chase camera**.
- The skip: Adam flies to the nav point while the cutscene plays and the destination loads.

## Still open

The play area's size; chunk size and how many authored; one `.blend` per region or per site; terrain kinds; what empty spots hold; near a site, Adam lands or the landing snaps; taking the controls back from Adam; when she hands over and what the skip skips; triangulating by flying or by tuning, and how close counts as close.
