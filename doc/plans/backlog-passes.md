# Plan: the backlog, in six passes

**Status:** *in progress*: approved 2026-10-12 (order and answers below); passes 1 and 2 built and approved by the owner on 2026-10-12; pass 3 built the same day (A, plus C and a tint in place of B: see the decision log), for the owner to judge; pass 4 built 2026-10-13 from its own plan, owner play-test pending. Before pass 1: an audit of the project and documentation structure (owner, 2026-10-12). Covers every item in [`backlog.md`](backlog.md) (1–23). All of it is in prototype 01, like the ship so far.

## Decided (owner, 2026-10-12)

1. **The order is approved.**
2. **Jetpack keys:** **C jumps, Space flies, Shift still walks.** Gamepad: Cross (button 0) jumps, the right trigger flies. Allowed **anywhere** for now (easier to test); limited indoors when building for user testing.
3. **The reference file** is `The Zamboni 1.19.blend`, copied from 1.18 (which has the keypad move); 1.18 is left untouched.
4. **The engineering window opens the same way as a bulkhead door.** Its control is a **lever**: it turns to its other position when used.
5. **Zoom is removed** from the D-pad as well as the wheel.
6. **Single-sided gets a switch** in the tuning panel. The reason for it is performance: to be measured with the switch (pass 2, stage 5).
7. **The circle mask** is left for now. (The black mask over the other floor, item 15, stays in pass 5.)

## Goal and scope

Get through the owner's backlog in an order that avoids doing things twice, with a play-test after each pass.

- **In:** the 23 backlog items, grouped into six passes. Passes 1, 2, 3 and 6 are planned here. Passes 4 and 5 have real design choices, so each gets its own short plan when it comes up (written after the pass before it is played).
- **Out:** anything not on the list (climbing animation, interaction points, the rule-table rewrite of the see-through rules, sounds).

## Why this order

| Reason | Consequence |
|---|---|
| Camera pitch and distance (16, 17) change which see-through problems are left | Camera first, see-through late |
| Single-sided materials (18) change how every cut looks and what it costs | Before the see-through pass |
| The bulkhead doors (6) are *dividers* in the see-through rules, and need colliders the bulkheads don't have today | Before the see-through pass |
| Five items need a new export (2, 12, 18, 19, 20), and the reference `.blend` (1) changes where exported data comes from | One export pass, built on the reference file, instead of five exports |
| The bugs (4, 9) and small interaction changes get in the way of every play-test | First |
| The jetpack (21) touches nothing else | Last, or any time once its two questions are answered |

## The passes

| Pass | What | Items | Needs an export | Own plan |
|---|---|---|---|---|
| **1** | Quick fixes: camera, ladders, small interaction changes, the ramp bug | 3, 4, 5, 9, 16, 17, 22, 23 | No | No (this one) |
| **2** | The reference `.blend`, then one re-export with the file fixes | 1, 2, 12, 18, 19, 20 | Yes | No (this one) |
| **3** | Lighting: warm sunlight in the crew quarters and cockpit | 10 | Maybe (light markers) | No (this one) |
| **4** | Bulkhead doors and the engineering window | 6, 7, 8 | Yes | Yes |
| **4.5** | Audio from the UE prototype: the files and the events that play them (added by the owner, 2026-10-13) | 24 | No | Yes ([`features/audio-from-ue.md`](features/audio-from-ue.md)) |
| **5** | See-through, fifth pass | 11, 13, 14, 15 | Maybe (tags) | Yes (a *fifth pass* section in [`see-through-rules.md`](features/see-through-rules.md)) |
| **6** | Jetpack | 21 | No | No (this one) |

## Constraints from the docs (conflicts flagged)

