# The auto-parachute: the jetpack slows a long fall (item 34)

**Status:** draft 2026-10-14; approved 2026-10-14 (owner: follow the recommendations: fixed braking, none without a jetpack, "auto-parachute" is our name); **built 2026-10-14**. One change from the plan: the braking isn't a setting of its own. It follows from the lowest fall, her height and gravity, so "a fall of the minimum fires at her height" stays true whatever they are. And it finishes 15 cm above the ground (in fixed steps it landed her at twice the speed otherwise). **Changed the same day** (owner): the burst lasts twice as long, so it no longer fires at her height (see the decision log's *Update*). What exists: [`../../features/interaction.md`](../../features/interaction.md#the-auto-parachute).

## Goal

From the owner (2026-10-14): when she falls from high enough, the jetpack fires by itself for a moment near the ground and slows her down. The same when she lets go of the jetpack while flying and falls freely.

- **Lowest fall that sets it off:** a bit under the ship's height. The ship stands 6.5 m tall in the game, so **5.5 m** (tunable).
- **Where it fires:** at her own height above the ground. That's `zamboniHeight`, **1.23 m**.

## Scope

- **In:** the burst itself (it slows the fall), its sound, its animation, and values in the tuning panel.
- **Out:** jet particles (the jetpack has none yet, flying included), fall damage, a landing animation, and fuel.

## Constraints from the docs

- **She flies only while wearing a jetpack** (`interaction.md`, *The jetpack rack*). The burst comes from the jetpack, so **it only happens while she wears one** (open question 1).
- **Part 1's rule on letting go** (`character.ts`): she falls from a standstill, keeping her horizontal speed. The burst doesn't change that. The fall is measured from where she let go.
- **The jetpack outdoors only** (`scope.md`) comes with the user-testing build. Inside the ship no fall is 5.5 m, so the burst never happens there.
- **Gravity is still open** (Part 1: 6 m/s², ours: 20). The numbers below are for 20, and the burst's settings follow whatever gravity is chosen.

## What I think

It's a good rule. A long fall that ends in a soft landing feels in control, and it costs no new model: the jetpack already has a sound and a flying clip. It's also a reason to keep the jetpack on.

**One problem with "fires at her height":** the jet would have to stop a slow fall and a fast fall within the same 1.23 m.
- **A 5.5 m fall:** she hits 13 m/s at 1.23 m above the ground. Slowing to 2 m/s over 1.23 m is about 7 g for 0.15 s: a quick puff, which is fine.
- **A 30 m fall** (let go high in the air): 34 m/s at 1.23 m. That's about 47 g in 0.07 s, so on screen she'd stop dead, as if she'd hit a cushion.

**My recommendation:** keep the deceleration the same in every fall. Choose it so that a 5.5 m fall fires at exactly her height (1.23 m), as you asked. A faster fall then fires higher, just high enough to stop the same way: about 7 m up for a 30 m fall.
- The burst always looks and sounds the same, only longer from higher up.
- The one value to tune is how hard it brakes.

The other way is to fire at 1.23 m every time, as written. That's simpler, but it gives a harder stop the higher she falls.

## The work

1. **Measuring the fall** (`character.ts`): the highest point since she was last on the ground, on a ladder or flying (where she let go counts). Each step while she falls, a ray down finds the ground below her. The drop is the highest point minus the ground under her now, so falling off a ledge onto lower ground counts too.
2. **The burst:** it starts when the drop is at least `parachuteMinDrop` (5.5 m) and the ground is within the firing height, which is computed from her speed and `parachuteBraking` (the recommendation). It pushes up until her fall is down to `parachuteLandingSpeed` (2 m/s), then ends, and she lands as usual.
   - Her horizontal movement and steering stay as they are.
   - Holding Fly during it is ordinary flying; the burst gives way.
   - Landing early (on a roof, a rock) ends it.
3. **What's seen and heard:** the flying clip and the jetpack's loop while it fires, with the same short fade as when she lets go. A `parachuting` flag on the character, next to `flying`, drives both.
4. **Tuning panel** (*Jetpack*): `parachute` on/off, `parachuteMinDrop`, `parachuteLandingSpeed`, `parachuteBraking`.
5. **Checks:** two in the smoke script, tried with the probe first.
   - Let go at 8 m and at 30 m. The burst fires, and she lands at no more than about 2 m/s.
   - Fall 4 m. No burst.

## Done when

- **Agent:** both checks pass, type-check, build and smoke pass, plus a screenshot mid-burst.
- **Owner:** it feels right with the controller, from the minimum drop and from high up.

## Open questions

1. **Without a jetpack** (off the ship's roof, say): no burst, as today? I'd say yes: it's the jetpack's.
2. **Fixed height or fixed braking** (*What I think*)? I recommend fixed braking.
3. **The name:** in the game it's a jet, not a parachute. Is "auto-parachute" its in-world name, or only ours?

## After

The rule goes in `interaction.md` (with the jetpack rack) or a jetpack section, and the values in `settings.ts`. Plus a line in `backlog.md` and the plans index.
