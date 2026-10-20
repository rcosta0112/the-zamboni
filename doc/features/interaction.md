# Interaction

**Status:** first version built in prototype 01 (2026-10-09), changed on 2026-10-12 (pass 1 of [`../plans/backlog-passes.md`](../plans/backlog-passes.md): ladders up only, the side door from its keypad only, the roof hatch as one target, the prompt next to the target) and on 2026-10-13 (pass 4, [`../plans/features/bulkhead-doors.md`](../plans/features/bulkhead-doors.md): the bulkhead doors, their panels, the engineering window and its lever); owner play-test pending. Plan: [`../plans/features/interaction-doors.md`](../plans/features/interaction-doors.md). Decision: [`../decision-log.md`](../decision-log.md).

Point at something and press a button to use it, as in the UE prototype. In this version: the ship's doors, the two keypads in the cargo hold, the bulkhead doors (which open by themselves) and their panels, the engineering window's lever, and ladders (which need no button).

## Controls

| Action | Gamepad | Keyboard |
|---|---|---|
| Use the target | **B / Circle** | **E** |
| Climb a ladder | Walk into its foot; push toward it to climb, away from it to climb down | Same (W A S D) |
| Leave a ladder at the top | Push any way but toward it: she floats for a moment, and walks | Same |
| Jump off a ladder | A (jump): a jump as anywhere else | Space |
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

**Doors that open together are one target:** the roof hatch's two parts (`Top Hatch Upper`, `Top Hatch Lower`). Aiming at either shows one prompt; one press moves both to the same state. Each part is tagged `opensWith: "<the other's name>"` in the ship file (since the export of 2026-10-12; until then the pair was listed in the code).

**No highlight:** the first version lifted the target toward white; the prompt replaced it, and the slider and its shader code were removed on 2026-10-14 (owner).

## Doors

| Door | Object in `The Zamboni 1.19.blend` | Hinge | Opens |
|---|---|---|---|
| Side door (cargo hold): **from its keypad only** | `Side Door` | bottom edge | outward and down until it rests on the ground (126°): **open, it's a ramp** |
| Trapdoor to the crew quarters | `Floor Hatch` | one edge | up, 90° |
| Roof hatch, outer (**one target with the inner**) | `Top Hatch Upper` | one edge | up, 100° |
| Roof hatch, inner | `Top Hatch Lower` | one edge | down, 90° |
| Fridge doors | `Galley Door 2`, `Galley Door 1` | vertical edge | 100° |
| Galley cupboard | `Galley Door 3` | vertical edge | 100° |
| Lockers | `Cargo Locker Door` (cargo bay), `Crew Locker Door 2`, `Crew Locker Door 1` (crew quarters) | vertical edge | 100° |

