# The Zamboni — Overview

**The Zamboni** is a short third-person adventure game: a mix of visual novel and immersive sim. A small science and exploration crew travels across an unknown, rocky and icy planet in an old converted transport ship, looking for the portals that link planets across the galaxy. It's the second part of a longer story with the same characters; Part 1 was prototyped as *Big Moon Tiny Moon* (see [`reference/big-moon-tiny-moon.md`](reference/big-moon-tiny-moon.md)).

For how it's built, see [`architecture/`](architecture/README.md). For the story itself, see [`story/`](story/overview.md).

## Key facts at a glance

- **Length:** about **one hour** of gameplay. Deliberately very short.
- **Genre:** story and exploration first. A visual novel's storytelling with an immersive sim's "everything is interactable" world.
- **No violence.** Short action segments may be considered, but the concept is storytelling and exploration.
- **Not open world.** Small, bounded areas around wherever the ship lands.
- **Minimal branching.** Dialogue has choices, but the story is mostly linear.
- **Platform:** web (Three.js), see [`architecture/stack.md`](architecture/stack.md).

## Pillars

1. **Storytelling.** The game is a road trip with a crew going through some stuff. Conversations carry it, in person and over the comm.
2. **Exploration.** Walking around the ship and the landing sites, finding ruins, artifacts and animals, and documenting them.
3. **Immersive-sim interactivity.** Everything should be interactable. Most small objects can be picked up; devices like the boombox and the ship's controls can be used.

## The crew and the mission

The crew are on a long journey across an unknown planet. Their mission is to find and document portals. Along the way they meet animals and people, have technical problems with the ship, and explore and document ruins. Full detail: [`story/overview.md`](story/overview.md), [`story/cast.md`](story/cast.md).

## How the game is structured

The game alternates between two kinds of section, joined by cutscenes:

| Section | Where the player is | What they can do |
|---|---|---|
| **Travelling** | Inside the ship while it flies low over the planet surface | Walk around the ship, talk to the crew, use the comm, interact with objects and devices |
| **Landed** | Inside the ship and in a limited area outside it | Everything above, plus walk outside, use the backpack and the scanner, explore and document ruins and wildlife |
| **Cutscenes** | — | Watch. The player never flies the ship; the crew are seen piloting it in cutscenes |

**Outside boundaries:** the landing sites are open rocky/icy desert. If the player wanders too far, the character stops and says something like *"I shouldn't get too far from the ship"*; far enough beyond that, invisible walls stop them.

## Main features

| Feature | Summary |
|---|---|
| Third-person character | The player character walks freely inside and outside the ship |
| See-through hull | Walls and hull between the camera and the character are cut away, so the camera can stay outside tight interiors. Plan: [`features/see-through-hull.md`](features/see-through-hull.md) |
| Interaction | Everything interactable: pick up small objects, use devices (boombox, ship controls, doors, lockers…) |
| Face-to-face dialogue | Visual-novel style: a horizontal box at the bottom of the screen with dialogue options |
| Comm | The main character has a comm (the in-world word for a smartphone), laid out like a smartphone with app icons. Apps: **chat** (many conversations happen here), **mission data** (the wildlife, ruins and artifacts documented so far), and a **camera** as a nice-to-have |
| Scanner | A handheld device used on ruins and artifacts; scanning adds an entry to the mission data, viewed on the comm |
| Binoculars | A handheld device used to look at far away objects, people or animals. Don't look at the sun. |
| Backpack | Usable outside the ship. Already prototyped in *Big Moon Tiny Moon* |
| Cutscenes | In-engine if possible; pre-rendered video as a fallback |
| Sound and music | Workflow still to be agreed: [`architecture/audio.md`](architecture/audio.md) |

Scope details (what's in, what's out, open questions): [`architecture/scope.md`](architecture/scope.md).
