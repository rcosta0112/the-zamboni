# The jetpack with momentum: hover, flight, glide and skid (item 39)

**Status:** draft 2026-10-14. Third version, rewritten around the owner's momentum model ("similar to the ship in Asteroids"). It replaces the two earlier drafts of the same day; their answers that still apply are folded in below. **Approved 2026-10-14** ("let's build it": the recommendations on the three open questions). **Built 2026-10-14.** What exists: [`../../features/interaction.md`](../../features/interaction.md#flying). Changes from the plan, found while building:

- **In flight, up and down follow the camera's aim** at `flyVerticalFollow` (2/s), more tightly than the drag. Under the drag alone, a climb left over from hovering carried her about 3 m on up.
- **The glide's fall limit** goes from 6 m/s at top speed to 12 m/s at her run speed. It doesn't loosen to nothing: it loosened too fast, and she fell at 12 m/s early in the glide.
- **A wall takes her speed only after three blocked steps.** Rapier's character controller now and then stops her for a step or two on open ground while she's pressed into it at speed.
- **Eleven new values, not ten:** `flyVerticalFollow` is the eleventh.

## Goal

From the owner (2026-10-14). On the controller, flying forward she keeps climbing. That's pass 6b's rule: R2 sets her height and the stick only moves her horizontally. Instead:

- **Two modes with the jet on:**
  - **Hover:** R2 moves her up and down gently. The stick lets her drift a little in any direction.
  - **Flight:** she accelerates in the direction the stick points, the camera's direction for forward. Her speed is momentum: changing direction accelerates her the new way, and she keeps the speed she had.
- **Her speed picks the mode.** Fast enough, she flies. Slow enough, she hovers.
- **R2 let go:** she stops accelerating, glides down, and loses momentum. Once she's slow, she's as if hovering when the jetpack cut out: she falls.
- **The ground:**
  - Jet off: touching the ground at speed (while gliding, or after), she skids to a stop.
  - Jet on: touching the ground at speed slows her a bit, but doesn't stop her.
- **No damage in this game:** skidding off a ledge, or into a wall, is fine (the owner: "a skid off a ledge sounds really fun").

## Scope

- **In:**
  - Hover, flight, the switch between them, the glide, the skid, and the jet on the ground.
  - The camera's lower limit, and the jet sound and glow.
  - The same rule for **Space and a digital R2**. They count as R2 held fully (the owner: they get the glide too).
  - Values in the tuning panel. The panel's jetpack settings left over from pass 6b go.