- **All start closed except the trapdoor**, which starts open for now (owner, 2026-10-09: from below, the camera angle makes it hard to aim at; to be worked out later). The trapdoor and two galley doors are modelled open in the file; the export closes the galley doors (`MODELLED_OPEN`) and tags the trapdoor `startOpen`.
- **The side door, fully open, is a ramp** (owner): as for the cargo ramp, a smooth walkable slope stands in for its steps, and its own collider is off. The doorway has a sill 0.13 m above the cargo floor (and above the door's hinge), so the slope climbs to the sill's top at no more than 42° (her controller takes up to 45°), then runs flat across it into the hold; its foot lies about 0.1 m past the door's far end. The door can't be closed while she's on it.
- Each press toggles; the door eases (smoothstep) over 0.6 s (tunable).
- **Collision:** every door has a convex collider that follows it (the fridge and cupboard doors too, since 2026-10-09).
- **A moving door pushes her out of its way** (owner, 2026-10-09; plan: [`../plans/features/interaction-clearance.md`](../plans/features/interaction-clearance.md)). Each fixed step, after her own movement, if the door's next position overlaps her capsule she's moved out along the contact normal, **sideways only**, through her character controller (so walls and furniture stop her; she's never placed inside anything). She slides, with no animation. The cargo ramp does the same.
  - **It stops instead** when she can't be cleared (pinned against furniture), or when it would have to lift her (a hatch or the ramp rising under her; the side door and ramp closing while she's on them). A stopped door **backs off until there's 7 cm between them** (left touching her, wedged against furniture on her other side, Rapier's controller wouldn't let her move at all) and **waits** until she's 10 cm clear of its next position, instead of following her.
  - **While she climbs the ladder, a door moves through her** (since 2026-10-20, pass 2b of the ladder): see *Ladders*.
  - **The cargo ramp, moved from its keypad, doesn't stop for her** (owner, 2026-10-14): she's inside then, and can't be under it. It still pushes her sideways where it can. Touching it on its way down had stopped it and left her stuck between it and the pallet. Moved any other way (the tuning panel's checkbox; from outside, when that exists) it stops as above: she can be under it. (`cargoRampByKeypad` in `settings.ts`, `unstoppable` in `advance`.)
    - **But it stops if it would lift her** (2026-10-14, item 35): she can step onto it after using the keypad. Passing through her, it left her inside its collider, and she walked out through the closed ramp. Now it stops and waits, as for any door, until she's off it (either way); then it closes. Pinned sideways, it still doesn't stop.
    > **[Agent note]** The other way would be to keep it going and slide her off it into the bay. That needs a push of its own (the sideways push sent her 2.4 m outward when it gave way): not done. The owner's call.
  - **A door keeps her 6 cm clear of itself as it moves**, not just out of its way (2026-10-14; 3, 5 and 2 cm before). Nearer than her controller's contact gap (3 cm), the controller counts her as touching the door and won't move her at all, not even away from it: an opened cupboard or locker door left her stuck beside it.
  - **The trapdoor, shut, is a fixed lid** (`lid` in `doors.ts`): standing on a moving part's collider she could hardly move. Any hinged door that lies flat when shut gets one (the roof hatch's parts too).
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
| Bulkhead door, upper deck (crew quarters ↔ cockpit) | `Cockpit Door Right`, `Cockpit Door Left` | **by itself** when she's near; its two leaves slide apart into the bulkhead, each by its own width |
| Bulkhead door, lower deck (cargo hold ↔ engineering) | `Engineering Door Right`, `Engineering Door Left` | the same. Its doorway is off-centre on purpose (owner: to make space for the locker) |
| Engineering window | `Engineering Window Left`, `Engineering Window Right` | **from its lever**; the two halves slide apart, each by its own width. There's glass behind them |
| The lever | `Engineering Window Lever Handle`, on `Engineering Window Lever` | slides 0.06 (Blender units) along its own Y axis, toward the window, when the window opens (owner, 2026-10-13: as in the UE prototype) |

