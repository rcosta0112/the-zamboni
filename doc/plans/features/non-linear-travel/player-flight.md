# Discussion: the player flies the ship (an open world in chunks)

**Status:** *discussion* (owner, 2026-11-23). Not a plan yet: nothing gets built from it. Short version: [player-flight-summary.md](player-flight-summary.md). Builds on [the non-linear game](non-linear-travel.md), [taking off and landing](take-off-and-landing.md), [the planet's map](planet-map.md) and the [flight test scene](flight-test-scene.md). Open items: SC-197 in [`tasks.md`](../../../tasks.md).

> **[Agent note]** Everything below is the owner's (2026-11-23) unless it's tagged as the agent's.

> **[Agent note]** **Conflicts with the docs** (discussions aren't checked against them; listed so they're known if this is adopted): [`scope.md`](../../../architecture/scope.md) lists *Flying the ship* as out of scope (the crew pilot it in cutscenes only); the [decision log](../../../decision-log.md), 2026-11-22: the player takes off and lands but has no direct control in flight; [take-off-and-landing.md](take-off-and-landing.md): landing at nav points only, at a fixed place each. Adopting this needs dated *Update* notes on those.

## The idea

- **The player can fly the ship.** The controls stay those of the flight test (engines, tilt, thrust, gear…), **plus steering left and right**.
- **A navigation pointer** shows where to go, but **the player is free to fly anywhere**.
- **The player can land anywhere**, even on an empty spot.
- **Guardrails stop the ship from crashing.**
- **Time can pass:** the player can skip the flight if they want to.

## Who flies: Adam as the backup pilot

- **Adam is one person with two bodies**, so in most scenes they are both the co-pilot and the navigator. That's why they're asked to set the course.
- **Nav points are set in the navigation interface and show in the pilot's interface as well:** the pilot follows them.
- **Adam is the backup pilot.** That makes flying optional, and lets the player walk round the ship and talk to the crew while travelling.

> **[Agent note]** One mechanic for three needs: the course is shared, so whoever flies follows the same nav point. Getting up (B at her seat, as now) hands the ship to Adam, who flies on to the nav point; sitting down and taking the controls takes it back. The skip is Adam flying (below). Taking the controls while Adam flies could need an order (*"I have the controls"*), a placeholder line until the script has one.

## The problem: when does she hand over and walk round?

- **How does the player decide it's time to hand the controls to Adam and walk round the ship?** Many of the character interactions were meant to happen in these moments.
- **Skipping the flight would also skip the in-ship moments.**

**The owner's answer (2026-11-24; [flight test plan](flight-test-scene.md#the-run-in-the-game-owner-2026-11-24), for the game: the flight test itself keeps to the flight controls, navigation and signal processing):** the player flies the take-off, the course change and the final approach; **after the course change the game prompts a break**, a playable scene in the ship follows, and **sitting back down plays the time-passing cutscene**. **Her seat's prompts** keep her up until the story's beats are met (like *"I want some coffee first."*). **Flying isn't the game's focus:** the playable scenes carry the events and conversations. Where she can go is steered by **which signals are available**; visited waypoints are allowed as the story needs; **Dr. Green refuses** what doesn't fit (*"We don't have to go to that place right now."*).

> **[Agent note]** The ideas before the owner's answer, which can be combined; the agent's recommendation was the first three together.
> 1. **Split the flying by distance.** The player flies the **local** part: searching a quadrant for signals, the approach, the landing. **Long legs between quadrants are Adam's cruise** (5 min a quadrant is too long to steer anyway), and that's the time in the ship. The player doesn't have to decide to get up: setting a long course is the cue.
> 2. **A leg lasts as long as its content.** The ETA is shown, but the arrival waits for the leg's in-ship moments, or for the player asking to get there. **The skip skips the waiting, not the content:** it's offered once nothing is pending, or it warns first (*"Dr. Kaufman wanted a word"*), and anything skipped carries over (the conversation happens on arrival or on the next leg).
> 3. **The crew pull her in.** A crew member with something to say calls her on the comms or comes to the cockpit (*"Doctor, got a minute? Engineering."*); Adam offers to take over (*"I've got it. Go."*). A small mark on the comm shows who wants to talk.
> 4. **Some conversations happen while she flies:** someone leans into the cockpit, or speaks over the comms. They cover the player who never gets up, but not the walking round.
> 5. **Story lever (the owner's call):** some legs are Adam's by the story (a long night leg, a storm, she's needed elsewhere), so the in-ship scene happens for everyone.

## The planet's scale and the play area

- **The game's size doesn't change.** The player doesn't need to travel the whole planet.
- **The planet's large scale helps limit the scope:** it isn't feasible to travel everywhere.

> **[Agent note]** The numbers: at today's 360 m/s a 1° quadrant (about 111 km on an Earth-sized planet) takes about 5 minutes; once round the planet about 31 hours. So the play area is a handful of quadrants round the story's sites. Its edge can be soft: the crew turn the ship back with a line (*"Nothing out there for us"*), or the guardrails steer it home.

## The world: chunks loaded and unloaded

- **An open-world setup:** the planet is cut into **chunks**, loaded and unloaded as the ship flies across it.
- **The neighbouring chunks are preloaded**, which keeps the loading out of sight.
- **Low-poly versions of the scenes** (the sites) can be added to the treadmill, seen from afar.

> **[Agent note]** **The treadmill and the chunks work together.** The treadmill becomes the *floating origin*: the ship stays at the world's centre and the world moves round it, which keeps coordinates small (a browser's 32-bit floats jitter tens of km from the origin). The chunks are what it carries. Today's ground is already a small version of this: 400 m cells whose rocks come from their place ([scenery.md](../../../features/scenery.md)). New: cells kept, loaded, unloaded, and walkable.

> **[Agent note]** **How it could work:**
> - **A planet map is the source of truth:** a low-resolution map of the intro planet (land, sea, mountains, ice, terrain kind). The same map draws the navigation station's globe, so the map and the ground always agree. The planet is large enough that each region is flat: over the 3.4 km view the curve drops less than a metre.
> - **Most chunks are made in code**, not downloaded: the terrain kind from the map, the heights and rocks from the chunk's place. Cheap, endless, nothing to fetch.
> - **Authored chunks only round the sites** (the temple, landing places, set pieces): files from Blender that replace the made chunk there. Only these are preloaded over the network.
> - **The preload ring leans ahead of the ship.** At 360 m/s and chunks of 1–2 km, a new chunk every 3–6 s: making them in code keeps up; downloads and the GPU's upload need a per-frame budget (WebGPU stalls when much arrives at once, as with the single-sided switch).
> - **Low-poly sites:** a cheap stand-in seen from afar; the full site swaps in close up, during the landing or an establishing shot, so the swap is never seen.

## The signal station: finding points of interest

- **The signal station finds points of interest in a quadrant.** They're **triangulated** and **handed over to navigation**, which makes a **waypoint** of them.
- **It also tells the player they're close to something interesting:** **Dr. Ogawa says they've got a signal.**

> **[Agent note]** This makes the signal depend on where the ship is: a point of interest gives off a signal heard within some range, so flying into a quadrant (or near enough to a spot) is what makes Dr. Ogawa speak up. Triangulating fits free flight: the fix could firm up as the ship moves (two or more bearings from different places), or the tuning at the station does it in one go. To decide which. The hand-over is the crew's chain already in the [travelling interface](travel-interface.md): signal → navigation → the pilot's screen. When Dr. Ogawa is away (engineering in one scene), whoever sits at the signal station says it.

## Landing anywhere

- **The player can land anywhere**, even on an empty spot.

> **[Agent note]** The chunks make this possible: each one carries a height field, which is also cheap as collision (Rapier's height field). So whether the ship can land (flat enough, clear of rocks, not water) and walking outside both come from the chunk: **no separate landed scene**. This replaces today's split between the flying ground (the treadmill) and the landed ground, the biggest change to the structure. Today a rock can go through the landed ship: the landing spot needs its rocks cleared.

> **[Agent note]** Open: what an empty spot holds. Nothing makes the landing dead time; options: small finds for the scanner, rocks to scan, or getting out limited there (*"Nothing here, Doctor"*).

> **[Agent note]** **Story lever (the owner's call):** near a site, Adam takes over for the last approach and lands in a short cutscene. It hides the swap to the full site and keeps the ship's place, the ramp's direction and the crew's walks where the scenes expect them. Alternative: landing near a site snaps to its landing place.

## Guardrails

- **Guardrails stop the ship from crashing.**

> **[Agent note]** With analog steering, "wrong orders made impossible" ([take-off-and-landing.md](take-off-and-landing.md)) becomes a steady assist: a minimum height that follows the ground; climbing over mountains and sites by itself; the soft edge of the play area; landing refused where it isn't safe (the reason shown, as the locks do now). Gentle pushes rather than invisible walls, or it feels like fighting the stick.

## Passing time

- **Exterior cutscenes show time passing.** **No chase camera:** the flight is flown from the cockpit.
- **The player can skip the flight.**

> **[Agent note]** The skip is Adam flying to the nav point: the time-passing cutscene (a generated flyby) plays over any terrain, so it doesn't need the destination's chunks; they load meanwhile, and the cockpit comes back with the ship at its new place, or landed. Skipping needs a destination: with no nav point set there's nothing to skip to. **Route events** (the penguins) can't assume a route any more: they trigger by region (a quadrant) or by time in the air, and a skip passing through a region still plays its event.

## What else it changes

> **[Agent note]**
> - **The pad:** steering needs a stick held all the time, while the right stick looks round and the D-pad selects controls today; dialogue choices while flying compete for the same buttons.
> - **Seeing out:** low flying from the cockpit only is hard; the bottom view (pass 3b) matters for landing.
> - **The signal station gets better** (above): signals come from places, so free flight gives it something to find. The strongest argument for the feature.
> - **Saving:** a place and a chunk, no longer a scene id.
> - **Scene files:** the sites become places on the map with their own Ink, started by getting close or landing, not numbered scenes in order (SC-191).
> - **Cost:** a higher ship sees more ground (more to draw). Already there: turning (`flightHeading`), the rocks from their place, flybys that start wherever the ship is.
> - **Checks:** probes need a hook to put the ship at a place, and checks of the chunks' loading (nothing missing, no stall).

## Passes, if it goes ahead

> **[Agent note]** A **big task**; a stop after each pass.
> 1. **Steering and the nav pointer in the flight test**, on today's treadmill. Small; answers "is flying fun" first. Fits the flight test plan's pass 4 (navigation).
> 2. **Chunks made in code:** kept cells, the preload ring, height fields with collision, the frame's cost measured. No downloads.
> 3. **The planet map driving the terrain kind, and one authored chunk** (the temple) with its low-poly stand-in and the swap.
> 4. **Landing anywhere and walking outside** on any chunk; saving by place.
> 5. **The skip:** Adam flying, the cutscene, the destination loaded behind it.
>
> Pass 1 can join the flight test plan as it is; passes 2–5 need their own plan.

## Open questions for the owner

1. **The play area:** how many quadrants round the sites?
2. **The chunks:** their size; how many authored ones (the sites only, or landmarks too)?
3. **Authored chunks in Blender:** one `.blend` per region, or one file per site?
4. **Terrain kinds** beyond the ice plain (sea, mountains the ship climbs over)? That decides what the planet map holds.
5. **Empty spots:** anything to find there, getting out limited, or just quiet?
6. **Near a site:** Adam lands it (a cutscene), or the landing snaps to the site's place?
7. **Taking the controls back from Adam:** a spoken order, or just sitting down?
8. **Triangulating a signal:** by flying (bearings from different places), or by tuning at the station alone? And how close counts as "close" for Dr. Ogawa's call: the quadrant, or a range round each point?
9. **Handing over and skipping** (the problem above): *answered (owner, 2026-11-24)*: see the owner's answer above. The agent's pick: local flying by the player, long legs Adam's cruise; legs that last as long as their content, the skip skipping only the waiting; the crew pulling her in.
