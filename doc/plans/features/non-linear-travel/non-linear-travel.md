# Discussion: a non-linear game (visiting locations instead of playing scenes in order)

**Status:** *discussion* (owner, 2026-11-22; the travelling interface's first draft added the same day). Not a plan yet: nothing gets built from it. Once the questions at the bottom are answered it becomes a decision-log entry and a plan in passes; the plan checks it against the docs (owner, 2026-11-22: conflicts aren't tracked in the discussion).

> **[Agent note]** The owner's idea (2026-11-22): instead of scenes played in a fixed order, the player visits **locations**. A gameplay element chooses where to travel: (1) maybe just **asking Adam to set the course**, or (2) an interface built on the **navigation station** where the player sets the course, with the **scanner array** used to scan for signals and other points of interest. The rest of this page is the agent's: what it would change in the game's structure, the options, and the questions.

## What would change in the structure

**1. The game's shape.** The recommended shape is **fixed ends, an open middle**: a linear start (0050 → 0700, the temple, as today: it teaches walking, the ship, landing), then a middle where the player picks from a few destinations, then a fixed end that the story triggers (e.g. *Blue runs away*, *Going after Adam*). The other shapes are in *Options*.

**2. Locations instead of scenes.** A **location** is somewhere the ship can land (the temple, the penguins' pond, the drone's crash site, a camp spot…) plus **travelling** itself. A location has its site file (the exterior slot in [levels](../../architecture/game-architecture/levels.md), unchanged), its landing and take-off shots (the [flight shots](../flight-shots.md) are already reusable: that fits), and its **beats**: what happens on arrival, while there, and on leaving, each with a condition on the story state.

