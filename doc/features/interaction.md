# Interaction

**Status:** first version built in prototype 01 (2026-10-09), changed on 2026-10-12 (pass 1 of [`../plans/backlog-passes.md`](../plans/backlog-passes.md): ladders up only, the side door from its keypad only, the roof hatch as one target, the prompt next to the target) and on 2026-10-13 (pass 4, [`../plans/features/bulkhead-doors.md`](../plans/features/bulkhead-doors.md): the bulkhead doors, their panels, the engineering window and its lever); owner play-test pending. Plan: [`../plans/features/interaction-doors.md`](../plans/features/interaction-doors.md). Decision: [`../decision-log.md`](../decision-log.md).

Point at something and press a button to use it, as in the UE prototype. In this version: the ship's doors, the two keypads in the cargo hold, the bulkhead doors (which open by themselves) and their panels, the engineering window's lever, and ladders (which need no button).

## Controls

| Action | Gamepad | Keyboard |
|---|---|---|
| Use the target | **B / Circle** | **E** |
| Climb a ladder | Walk into its foot; push toward it to climb. She steps off at the top by herself | Same (W A S D) |
| Let go of a ladder (she drops) | Push away from it, or A (jump) | Same, or Space |
| Go down | Walk into the open trapdoor: she falls through | Same |

The prompt shows the button of the last device used (◯ or E).

## Targeting

"Pointing" is done with the camera; there's no crosshair:

1. **Candidates:** every interactable object whose bounds are within **reach** of her chest (1.0 m, tunable), and not behind something solid (a ray from her chest to the object's nearest point; its own collider doesn't count).
2. **Target:** of those, the one nearest the **centre of the screen**: 0 if the view's centre line passes through its bounds, otherwise the angle to its centre; nothing beyond 30° (tunable). Ties go to the nearer object.
3. **Feedback:** a prompt **next to the target on screen** names the action: *Open* / *Close* for doors, *Open ramp* / *Close ramp* and *Open door* / *Close door* for the keypads and panels, *Open window* / *Close window* for the lever (owner, 2026-10-12; it was at the bottom of the screen). It's placed to the right of the centre of the target's bounds: clear of a small target (a keypad), at most 60 px from the centre of a large one (a door filling the view), and always inside the screen's edges. It follows the target as the camera moves.

**What isn't a target:**

- **A door that a keypad, a panel or a lever controls** (owner, 2026-10-12): the side door and the cargo ramp are used from their keypads only; the bulkhead doors from their panels; the engineering window from its lever.
- A door she's standing on (see *Doors*).

**Doors that open together are one target:** the roof hatch's two parts (`Top Hatch`, `Top Hatch Bottom`). Aiming at either shows one prompt; one press moves both to the same state. Each part is tagged `opensWith: "<the other's name>"` in the ship file (since the export of 2026-10-12; until then the pair was listed in the code).

**The highlight is off by default** (the *highlight* slider in the tuning panel, 0 = off): the target lifted toward white, the first version's feedback. The slider stays until the owner has seen the prompt; then it's removed with its shader code. It rides on the see-through hull's per-object uniform (its `w`: bit 0 = never cut, bit 1 = highlighted), so it costs no extra per-draw update.

## Doors

| Door | Object in `The Zamboni 1.19.blend` | Hinge | Opens |
|---|---|---|---|
| Side door (cargo hold): **from its keypad only** | `Door` | bottom edge | outward and down until it rests on the ground (126°): **open, it's a ramp** |
| Trapdoor to the crew quarters | `Hatch.002` | one edge | up, 90° |
| Roof hatch, outer (**one target with the inner**) | `Top Hatch` | one edge | up, 100° |
| Roof hatch, inner | `Top Hatch Bottom` | one edge | down, 90° |
| Fridge doors | `Galley Door`, `Galley Door.001` | vertical edge | 100° |
| Galley cupboard | `Galley Door.002` | vertical edge | 100° |
| Lockers | `Locker Door` (cargo bay), `Locker Door.001`, `Locker Door.003` (crew quarters) | vertical edge | 100° |

