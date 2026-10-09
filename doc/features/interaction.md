# Interaction

**Status:** first version built in prototype 01 (2026-10-09); owner play-test pending. Plan: [`../plans/features/interaction-doors.md`](../plans/features/interaction-doors.md). Decision: [`../decision-log.md`](../decision-log.md).

Point at something and press a button to use it, as in the UE prototype. In this first version: the ship's doors, the two keypads in the cargo hold, and ladders (which need no button).

## Controls

| Action | Gamepad | Keyboard |
|---|---|---|
| Use the target | **B / Circle** | **E** |
| Climb a ladder | Walk into it; push toward it to climb, away to go down | Same (W A S D) |
| Let go of a ladder | A (jump) | Space |

The prompt shows the button of the last device used (◯ or E).

## Targeting

"Pointing" is done with the camera; there's no crosshair:

1. **Candidates:** every interactable object whose bounds are within **reach** of her chest (1.0 m, tunable), and not behind something solid (a ray from her chest to the object's nearest point; its own collider doesn't count).
2. **Target:** of those, the one nearest the **centre of the screen**: 0 if the view's centre line passes through its bounds, otherwise the angle to its centre; nothing beyond 30° (tunable). Ties go to the nearer object.
3. **Feedback:** the target is lifted toward white (the *highlight* slider; 0 turns it off), and a prompt at the bottom of the screen names the action: *Open* / *Close* for doors, *Open ramp* / *Close ramp* and *Open door* / *Close door* for the keypads.

The highlight rides on the see-through hull's per-object uniform (its `w`: bit 0 = never cut, bit 1 = highlighted), so it costs no extra per-draw update.

## Doors

| Door | Object in `The Zamboni 1.18.blend` | Hinge | Opens |
|---|---|---|---|
| Side door (cargo hold) | `Door` | bottom edge | outward and down until it rests on the ground (126°): **open, it's a ramp** |
| Trapdoor to the crew quarters | `Hatch.002` | one edge | up, 90° |
| Roof hatch, outer | `Top Hatch` | one edge | up, 100° |
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
- The bulkhead doors (`Door Cockpit`, `Door Engineering`…) aren't interactive.
- Doors are cut by the see-through hull like before; their raycast data follows them while they move, and they're left out of the ship's merged shadow caster (they cast their own).

**Keypads** (`Plane.004`, upper: the cargo ramp; `Plane.006`, lower: the side door), beside the side door. The cargo ramp still **starts open**: it's the way in from the start position, and the keypads are inside. The tuning panel's *cargo ramp open* checkbox follows the keypad.

## Ladders

No button: walking into a ladder is enough (owner).

- **From the bottom:** walking toward a ladder's foot (within 0.5 m, pushing toward it) attaches her. Pushing toward the ladder climbs, away goes down (camera-relative, like walking). At the bottom, pushing away lets go.
- **At the top:** she steps off onto the floor above, toward where the stick points (or straight ahead), wherever there's floor and room for her. A ladder with no floor at the top just stops there.
- **From the floor above:** walking toward the opening (within 0.7 m) attaches her at the top and takes her down until the stick is let go; from then, toward the ladder is up again. Not through a closed trapdoor.
- **Blocked above:** a ray from her head stops her under a closed hatch. She can open it from the ladder (it's in reach).
- **Jump** lets go. After letting go she doesn't attach again until the stick is let go too (so holding the stick doesn't loop her back on).
- While climbing she's placed directly, without collisions, and shown standing: **no climbing animation yet**.

| Ladder | Where | Top |
|---|---|---|
| `Ladder Cargo Bay` | cargo bay, up through the trapdoor | the crew quarters floor |

The rungs on the cockpit bulkhead by the galley (`Ladder Crew Quarters`) were removed (owner, 2026-10-09).

Ladders are found from their bounds at load: she stands on the more open side, the bottom is the floor under it, the top is the lowest floor found beside its top end that's reachable straight up (measured with the doors left out).

## Data

From the ship file's custom properties (glTF extras), set by [`app/tools/export-ship.py`](../../app/tools/export-ship.py) until they're set in Blender (naming contract: [`../architecture/asset-pipeline.md`](../architecture/asset-pipeline.md#naming-contract-proposed)):

- `door: {axis, angle, toGround, startOpen}` and `interact: "open"` on each door; `hinge` (its hinge point).
- `interact: "use"`, `device: "panel"`, `controls: "<object name>"` on the keypads.
- Ladders are listed by name in the code for now.

## Code

In prototype 01: [`interaction.ts`](../../app/prototypes/01-walk/src/interaction.ts) (targeting, prompt, highlight), [`doors.ts`](../../app/prototypes/01-walk/src/doors.ts), [`ladders.ts`](../../app/prototypes/01-walk/src/ladders.ts); the interact action in `input.ts`; the overlap test, rays and teleport in `physics.ts`.

## Open questions

- **The roof hatch can't be reached** (it's about 2.3 m above the cockpit floor; the rungs are on the other side of the cockpit bulkhead). Owner, 2026-10-09: either an unfolding ladder gets added, or it stays as it is: the crew have jetpacks. (For testing, *reach* at ~1.8 m lets her open it from the cockpit floor.)
- **Aiming at the trapdoor from below** is hard with the camera angle; it starts open until that's worked out.
- A climbing animation (Part 1 has none).
- Gamepad untested by the agent (no controller in the test browser).