- **Closed, the two leaves fit into each other:** their meeting edges are S-shaped, so their bounds overlap by 0.11 (1.19's Blender units; 0.16 m since the file took the game's scale, 2026-10-19). The leaves are scaled 1.02 across and up so they reach into the doorway's frame: at their modelled size a line of light showed between door and frame (owner, 2026-10-13). Done by [`app/prototypes/0.0.2/tools/fit-bulkhead-doors.py`](../../app/prototypes/0.0.2/tools/fit-bulkhead-doors.py): see [`asset-pipeline.md`](../architecture/asset-pipeline.md#before-the-next-export).
- **Near** (owner, 2026-10-13): she's on the door's deck and within **1.5 m** of the closed door, measured on the floor to the door's bounds (*...when she is within*, tuning panel). The distance and the slide time go together: the door has to be open before she reaches it at a run (3.5 m/s indoors). At 0.6 s she ran into the leaves, was pushed aside by them and ended against the bulkhead. A longer distance isn't the fix: at 2 m the cockpit's door stays open for most of the cockpit. It closes when she's 0.3 m further away than that, so it doesn't flutter at the edge. Only she opens doors: the crew don't walk yet.
- **Panels** (`Cockpit Door Panel Front`, `Cockpit Door Panel Back`, `Engineering Door Panel Front`, `Engineering Door Panel Back`: one on each side of each bulkhead; *Front* is the one on the side toward the ship's front). **A panel shuts its door and keeps it shut** (owner, 2026-10-13): *Close door* shuts it, whoever is near; *Open door*, from either panel, makes it automatic again, and since she's standing at it, it opens. A door can't be held open.
- **The lever** is one target with its panel: *Open window* / *Close window*. It isn't used while it or the window is moving (as in the UE prototype). **The lever moves first; the window starts, with its sound, 0.6 s after the lever is used** (*window after its lever*, tuning panel): together, the window's sound covered the lever's (owner, 2026-10-13; first 0.3 s, then doubled).
- **Time:** 0.3 s, a setting of its own (*sliding door time*). *Bulkhead doors open by themselves* (tuning panel) can be turned off: the panels then just open and close them.
  > **[Agent note]** **It is off for now** (owner, 2026-10-13: "disable the proximity trigger on the doors for now"): `autoDoors: false` in `settings.ts`. The bulkhead doors start shut and open and close from their panels only. The code is kept, and the scripted check turns the setting on for itself, so everything above about doors opening by themselves describes what comes back when it's turned on again.
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
| The ladder | A light tap on metal (three variations) | Each time a hand lands on a rung (or on the floor above): five fixed moments of the animation (`RUNG_TIMES` in `ladders.ts`, measured by `tools/ladder-times.js`) |
| The jetpack rack | Straps, then a buckle's clack; for putting back, the buckle, then the weight onto the hooks | Taking one; putting it back |

- A door that stops against her and waits: the motor stops with it and starts again; the small doors make their closing sound only once closed.
- Which sound a hinged door gets comes from what's already known of it, not a new tag: it opens down to the ground (a motor), its hinge stands upright (a latch) or lies flat (a hatch).
- **Her footsteps** aren't an interaction: see [0.0.2's README](../../app/prototypes/0.0.2/README.md#sound) and [`audio.md`](../architecture/audio.md#what-exists-prototype-01-2026-10-13).
- **Not built:** a sound when a target comes into reach (owner, 2026-10-13: no).

## The boombox

Built 2026-10-13 (backlog pass 4.5; [plan](../plans/features/audio-from-ue.md)). `Boombox`, on the crew quarters shelf, plays the UE prototype's four tracks.

- **One action, no *Stop*** (owner, 2026-10-13: no interaction in the game has more than one option). Each use moves it one step round a ring: **track 1 → 2 → 3 → 4 → off → track 1**. The prompt names the step it will take: *Play* when it's off, *Next track* while one of the first three is on, *Turn off* on the fourth.
- **Every use plays the cassette sound first**; the track starts, from 0.1 s, when that ends. Using it stops the track that's on at once. Used again before the cassette sound ends, only the last use counts.
- **A track that ends by itself goes on to the next**, with no cassette sound; the fourth ends in *off*.
- **It shakes while a track plays**: a small random move and turn each frame (*boombox: vibration*, tuning panel; 0 = still). As in UE.
- **The sound comes from the boombox** and falls off with distance, in a straight line: full within 1.5 m, silent at 12 m (*boombox: full within*, *silent at*). A guess: UE's values aren't readable. The distance is to the camera, not to her. A closed door doesn't muffle it.
- **Not from UE:** the ring's *off* step (UE's `Stop` is most likely "stop and move to the next track"); what UE's `Random Integer` feeds isn't known, so nothing here is random but the shake.

## The jetpack rack

Built 2026-10-14 (item 32; [plan](../plans/features/dr-green-jetpack-model.md)). On the cargo hold's wall: two shelves (`Jetpack Rack Upper`, `Jetpack Rack Lower`) and four jetpacks with straps (`Jetpack 3`, `.002` below, `.003`, `.004` above; `.003` added by the agent on 2026-10-14, item 37: a copy of `.004`, its mesh and tags shared).

