# Discussion: the planet's map and its quadrants

**Status:** *discussion*, the naming and the readings below decided (owner, 2026-11-22). Not a plan yet: nothing gets built from it. Used by [the travelling interface](travel-interface.md) (the navigation station's map, the signal station's readings), part of [the non-linear game](non-linear-travel.md). Split out of the interface doc on 2026-11-22 (owner).

## Decided (owner, 2026-11-22)

- **The planet is split into quadrants**, the reference for the map and the signal station.
- **The map is made from the planet of the intro shot** (the [planet cinematic](../planet-cinematic.md): a procedural planet from a seed and a preset, `src/planet/`).
- **A meridian**; the quadrants are named from it. **It's picked at random once and kept for the game.**
- **Names in hexadecimal, no negative numbers.** **The first number is north–south, the second east–west, joined by a dash.**
  - **North–south: 0 to 180.**
  - **East–west: 0 to 359.**

Also decided (owner, 2026-11-22: "yes" to the agent's readings):
- **One quadrant = 1° × 1°**: 181 × 360 names (65,160).
- **North–south 0 = the north pole, 90 = the equator, 180 = the south pole.** East–west counted **eastward** from the meridian.
- **Three hex digits each**, so names line up on the screen: north–south `000`–`0B4`, east–west `000`–`167`. Capital letters.
- **"Kept for the game"**: picked at random once, now, and then fixed: the same meridian for every player and every new game, so the script can name real quadrants. (The other reading, a new meridian per new game, would make the crew's lines take the number from Ink.)

## Examples

| Where | North–south | East–west | Name |
|---|---|---|---|
| The north pole, on the meridian | 0 → `000` | 0 → `000` | **`000-000`** |
| On the equator, 243 east of the meridian | 90 → `05A` | 243 → `0F3` | **`05A-0F3`** |
| Near the south pole, just west of the meridian | 170 → `0AA` | 359 → `167` | **`0AA-167`** |

Dr. Ogawa: *"I got a signal from quadrant 05A-0F3."* (The script is the owner's; the placeholders *0594B* and *44D* don't fit the format.)

## The agent's notes (no action yet)

- **Picking the meridian:** a longitude on the intro planet chosen with a random number once, written into the planet's preset (`presets.json`) beside its seed, so the intro shot, the map and the names all agree. If the planet's seed or shape changes later, the quadrants keep their place on the sphere (the names don't move), but what's in them changes: the places in the script would need checking.
- **Story places get quadrants:** the temple, the penguins, the drone's crash and the rest each get a quadrant on the map. **The agent keeps the table** (place → quadrant) in this doc, filled in from the script as the sites are written, and checks the script's quadrant names against it (owner, 2026-11-22).
- **What the map shows at each zoom:** the whole globe with a grid **every 16°** (`010` in hex, lining up with the names' digits; owner, 2026-11-22), finer lines as it zooms in; the quadrant under the cursor named on the screen.
- **The quadrants near the poles are thin** (1° east–west shrinks to nothing at the pole): fine for names, odd for a grid; the map can thin the lines out near the poles.

## Open questions for the owner

None (all answered 2026-11-22).
