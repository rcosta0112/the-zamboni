# Backlog

> **[Agent note]** The tracker for the owner's lists of 2026-10-09 and 2026-10-12: one line per item. The plan, with the passes and how each item is done: [`backlog-passes.md`](backlog-passes.md). Status is one of *To do*, *In progress*, *Built* (owner play-test pending), *Done*. The owner's own words are at the bottom, unchanged.

| # | Item | Pass | Status |
|---|---|---|---|
| 1 | Copy the `.blend` and update it to match the scene in the game; it becomes the reference (`The Zamboni 1.19.blend`) | 2 | Built |
| 2 | The cargo ramp keypad, moved away from the side door's in the file: re-export | 2 | Built (re-exported 2026-10-12 from the owner's updated 1.19: `Door Panel - Cargo Ramp`, moved toward the ramp) |
| 3 | The side door: no interaction of its own; it opens only from its keypad | 1 | Built |
| 4 | Bug: the ladder gets stuck at the top | 1 | Built |
| 5 | Ladders go up only; going down, she jumps down the hatch | 1 | Built |
| 6 | Bulkhead doors (`Door Cockpit`/`2`, `Door Engineering`/`2`): open and close when she gets close; a panel on each side opens or closes them | 4 | Built ([`features/bulkhead-doors.md`](features/bulkhead-doors.md)) |
| 7 | The engineering window opens like a bulkhead door, from a lever next to it | 4 | Built ([`features/bulkhead-doors.md`](features/bulkhead-doors.md)) |
| 8 | 6 and 7 as in the UE prototype (`BP_Door_Internal`, `BP_Engineering_Window`, `BP_Lever_Panel`) | 4 | Built ([`features/bulkhead-doors.md`](features/bulkhead-doors.md)) |
| 9 | Bug: the cargo ramp doesn't close | 1 | Built |
| 10 | Crew quarters and cockpit are too blue: sunlight through the windows should warm them | 3 | In progress (built in pass 3, but still too blue: the owner is making reference images in Blender; the tests and the new direction are in the decision log, 2026-10-12 update) |
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
| 21 | The jetpack, as in Big Moon Tiny Moon; no visuals; allowed anywhere for now | 6 | To do |
| 22 | The top hatch: one interaction opens or closes both parts | 1 | Built |
| 23 | The control prompt moves next to the object pointed at, instead of the colour highlight | 1 | Built |
| 24 | The audio files and audio events of the UE prototype, copied to the game (owner, 2026-10-13) | 4.5 | Built 2026-10-13 ([`features/audio-from-ue.md`](features/audio-from-ue.md), *As built*): door sound, boombox, the ship's noise; **the owner's to listen to** (levels, falloff, the mix, the loops, a gamepad alone) |

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