- **Out:**
  - **Animations for the new moves:** drifting sideways or backward, gliding, skidding. The *Flying* clip covers flight and hover, and the falling clip covers the glide. A skid shows her standing. The owner: adjust later if needed.
  - **Fuel.** **Damage** (there's none in this game).

## Constraints from the docs

- **Pass 6b** ([`../backlog-passes.md`](../backlog-passes.md#pass-6b-hovering-on-an-analog-r2-gamepad-only-and-the-flying-animation)) and item 21:
  - This plan **replaces** pass 6b's rule (R2 sets the height, the stick only moves her horizontally).
  - It also replaces the tuning panel's other two R2 modes (*acceleration*, *Part 1's rule*). The owner agreed (2026-10-14).
  - An *Update* to pass 6b's entry in the decision log.
- **Part 1's flight rule** (`character.ts`, `fly`):
  - **Speed is no longer one number along her facing.** It's a velocity that thrust and drag change.
  - **With Space held and the stick at rest**, she rises at 5 m/s, as R2 held fully does in hover. That's the same as Part 1's rise (a quarter of fly speed).
  - **Letting go:** the glide replaces "falls from a standstill, carries on at her speed, which slows to her run".
  - All three go in the same *Update*.
- **She flies only while wearing a jetpack** ([`interaction.md`](../../features/interaction.md#the-jetpack-rack)). Unchanged.
- **No flying indoors in the game** ([`scope.md`](../../architecture/scope.md)). It stays on in the prototype for testing (the owner), so nothing is tuned for the ship's rooms.
- **The auto-parachute** ([`interaction.md`](../../features/interaction.md#the-auto-parachute)) still fires after a long fall, glides included. A glide sinks at up to 6 m/s, more than the burst's landing speed (2 m/s), so it still brakes, with less to do. She keeps her horizontal momentum through it and skids on landing.

## How it works

### Her velocity

While the jet is on, gravity is off, as in Part 1. Her velocity (horizontal and vertical) carries over from step to step.

- **Hitting something** takes away the part of her velocity that went into it. Sliding along a wall she keeps the rest. Head-on, she stops, and is then slow enough to hover.

### The two modes, and the switch

- **Into flight** when her horizontal speed passes `cruiseSpeed` (4 m/s).
- **Back into hover** only when she's below `hoverDriftSpeed` (1.5 m/s) **and** the stick is inside its drift range (`hoverStickShare`, the first 60 % of its travel).
  - So thrusting through zero in a reversal keeps her in flight. In hover, R2 fully pressed means climb, so a reversal through hover would lift her a few metres every time.
- **The handover is eased** over `flightBlendTime` (0.3 s), so no control changes hands in one step. The share in flight, *w* (0 to 1), also drives the camera, the sound and the glow.

### Hover (jet on, slow)

- **Height:** her vertical speed eases toward what R2 asks for: descend, hold or climb, as pass 6b does now.
- **The stick, inside its drift range:** sets a drift of up to 1.5 m/s in its direction directly (no momentum), easing in and out as on foot, with `flyAcceleration` and `flyDeceleration`. Small moves near things stay precise. She turns as on foot.
- **The stick, past its drift range:** thrust starts, from 0 at the range's edge to full at the stick's end. Once she passes cruise speed she's in flight.

### Flight (jet on, fast)

- **Thrust:** `flyThrust` (12 m/s²) times how far the stick is pushed, in its direction.
  - Stick forward is the camera's direction, tilted by its pitch, so the camera aims a climb or a dive. Sideways is level.
  - A partly pushed stick keeps her flying at a lower top speed.
- **Drag:** in proportion to her speed. It sets her top speed at `flySpeed` (20 m/s, Part 1's): the drag is `flyThrust ÷ flySpeed` per second.
- **R2's depth means nothing here.** Held at all, the jet is on (the owner).
- **Stick at rest with R2 held:** she coasts level, slowing by the drag, until she's slow enough to hover.
- **Facing:** toward the thrust while thrusting, along her motion while coasting. Drifting sideways or backward is fine (the owner).
- **Near the ground:** below `flyLowest` (1 m), thrust doesn't push her down and a dive levels off, as now.
- **Touching the ground** at speed (jet on): she slides along it, losing `flyGroundDrag` (4 m/s²) while in contact, and the levelling-off lifts her away.

**What it feels like with these values:**
- From a standstill with a full push, flight comes after 0.35 s, and 90 % of top speed after about 4 s.
- A 90° turn at full speed takes an arc about 33 m across. At Part 1's 6 m/s² it would be 67 m.
- Pulling fully back at 20 m/s stops her in about 1.2 s, then she speeds up the other way.
- Coasting from 20 m/s, she's down to hover speed in about 4.5 s.

### The glide (R2 let go)

The jet cuts out at once. She keeps her velocity, including a climb, which arcs up under full gravity.

- **The stick does nothing:** no thrust, as in Asteroids (open question 1). She faces along her motion.
- **Momentum:** her horizontal speed falls off by `glideDrag` (3 m/s²): from 20 m/s to her run speed (7 m/s) in about 4 s.
- **On the way down:**
  - Part of gravity is cancelled in proportion to her speed: at fly speed, `glideLift` (0.7) of it, which leaves 6 m/s², Part 1's gravity.
  - Her fall is held to `glideSink` (6 m/s) at fly speed. That limit loosens as she slows.
- **Below her run speed** the glide is over. She's as if hovering when the jetpack cut out: she falls as she does without a jetpack (the owner).
  - So letting go while hovering gives no glide: she just falls, as now.
- **Pressing R2 again** keeps her velocity, so fast she's straight back in flight, and slow she hovers.

**What it gives:** from 20 m/s at 10 m up, level, about 2 s in the air and 35 to 40 m covered. Today it's 1 s and 7 to 20 m.

### The skid (jet off, on the ground at speed)

- **When:** she reaches the ground faster than her run speed with the jet off, from a glide, or by letting go of R2 while skimming the ground.
- **How:** she slides along her motion, losing `skidFriction` (15 m/s²): from 20 m/s, 13 m in 1.3 s.
- **During it:** the stick does nothing, there are no footsteps, and her standing pose shows.
- **At a stop** she walks as usual.
- **Off a ledge:** she's in the air at that speed, so the glide picks up again (open question 2).

### The camera, the sound, the glow

- **The camera** may go below her (`cameraMinPitchFlyingDeg`) only in flight. Its lower limit eases with *w*. Today it's all or nothing.
- **The jet sound and glow:**
  - They follow R2 in hover, as now, and run at full in flight, with *w* blending between.
  - With the jet off (gliding, skidding) they're off.

## The work

1. **`character.ts`:** the jet on becomes one function, replacing `fly` and `flyByTrigger`. In it:
   - The velocity, the mode switch with its blend, hover, flight, and the jet on the ground.
   - The levelling off near the ground moves into it.
   - **New fields:** `velocity` (with the jet on, gliding, skidding), `inFlight`, `flightShare` (*w*), `gliding`, `skidding`.
   - **The let-go branch** of `update` starts the glide. **The air rule** applies the glide's lift, sink limit and drag while `gliding`, and leaves the stick out of it. **The ground** starts a skid above run speed with the jet off.
2. **`input.ts`:** Space and a digital R2 give a trigger value of 1, so they go through the same function.
3. **`settings.ts`:**
   - **Added:** `flyThrust` 12 m/s², `hoverDriftSpeed` 1.5 m/s, `cruiseSpeed` 4 m/s, `hoverStickShare` 0.6, `flightBlendTime` 0.3 s, `flyGroundDrag` 4 m/s², `glideDrag` 3 m/s², `glideLift` 0.7, `glideSink` 6 m/s, `skidFriction` 15 m/s².
   - **Removed:**
     - `padFlyMode`.
     - `flyTriggerAcceleration` and `flyVerticalDrag`: the *acceleration* mode.
     - `flyRiseShare`: Space now rises at R2's climb speed, the same 5 m/s.
   - **Kept, with a new meaning:** `flySpeed` (top speed), `flyAcceleration` and `flyDeceleration` (the hover drift).
4. **`main.ts`, `camera.ts`, `exhaust.ts`, `footsteps`:**
   - The camera gets *w* instead of "flying by Part 1's rule".
   - The sound and the glow get the blended value.
   - Footsteps go quiet while she skids.
5. **`tuning.ts`** (*Jetpack*):
   - **Gone:** *analog R2*, *R2 accel. mode: max*, *R2 accel. mode: drag*, *rise, stick at rest*.
   - **Relabelled:**
     - *acceleration*, *deceleration* → *hover drift: acceleration*, *…: deceleration*.
     - *fly speed* → *top speed*.
     - *lowest flight, stick pushed* → *lowest flight (m)*.
   - **Added:** the ten new values.
6. **Checks,** with a made-up gamepad, outdoors, tried with the probe first, then into the smoke script:
   - **Hover:** R2 in the hover band, stick at 40 %. She drifts at no more than 1.5 m/s, and her height stays within 10 cm over 2 s.
   - **Flight is level:** R2 full, stick full, camera level. After 2 s she's in flight, and her height changes by less than 1 m once there. Today she climbs at 5 m/s.
   - **Reversal:** at full speed, the stick pulled fully back, R2 full. She slows through zero and comes back the other way, staying in flight. Her height changes by less than 0.5 m.
   - **Coasting:** stick let go at full speed, R2 held. She slows level, and is hovering within about 6 s.
   - **Glide:** R2 let go at full speed, 10 m up. Her speed falls off at about 3 m/s², she sinks no faster than 6 m/s while above cruise speed, and she covers more than 30 m.
   - **Skid:** she lands from that glide and slides to a stop, then walks.
   - **Jet on the ground:** at full speed, skimming the ground. She loses some speed but stays in flight.
   - **From a hover:** R2 let go while hovering. She falls as now.

## Done when

- **Agent:** the eight checks pass, along with type-check, build and smoke. Plus screenshots in flight, hovering, gliding and skidding.
- **Owner:** it feels right with the controller: drifting while hovering, pushing into flight, turning with momentum, coasting back into hover, gliding after letting go, skidding to a stop.

## Open questions

1. **Steering while gliding.** As written, the stick does nothing with R2 let go (Asteroids: no thrust, no change). A small air control (say a tenth of the thrust) would let her nudge a landing. I recommend none to start, and adding it if the play-test misses it.
2. **Skidding off a ledge:** the glide picks up again at that speed. I'd say yes, since it's the same rule and it's the fun part.
3. **"Slows down a bit"** on the ground with the jet on: 4 m/s², so a second's contact costs 4 of her 20 m/s. A first guess, to tune.

## After

- **`interaction.md`:** a *Flying* section, next to the jetpack rack: hover, flight, the switch, the glide, the skid, the ground, Space and the digital R2.
- **`decision-log.md`:** an *Update* to pass 6b's entry: the R2 rule, Part 1's flight rule, and letting go.
- **`backlog-passes.md`:** a note under pass 6b that this replaces it.
- Item 39 in `backlog.md`, the plans index, and `CODE-MAP.md`: `fly` and `flyByTrigger` become one function.