- **Conflict (18): "the export keeps Blender's setting … nothing is forced"** ([`asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export), owner, 2026-10-08) against "make all double-sided materials single-sided" (owner, 2026-10-12). The new instruction is specific, so the plan follows it; the checklist entry and the decision log get an update.
- **Conflict (18): the see-through hull draws every cuttable material double-sided on purpose**, back faces in a dark colour, so a cut edge reads as a solid cross-section ([`see-through-hull.md`](../features/see-through-hull.md)). This happens in the game (`makeCuttable`), whatever Blender says. Single-sided means that look goes: through a cut you see what's behind it, and a wall with no modelled back disappears from behind. See pass 2, stage 5.
- **Conflict (21): the backpack is "outdoors only"** ([`scope.md`](../architecture/scope.md)), and prototype 01's plan says **jump and fly share a button, and she can't jump while wearing it** ([`01-walk.md`](prototypes/01-walk.md)). The backlog says "hold the space bar". Part 1 used a separate *Fly* button (right mouse / right shoulder). Settled: see *Decided*, 2.
- **Changes to owner decisions of 2026-10-09** (not conflicts, but each gets a dated *Update* in the [decision log](../decision-log.md)): ladders went both ways (5); the side door could be opened directly (3); the target was highlighted (23); the roof hatches were two doors (22); characters were always visible (14); the bulkhead doors weren't interactive (6).
- **Export checklist** ([`asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export)) is read before each export; `PERF:` materials are listed to the owner after each.
- **Art drives behaviour through names and custom properties** ([`architecture/README.md`](../architecture/README.md)): new behaviour (sliding doors, linked hatches, switches) gets tags, not name checks in code.
- **Gamepad first:** every change to controls is made for the gamepad and the keyboard together.
- **`resources/` is not in git**, and the original `.blend` is never written to: the reference file is a new file.

## Pass 1: quick fixes (code only)

1. **Camera (16, 17).** Two settings, *distance indoors* and *distance outdoors*, in the tuning panel; the camera eases between them (~0.5 s) when she crosses the same "inside" test the see-through hull uses. Zoom removed from the wheel and the D-pad. *Minimum pitch* defaults to 0. The min/max distance settings go.
2. **The cargo ramp doesn't close (9).** Not diagnosed yet: reproduce in the browser, log what `advance()` returns for the ramp, fix. Then check every door again, open and closed, with her in and out of the way.
3. **Ladder stuck at the top (4).** Likely cause, from the code: at the top she steps off only if a free spot is found within 0.55–0.8 m in the direction pushed; with none found she stays on the ladder. Reproduce, then fix together with stage 4.
4. **Ladders go up only (5).** She attaches at the foot and climbs while the stick pushes toward the ladder; **at the top she steps off by herself**; pushing away or jump lets go (she drops). Nothing attaches her from the floor above: walking into the opening, she falls through it.
5. **The side door (3).** Rule: a door that a keypad controls isn't offered itself. (The cargo ramp already works this way.)
6. **The roof hatch (22).** `Top Hatch` and `Top Hatch Bottom` become one target: aiming at either shows one prompt and moves both. Listed in code for now; a tag (`opensWith`) at the next export.
7. **The prompt next to the target (23).** The prompt is placed on screen at the target (its bounds' centre, kept inside the screen's edges) instead of at the bottom. The highlight defaults to off; the slider stays until the owner has seen the prompt, then it's removed with its shader code.

**Done when:** check and build pass; in the browser: the ramp closes and opens from its keypad; the ladder can be climbed ten times in a row and left at the top each time; she drops through the open trapdoor; the side door shows no prompt; one press moves both roof hatches; the prompt follows the target; the camera distance changes at the ramp. Gamepad: untested by the agent (no controller in the test browser).

## Pass 2: the reference `.blend` and one re-export

**Stage order matters: the reference is built and proven first, with no other change, then the fixes go in.**

1. **Build the reference file (1).** A script opens the owner's current file (with the keypad move, 2) and saves **a new file**, `The Zamboni 1.19.blend`. Into the file go the things that are *scene content*:
   - doors closed as they start in the game; the `REMOVED` objects deleted;
   - every tag as a custom property on its object (`cuttable`, `structure`, `seeThrough`, `divider`, `door`, `interact`, `controls`), replacing the lists in `export-ship.py`;
   - the room light markers as empties (the new cockpit light included);
   - the bulkheads' collision pieces as `*_col` objects (the naming contract's convention);
   - the interior collections included in the view layer.

   What stays in the export script, because it's *derived*: applying modifiers, baking and merging props, joining the collider, hinge points, the `PERF:` report, compression.
