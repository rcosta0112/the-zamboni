# Backlog

> **[Agent note]** The tracker for the owner's lists of 2026-10-09 and 2026-10-12: one line per item. The plan, with the passes and how each item is done: [`backlog-passes.md`](backlog-passes.md). Status is one of *To do*, *In progress*, *Built* (owner play-test pending), *Done*. The owner's own words are at the bottom, unchanged.

| # | Item | Pass | Status |
|---|---|---|---|
| 1 | Copy the `.blend` and update it to match the scene in the game; it becomes the reference (`The Zamboni 1.19.blend`) | 2 | Built |
| 2 | The cargo ramp keypad, moved away from the side door's in the file: re-export | 2 | Built (re-exported 2026-10-12 from the owner's updated 1.19: `Door Panel - Cargo Ramp`, moved toward the ramp) |
| 3 | The side door: no interaction of its own; it opens only from its keypad | 1 | Built |
| 4 | Bug: the ladder gets stuck at the top | 1 | Built |
| 5 | Ladders go up only; going down, she jumps down the hatch | 1 | Built; **replaced by 31** (2026-10-13) |
| 6 | Bulkhead doors (`Door Cockpit`/`2`, `Door Engineering`/`2`): open and close when she gets close; a panel on each side opens or closes them | 4 | Built ([`features/bulkhead-doors.md`](features/bulkhead-doors.md)) |
| 7 | The engineering window opens like a bulkhead door, from a lever next to it | 4 | Built ([`features/bulkhead-doors.md`](features/bulkhead-doors.md)) |
| 8 | 6 and 7 as in the UE prototype (`BP_Door_Internal`, `BP_Engineering_Window`, `BP_Lever_Panel`) | 4 | Built ([`features/bulkhead-doors.md`](features/bulkhead-doors.md)) |
| 9 | Bug: the cargo ramp doesn't close | 1 | Built |
| 10 | Crew quarters and cockpit are too blue: sunlight through the windows should warm them | 3 | In progress (built in pass 3, but still too blue: the owner is making reference images in Blender; the tests and the new direction are in the decision log, 2026-10-12 update). **On hold** (owner, 2026-10-14: "ok for now", another lighting pass later) |
| 11 | Everything in engineering and the cargo hold is always visible while she's on that floor | 5 | To do |
| 12 | The engineering display (`Monitor Arm`) is invisible most of the time: it ends up inside the wall | 2 | Built |
| 13 | See-through in the crew quarters: furniture close to the walls (bunks, lockers); only their back walls are hidden | 5 | To do |
| 14 | Characters on other floors hide normally; on her floor they're always visible | 5 | To do |
| 15 | Try a black mask over everything on the floor she isn't on | 5 | To do |
| 16 | Fixed camera distance, one indoors and one outdoors; no zoom (wheel or D-pad); values in the tuning panel | 1 | Built |
| 17 | Minimum camera pitch: 0 | 1 | Built |
| 18 | All double-sided materials single-sided, with a switch in the tuning panel; issues fixed in Blender | 2 | Built |
| 19 | The ship's collision extended down to the ground (a box), so she can't get under it | 2 | Built |
| 20 | The same under the front thrusters | 2 | Built |
| 21 | The jetpack, as in Big Moon Tiny Moon; no visuals; allowed anywhere for now | 6 | Built 2026-10-14 (before pass 5, owner): hold Space; C / Cross jumps; Part 1's rule, values, jet sound and *Flying* clip. Gamepad (pass 6b): an analog R2 hovers half-way, climbs above, descends below; a digital R2 flies like Space. **Flying replaced by item 39** (momentum) |
| 22 | The top hatch: one interaction opens or closes both parts | 1 | Built |
| 23 | The control prompt moves next to the object pointed at, instead of the colour highlight | 1 | Built; approved, the highlight's code removed 2026-10-14 |
| 24 | The audio files and audio events of the UE prototype, copied to the game (owner, 2026-10-13) | 4.5 | Built 2026-10-13 ([`features/audio-from-ue.md`](features/audio-from-ue.md), *As built*): door sound, boombox, the ship's noise. Played by the owner, 2026-10-13: good |
| 25 | The displays look gray and washed out: emission made by nodes isn't exported as Blender shows it (owner, 2026-10-13) | – | Built 2026-10-13 ([`features/display-materials.md`](features/display-materials.md)): the export bakes them; ship and crew re-exported |
| 26 | Subtle placeholder sounds for every interaction where it makes sense; footsteps in the snow and in the ship (owner, 2026-10-13) | – | Built 2026-10-13 ([`features/interaction-sounds.md`](features/interaction-sounds.md), *As built*): footsteps cut from Part 1's loops, the rest made by a script. Approved (owner, 2026-10-14) |
| 27 | The sound pauses with the game; the gamepad's Start / Options pauses (owner, 2026-10-13) | – | Built 2026-10-13 |
| 28 | A start screen from the Figma mockup: a progress bar until everything is loaded, then the start button (states as in Eigodojo, the Zamboni mockup's colours), a click sound, Part 1's soundtrack (owner, 2026-10-13) | – | Built 2026-10-13 ([`features/start-screen.md`](features/start-screen.md), *As built*; what exists: [`design/start-screen.md`](../design/start-screen.md)): approved but for the pressed button (owner, 2026-10-14), now one flat box as in Eigodojo: **the owner's to look at** |
| 29 | The bulkhead doors' proximity trigger off for now; the code kept (owner, 2026-10-13) | – | Built 2026-10-13: `autoDoors: false`; the panels open and close them |
| 30 | Movement inside the ship: she gets stuck in lots of places; improve the collision (owner, 2026-10-13) | – | Built 2026-10-13 ([`features/movement-and-ladder.md`](features/movement-and-ladder.md), *As built*): she moves the way the stick points indoors, a lower indoor jump, ten collision boxes. Played and approved (owner, 2026-10-14); **the boxes are `*_col` objects in the ship file since 2026-10-14**, tagged `reach: "through"`. **Done** |
| 31 | The ladder: up walking forwards, down walking backwards; free once she clears the deck; off after she walks away and while she's upstairs (owner, 2026-10-13). Reverses item 5 | – | Built 2026-10-13 ([`features/movement-and-ladder.md`](features/movement-and-ladder.md), *As built*; what exists: [`features/interaction.md`](../features/interaction.md#ladders)). Played and approved (owner, 2026-10-14) |
| 32 | Take a jetpack from the rack: it hides on the rack, hers shows, her little backpack hides, the hood's shape key applies, flying turns on; she can take it off. Dr. Green from the ship file's new `Crew` collection, at the prototype's scale; no binoculars (owner, 2026-10-14) | – | Built 2026-10-14 ([`features/dr-green-jetpack-model.md`](features/dr-green-jetpack-model.md); what exists: [`../features/interaction.md`](../features/interaction.md#the-jetpack-rack)): taken and put back at the rack, flying only with one on, jumping with it allowed. **Done** (owner, 2026-10-14) |
| 33 | The ladder: a small delay before she gets on it (about 0.5 s of pushing toward it), so walking past doesn't attach her (owner, 2026-10-14) | – | **Built 2026-10-14** (`ATTACH_DELAY` in `ladders.ts`; probe: a 0.25 s push doesn't attach, a held one does after 0.53 s). **Done** (owner, 2026-10-14) |
| 34 | An auto-parachute (owner, 2026-10-14) | – | **Built 2026-10-14** ([plan](features/auto-parachute.md); [`interaction.md`](../features/interaction.md#the-auto-parachute)): after a fall of 5.5 m or more, wearing a jetpack, it fires near the ground and she lands at 2 m/s. Made twice as long the same day (owner): 0.5 s and about 2.85 m up on the minimum fall, longer and higher for longer falls. **Done** (owner, 2026-10-14) |
| 35 | She can walk through the cargo ramp while it's closing (owner, 2026-10-14) | – | **Fixed 2026-10-14.** Closed from the keypad (never stops for her), it passed through her while she stood on it, and she walked out through it. Now it stops when it would lift her and waits until she's off ([`interaction.md`](../features/interaction.md)). **Done** (owner, 2026-10-14) |
| 37 | The rack should hold four jetpacks; one is missing (owner, 2026-10-14) | – | **Done 2026-10-14** (owner's go-ahead): `Jetpack.003` on the upper shelf, a copy of `.004` (shared mesh, same tags), saved by the agent (copy: `… (before fourth jetpack, 2026-10-14).blend`); `export:ship`: one difference, the new jetpack. Smoke expects 4 |
| 36 | See the ship's shadow from further away; what does it cost, and what about other large objects? (owner, 2026-10-14) | – | **Built 2026-10-14** (owner: follow the recommendation): `shadowRangeOutdoors` 50 m, `shadowRangeIndoors` 25 m, eased; cascades when an outdoor site is built. The measurements: at 25 m the ship's shadow starts being cut 18–29 m from its centre (48–66 m along the sun's direction); gone at 40 m. The range costs sharpness, not time: the sun shadow is about +1.8 ms at 25, 50 or 80 m (headless Chrome, 131 casters, the ship one of them); a texel is 2 × range / 4096 (1.2 cm at 25 m, 2.4 cm at 50, the steps that took us from 2048 to 4096 on 2026-10-12). Options: a larger range outdoors only (cheap); cascades, as `performance.md` plans for outdoors (one more shadow render per cascade; the far one could draw only the ship); for static things, a shadow baked onto the snow. No other large objects yet. **Done** (owner, 2026-10-14) |
| 38 | The jetpack's exhaust glow, as in Part 1 (owner, 2026-10-14; video reference: `Big Moon Tiny Moon 2021-12-25 19-52-10.mp4`) | – | **Built 2026-10-14** ([plan](features/jetpack-glow.md), approved; [`interaction.md`](../features/interaction.md#the-exhaust-glow)): a sprite per nozzle with the halo painted in (no bloom); follows R2 like the jet sound, flickers on its own; moved below and behind the jetpack (owner). **Done** (owner, 2026-10-14) |
| 39 | On the controller, flying forward she keeps climbing: two modes instead, hovering (R2 sets her height, a little drift) and flight (where the camera points), chosen by her horizontal speed with a blend between; after the jet cuts out she glides on her momentum (owner, 2026-10-14). Replaces pass 6b's R2 rule | – | **Built 2026-10-14** ([plan](features/jetpack-hover-and-flight.md), approved: the agent's recommendations on its three questions; [`interaction.md`](../features/interaction.md#flying)): momentum as in Asteroids, hover / flight by her speed, a glide, a skid; eight smoke checks. **Done** (owner, 2026-10-14: "no issues") |
| 40 | Wind outside the ship, faint inside, louder in the cargo hold with the ramp and/or side door open, each by its size; crossfade the loop if it isn't clean (owner, 2026-10-14) | – | **Built 2026-10-14** ([`audio.md`](../architecture/audio.md)): first UE's `Starter_Wind05`, then (owner) klankbeeld's coast recording, then (owner) Mark DiAngelo's wind from the Islands project, its fades cut off, streamed and crossfaded (not a clean loop); on the cargo ramp she's outside (owner: it was quieter there). Levels in the tuning panel. **Done** (owner, 2026-10-14) |
| 41 | See-through from scratch: every rule off, the hull alone, then the hidden objects back one group at a time (owner, 2026-10-14). Replaces pass 5's plan; items 11, 13, 14, 15 come back as rules here | – | **In progress** on the branch `see-through-from-scratch`: stage 1 (the hull, floors, inner walls, the gap filled, the camera kept out of the wall) closed 2026-10-15 (owner: "good enough for now"); stage 2 (2026-10-15): the cockpit, engineering, the cargo hold whole and the crew quarters' big furniture back, cut by the hole; the cockpit (with its crew), engineering and the cargo hold's sled, pallet and lantern never cut on her deck; then every object back, the crew quarters' lockers, bunks, galley never cut and the camera in front of them, the clamps and cabinet contents fixed in the file and the export; then the camera colliding indoors (hull, bulkheads never cut, crew quarters' boxes and couch corner) and the hole's round end (owner's choice); next: the camera in a locker, the ceiling |
| 42 | Collision for medium and small objects: a pass to simplify it, with boxes where detailed shapes collide one by one (example, owner: the jetpack rack and the fire extinguisher under it inside one box) (owner, 2026-10-15) | – | **Built 2026-10-16** ([collision-boxes.md](features/collision-boxes.md), *As built*): 12 boxes in the file by [`add-collision-boxes-2.py`](../../app/tools/add-collision-boxes-2.py), 96 objects out of the collider (49,842 → 19,862 triangles); a probe walked, jumped and flew her into each box; smoke passes. Owner play-test pending |
| 43 | The camera also collides with the cargo ramp when it's closed (owner, 2026-10-16: for a future pass) | – | To do |
| 44 | The ladder by button: a *Climb* prompt, she slides to the start of the owner's animation (1.20, `Dr. Green - Ladder`), it plays, she ends where it ends; a closed trapdoor opens as her head reaches it; the free climb kept in the code (owner, 2026-10-17). Comes with her size: the game at the ship file's size, her rig normalized (recommended) | – | **Pass 2a built 2026-10-19** (the button, the slide, the animation moving her, the end upstairs); 2b next: the trapdoor, the rung sounds, the smoke checks ([`features/ladder-climb-animation.md`](features/ladder-climb-animation.md)) |
| 45 | IK in the game (feet on uneven ground, hands on what she uses, look-at; a free climb with hands on the rungs): its own plan when the first case comes (owner's question, 2026-10-19) | – | To do |
| 46 | One scale for the ship file and the game: 1 unit = 1 m, Dr. Green 1.23 tall at scale 1, the game's proportions kept, no factor in the exports; and what the ship export takes is a list (owner, 2026-10-19) | – | **Built 2026-10-19** ([`features/scale-normalization.md`](features/scale-normalization.md), *As built*): `The Zamboni 1.21.blend`; four of the owner's 1.20 changes to look at (asset pipeline, *To look at in 1.21*) |
| 47 | Export checks from the 2026-10-19 retrospective: flag a door not in its closed pose (against the list), a character whose action is missing; a script that lists what changed between two .blend versions (objects, door poses, actions, collections) | – | To do |
| 48 | Exports that don't break when the file is worked on: recorded closed poses for moving parts, the game's files replaced only when nothing is flagged, a baseline of places with `--accept`, a check after every export; or the component model of the ship the owner is weighing (owner, 2026-10-19) | – | Plan saved, no action ([`features/robust-exports.md`](features/robust-exports.md)) |
| 49 | The ship's things as components: kinds with defaults and states defined in the game, the file carrying only kind and id; the current structure and the patterns that fit (owner, 2026-10-19) | – | Plan saved, no action ([`architecture/game-architecture/components.md`](architecture/game-architecture/components.md)) |

**Left for now** (owner, 2026-10-12): the circle-mask idea of 2026-10-09.

## The owner's notes, as written

Here's the full list as the task was interrupted:


- Make a copy of the blend file and update it to match the scene. That will be our reference from now on.
- I moved the ramp control panel away from the side door so it's easier to select
- Remove the interaction from the side door itself. The only way to open it should be the panel.
- Check the lighting inside the crew quarters. The sunlight coming from the window should help to make things less blue. Probably easier to simulate it using a couple area lights the same color of the sun.
- The ladder is stick at the top. 
- The lader should work only going up. Let the player jump down the hatchet. Its way faster.
- Make all the objects in engineering and cargo hold always visible when the character is in that floor.
- Check why the display in engineer is invisible most of the time (it's called Monitor Arm). Looks like there's something wrong with armature, so it ended up inside the wall
- Let's add the bulkhead doors. They work like this: They open and close when the character gets close to them. There should be a pannel on the bulkhead on each side. If the player pushes the button the doors will open or close.
- There's a window in engineering that opens and closes when the player flips a switch next to them
- Both these elements work in the prototype. Copy the logic from there
- On the see-through shader: The main issue still remaining is in the crew quarters. It works fine on the other rooms. The problem is caused by the furniture close to the walls, like the bunk beds and the lockers. The way the shader is setup right now hides only their back walls. Let's consider solutions for this issue.
- Set a fixed distance for indoors and outdoors. Disable the zoom on the scroll wheel.
add controls to the panel so I can tell you the exact values.
- Set the min camera pitch to 0. That fixed several issues with the see-through shader
- Make it so characters in different floors hide normaly. They should be always visible if the character is on the same floor
- I would like to try adding a black mask to cover everything on the floor where the player is not.
- Make all double sided materials single sided. We'll fix any issues in Blender.
- Extend the collision box for the ship all the way to the ground so the character can't get under it. She get's stuck sometimes. Just adding a collision box would be enough
- Same for the front thrusters. Add a box underneath that goes all the way down. She sinks a bit into the floor when you try to walk under them.
- Implement the jetpack functionality from the Big Moon Tiny Moon Prototype. No need for the visual elements for now. Just make so she flies when you hold the space bar in the same way

- The trigger for the top hatch should open or close both parts with a single interaction

- instead of the color highlight, I want to move the control prompt next to the object being pointed at.

Added 2026-10-13:

- let's add another pass (call it 4.5). I would like to copy the audio files and audio events from the prototype. List everyhing you find before we start
- look at the textures for the displays. They look gray and washed out. You can still see the texture, but looks like the material is not setup correctly.

Added 2026-10-16:

- note for a future pass: the camera should also collide with the cargo ramp when closed