- **Pointing at one, *Take jetpack*:** it disappears from the rack and she wears one. Hers (`Jetpack`, no straps) shows on her back, her little backpack (`Backpack.002`) hides, and the hood's shape key `jetpack` is on, so the hood clears it. **She can fly only while she wears one** (Space / R2). Jumping (C / Cross) works with or without it.
- **While she wears one, only the empty spot is offered, *Put back jetpack*:** it reappears there and everything goes back (owner, 2026-10-14: taken off at the rack only).
- Sounds: straps and a buckle, one for taking, one for putting back (placeholders: [Sounds](#sounds)).
- *Wearing a jetpack* in the tuning panel (*Jetpack*) moves the same state; the rack follows it (switched on, the first jetpack goes). She starts without one.
- On Part 1's model (tuning panel) nothing shows or hides: its jetpack is part of the model. The flying rule is the same.

### Flying

Built 2026-10-14 (item 39; [plan](../plans/features/jetpack-hover-and-flight.md)). **The jetpack with momentum** (owner: "similar to the ship in Asteroids"). While the jet is on (R2 or Space held) there's no gravity and she has a velocity that carries over. **Her horizontal speed picks the mode**, with a 0.3 s handover:
- **Hover** (slow): R2 sets her height: below 5 % the jet is off, then descend, hold (the middle third) and climb, up to 5 m/s, eased at 6 m/s². The stick's first 60 % drifts her up to 1.5 m/s in its direction (no momentum: precise near things); past that it thrusts. On the ground only R2's climb band takes off.
- **Flight**: from 4 m/s, until she's back under 1.5 m/s with the stick in its drift range, so a reversal through zero stays in flight. Thrust (12 m/s² at a full push) where the stick points, forward being where the camera looks, its pitch included; a drag holds her top speed at 20 m/s (Part 1's fly speed). Up and down follow the camera's aim more tightly than the drag (2/s), so a climb left from hovering doesn't carry her on up: taking off into flight she climbs about 2.5 m. R2's depth doesn't matter. Below 1 m a dive levels off; touching the ground costs her 4 m/s² and she flies on. Turning 90° at full speed takes an arc about 33 m across; pulling fully back stops her in about 1.2 s; the stick let go, she coasts back into hover in about 4 s. She faces the stick while it's pushed, her motion while she coasts. The camera may go below her (-40°) in flight only, eased with the handover.
- **R2 let go: the glide.** The jet cuts out at once and she keeps her velocity. Faster than her run, she glides: her speed falls off by 3 m/s², and on the way down part of gravity is cancelled by her speed (0.7 of it at top speed) and her fall is held to 6 m/s at top speed (12 m/s at her run speed). The stick does nothing. At her run speed the glide is over and she falls as without a jetpack; let go while hovering, she just falls. From 20 m/s, 10 m up: about 2 s and 35 m.
- **The skid:** on the ground faster than her run with the jet off (a glide that lands, or letting go while skimming the ground), she slides along her motion, losing 15 m/s², to a stop: no steering, no steps, shown standing. Off a ledge, she glides again. There's no damage in the game (owner).
- **Space and a digital R2** count as R2 held fully: with the stick at rest she climbs at 5 m/s (Part 1's rise).
- **Walls** take away the part of her velocity that goes into them, after three steps of being blocked (Rapier's controller now and then stops her for a step or two on open ground when she's pressed into it at speed).
- **Tuning panel** (*Jetpack*): top speed, thrust, up/down following the camera, the flight and drift speeds, the stick's drift range, the drift's acceleration and deceleration, the handover, the lowest flight, the ground drag, the glide's three values, the skid, and R2's band and speeds.

### The auto-parachute

Built 2026-10-14 (item 34; [plan](../plans/features/auto-parachute.md)). **After a fall of 5.5 m or more** (a bit under the ship's 6.5 m), **the jetpack she wears fires by itself near the ground** and she lands at 2 m/s (owner).
- **What counts as a fall:** measured from where it started (where she last stood or climbed, or let go of the jetpack) to the ground under her now, so dropping off a ledge onto lower ground counts too.
- **How long, and where it fires** (owner, 2026-10-14: twice as long as first built): on a fall of the minimum it brakes for 0.5 s (*burst on the lowest fall*), and the braking is the same for every fall, so a longer fall fires higher and for longer. Measured from start to landing: 5.6 m fires at about 2.85 m, 0.42 s; 8 m at 4.1 m, 0.5 s; 30 m at 16 m, about 1 s. (First built, it fired at her height, 1.23 m, on the minimum fall: 0.22, 0.25 and 0.45 s.) Firing at one height every time would stop a high fall dead.
- **Only with a jetpack on** (it's the jetpack's), and never inside the ship (no fall there is 5.5 m).
- **While it fires:** the flying clip and the jetpack's sound play; she steers as she falls; holding Fly is ordinary flying.
- **Tuning panel** (*Jetpack*): on/off, the lowest fall, the landing speed, the burst on the lowest fall. The braking follows from those and gravity. The exhaust glow shows while it fires.

### The exhaust glow

Built 2026-10-14 (item 38; [plan](../plans/features/jetpack-glow.md)). **Part 1's glow at the jetpack's two nozzles while she flies or the auto-parachute fires** (owner): a white core with a cyan halo, matched to the owner's video of Part 1 (`Big Moon Tiny Moon 2021-12-25 19-52-10.mp4`).
- **How Part 1 made it, and why it's different here:** a tiny cyan particle made into a ball of light by the camera's bloom. The game has no bloom, so the halo is painted into the sprite (`exhaust.ts`): one camera-facing, additive sprite per nozzle, the two overlapping. If bloom comes later, the halo can be turned down.
- **Where:** below the jetpack and behind it (owner, 2026-10-14, from a screenshot): from the middle of each nozzle ring (`Jetpack_Mesh002`, the jetpack's bottom back edge), 14 cm down and back at 45° in the jetpack's space (about 10 cm of each), and 6 cm toward the camera. It follows the jetpack as she moves. Children of the jetpack named `JetpackExhaust…` in the ship file would replace the rings as the starting point.
- **Size:** constant on screen, 12 % of its height per sprite at full (as Part 1's renderer kept its particle's size on screen).
- **With an analog R2** (and *jet sound follows R2* on): size and brightness follow the trigger squared, as the sound's level does, down to 35 % at the bottom. On its own it **flickers** (a new size up to 15 % either way, 30 times a second) and **shakes** (up to 4 mm).
- **Tuning panel** (*Jetpack*, *glow: …*): on/off, size, white core, both colours, halo brightness, the R2 bottom, flicker, flicker rate, shake, the two offsets.

## Ladders

**By button, with the owner's climbing animation** (since 2026-10-19, pass 2a of [`plans/features/ladder-climb-animation.md`](../plans/features/ladder-climb-animation.md)). At the ladder's foot the prompt says **Climb** (E / B, like every target). Pressed, she slides to where the animation starts (0.2 s or more, turning to face the ladder), then it plays (3 s, `Dr. Green - Ladder x1.25` from 1.21) and moves her: its root motion, so the camera follows her up. At its end she stands where its last frame leaves her, on the crew quarters floor beside the opening, turned a quarter to the right, and the stick is hers again; if that leaves her within a few centimetres of a door (the open trapdoor, since the owner moved her closer to the ladder in the animation), she then slides 0.15 clear of it, sideways, over 0.25 s (through her controller, so walls stop her), before the stick is hers: at 0.016 her controller wouldn't move her at all, and pushed only 0.04 clear she still caught on it for a moment (`DOOR_CLEAR` in `ladders.ts`, `awayFromDoors` in `doors.ts`; owner, 2026-10-20). While it plays nothing else can be used, and her movement, jump and the jetpack do nothing; **the camera stays the player's**. **No climbing down** (owner): from the floor above she drops through the opening, as before. Where the animation starts comes from the file: the armature it was made on (`Dr. Green Jump suit`, at the ladder's foot), tagged `climb` on her model by `npm run export:player`.
- **A shut trapdoor opens by itself** (pass 2b, 2026-10-20): its usual opening (0.6 s, its sound) starts **1.0 s into the animation** (frame 24), the latest start at which the swinging lid misses her (her hood, at 1.47 s), two frames earlier. Measured once, not at run time: `npm run probe -- tools/ladder-times.js` again if the animation, the ladder, the trapdoor or the door time changes (`TRAPDOOR_AT` in `ladders.ts`). A shut **and locked** trapdoor: no *Climb* prompt.
- **While she climbs, doors move through her** (neither push her nor stop): the lid's collider met her capsule, bigger than her body, and stopped at 0.8 open. The climb's end puts her clear of them.
- The open lid grazes her by a few vertices (a hand by its hinge, then her side as she steps off, within 5 cm): seen in the measurement, not in the screenshots.
- She ends about 9 cm from the opening's edge: walking back toward it, she drops through.

**Kept, not in use** (owner, 2026-10-19: so it can be rolled back), `ladders-free.ts`: the climb with the stick, as below.

No button: walking into a ladder is enough (owner).

**Up and down, and nothing moves her off it** (owner, 2026-10-13; from 2026-10-12 until then ladders went up only, and she stepped off at the top by herself).

- **From the bottom:** walking toward a ladder's foot (within 0.5 m, pushing toward it) **for half a second** attaches her, so walking past doesn't (owner, 2026-10-14). **Toward the ladder climbs, away from it climbs down** (camera-relative, like walking). With the stick at rest she stays where she is. At the foot, pushing away walks her off.
- **At the top she's held** for as long as the stick is toward the ladder or at rest. (Let go on arrival, the stick she's still holding would walk her at the wall the ladder stands on.)
- **Leaving the top:** the first push any other way (more than 75° from the ladder's direction), back included, lets go. **She floats for 0.6 s** (*float off the ladder top*, tuning panel): no gravity, walking as anywhere else, collisions on. The float ends as soon as there's floor under her; if the time runs out over the opening, she falls. At the cargo bay ladder the floor is 0.44 m behind her and to her left; to her right there's none she can stand on (the wall is too close), so that way she falls back down.
- **From the top there's no climbing back down:** back is the floor behind her. Below the top, away is down.
- **Jump is a jump** (the indoor height), from wherever she is on the ladder: part of the way up she falls to the floor below; near the top, pushing back, she lands on the floor above.
- **From the floor above: nothing attaches her.** Walking into the opening, she falls through it to the floor below. **The ladder doesn't collide while she's more than 1 m above its foot** (upstairs, or falling past it), so she doesn't land on it; it collides again once she stands on the floor below, clear of it. Dropping in while pushing toward it, she can land where it stands and overlap it until she steps away.
- **Blocked above:** a ray from her head stops her under a closed hatch. She can open it from the ladder (it's in reach).
- After leaving a ladder she doesn't attach again until the stick is let go too (so holding the stick doesn't loop her back on).
- While climbing she's placed directly, without collisions, and shown standing: **no climbing animation yet** (the owner's animation comes with pass 2 of [`plans/features/ladder-climb-animation.md`](../plans/features/ladder-climb-animation.md)). Since 1.20 the ladder's mesh reaches up into the opening, 0.2 m below the floor above (0.55 m before); the side she stands on is measured at her height above its foot.

| Ladder | Where | Top |
|---|---|---|
| `Cargo Hold Ladder` | cargo bay, up through the trapdoor | the crew quarters floor |

The rungs on the cockpit bulkhead by the galley (`Ladder Crew Quarters`) were removed (owner, 2026-10-09).

Ladders are found from their bounds at load: she stands on the more open side, the bottom is the floor under it, the top is the lowest floor found beside its top end that's reachable straight up (measured with the doors left out).

> **[Agent note]** **The ladder's collider** is cut out of the ship's at load, by the ladder's bounds (`addStaticMesh` in `physics.ts`), so it can be switched off. At the next export, `collider: "none"` on `Ladder Cargo Bay` and a collider made from its own mesh would replace that.

## Data

From the ship file's custom properties (glTF extras). Since 2026-10-12 they're set in Blender, in the reference file (`doorAxis`, `doorAngle`, `doorToGround`, `doorStartOpen`, which [`app/prototypes/0.0.2/tools/export-ship.py`](../../app/prototypes/0.0.2/tools/export-ship.py) writes as `door`; naming contract: [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#naming-contract-proposed)):

- `door: {axis, angle, toGround, startOpen}` and `interact: "open"` on each door; `hinge` (its hinge point).
- `door: {slide, auto}` on a sliding door (in the file: `doorSlide`, `doorDistance`, `doorAuto`): the way and distance it slides to open, as a vector in the ship's space; `auto`: it opens when she's near.
- **What a thing is comes from its `kind`, and the game finds it by kind** (since 2026-10-20; the game's structure, pass 6): the devices (`keypad`, `door-panel`, `lever`), `ladder`, `jetpack`, `boombox`, `ramp`. Each also has its stable `id`.
- `controls: "<id>"` on the keypads, the bulkhead doors' panels and the window's lever: the id of one door (or `cargo-ramp`); everything that opens with it moves too.
- **A device's child that's tagged as a door is its handle** (the lever on its panel): it goes to its other position with what the device controls.
- `opensWith: "<id>"` on doors that open together (the roof hatch's parts, a bulkhead door's leaves, the window's halves).
- The `interact` and `device` tags are still in the file but no longer read by the game. The export keeps every prop tagged `interact` or with an `id` as an object of its own.

## Code

In 0.0.2: [`interaction.ts`](../../app/prototypes/0.0.2/src/interaction.ts) (what's a target, what a device does, targeting, the prompt's place), [`doors.ts`](../../app/prototypes/0.0.2/src/doors.ts) (hinged and sliding doors, opening on approach, where a sliding door's sound comes from), [`boombox.ts`](../../app/prototypes/0.0.2/src/boombox.ts), [`jetpack.ts`](../../app/prototypes/0.0.2/src/jetpack.ts) (the rack; what she wears is in `model.ts`, flying only with one in `character.ts`), [`audio.ts`](../../app/prototypes/0.0.2/src/audio.ts) (see [`audio.md`](../architecture/audio.md#what-exists-prototype-01-2026-10-13)), [`ladders.ts`](../../app/prototypes/0.0.2/src/ladders.ts); the sounds' cues in `cues.json`, made by [`app/prototypes/0.0.2/tools/make-placeholder-sounds.mjs`](../../app/prototypes/0.0.2/tools/make-placeholder-sounds.mjs); the interact action in `input.ts`; the overlap test, rays and teleport in `physics.ts`.

## Open questions

- **A closed bulkhead door between her and the camera** (found 2026-10-13). The indoor camera is 3.5 m behind her and a door closes once she's 1.8 m past it, so walking into the cockpit or engineering with the camera behind her, the door closes between them and she's hidden. Before the doors moved, the camera saw her through the open doorway. Options: the door stays open while the camera looks through its doorway; the leaves are cut like the hull while they hide her; leave it. To judge in play, and to settle with the see-through pass (backlog pass 5).

- **The roof hatch can't be reached** (it's about 2.3 m above the cockpit floor; the rungs are on the other side of the cockpit bulkhead). Owner, 2026-10-09: either an unfolding ladder gets added, or it stays as it is: the crew have jetpacks. (For testing, *reach* at ~1.8 m lets her open it from the cockpit floor.)
- **Aiming at the trapdoor from below** is hard with the camera angle; it starts open until that's worked out.
- A climbing animation (Part 1 has none).
- Gamepad untested by the agent (no controller in the test browser).
- **The prompt and a target she hides:** the prompt is placed at the target even when her own body is between the camera and it (a keypad behind her head). To judge in play.
