# Scope

**Status:** *draft*, Step 1. Based on the owner's brief of 2026-10-08; priorities are proposed.

## Targets

| | Target |
|---|---|
| Play time | About **1 hour** |
| Structure | Travelling sections inside the flying ship, alternating with landings where the player can walk inside and outside. Joined by cutscenes |
| Ship | The Zamboni's interior: cockpit, crew quarters, engineering/lab, cargo bay, galley (from the UE prototype) |
| Landing sites | Small bounded areas of rocky/icy desert around the ship. 6 to 10 scenes, with some repeat locations (owner, 2026-10-08). Some have ruins, mostly unique models |
| Cast | Dr. Green (player), Dr. Kaufman, Dr. Ogawa, Adam (two bodies), the penguin, plus animals and people met on the way |
| Platform | Web, desktop browsers; installable and playable offline (see [`platform.md`](platform.md)) |
| Input | **Gamepad first**; keyboard and mouse supported as secondary |

## In scope

Priority: **Core** = the game doesn't work without it. **Wanted** = planned. **Maybe** = only if time allows.

| Feature | Priority | Notes |
|---|---|---|
| Third-person controller + camera | Core | Probably two run speeds: outdoors and indoors |
| Jump | Core | Same button as backpack flight; no jumping while wearing the backpack |
| See-through hull | Core | [`../features/see-through-hull.md`](../features/see-through-hull.md) |
| Ship interior, walkable during travel and landings | Core | |
| Outdoor landing areas with soft + hard boundaries | Core | Bark first (*"I shouldn't get too far from the ship"*), invisible walls further out |
| Interaction: use devices (doors, lockers, boombox, ship controls, screens…) | Core | Immersive-sim pillar |
| Pick up small objects (carry, drop, throw) | Core | Most small objects, not all |
| Face-to-face dialogue (VN-style box at the bottom, options) | Core | Minimal branching |
| Comm: home screen with app icons + chat app | Core | Many conversations happen here |
| Comm: mission data app (wildlife, ruins, artifacts) | Core | Where scanned entries are viewed |
| Scanner | Core | Scans ruins and artifacts, maybe wildlife; adds entries to the mission data |
| Cutscenes (in-engine) | Core | Pre-rendered only as a fallback |
| Music, ambience, sound effects | Core | Workflow: [`audio.md`](audio.md) |
| Backpack | Wanted | Outdoors only. Reference: Part 1 jetpack |
| Save / continue | Core | Stop and continue later. Checkpoint saves; props aren't tracked and reset on reload (owner, 2026-10-08) |
| Installable web app, offline play | Core | Download everything at once and play offline (owner, 2026-10-08) |
| Settings (volume, mouse sensitivity, invert Y) | Wanted | |
| Comm: camera app | Maybe | Nice to have |
| Short action segments (non-violent) | Maybe | E.g. a chase or a timed repair. To be defined |
| Gamepad | Core | The main input (owner, 2026-10-08). Every screen and menu must work with it |

## Out of scope

- **Spoken dialogue / voice acting.** All dialogue is text (owner, 2026-10-08).
- **Violence or combat** of any kind.
- **Flying the ship.** The crew pilot it in cutscenes only.
- **Open world.** Only small areas around landing sites.
- **Heavy branching.** No multiple endings or large choice trees.
- **Mobile / touch** (for now).
- **Multiplayer.**

## Open questions

- **Camera style indoors:** free orbit, fixed angles, or a cutaway/isometric view?
- **Landings:** 6 to 10 scenes with some repeat locations (decided 2026-10-08). Still open: what's at each (ruins, animals, people, ship repairs)?
- **Outdoor look and scale:** terrain variety between sites, weather, day/night?
- **Inside ↔ outside:** how the player moves between them (hatch, ramp, airlock?) and whether there's a loading moment.
- **Action segments:** are there any, and what are they?
- **Languages:** English only?
- **Distribution:** Vercel, probably ([`platform.md`](platform.md)). Also itch.io, or a desktop wrapper for Steam later?
