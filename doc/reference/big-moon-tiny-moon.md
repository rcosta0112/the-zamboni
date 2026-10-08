# Big Moon Tiny Moon — Part 1 (summary)

*Big Moon Tiny Moon* is the first part of the story The Zamboni continues. It was prototyped between December 2020 and mid-2022 as a small third-person exploration game on an island. It was never finished. This document summarises what it was, what it established for the story, and what can be reused.

## Key facts at a glance

- **Same crew, earlier mission:** Dr. Green, Dr. Kaufman, the engineer who became Dr. Ogawa, and "Mr. Robot" (the precursor of Adam).
- **Same planet, probably.** The Zamboni's mission starts at "the portal leading to BMTM-640 B". BMTM = **B**ig **M**oon **T**iny **M**oon.
- **Already prototyped there:** third-person movement, the jetpack ("backpack"), scanning ruins, dialogue with portraits, penguins.
- **Engine:** Unity 2020.3 (URP, Cinemachine, Input System, Timeline, Yarn Spinner 1.2.7).

## Where things are

| What | Where |
|---|---|
| Unity project (source) | `C:\Users\31658\Projects\Big Moon Tiny Moon\` (scene `Assets/Scenes/Main.unity`, scripts in `Assets/Scripts/`) |
| Working folder: design docs, exported assets, Blender files, reference, builds, captures | `D:\Work\Big Moon Tiny Moon\` |
| Story outline | `D:\Work\Big Moon Tiny Moon\Doc\storyline.txt` (dated 2021-10-10) |
| Dialogue | `Doc\Dialog 1.01.yarn` (also in the Unity project under `Assets/Scripts/Dialog/`) |
| Location-flow mock-up | `D:\Work\Big Moon Tiny Moon\Ren'Py\game\` (one `.rpy` per location, a menu of where to go next) |
| Playable build | `D:\Work\Big Moon Tiny Moon\Builds\Big Moon Tiny Moon.exe` (Windows) |
| Gameplay captures | `D:\Work\Big Moon Tiny Moon\Media\` (e.g. 2021-05-22 and 2021-06-20 recordings) |

## The story

The player, **Dr. Green** (archaeologist; "J" in the Ren'Py mock-up), steps out of a portal onto an island under a big and a tiny moon. A team is already there to launch a **satellite** that will map the planet.

The rough storyline (from `storyline.txt`):

1. **Arrival.** Out of the portal, Dr. Green meets Mr. Robot, who gives an overview and points to the camp. (*"Going through portals can be hard on organics. I find it quite disorienting myself."*)
2. **Tracks.** Tractor tracks on the grass lead to the engineer and his rocket launcher.
3. **Camp.** The player unpacks and gets gear, including the scanner.
4. **The launcher.** Dr. Green is angry: the launcher was put down before she could survey the site, and it may be damaging artifacts. The engineer says Mr. Robot authorised it. (This is the one written dialogue, `Dr.Ogawa.01`.)
5. **Dr. Kaufman**, the exobiologist, is out by the icebergs watching penguins, using the jetpack. The player has to wait for her to come back to borrow it: the first gate.
6. **Scanning.** Scanning a ruin shows a holographic wireframe of what the building looked like, plus some text. Sites: dead tree temple, the portal, the fountain, two broken houses, Cypress Knees hill (a Mr. Robot is there studying the rocks), the lighthouse.
7. **Out of reach.** The fountain temple and the tower can be seen but not reached without the jetpack.
8. **The lighthouse.** Undecided: a curiosity, or something the player switches on.
9. **Kaufman returns** after enough scanning; the player gets the jetpack at the camp.
10. **With the jetpack:** the basin temple and the tower become reachable.
11. **Basin temple.** A large site with several scan points; birds fly off when the player gets close.
12. **The tower.** Fly to the top for the view; maybe a switch for the lighthouse.
13. **Ending.** With everything scanned, the engineer calls: ready to launch. Everyone meets at the launcher; cutscene of the rocket going up. A possible last shot: the satellite scanning the globe and finding **another portal**, which is where The Zamboni picks up.

**Locations:** Portal, Camp, Launcher, Tree Temple, Broken Bridge, Basin Temple, Elevator, Tower, House 1, House 2, Cypress Knees, Lighthouse.

**Tone, from the earliest design notes (Dec 2020):** interactive fiction more than a puzzle game; "just explore, find things and interact with characters and objects"; open-ended, "happy to leave the player wondering what is going on", likened to *Lost*. Penguins from day one. The portal ("slip gate") came from those notes too.

## What was built (Unity)

| System | How it worked | Script |
|---|---|---|
| **Third-person movement** | `CharacterController`; walk/run with acceleration, smooth turning toward the camera direction, gravity, ground check | `PlayerMovement.cs` |
| **Jetpack ("backpack")** | Hold *Fly* (right mouse / gamepad right shoulder): the character flies in the camera's direction on all axes, at `flySpeed`. With no movement input it rises straight up. Jet particles and a looping jet sound play while flying; the animator has a `flying` state | `PlayerMovement.cs` |
| **Camera** | Cinemachine third-person camera, invert-Y option | Cinemachine + `SimpleCameraController.cs` |
| **Footsteps** | A raycast down reads the surface tag (`Rock`, else grass) and picks the footstep sound; played only while the run/walk animation is active | `PlayerMovement.cs` |
| **Interaction** | Trigger volumes set a global "action context" (`Talk`, `Scan`) and show an *"E: …"* prompt; the Action key runs it | `Main.cs`, `ScannableController.cs`, `EngineerController.cs` |
| **Scanning** | The character turns to face the target, plays a scan animation, shows the scanner prop, and swaps the material of the target's `Rock`-tagged parts to a scan material | `PlayerMovement.cs` (`scan()`) |
| **Dialogue** | Yarn Spinner; a `setSpeaker` command shows the speaker's portrait (Green, Ogawa, Kaufman, Robot, Penguin); a typing sound plays while text appears | `Dialog.cs`, `Dialog 1.01.yarn` |
| **Penguins** | Wander at random speeds, desynced idle animations, squawk only within 50 m of the player | `PenguinController.cs`, `PenguinGenerator.cs` |
| **Birds** | Boids flocking | `BoidController.cs`, `BoidGenerator.cs` |
| **Look** | Low-poly, stylized nature pack, gradient skyboxes, water shader | — |

**Controls:** WASD / left stick move, mouse / right stick look, Space jump, Shift walk, E action, right mouse fly, Y invert look.

## What carries into The Zamboni

- **Story continuity:** the crew, the portal network, scanning ruins, penguins, the robot as a crew member, and the "organics" vocabulary. The satellite ending leads straight to The Zamboni's search for portal signals.
- **Backpack:** the jetpack's feel is the reference for the backpack (camera-relative 3D flight, rise when idle, particles and sound). Things to improve: it had no fuel or limit, and slope sliding never worked (*"WHY NO WORKY"*).
- **Scanner:** the reference for the scan action and its holographic look. The Zamboni adds the database Part 1 wanted but cut to save time.
- **Dialogue presentation:** portraits plus a typing sound, the starting point for the VN box.
- **Assets** (FBX in `D:\Work\Big Moon Tiny Moon\Assets\`): characters (Dr. Green, Dr. Green scanning, Dr. Kaufman, the engineer, the scanner), penguins and baby penguin, boids, ruins (temples, portal, lighthouse, houses, columns…), terrain, UI portraits (`Assets/UI/portrait-*.png`), and a smartphone typing sound (`mixkit-smartphone-typing`).

## Open questions

- Is the planet the same one (BMTM-640 B), and does The Zamboni take place after the satellite launch?
- Does the backpack in The Zamboni work the same way (free flight), or is it more limited (jumps, hover, fuel)?
- Mr. Robot → Adam: same character, a new body, or a different construct of the same Mainframe?
