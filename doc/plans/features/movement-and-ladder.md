# Moving through the ship, and the ladder both ways

> **[Agent note]** **Status: built 2026-10-13** (approved by the owner the same day, with the answers under *The owner's second answers*); the owner's to play. Still to do: the boxes into the ship file, once approved. What was built, and where it differs from the plan: *As built*, at the end. Asked for by the owner on 2026-10-13: "improve movement fluidity inside the ship. There are lots of places where the character is getting stuck. Let's see if we can improve the collision boxes", and a new ladder.

## Goal and scope

- **In:** she stops catching on things inside the ship; the ladder is climbed up and down, hands her over to normal walking at the top without taking control from the player, and is out of the way while she's upstairs. Prototype 01.
- **Out:** a climbing animation; getting onto the ladder from the floor above; the jetpack (backlog 21); the see-through rules.

## The owner's answers (2026-10-13)

- **Where she sticks.** Cockpit: clear. **Crew quarters:** close to any wall; "we need collision boxes there". **Cargo hold:** around the sledge, its corners most; jumping on top of it gets her stuck in the ceiling; walking on top of the boxes is difficult ("I think it's the lamp"). **Engineering:** mostly fine; block her from walking up the window ramp, where she can get stuck.
- **A thinner capsule:** yes, "as long as the model doesn't clip on walls and objects. This is a tight space so she will often be right next to objects and people".
- **The top of the ladder:** no fixed step-off ("it takes control from the player"). Two ideas: a smaller hatch, so there's very little space behind her; and she floats for half a second when she leaves the ladder at the top ("she may fall back down if the player is not careful but that's acceptable").
- **Not answered yet:** the ladder's own collision; whether jump still lets go.

## Constraints from the docs

- **Changed by the owner, to record when built:** [`features/interaction.md`](../../features/interaction.md#ladders) and backlog item 5 say *ladders go up only* (2026-10-12), *pushing away lets go: she drops*, and *at the top she steps off by herself*. All three go; the [decision log](../../decision-log.md) gets a dated *Update*.
- **No button for ladders** (owner, 2026-10-09) stays.
- **Collision** in [`architecture/asset-pipeline.md`](../../architecture/asset-pipeline.md): "simplified `*_col` meshes, boxes or heightfields". What exists: every fixed part collides with its real shape at full detail, big props with their convex hulls. *Don't decimate around openings* stands.
- **Small edits to the ship file are the owner's** (CLAUDE.md): the boxes, the tags, the hatch.
- **Gamepad first:** everything below works on the left stick alone.

## What was measured (2026-10-13)

- **A survey:** she fits on 483 spots of a 0.2 m grid, about 19 m² over all the floors. At 115 of them something no taller than 0.4 m stops her in at least one direction (seat bases, the cargo hold's crates, table legs). The crew quarters' wall on one side shows as a whole row of blocked spots with nothing in the way at any height up to her head: most likely the curved hull pressing on the top of her capsule. Rough: for comparing before and after.
- **Her model is already wider than her capsule.** The capsule's radius is 0.28 m. The model's bounds reach 0.33 m from her axis standing and 0.40 m running (arms). The bounds of an animated model are generous, so the real figure is somewhat less, but not under 0.28.
- **She jumps 1.0 m, and she's 1.23 m tall:** her head reaches 2.23 m above the floor she jumps from. The cargo hold is about 2.2 m high and the crew quarters 2.19 m: she reaches the ceiling from the floor, and from on top of anything.
- **The trapdoor's opening** is 0.94 × 0.92 m at the deck. At the top of the ladder she's near its middle: the floor's edge is **0.44 m behind her**, 0.44 and 0.48 m to the sides, and 0.5 m ahead, where the wall is 0.65 m away. She fits there without touching anything.
- **The ladder's mesh** is 1.3 m long (0.37 m above the cargo floor to 0.55 m below the deck); the climb is 2.24 m.

## Part A: getting stuck

Each stage is tried alone, measured with the survey, then walked by the owner.

1. **She moves the way the stick points.** Today she walks along her facing while she turns toward the stick over 0.2 s, so she sets off in an arc; in a tight room the arc ends in a wall or a corner. Indoors, she moves in the stick's direction at once and her body turns as now. A setting, to compare. **The ladder's top depends on this** (Part B, 3).
2. **The capsule stays 0.28 m.** *Issue with the owner's answer:* a thinner capsule and "the model doesn't clip" pull opposite ways, and the model already reaches past the capsule. Thinner is dropped unless the owner wants to see it; the radius becomes a setting in the tuning panel so it can be tried in a minute.
3. **The controller's contact gap:** 0.02 m, 7 % of the radius; the usual advice is 10 % or more, and too small a gap is the first cause of sticking. Try 0.03 to 0.04 m. It also keeps the model that much further from walls.
4. **Jumping indoors.** *Issue:* the ceiling she gets stuck in over the sledge is in reach from the floor too. **Options:** **a.** a lower jump indoors (a setting, starting at 0.4 m: over the 0.3 m things, not onto the sledge); **b.** boxes that fill the space above the sledge and the boxes, so she can't get up there; **c.** both. **Recommended: a**, then b only where she still gets somewhere she shouldn't. To decide: is she meant to get on top of the sledge and the boxes at all?
5. **Boxes** (`*_col` objects in the `Game` collection; the export already joins them into the collider). A box in front of a detailed surface is enough: she never reaches what's behind it, so nothing needs retagging. What the file needs:
   - **Crew quarters:** a flat vertical face along every wall she can walk next to, floor to above her head (1.3 m or more), standing just proud of the furthest thing that sticks out on that wall (bunks, lockers, the hull's curve). One box per straight run; none across doorways or the trapdoor.
   - **Cargo hold, the sledge:** one box around it, or tagged `collider: "hull"` if it isn't a prop already colliding that way. Its corners stop catching when they're one shape.
   - **Cargo hold, the boxes:** the lamp tagged `collider: "none"`, if she's meant to walk up there (see 4).
   - **Engineering:** one box across the foot of the window ramp, to above her head.
   - **Who makes them:** the owner in Blender, or the agent with a script (it saves the file: go-ahead and a copy first, as before). The crew quarters are the bulk of it.
6. **The sledge's frame rate.** Standing on the sledge she's at about 7 fps ([`steps/current.md`](../../steps/current.md), *Found, not fixed*: "reachable on foot?"). It is. Looked into only if she's meant to be up there.

## Part B: the ladder

### What games do

- **Walk into it, stick up and down to climb** (Zelda, Uncharted, most third-person games): what's asked for.
- **Getting off at the top** is usually a short fixed move; free walking there is where ladders go wrong (Half-Life: falling back down). The owner prefers the risk to losing control: accepted.
- **Getting on from the top** is the other hard part. Avoided here: upstairs the ladder is off, and the way down is the opening.

### As proposed now

1. **Up and down:** *toward the ladder* (camera-relative, the way she walked into it) climbs up; *away from it* climbs down; at the foot, away walks her off. The stick at rest holds her where she is.
2. **At the top she's held, not released.** She stays at the top for as long as the stick is toward the ladder or at rest. *Issue this avoids:* released on arrival, the stick she's still holding walks her at the wall 0.65 m ahead, and she falls after the half second, every time.
3. **Leaving the top:** the first push in any other direction, back included, lets go of the ladder: she **floats** (no gravity, normal walking, collisions on) until her feet are over floor or the time runs out, then she's walking or falling as anywhere else.
   - *Issue:* **from the top she can't climb back down**: back walks her onto the deck behind. Below the top, away is still down. This follows from "after she clears the deck, moving is decoupled".
   - *Issue:* **half a second is tight.** The floor is 0.44 m away. From a standstill at full stick she covers that in 0.39 s, if she moves the way the stick points (Part A, 1). With today's turning arc, or at walking pace, she doesn't make it. The time is a setting, starting at **0.6 s**.
4. **A smaller hatch.** *Issues:* her capsule is 0.56 m across, so the opening can't go much under 0.7 m: that brings the floor from 0.44 to about 0.3 m behind her, a small gain. And **the opening is also the way down**: at 0.7 m she has to walk into it within a few centimetres of its middle, or she rests on the rim. **Recommended:** leave the hatch as it is and see the float first. If it's still made smaller, only on the side behind her, and the leaf with it.
5. **Upstairs the ladder is off:** she can't take hold until she's back on the cargo floor (as now). **Its collision** (open question): dropping through the opening she lands on the ladder's top end today. Proposed: the ladder doesn't collide at all (`collider: "none"` on `Ladder Cargo Bay`, one export). Its front is 0.3 m from the wall behind it, so there's next to nothing to walk through. With a float she may fall from, this matters more.
6. **Jump on the ladder** (open question): proposed, it still lets go and she drops.
7. **The mesh stops 0.55 m short of the deck:** she climbs the last part on nothing. Flagged only.

### The work

1. `ladders.ts`: away climbs down; at the foot she walks off; the rung sound going down too.
2. The top: held; leaving it; the float (`character.ts`: gravity off for the time or until grounded). The fixed step-off and `findExit` go.
3. The ladder's collision: the tag, the owner's export, *Found, not fixed* rechecked.
4. The scripted check: "climbed and left at the top, 10 times" becomes *climbs, is held, pushes back, stands on the deck*; the two "lets go" checks become *climbs down and walks off at the foot*; one for *pushes at the wall from the top: nothing happens*; one for dropping through the opening without landing on the ladder.

## Order

Part A 1 (the ladder needs it), 3 and 4a: code only, one sitting. Then Part B. Then the boxes (A 5), which wait on who makes them.

## Done when

- **Agent:** the survey's count of blocked spots before and after each stage of Part A; the ladder's checks; `npm run check`, `build`, `smoke`.
- **Owner:** runs along every wall of the crew quarters and round the sledge with a gamepad without stopping where she didn't mean to; can't get onto the window ramp; up the ladder, part of the way down, up, off onto the deck, and down through the opening.

## Open questions for the owner

1. Is she meant to get on top of the sledge and the boxes? (Decides the indoor jump, the lamp, the frame rate.)
2. A lower jump indoors: fine? Starting at 0.4 m.
3. The capsule stays 0.28 m, given the model is already wider: agreed?
4. Who makes the boxes: the owner, or the agent with a script that saves the file?
5. The top of the ladder as in Part B, 2 and 3 (held; any push but forwards lets go; no climbing down from the very top): agreed?
6. The hatch left as it is until the float has been tried?
7. The ladder not colliding at all: fine?
8. Jump still lets go of the ladder?

## After

[`features/interaction.md`](../../features/interaction.md) (*Ladders*, the controls table), the decision log (an *Update* on 2026-10-09's entry), backlog items 5 and 29 to 31, [`steps/current.md`](../../steps/current.md) (*Found, not fixed*), the prototype's code map and README.

## The owner's second answers (2026-10-13)

1. The sledge's box goes up to the ceiling and across to the side wall, so there's no walking round it. One box for the boxes (the chests) and one for the lamp on top: "low enough that it feels like the player should be able to go on top of them".
2. A lower jump indoors: yes. 3. The capsule stays 0.28 m: yes.
4. "Make the boxes. After they are approved, move them to blender."
5. The top of the ladder as proposed, "with the caveat that the ladder will be disabled after dismount from the top so the user can freely jump down". 6. The hatch stays as it is.
7. The ladder collides: "I don't want any clipping if we can avoid it."
8. "Let's try having jump work normally. She should fall back down or land on the deck if the jump is well timed."

## As built (2026-10-13)

**Movement**

- **Indoors she moves the way the stick points at once**; her body turns after, as before (`indoorDirectMove`, on; tuning panel, *Movement*). Outdoors nothing changed.
- **The controller's contact gap is 0.03 m** (was 0.02).
- **The indoor jump is 0.6 m, not the 0.4 m proposed:** the chests are 0.5 m high, and the owner wants her on them (`indoorJumpHeight`; tuning panel, *Jump*). Measured: she rises 0.56 m, gets onto the chests, not onto the sledge; her head doesn't reach a ceiling from either floor. From on top of the chests she rises 0.29 m before her head meets the ceiling, and comes down again.
- **Ten collision boxes** in `colliders.ts`, in the world's coordinates, shown in blue with *show colliders* and switched off with *collision boxes* (tuning panel, *Movement*), to compare: `sledge` (to the ceiling and the side wall), `chests`, `lamp`, `window slope`, and six in the crew quarters (`galley and bunks`, `lockers`, `table and benches`, `wall by the trapdoor`, and the cockpit bulkhead either side of its doorway). The reach test passes through them, so what's behind one can still be used.
- **What "sticking to the walls" was.** Along the galley, with a flat box in front and nothing in her way, she still stopped dead: the closed galley doors have colliders of their own, and their ends, a centimetre behind the box's face, were enough. **Every face now stands 0.08 m proud of the furthest thing behind it.** That costs floor: the crew quarters' walkway is about 0.15 m narrower than the furniture leaves.
- **Measured** (her controller alone, pushed on the slant into each face and along it, 15 runs, with the boxes and without): without, she stops dead in 3 (the galley's doors, the sledge's corner, the cargo bulkhead's door frame), stops twice on the way in another (along the bunks), and gets up onto the benches or the table in 2; with, she gets to the far end in 14, and in the last the Contraption hangs in her way in engineering. A few runs lose one step (17 ms) passing something.
- **Not done:** the lamp didn't collide before (it's a small prop); it has its box now, as asked. The difficulty on the chests was the grooves between them, which the chests' box covers.

**The ladder**: as in Part B, *As proposed now*, and [`features/interaction.md`](../../features/interaction.md#ladders). Where it differs or adds:

- **The ladder collides only while she's at its foot** (the owner's caveat, and "it should collide"): off once she's more than 1 m above its foot, on again when she stands on the cargo floor clear of it. Its collider is cut out of the ship's at load by its bounds; no export was needed.
- **Pushing right at the top, she falls back down:** between the opening and the wall on that side there's 0.17 m of floor, less than she needs. Back and left land her on the floor (10 times in 10 each, in the scripted check), at a run and at a walk.
- **Jump:** part of the way up she rises 0.56 m and falls to the cargo floor; at the top or from 85 % of the way, pushing back, she lands on the floor above.
- **Dropping through the opening while pushing toward the ladder**, she lands where it stands (it isn't colliding yet) and overlaps it until she steps away.
- `findExit` and the fixed step-off are gone.

**The scripted check:** the ladder's four checks are replaced by eight (held at the top; off it back and to the side, 10 times each; the drop past the ladder; the ladder colliding again; down and off at the foot; the two jumps). None for the boxes: the comparison above was made with a probe.

**Still open**

- The boxes into the ship file, once the owner has played with them. The reach test has to keep passing through them there too (see the note in [`architecture/asset-pipeline.md`](../../architecture/asset-pipeline.md)).
- Elsewhere in the ship, closed doors with colliders of their own will stop her the same way wherever she slides along the wall they're in (the lockers in the cargo hold): not looked at.
- The sledge's 7 fps: no longer reachable, so not looked into.

## After the owner played (2026-10-13, same day)

- **The sledge's box ends flush with the chests' box** at both ends (it stood 0.17 m further out toward the ramp).
- **The table's box has its corner toward the galley cut off** (0.74 m along each side): the benches and the table step back there. The cut stands 0.08 m proud of the table's foot. A box is now an outline seen from above with a bottom and a top (`addStaticPrism` in `physics.ts`), so one can have a cut corner; in the ship file that's a `*_col` mesh with five sides.
- **The cargo ramp** ("she's getting stuck walking out and she's floating above it"). Its walkable slope was one flat plane from the cargo floor's edge to the ramp's far end: up to 0.32 m above the ramp near the top, and it met the floor across the 0.2 m slot at the ramp's hinge with a step up of 0.29 m, a hair under what she can step over. It was like that before this session; the wider contact gap (0.03 m) is the likely reason she began to stick there. **Now the slope follows what's seen** (`walkwayTriangles` in `ship.ts`): the floor's bevel, across the slot, down the ramp (to the centimetre), and on to the ground past the lip at the ramp's end. Near the top it's up to 0.08 m above the ramp for 0.4 m: the floor ends 0.2 m above the ramp's top, and the slope takes that down gently instead of as a step.
- **She's kept on the ground going down a slope** (Rapier's snap-to-ground, 0.15 m, in `physics.ts`): running down the ramp she was in the air for most of it, falling back onto it step by step. Measured after: out at a run and at a walk, in the air 0 or 1 samples of 15 to 27, never stopped, at most 0.08 m above the slope; in, up the right side, into the hold without stopping. Up the middle she meets the chests' box (they stand in the way in), and at the left edge the opening's side.

## Second round (owner, 2026-10-14)

- **"She's getting stuck on the cabinet and locker doors when they open."** Caused by this plan's wider contact gap (0.03 m): a door pushed her 0.02 m clear of itself, and backed off to 0.03 m when it stopped against her, both inside the gap, where her controller counts her as touching the door and won't move her in any direction. And a door could come to rest inside the gap without ever overlapping her. **Now a moving door keeps her 0.06 m clear** all the way (`advance` in `doors.ts`), backs off to 0.07 m and waits for 0.10 m; the three follow the gap (`CONTACT_GAP`). Measured: in front of each door she can stand at (two of the galley's, the cargo hold's locker, one of the crew quarters'), opened, she moves away in 7 or 8 of 8 directions (the eighth is the door, or the table's box); before, the cargo locker's left her blocked in 8 of 8.
- **"She's getting stuck on the ladder hatch when it's closed."** Standing on a moving part's collider, her controller moved her 0.06 to 0.12 m of 0.58 asked; most likely the same before this session (the trapdoor starts open). **Shut, the trapdoor is now a fixed lid** in place of its moving collider (`lid`): she walks across it to the walls and off again.
