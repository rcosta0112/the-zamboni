# Plan: Doors and the character (getting in the way, getting trapped)

**Status:** *built*, 2026-10-09 (option 2 approved the same day); owner play-test pending. What was built: [`features/interaction.md`](../../features/interaction.md#doors).

## Decided (owner, 2026-10-09)

1. **Option 2: the door pushes her.** Interaction points maybe later.
2. **She can't open the trapdoor while standing on it** (the camera angles don't work there anyway): no door is offered while she stands on it.
3. **The slide is fine for now.**

> **[Agent note]** Found while building: a door that stops leaving her *touching* it, with furniture on her other side, leaves Rapier's controller unable to move her at all (even in the free direction). So a stopped door backs off until there's 3 cm of room. Also, the floor in front of the crew-quarters lockers is almost entirely taken by furniture (one free spot), so those doors often stop part-way there; and in narrow spots she turns round along her facing (Part 1's controller), which can sweep her into furniture while turning.

## The problem

Owner, 2026-10-09: on almost every interactable object, Dr. Green gets in the way of the door's movement and gets trapped by its collision.

**What happens now** (measured 2026-10-09, crew-quarters locker, open floor in front):

- To use a door she stands in front of it, so she's usually inside its swing. A door that would touch her **stops** (here at 31% open) and **tries again every frame**, so as she moves away it **follows her and stays in contact**.
- While it's in contact she can barely move: 0.14 m in 0.6 s instead of ~2 m. That's the "trapped".
- The fridge and cupboard doors have no collider: they **pass through her**.
- Being pushed *inside* a collider is worse: placed overlapping a prop's collider, she can't move at all and the frame rate dropped to 4 fps (a test placement, but anything that moves her must never do that).

## Goal and scope

Opening and closing a door never traps her, and doors don't pass through her. **In:** every door in [`features/interaction.md`](../../features/interaction.md) (lockers, fridge, cupboard, trapdoor, roof hatches, side door, cargo ramp). **Out:** reaching or hand animations; doors opened by other characters.

## Constraints from the docs

- **Movement goes through Rapier's character controller** (slides along walls, never through them); anything that moves her must use it, not set her position ([prototype README](../../../app/prototypes/01-walk/README.md#the-ship-and-collisions)). Rapier's controller is **not pushed by moving (kinematic) bodies** on its own: a push has to be computed and applied by us.
- **Animations available:** Part 1's idle, walk, run and jump only; no walking backwards or sideways, no turning on the spot ([prototype README](../../../app/prototypes/01-walk/README.md)).
- **Gamepad first**; the camera in the ship should look good at all times ([architecture](../../architecture/README.md)).
- **On a ladder** she's placed directly (no collisions): a door can't push her there.

## Options

| | How | For | Against |
|---|---|---|---|
| **1. Interaction point** (owner's idea) | Each object gets a stand point outside its swing (authored in Blender as an empty, or computed from the swing). On a press she walks there, turns to face it, then the door opens. Control is taken for ~1 s | Polished and predictable; the same points will be needed later for reaching/use animations and for other characters | The most work: a stand point per object, a short walk that can get stuck on furniture (needs a fallback), turning. Only forward walking exists: walking back to a point behind her means turning round, walking, turning again (slow) or sliding |
| **2. The door pushes her** (owner's preference) | Each step a door moves, if its new pose overlaps her capsule, she's moved out along the contact normal (horizontal only) **through the character controller**. If she can't be moved (pinned against a wall), the door stops there, as now | Little code (one contact query per moving door per step); no authoring; she keeps control | She slides without a walk animation (slow: a door takes 0.6 s); pushes can tip her off an edge (the trapdoor hole, the top of the ramp); a push into a corner pins her, so the door stops short |
| 3. Step out of the swing first | On a press, test the door's whole swing (computed at load) against her capsule. If she's in it, she takes a short automatic step out (shortest way, through the controller, ~0.3 s), then the door opens | Control taken only when needed and only briefly; no authoring; the door never touches her | Same animation problem as 1 for the step (a slide, or a turn); the computed step can point somewhere awkward in a cramped spot |
| 4. Only offer it from outside the swing | No prompt while she's inside the swing (or a hint: *step back*) | No movement code, no animation issue | Fiddly for the player, especially in the narrow crew quarters |
| 5. No collision while moving | Doors don't collide with her while they move; at rest, if she's inside, she's pushed out | Simplest | She visibly clips through the door during the swing |
| 6. Smaller swings | Lockers 100° → ~80°, faster doors | Less overlap to begin with | Doesn't solve it; it's tuning to combine with any of the above |

**Recommendation: try 2 first, as the owner proposes**, with the guards below; it has no blocking downside. Keep 1 (interaction points) for later polish: the points will be needed anyway for use animations (reaching into a locker), and option 2 doesn't stand in the way of adding them.

### Known downsides of 2, and the guards

- **Pinned:** pushed into a wall or a corner. → The push goes through the controller; whatever part of it the controller refuses, the door stops at its last clear pose (today's behaviour). It **doesn't retry every frame while touching her** (the chasing): it waits until she's clear of its next pose by a margin (e.g. 5 cm).
- **Edges:** the push is **horizontal only**. A door that would lift her (the trapdoor opening under her, a hatch) stops instead; the side door and ramp don't close while she's on them (as now).
- **Ladders:** no pushing while she's climbing; the door stops (opening the trapdoor from the ladder below it already works).
- **No animation:** she slides back at the door's edge speed, facing where she was. If that looks bad in play: a short turn-and-step (part of option 3) or a "nudged" stagger animation later.
- **The fridge and cupboard doors:** they get a convex collider like the others, so they push her instead of passing through her (closed, they're flush with the counter, so nothing changes for walking).
- **Never into a collider:** pushes only move her through the controller, so she can't be placed inside furniture.

## The work (option 2)

1. **Contact:** for a moving door, its collider's contact with her capsule at the door's next pose (Rapier `contactShape`: normal and depth), in `physics.ts`.
2. **Push:** in `doors.ts`, before accepting the next pose: compute the push (horizontal, depth + 2 cm), move her by it through the controller (`physics.move`), accept the pose if she's now clear, otherwise keep the old pose and mark the door *waiting*. A waiting door resumes once she's clear of its next pose by 5 cm.
3. **Order in the step:** doors move in the fixed step, after her own movement, so the push and her input don't fight.
4. **Fridge and cupboard colliders:** convex colliders like the other doors'.
5. **Guards:** no push while climbing; no push that would need to lift her; side door and ramp don't close on her.
6. **Tuning panel:** push on/off (to compare with today's stop-only behaviour), door time (exists).

## Done when

- **Agent:** check and build pass; in the browser, for each door, with her standing inside its swing: the door opens fully and she ends up outside it; with her pinned (her back to a wall), the door stops and resumes when she leaves; she can always walk away; no frame-rate drop. Screenshots of a locker, the fridge and the trapdoor mid-push.
- **Owner:** play-test with the gamepad; judge the slide.

## Open questions

1. **Option 2 with these guards, then decide on 1 after playing?**
2. **Trapdoor:** it starts open for now; when it's closed and she stands on it, should opening it **stop** (proposed), push her off sideways, or let her drop through?
3. **The slide:** acceptable for a prototype, or should a push turn her to face away and play a short walk?

## After

- [`features/interaction.md`](../../features/interaction.md): how doors and the character interact.
- Decision log: the choice between pushing and interaction points.
- This plan's status, and the index in [`../README.md`](../README.md).