- **All start closed except the trapdoor**, which starts open for now (owner, 2026-10-09: from below, the camera angle makes it hard to aim at; to be worked out later). The trapdoor and two galley doors are modelled open in the file; the export closes the galley doors (`MODELLED_OPEN`) and tags the trapdoor `startOpen`.
- **The side door, fully open, is a ramp** (owner): as for the cargo ramp, a smooth walkable slope stands in for its steps, and its own collider is off. The doorway has a sill 0.13 m above the cargo floor (and above the door's hinge), so the slope climbs to the sill's top at no more than 42° (her controller takes up to 45°), then runs flat across it into the hold; its foot lies about 0.1 m past the door's far end. The door can't be closed while she's on it.
- Each press toggles; the door eases (smoothstep) over 0.6 s (tunable).
- **Collision:** every door has a convex collider that follows it (the fridge and cupboard doors too, since 2026-10-09).
- **A moving door pushes her out of its way** (owner, 2026-10-09; plan: [`../plans/features/interaction-clearance.md`](../plans/features/interaction-clearance.md)). Each fixed step, after her own movement, if the door's next position overlaps her capsule she's moved out along the contact normal, **sideways only**, through her character controller (so walls and furniture stop her; she's never placed inside anything). She slides, with no animation. The cargo ramp does the same.
  - **It stops instead** when she can't be cleared (pinned against furniture), when she's on a ladder, or when it would have to lift her (a hatch or the ramp rising under her; the side door and ramp closing while she's on them). A stopped door **backs off until there's 3 cm between them** (left touching her, wedged against furniture on her other side, Rapier's controller wouldn't let her move at all) and **waits** until she's 5 cm clear of its next position, instead of following her.
  - **No door is offered while she's standing on it** (the closed trapdoor: owner, the camera angles don't work there anyway).
  - Tuning panel: *doors push her* (off: they only stop, as before).
- The bulkhead doors and the engineering window slide: see *Sliding doors* below.
- Doors are cut by the see-through hull like before; their raycast data follows them while they move, and they're left out of the ship's merged shadow caster (they cast their own).

**Keypads** (`Plane.004`, upper: the cargo ramp; `Plane.006`, lower: the side door), beside the side door. The cargo ramp still **starts open**: it's the way in from the start position, and the keypads are inside. The tuning panel's *cargo ramp open* checkbox follows the keypad.

> **[Agent note]** **The cargo ramp didn't close (fixed 2026-10-12).** The game took the ramp's pose in the ship file for "closed". Since the export of 2026-10-09 the file has the ramp lying open (the object turned 88° about its hinge), so "closing" moved it 4°. The game now takes "closed" as the door object with no rotation of its own, whatever pose the file has it in (`closedAngle` in `ship.ts`); it travels 92° again. The same would happen to any door exported open that isn't in the export's `MODELLED_OPEN` list: the reference file (pass 2) has every door closed.

## Sliding doors

Built 2026-10-13 (owner's backlog of 2026-10-12, items 6 to 8; until then the bulkhead doors weren't interactive). A sliding door moves along a line instead of turning on a hinge; everything else is as for the other doors (the easing, the collider that follows it, pushing her or stopping, the see-through hull).

| What | Objects in `The Zamboni 1.19.blend` | Opens |
|---|---|---|
| Bulkhead door, upper deck (crew quarters ↔ cockpit) | `Door Cockpit`, `Door Cockpit 2` | **by itself** when she's near; its two leaves slide apart into the bulkhead, each by its own width |
| Bulkhead door, lower deck (cargo hold ↔ engineering) | `Door Engineering`, `Door Engineering 2` | the same. Its doorway is off-centre on purpose (owner: to make space for the locker) |
| Engineering window | `Lab Window`, `Lab Window.001` | **from its lever**; the two halves slide apart, each by its own width. There's glass behind them |
| The lever | `Level`, on `Level Panel` | slides 0.06 (Blender units) along its own Y axis, toward the window, when the window opens (owner, 2026-10-13: as in the UE prototype) |

- **Closed, the two leaves fit into each other:** their meeting edges are S-shaped, so their bounds overlap by 0.11 (Blender units). The leaves are scaled 1.02 across and up so they reach into the doorway's frame: at their modelled size a line of light showed between door and frame (owner, 2026-10-13). Done by [`app/tools/fit-bulkhead-doors.py`](../../app/tools/fit-bulkhead-doors.py): see [`asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export).
- **Near** (owner, 2026-10-13): she's on the door's deck and within **1.5 m** of the closed door, measured on the floor to the door's bounds (*...when she is within*, tuning panel). The distance and the slide time go together: the door has to be open before she reaches it at a run (3.5 m/s indoors). At 0.6 s she ran into the leaves, was pushed aside by them and ended against the bulkhead. A longer distance isn't the fix: at 2 m the cockpit's door stays open for most of the cockpit. It closes when she's 0.3 m further away than that, so it doesn't flutter at the edge. Only she opens doors: the crew don't walk yet.
- **Panels** (`Door Panel - Cockpit`, `- Crew Quarters`, `- Engineering`, `- Cargo Hold`: one on each side of each bulkhead). **A panel shuts its door and keeps it shut** (owner, 2026-10-13): *Close door* shuts it, whoever is near; *Open door*, from either panel, makes it automatic again, and since she's standing at it, it opens. A door can't be held open.
- **The lever** is one target with its panel: *Open window* / *Close window*. It isn't used while it or the window is moving (as in the UE prototype). **The lever moves first; the window starts, with its sound, 0.6 s after the lever is used** (*window after its lever*, tuning panel): together, the window's sound covered the lever's (owner, 2026-10-13; first 0.3 s, then doubled).
- **Time:** 0.3 s, a setting of its own (*sliding door time*). *Bulkhead doors open by themselves* (tuning panel) can be turned off: the panels then just open and close them.
- **Collision:** each leaf and each window half has a convex collider that follows it; the lever has none. A leaf closing on her pushes her sideways or stops and waits, as any door does. **An opening leaf pushes nothing:** it moves along its own face, away from the doorway (running at a door, she touched the leaves before they were open and was pushed aside, against the edge of the doorway).
- **See-through:** a closed bulkhead door hides her from a camera in the next room, as its bulkhead does: she shows only through the leaf's glass strip. See *Open questions*.
- **Sound** (2026-10-13, backlog pass 4.5): when a bulkhead door or the window **starts to move**, opening or closing, `sfx_door_slide` plays from the middle of the doorway, from 0.1 s into the file (as UE does). One sound per door, not per leaf, at 0.64 of the file's level (owner, 2026-10-13: lowered by 20%, then by 20% again). The other doors and the devices have sounds of their own since: see *Sounds*.
- **Not built:** the light UE fades in with the window, and the daylight in engineering from the ramp (lighting is set aside, owner 2026-10-13).

## Sounds

Built 2026-10-13 ([plan](../plans/features/interaction-sounds.md)). **Placeholders, and subtle on purpose** (owner): short, with no bright part, at about a third of the bulkhead doors' level, full within 1 m and silent at 8 m (the ramp and side door: 2 m and 14 m). *Interaction sounds* in the tuning panel (*Sound*) scales the whole set. UE had none of these.

| What | Sound | When |
|---|---|---|
| Lockers, fridge doors, the galley cupboard | A soft click; a dull knock | It starts to open; it reaches closed |
| The trapdoor, the roof hatch (one sound for its two parts) | The same two, lower and a little louder | The same |
| The keypads (cargo ramp, side door), the bulkhead doors' panels | **Two tones** (owner): rising for open, falling for close | When used |
| The lever | A lever being thrown (a recording the owner chose); no tones | When used (not while it or the window is moving: it isn't used then). **The window starts 0.6 s later** |
| The cargo ramp, the side door | **An electric motor over the hiss of hydraulics** (owner), not loud; then the press letting its pressure go, and a thud | While it moves; when it reaches open or closed |
| The ladder | A light tap on metal (three variations) | She takes hold; then every 0.35 m climbed |

- A door that stops against her and waits: the motor stops with it and starts again; the small doors make their closing sound only once closed.
- Which sound a hinged door gets comes from what's already known of it, not a new tag: it opens down to the ground (a motor), its hinge stands upright (a latch) or lies flat (a hatch).
- **Her footsteps** aren't an interaction: see [prototype 01's README](../../app/prototypes/01-walk/README.md#sound) and [`audio.md`](../architecture/audio.md#what-exists-prototype-01-2026-10-13).
- **Not built:** a sound when a target comes into reach (owner, 2026-10-13: no).

## The boombox

Built 2026-10-13 (backlog pass 4.5; [plan](../plans/features/audio-from-ue.md)). `Boombox.001`, on the crew quarters shelf, plays the UE prototype's four tracks.

- **One action, no *Stop*** (owner, 2026-10-13: no interaction in the game has more than one option). Each use moves it one step round a ring: **track 1 → 2 → 3 → 4 → off → track 1**. The prompt names the step it will take: *Play* when it's off, *Next track* while one of the first three is on, *Turn off* on the fourth.
- **Every use plays the cassette sound first**; the track starts, from 0.1 s, when that ends. Using it stops the track that's on at once. Used again before the cassette sound ends, only the last use counts.
- **A track that ends by itself goes on to the next**, with no cassette sound; the fourth ends in *off*.
- **It shakes while a track plays**: a small random move and turn each frame (*boombox: vibration*, tuning panel; 0 = still). As in UE.
- **The sound comes from the boombox** and falls off with distance, in a straight line: full within 1.5 m, silent at 12 m (*boombox: full within*, *silent at*). A guess: UE's values aren't readable. The distance is to the camera, not to her. A closed door doesn't muffle it.
- **Not from UE:** the ring's *off* step (UE's `Stop` is most likely "stop and move to the next track"); what UE's `Random Integer` feeds isn't known, so nothing here is random but the shake.

## Ladders

No button: walking into a ladder is enough (owner).

**Ladders go up only** (owner, 2026-10-12). The way down is the opening: she falls through it.

- **From the bottom:** walking toward a ladder's foot (within 0.5 m, pushing toward it) attaches her. Pushing toward the ladder climbs (camera-relative, like walking). With the stick at rest she stays where she is.
- **At the top she steps off by herself** onto the floor above, whatever the stick says: of the spots around the top with floor and room for her, the one with the most open floor around it. A ladder with no floor at the top just stops there.
- **Letting go:** pushing away from the ladder, or jump. She drops. (At the foot, pushing away just walks her off.)
- **From the floor above: nothing attaches her.** Walking into the opening, she falls through it to the floor below.
- **Blocked above:** a ray from her head stops her under a closed hatch. She can open it from the ladder (it's in reach).
- After leaving a ladder (stepping off, letting go) she doesn't attach again until the stick is let go too (so holding the stick doesn't loop her back on).
- While climbing she's placed directly, without collisions, and shown standing: **no climbing animation yet**.

| Ladder | Where | Top |
|---|---|---|
| `Ladder Cargo Bay` | cargo bay, up through the trapdoor | the crew quarters floor |

The rungs on the cockpit bulkhead by the galley (`Ladder Crew Quarters`) were removed (owner, 2026-10-09).

Ladders are found from their bounds at load: she stands on the more open side, the bottom is the floor under it, the top is the lowest floor found beside its top end that's reachable straight up (measured with the doors left out).

> **[Agent note]** **"Stuck at the top" (fixed 2026-10-12).** The first version stepped her off toward where the stick pointed, which while climbing is toward the ladder. At the cargo bay ladder that spot is a corner between the cargo bulkhead and the open trapdoor: forward and left are walls, and right or back walked her into the 0.7 m zone that attached her to the top of the ladder and took her down again. Both halves are gone: she's put on the most open floor, and nothing attaches her from above.

## Data

From the ship file's custom properties (glTF extras). Since 2026-10-12 they're set in Blender, in the reference file (`doorAxis`, `doorAngle`, `doorToGround`, `doorStartOpen`, which [`app/tools/export-ship.py`](../../app/tools/export-ship.py) writes as `door`; naming contract: [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#naming-contract-proposed)):

- `door: {axis, angle, toGround, startOpen}` and `interact: "open"` on each door; `hinge` (its hinge point).
- `door: {slide, auto}` on a sliding door (in the file: `doorSlide`, `doorDistance`, `doorAuto`): the way and distance it slides to open, as a vector in the ship's space; `auto`: it opens when she's near.
- `interact: "use"`, `device: "panel"`, `controls: "<object name>"` on the keypads and the bulkhead doors' panels; `device: "lever"` on the window's lever panel. `controls` names one door: everything that opens with it moves too.
- **A device's child that's tagged as a door is its handle** (the lever on its panel): it goes to its other position with what the device controls.
- `opensWith: "<object name>"` on doors that open together (the roof hatch's parts, a bulkhead door's leaves, the window's halves).
- Ladders are listed by name in the code for now. So is the boombox (`UNTAGGED` in `interaction.ts`), until the next export tags it `interact: "use"`, `device: "boombox"`.

## Code

In prototype 01: [`interaction.ts`](../../app/prototypes/01-walk/src/interaction.ts) (what's a target, what a device does, targeting, the prompt's place, highlight), [`doors.ts`](../../app/prototypes/01-walk/src/doors.ts) (hinged and sliding doors, opening on approach, where a sliding door's sound comes from), [`boombox.ts`](../../app/prototypes/01-walk/src/boombox.ts), [`audio.ts`](../../app/prototypes/01-walk/src/audio.ts) (see [`audio.md`](../architecture/audio.md#what-exists-prototype-01-2026-10-13)), [`ladders.ts`](../../app/prototypes/01-walk/src/ladders.ts); the sounds' cues in `cues.json`, made by [`app/tools/make-placeholder-sounds.mjs`](../../app/tools/make-placeholder-sounds.mjs); the interact action in `input.ts`; the overlap test, rays and teleport in `physics.ts`.

## Open questions

- **A closed bulkhead door between her and the camera** (found 2026-10-13). The indoor camera is 3.5 m behind her and a door closes once she's 1.8 m past it, so walking into the cockpit or engineering with the camera behind her, the door closes between them and she's hidden. Before the doors moved, the camera saw her through the open doorway. Options: the door stays open while the camera looks through its doorway; the leaves are cut like the hull while they hide her; leave it. To judge in play, and to settle with the see-through pass (backlog pass 5).

- **The roof hatch can't be reached** (it's about 2.3 m above the cockpit floor; the rungs are on the other side of the cockpit bulkhead). Owner, 2026-10-09: either an unfolding ladder gets added, or it stays as it is: the crew have jetpacks. (For testing, *reach* at ~1.8 m lets her open it from the cockpit floor.)
- **Aiming at the trapdoor from below** is hard with the camera angle; it starts open until that's worked out.
- A climbing animation (Part 1 has none).
- Gamepad untested by the agent (no controller in the test browser).
- **The prompt and a target she hides:** the prompt is placed at the target even when her own body is between the camera and it (a keypad behind her head). To judge in play.