2. **Prove it.** `export-ship.py`, reduced to read tags from the file, exports the reference. The result is compared with today's export automatically: same objects, same triangle counts, same custom properties, same collider (the keypad's position aside). Only then does anything else change.
3. **`Monitor Arm` (12).** Likely cause, from the export script: the display's meshes are deformed by the `Monitor Arm` armature, and listed objects (`Monitor Arm.031`, `Stand`) go through the glTF exporter, which doesn't apply an armature's pose; they come out in the rest pose, inside the wall. To confirm in the file. Fix: bake them in their posed place, as props are.
4. **Collision boxes (19, 20).** Box objects in the reference file, joined into the collider at export: one under the hull, from the ground up to its underside; one under each front thruster. Kept clear of the cargo ramp's and the side door's way in. The owner can then resize them in Blender.
5. **Single-sided (18).** In the reference file: backface culling on for every material. In the game: the see-through materials stop forcing double-sided, with a **switch in the tuning panel** (single-sided / double-sided as today). **Frame time measured both ways** on the owner's PC, inside the ship and outside: that's the answer to whether it's worth it. Then a walk through the ship from inside and outside, listing every surface that disappears, for the owner to fix in Blender. The characters stay as they are for now.
6. **Export, compress, check** (checklist read first; `PERF:` list to the owner, which should now be empty for the ship).

**Done when:** stage 2's comparison passes; the engineering display is visible in place; she can't get under the hull or the front thrusters, and can still walk up the ramp and the side door; the keypads are where the owner moved them; a list of single-sided problems, with screenshots; frame time before/after.

## Pass 3: lighting (10)

The interior is lit by the room lights and the blue world light; the sun doesn't get in. Cause to confirm: the ship's shadow comes from one merged mesh that includes the window glass, so the glass blocks the sun.

| Option | How | Cost | Against |
|---|---|---|---|
| **A. Glass lets the sun through** *(recommended first)* | Leave glass out of the merged shadow caster | None per frame | Gives sun patches, not a warm room: there's no bounced light |
| **B. Sun-coloured fill at the windows** | One light marker per window group, in the sun's colour | Uses the four-light budget (the crew quarters already have two lights, the cockpit one) | Doesn't move with the sun's direction |
| C. Less blue inside | The world light fades down while she's inside | None | Changes every room, not only the two |

**Recommendation: A, look, then B where it's still too blue** (markers from the reference file). Sun colour, fill intensity and the world light's indoor level go in the tuning panel.

**Done when:** before/after screenshots of the crew quarters and cockpit from the same camera; the owner judges the colour.

## Pass 4: bulkhead doors and the engineering window (6, 7, 8): own plan

**Its plan: [`features/bulkhead-doors.md`](features/bulkhead-doors.md)** (approved and built 2026-10-13). What was known before it:

- **Behaviour (owner, 2026-10-12):** the window opens the same way as a bulkhead door; its control is a lever that turns to its other position when used. The Blueprints are there if this isn't enough.
- **One point left for that plan:** what the panel button does to a door that also opens by itself (proposed: it overrides: a door shut from its panel stays shut until a panel is used again; opened from its panel, it stays open).
- **New in the code:** doors that **slide** instead of swinging; a **proximity trigger**; a door with two panels; a switch with its own moving part. All of it from tags.
- **New in the file:** the four doors become moving parts with colliders (today they have none); panels on both sides of each bulkhead (the file has a hidden `Door Panel` that isn't exported: to look at); the window and its switch.
- **See-through:** the doors are dividers and "bulkheads always visible" covers them; to be checked with doors that move.

## Pass 4.5: audio from the UE prototype (24): own plan

Added by the owner on 2026-10-13: "copy the audio files and audio events from the prototype". This brings sounds into scope (*Goal and scope* above listed them as out). **Its plan: [`features/audio-from-ue.md`](features/audio-from-ue.md)** (approved and **built** 2026-10-13), built on the inventory in [`ue-prototype.md`](../reference/ue-prototype.md#audio-read-2026-10-13) and the owner's answers of the same day. [`audio.md`](../architecture/audio.md) is still *open for discussion*: this pass is the "first audio step" it leaves several checks to.

## Pass 5: see-through, fifth pass (11, 13, 14, 15): own plan

A *fifth pass* section in [`see-through-rules.md`](features/see-through-rules.md), written after pass 2 (single-sided) and pass 1 (pitch 0) have been played, since both change what's left.

- **Rules, small (11, 14):** on the lower deck, furniture and props are never cut while she's there (structure still is). Crew characters join the rules: on her deck never cut, on the other deck cut like everything else there.
- **Crew-quarters furniture against the walls (13):** options to weigh in that plan: treat wall furniture as part of the wall behind it (cut with the hull, never on its own); cut it as a whole; a height cut. Each behind a toggle, to compare in play.
- **Black mask over the other floor (15):** a try-out behind a toggle in prototype 01 (it needs the ship and the decks): everything on the deck she isn't on drawn black instead of cut. The numbered backlog mentions a "circle-mask idea of 2026-10-09": it isn't written down in the docs (open question 8).

## Pass 6: jetpack (21) (built 2026-10-14)

**Part 1's behaviour** (read from `PlayerMovement.cs`): while *Fly* is held there's no gravity. With the stick pushed she flies where the camera points, up and down included, at fly speed (20 m/s; run is 7). With the stick at rest she rises straight up, to a quarter of fly speed. Letting go, she falls.

1. A *fly* action in `input.ts` (held, not latched): **Space / right trigger** (gamepad button 7). Jump moves from Space to **C** on the keyboard and stays on Cross; Shift still walks. Fly speed, rise speed and acceleration in the tuning panel, starting from Part 1's values.
2. In `character.ts`: flying replaces gravity and the ground move with Part 1's rule, still through Rapier's controller (she can't fly through the hull). No particles, sound or animation.
3. Ladders: starting to fly lets go. Doors: a flying character is pushed like a walking one.
4. It works **anywhere**, inside the ship too, for now. An *outdoors only* limit comes with the user-testing build ([`scope.md`](../architecture/scope.md) says outdoors only: noted there).

**Done when:** from the ground she can fly onto the ship's roof and land; she can't pass through the hull or the ground; letting go drops her; the owner compares the feel with Part 1's build.

> **[Agent note]** Built 2026-10-14, before pass 5 (owner: "let's do the jetpack first"). As planned, plus: taking off keeps the velocity she had, letting go keeps her momentum; against the ground or a wall her flight velocity is cut to what actually moved her. **Acceleration (30 m/s²) is a guess**: Part 1's value wasn't recorded. **With minimum pitch 0 the camera never looks up, so the stick never flies her upward** (level at best, down when the camera is above her); she rises only with the stick at rest. Part 1's camera could look up. To judge in play. Checked: three smoke checks (rise and fall, the hull stops her, onto the roof); gamepad untested.
>
> **Update (2026-10-14, owner's play):** fly moved to **R1** (Part 1's right shoulder); stick + jetpack "runs really fast instead of flying". Now **Part 1's exact rule and values** (from its `PlayerMovement.cs` and `Main.unity`, which supersede the note above): one speed shared with the run, flight along her facing tilted by the camera's pitch, acceleration 6 m/s² and deceleration 120 m/s², no vertical momentum on release. Two additions, not Part 1's, to fix the report: the camera may go below her while flying (-40°), and below 1 m a downward flight levels off and lifts her from the ground. **Part 1's jet sound** (`Thrusters.mp3`) loops while she flies. Part 1's gravity was 6 m/s² (0.1 per frame); ours stays 20 (the jump is tuned to it): to judge in play. Smoke: rise and fall, the sound, the lift-off, the hull, the roof; R1 tried with a made-up pad.

### Pass 6b: hovering on an analog R2 (gamepad only), and the flying animation

*Status: approved 2026-10-14 ("let's follow your suggestion"; plus: detect whether R2 is analog or digital, and a digital one flies keyboard style); built the same day.*

> **[Agent note]** As built: R2 is analog once a value between 0 and 1 has been seen from that pad (until then, digital). Added while building: **on the ground only the climb band takes off**, and descending onto the ground lands her: half-way on the ground with the stick pushed would otherwise skim the ground at fly speed. The camera's below-her exception applies only to Part 1's rule. Checked with made-up pads (no controller in the test browser): hover drift 0 at 36%, 50% and 64%; smoke checks for the analog and digital cases. What exists: the prototype README, *Jetpack*.

**Asked (owner, 2026-10-14):** fly back on **R2**, as it's analog. Held about half-way she **hovers** in place when she isn't flying forward. The idea: vertical acceleration proportional to the trigger, damped in the middle third so the hover point is easy to find. Keyboard unchanged (Space, Part 1's rule).

**Issues with acceleration proportional to the trigger:**

1. **It doesn't settle.** With the trigger setting acceleration, the half-way point gives zero acceleration, so she keeps whatever vertical speed she had: rising at 2 m/s when the player finds the middle, she goes on rising at 2 m/s. To stop she has to overshoot below the middle and come back. That's a lunar-lander control: fun for some, but hovering takes constant correction, and damping the middle third (a flatter curve there) makes it *slower* to correct, not easier.
2. **Released has to mean off.** At 0 the jetpack is off (she falls, the sound stops), so the trigger's travel is shared: a little for "off", then descend, hover, climb.
3. **Some pads have digital triggers** (Switch Pro, some cheap pads: 0 or 1 only). They can't hover, so full = Part 1's rise.
4. **Holding a trigger half-way for long** tires the finger, more on triggers with no resistance (Xbox) or a stiff one.
5. **With the stick pushed**, Part 1 flies along the camera's pitch, so up and down come from two places (camera and trigger) and fight each other.

**Proposed instead: the trigger sets her vertical *speed*, not her acceleration.**

| Trigger | Target vertical speed |
|---|---|
| Released (below 5%) | Jetpack off: she falls |
| 5% to 33% | Descend: from -5 m/s up to 0, eased |
| **33% to 67%** | **0: hover.** Flat, so anywhere in the middle third holds her height exactly |
| 67% to 100% | Climb: from 0 up to +5 m/s (Part 1's rise), eased |

- Her vertical speed eases toward the target at the jetpack's acceleration, so she still floats into a hover instead of stopping dead. Once there she stays (no drift).
- The ramps on either side of the flat third are smooth (no step at 33% or 67%), with a little hysteresis at the edges so a shaky finger doesn't flicker between hover and climb.
- **With the stick pushed**, on the gamepad the stick flies her horizontally at fly speed and **the trigger alone sets her height**; the camera's pitch no longer steers. That removes the skimming problem and the *camera below her* exception on the gamepad (they stay for the keyboard).
- **Feedback for finding the hover point:** the jet sound's volume and pitch follow the trigger (quieter and lower while hovering, loudest climbing). Optional, a setting.
- A setting switches the gamepad between this and Part 1's rule, so both can be compared.

**Option: the owner's version as asked**, behind the same switch: acceleration proportional to the trigger, the middle third flattened, plus a small drag on her vertical speed so she settles by herself. Cheap to build next to the proposal and compare in play.

**The flying animation.** Part 1's Dr. Green has these clips (`Dr.Green.fbx`, 24 fps): *Walking* (1.42 s, loop), *Running* (0.83 s, loop), *Jumping* and *Jumping 2* (1.42 s, once), ***Flying* (7.5 s, loop)**, *Standing* (one frame), and *Scanning* (10 s, loop, a separate `.anim`). Part 1's Animator plays *Flying* whenever *Fly* is held. **It's already in the prototype's file** (`part1-dr-green.glb`: `flying`, 7.54 s) and unused: today she shows the jump pose in the air. Proposed: play it while she flies (a short blend in and out), on both models (the Zamboni model takes Part 1's clips retargeted). Other characters in Part 1: Dr. Kaufman *Scanning* (500 frames), Dr. Ogawa *Engineer Working* (160 frames), the generic *Character* (Jumping, Running, Standing, Walking).

**The work:** R2's value in `input.ts` (Space stays digital); the trigger mapping and the switch in `character.ts`; the sound's level and pitch; the flying clip in `model.ts`; tuning-panel settings (the thirds' edges, descend and climb speeds); a smoke check with a made-up pad at 20%, 50% and 90%.

**Done when:** with a made-up pad, she holds her height within a few centimetres anywhere in the middle third, descends below it and climbs above it; released, she falls; the flying clip plays while she flies. Then the owner plays it with the real controller.

## After every pass

Check and build; the prototype in a browser (screenshots, console); a report of what was and wasn't verified; then the owner's play-test before the next pass starts. Docs updated to describe what exists:

| Pass | Docs |
|---|---|
| 1 | [`features/interaction.md`](../features/interaction.md), prototype README (controls), decision log updates |
| 2 | [`asset-pipeline.md`](../architecture/asset-pipeline.md) (the reference file, the checklist, the naming contract), [`see-through-hull.md`](../features/see-through-hull.md), decision log |
| 3 | A lighting note in the prototype README; decision log if B or C is chosen |
| 4 | [`features/interaction.md`](../features/interaction.md), [`ue-prototype.md`](../reference/ue-prototype.md) (what was read), naming contract |
| 5 | [`see-through-hull.md`](../features/see-through-hull.md) |
| 6 | Prototype README, [`01-walk.md`](prototypes/01-walk.md), [`scope.md`](../architecture/scope.md) if indoors is allowed |

Each item's status is kept in [`backlog.md`](backlog.md), and the state of the work in [`../steps/current.md`](../steps/current.md).

## Open questions

None open. (Pass 4's and pass 5's own plans will have theirs.)
