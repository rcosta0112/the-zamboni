# Plan: the backlog, in six passes

**Status:** *in progress*: approved 2026-10-12 (order and answers below); passes 1 and 2 built on 2026-10-12, owner play-test pending. Before pass 1: an audit of the project and documentation structure (owner, 2026-10-12). Covers every item in [`backlog.md`](backlog.md) (1–23). All of it is in prototype 01, like the ship so far.

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

To be planned once the UE logic can be read. What's known now:

- **Behaviour (owner, 2026-10-12):** the window opens the same way as a bulkhead door; its control is a lever that turns to its other position when used. The Blueprints are there if this isn't enough.
- **One point left for that plan:** what the panel button does to a door that also opens by itself (proposed: it overrides: a door shut from its panel stays shut until a panel is used again; opened from its panel, it stays open).
- **New in the code:** doors that **slide** instead of swinging; a **proximity trigger**; a door with two panels; a switch with its own moving part. All of it from tags.
- **New in the file:** the four doors become moving parts with colliders (today they have none); panels on both sides of each bulkhead (the file has a hidden `Door Panel` that isn't exported: to look at); the window and its switch.
- **See-through:** the doors are dividers and "bulkheads always visible" covers them; to be checked with doors that move.

## Pass 5: see-through, fifth pass (11, 13, 14, 15): own plan

A *fifth pass* section in [`see-through-rules.md`](features/see-through-rules.md), written after pass 2 (single-sided) and pass 1 (pitch 0) have been played, since both change what's left.

- **Rules, small (11, 14):** on the lower deck, furniture and props are never cut while she's there (structure still is). Crew characters join the rules: on her deck never cut, on the other deck cut like everything else there.
- **Crew-quarters furniture against the walls (13):** options to weigh in that plan: treat wall furniture as part of the wall behind it (cut with the hull, never on its own); cut it as a whole; a height cut. Each behind a toggle, to compare in play.
- **Black mask over the other floor (15):** a try-out behind a toggle in prototype 01 (it needs the ship and the decks): everything on the deck she isn't on drawn black instead of cut. The numbered backlog mentions a "circle-mask idea of 2026-10-09": it isn't written down in the docs (open question 8).

## Pass 6: jetpack (21)

**Part 1's behaviour** (read from `PlayerMovement.cs`): while *Fly* is held there's no gravity. With the stick pushed she flies where the camera points, up and down included, at fly speed (20 m/s; run is 7). With the stick at rest she rises straight up, to a quarter of fly speed. Letting go, she falls.

1. A *fly* action in `input.ts` (held, not latched): **Space / right trigger** (gamepad button 7). Jump moves from Space to **C** on the keyboard and stays on Cross; Shift still walks. Fly speed, rise speed and acceleration in the tuning panel, starting from Part 1's values.
2. In `character.ts`: flying replaces gravity and the ground move with Part 1's rule, still through Rapier's controller (she can't fly through the hull). No particles, sound or animation.
3. Ladders: starting to fly lets go. Doors: a flying character is pushed like a walking one.
4. It works **anywhere**, inside the ship too, for now. An *outdoors only* limit comes with the user-testing build ([`scope.md`](../architecture/scope.md) says outdoors only: noted there).

**Done when:** from the ground she can fly onto the ship's roof and land; she can't pass through the hull or the ground; letting go drops her; the owner compares the feel with Part 1's build.

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