**3. Travel beats.** Conversations in the flying ship (*Adam acting weird*, *the clogged analyser*) stop belonging to a leg of the journey and come from a pool, picked by **progress** (how many places visited, what's been seen), not by destination. Adam's arc (they slowly diverge) then reads the same in any order.

**4. Story state in Ink, as now.** It already holds all the state ([saving](../../architecture/game-architecture/saving.md)). A hub knot lists the known destinations as choices (`* {penguins_known} [The penguins] -> penguins`); visit counts and a *progress* number drive the travel beats and the end. Nothing in the save format changes: the checkpoint becomes *a location, or travelling*, plus Ink's state.

**5. Points of interest: known, then visited.** A destination becomes known through the story (Ogawa's blip, *"Please set a course for the penguins"* in [Penguins](../../../story/scenes/notes/penguins.md)) or by scanning (option 2 below). Each has a state: unknown → known → visited (→ done). The mission data on the comm can list them too.

**6. Loading gets easier.** The next site can't be guessed ahead of time, but once a course is set the flight (cutscene + walking the ship) is the loading time for that site: a natural preload window ([loading](../../architecture/game-architecture/loading.md)).

**7. The writing gets harder.** Every site's lines have to read right whether it's visited first or last; a line naming another place needs a condition. More variants to write and test. Repeat visits (already in scope: *6 to 10 scenes, some repeat locations*) need something new each time, or a short *"nothing new here"*.

> **Story lever:** the fewer destinations open at once (2–3), and the more each site's content stands on its own, the less of this there is to write and test. A middle of three sites in any order is much cheaper than six.

## Options

**The game's shape**

| Option | Cost | Risk |
|---|---|---|
| **A. Fixed ends, open middle** (recommended) | moderate: the middle sites written order-free | the middle's length varies with the player |
| B. Chapters, each a small open set (2–3 sites in any order), the chapter ends after enough of them | the most writing control | more structure to build (chapter gates) |
| C. Fully open from the start, the end triggered by progress | the most freedom | the hardest to pace in an hour; the start teaches nothing |

**Choosing where to go**

| Option | Cost | Risk |
|---|---|---|
| **1. Ask Adam** (a dialogue choice: *"Adam, set a course for…"*) | small: the dialogue system and Ink choices already exist; Adam's in the cockpit | not much gameplay; the choice can feel like a menu inside a conversation |
| **2. The navigation station** (a screen at the station: a map of the known points, the course set there; the scanner array scans for new signals) | large: a new gamepad-first UI (Figma first), a map, the scan as a small game, the art of the station's screen | the most new work; risks becoming a minigame that's tested more than the story |
| 1 then 2 (recommended) | 1 now, 2 if 1 plays well | 2 may never come |

Option 2 fits the world well: the mission is *finding faint, erratic portal signals* with the ship's sensor array ([story overview](../../../story/overview.md)), Ogawa runs it, and it can make the destinations something the player *finds* rather than picks from a list. A middle way: the station shows the map and the signals, but the course is still set by asking Adam (or Ogawa) there.

## The travelling interface

Moved to its own doc (owner, 2026-11-22): **[travel-interface.md](travel-interface.md)**: the stations and their controls, the quadrants, the references. In short: the course is chosen at the cockpit's stations, every navigation and signal action spoken to the crew member there; her own seat's controls she works herself.

## Flying from inside the cockpit (owner, 2026-11-22)

> **[Agent note]** The owner's points, as given (with the physical-controls version):
> - **All the flight happens from inside the cockpit**, the player switching from station to station.
> - An **ETA clock**.
> - The player can **get up and walk around**; **Adam takes control of the ship**.
> - **Take-off and landing from inside the ship**: to figure out.
> - The **exterior cutscenes stay for specific game beats**.
> - **The characters switch places sometimes.** In one scene Dr. Ogawa is down in engineering working on the sensor array, Adam Red takes his place at the signal station, and **Dr. Kaufman navigates**.

> **[Agent note]** Notes on it (no action yet):
> - **It fits the travelling section as it is** ([`overview.md`](../../../overview.md): walking the ship while it flies). The flight becomes the time between choosing and arriving, and the conversations fill it.
> - **The ETA clock:** where it shows (a cockpit screen, the comm, the HUD?), and how long a leg takes in real time. In a one-hour game, legs of a few minutes at most; what happens when it reaches zero (Adam announces it; landing waits for her at her seat?). Can she sit and skip ahead?
> - **Take-off and landing seen from the cockpit** is the hardest part: the ship's motion felt inside (the scenery moving past the windows, a camera shake, the engine sound already follows the engine power), and the **travel terrain turning into the landing site** while she watches through the windshield, with no cut to hide the swap ([levels](../../architecture/game-architecture/levels.md): the exterior slot). A short cut (a fade, a cutscene beat) at the moment of the swap is the cheap way out.
> - **Who sits where is story state:** the scene setups already place characters (the `place` command); each character needs a **seated pose per station** they can take (Dr. Kaufman at navigation, Adam Red at the signal station: Blender work), and Dr. Ogawa's working pose in engineering (0700's script already has him there working on the scanner array).
> - **The spoken orders follow who's at the station:** *"Adam, please set a course…"* becomes *"Dr. Kaufman, please set a course…"*; each mediated line needs a version per crew member who can sit there. Writing (yours) and a rule in Ink that picks the line by who's seated.

## After setting a course (owner, 2026-11-23)

**Once the player sets the course and the ship turns onto it, an external cutscene plays to show the passage of time. Then the game goes back to the cockpit view.**

> **[Agent note]** Notes on it (no action yet):
> - **It covers the swap.** The cutscene is the cut the take-off and landing note above was looking for: the travel terrain can turn into the next site's (and the site start loading) while it plays ([loading](../../architecture/game-architecture/loading.md)).
> - **The same shot every leg, or one per leg?** One reusable flyby (the [flight shots](../flight-shots.md) and the flybys already exist) costs one shot; per-destination shots (the landscape under the ship changing) cost one each. Repeats would want to be short, or skippable.
> - **The ETA after it:** does the cutscene take up the whole leg (back in the cockpit on arrival, ready to land), or part of it (back in the cockpit with time left to walk the ship and talk)? The second keeps room for travel beats and events on the route; the first makes the ETA clock barely needed.
> - **Related:** *the exterior cutscenes stay for specific game beats* (above): this adds one at every course change.

**Masking the loading (owner, 2026-11-23):**
- **Low-poly versions of the external scenes** (the temple, …) can be used to mask loading.
- **An establishing shot of the area whenever the ship lands**, if necessary.

> **[Agent note]** (no action yet) The low-poly site can show in the time-passing cutscene and through the windows on arrival while the full site loads, then be swapped for it (a cheap model per site, from the site's file; the swap under a cut or at a distance where it doesn't show). The establishing shot, played on landing, is a second cut to hide that swap behind; with both, the landing never waits on the load.

> **Story lever:** fewer seating arrangements (one or two swaps in the game) and short legs keep the poses, the line variants and the ETA's waiting down.

## Where the ship lands

Option B (at a fixed landing place for each point; no empty spots so far), with more points of interest (signal spots, infrared spots for wildlife, random events that make the ship land) and no landing in the ocean, on mountains, over boulders or sites (owner, 2026-11-22): [take-off-and-landing.md](take-off-and-landing.md#where-the-ship-can-land).

## Events on the route (owner, 2026-11-22)

**We'll have the option to add events that happen on the route between nav points.** It fits the [Penguins](../../../story/scenes/notes/penguins.md) scene: on the way somewhere, Dr. Ogawa sees a blip in the infrared, and Dr. Kaufman has Adam set a course for the penguins.

> **[Agent note]** How it could work (no action yet): an event is a beat with a condition (the story so far, which leg, part-way along it), started during the flight; it can start a conversation, **add a nav point and change the course** (the penguins: an infrared spot, the ship turning toward it, a new ETA), or lead to a landing (the *random events that make the ship land* in [take-off and landing](take-off-and-landing.md#where-the-ship-can-land)). Events written for specific legs, or a pool picked by progress like the travel conversations.

## Open questions for the owner

1. Is the start (0050 → 0700) still linear, and the end fixed? Which scene ends the open part?
2. Which shape: A, B or C?
3. ~~Choosing: Adam, the navigation station, or Adam first?~~ The cockpit interface, mediated by dialogue (owner's first draft, 2026-11-22). Its questions are in [travel-interface.md](travel-interface.md#open-questions-for-the-owner).
4. Can the player go back to a site already visited? Does anything happen there?
5. What moves the story on: a number of places visited, specific places, or both?
6. ~~Who in the crew answers~~: whoever sits at the station (Adam, or Dr. Kaufman navigating while Dr. Ogawa is in engineering and Adam Red takes the signal station: owner, 2026-11-22). Script is yours.
7. The scene files' numbers: keep them for the fixed start and end, and name the middle's by location? (Your files; not changed until you say.)
8. Flying from inside: where the ETA shows and how long a leg lasts; can she skip the wait? (Take-off and landing: from inside, by her, [take-off-and-landing.md](take-off-and-landing.md); the external shots for story moments.)
9. The time-passing cutscene: one shot reused, or one per leg? Does it cover the whole leg (arrival) or only part of it?

## After (if it goes ahead)

A decision-log entry; `overview.md` (structure, *mostly linear*), `scope.md`, [game structure](../../architecture/game-architecture/game-structure.md) (locations and beats), [saving](../../architecture/game-architecture/saving.md) (the checkpoint), [levels](../../architecture/game-architecture/levels.md) and [loading](../../architecture/game-architecture/loading.md) (the preload on setting a course); then a plan in passes, starting with a test hub in Ink with placeholder lines.
