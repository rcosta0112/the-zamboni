# The coffee: pour, carry, sip, the sink

> **[Agent note]** Status: **built** (2026-11-18): approved and both passes built the same day; the owner's look pending. Replaces pass 3 of the [flying scene](flying-scene.md#the-coffee-its-own-pass) (approved 2026-10-22) where the owner's brief of 2026-11-18 differs (the conflicts are listed below). Source: `The Zamboni 1.22.blend` as of 2026-11-18, read only.

## Goal (owner, 2026-11-18)

- **The coffee pot** in the galley (`Coffee Pot`) gets a prompt, *Pour coffee*. Using it puts the mug (`Mug`) in her right hand. No pouring animation.
- **Holding it:** her arm in the drinking loop's hold, blended over her walk; **no running** while she holds it; **a sip at random every 5–10 s** (`Dr. Green - Coffee`, frames 1–84).
- **No gadgets** while she holds it.
- **The sink:** while she holds it, a prompt over the sink, *Put cup in sink*. Her mug goes; the cup in the sink (`Mug Empty`, hidden until then) shows up.
- The prompts' wording is a game label (the owner's to change).

## Conflicts with the approved plan (flying scene, pass 3)

1. The plan has a **pouring animation** (SC-25) at a `coffee-maker`. Now there's no animation and the prompt is on the **pot**. *If approved, SC-25 is dropped.*
2. Sips were **8–20 s, and she could run**. Now it's 5–10 s, and she can't run.
3. The plan's open questions 2 and 3 are answered: **it ends at the sink**, and **the mug is the new `Mug`**.
4. **The mug hangs on the parka only**, but in the flying scene she wears the **jumpsuit**. I'd move it onto the shared skeleton at load (the way `model.ts` `dress` handles the jumpsuit), so it shows in both outfits. No Blender edit needed.

## Where drinking touches other actions (my defaults; 1, 4 and 6 set by the owner, 2026-11-18)

1. **Ladder (owner, 2026-11-18):** the mug disappears while the climbing animation plays, and shows again when it ends. No sips on the ladder. The floor hatch takes the same rule (agent's default).
2. **Jump, fall, jetpack flight or hover, auto-parachute:** no sip starts, and a sip already going finishes. The mug stays in her hand. (In flight the jetpacks are locked anyway.)
3. **Conversations, cutscenes, the dialogue box:** no sip starts; a sip already going blends back to the hold in about 0.2 s. The mug stays in her hand.
4. **Her seat (owner):** she must pour a coffee before she can sit. Before that, using the seat gets her line *"I want some coffee first."* Once she has poured, she can sit, mug in hand or not. **The mug disappears when she sits**, and the game goes on to the next scene. **After the landing**, using the pot gets *"No time for that now."*
5. **Gadgets:** pouring puts away a gadget that's out. While she holds the mug, the gadget buttons do nothing (no sound and no line, unless you want one).
6. **One coffee only (owner):** while she holds the mug, the pot has no prompt. After the sink, using the pot gets *"That's enough coffee for now. Better get back to work."*
7. **Doors, keypads, levers, the boombox, her locker:** used as they are now, mug in hand.
8. **The save:** `green_coffee` (`none` / `holding` / `sink` / `done`, Ink, kept with her), so *Continue* gives back the mug or the cup in the sink. Sitting with the mug in her hand sets `done`, and the sink cup stays hidden.
9. **The three lines are the owner's copy** (2026-11-18). They go into chapter 1's Ink where the placeholders are (SC-32, SC-33), word for word.

## Changes in the file you didn't mention (found by the export gates; nothing was taken into the game)

> **[Agent note]** All non-issues (owner, 2026-11-18). The cup holder was moved and scaled down to fit the cups in use; `Coffee Pot.002` and `Mug.007` are in an archival collection, disabled and never exported.

1. ~~The action `Dr. Green - Scanner` is gone.~~ Back after the owner's save (2026-11-18, checked again).
2. **The parka's mesh has 1 vertex fewer** (5289 → 5288; 3 fewer before that save).
3. **`Hand_r.IK` now reaches the parka's export**, and every clip moves it: the mug's parent (a non-deform bone), so expected. The jumpsuit's export doesn't have it; pass 1 moves the mug onto `Hand_r`, which drops it again.
4. **`Cup Holder` and `Mug.005` moved about 25 cm.** The grinder itself is merged into `Props Galley` (+2 vertices, up to 5 cm), which fits *fixed the grinder*. Were the cup holder and mug meant to move?
5. Hidden in the file now, harmless (the export shows them anyway): `Binoculars.001`, `Scanner`, `Scanner Ray`, and the collision boxes (the collider file is identical). The file was saved on frame 76 (the export uses frame 1).
6. In the file but not exported, so no effect: `Coffee Pot.002` and `Mug.007` on `Dr. Green Jump suit Baked.002` in the scene's root collection. Are they new?

## The work

**Pass 1: the export.**
1. Give `Coffee Pot` and `Mug Empty` ids and kinds, the same way as the locker's clothes, and add them to `ship-export-list.json`.
2. The player export takes `Dr. Green - Coffee` and `Mug`, with the mug moved from `Hand_r.IK` onto `Hand_r` (the binoculars' pattern).
3. Run `export:ship` and `export:player` and accept them once the summaries show only these changes.

*Build ~20 min. Review: your look at the summaries.*

> **[Agent note]** **Pass 1, prepared (2026-11-18; approved by the owner the same day: "do it"):** [`add-coffee-ids.py`](../../../app/prototypes/0.0.2/tools/add-coffee-ids.py) (`coffee-pot`, `sink-cup`; tried on a scratch copy); both in `ship-export-list.json`; kinds `coffee-pot`, `sink-cup` in `kinds.ts`; `export.mjs` takes `Dr. Green - Coffee=Mug::Hand_r` (`export-crew-character.py`: a held object may have no action of its own); `Crew (do not export)` off in `export-collections.json`. From the scratch copy, the gates showed: the mug and the coffee clip (1–84 at 24 fps, the mug on `Hand_r`), the pot and the sink cup, 2 new ids, the collider +396 triangles (the pot and the cup), `PERF:` the material `Coffee` is double-sided. **Done the same day:** the ids saved into 1.22 (the owner had closed it; the file as it was: `The Zamboni 1.22 (before the coffee ids, 2026-11-18).blend`), both exports showed only these changes (the parka's mesh now 5285 vertices, the owner's edits) and were accepted; the after-export checks pass. Until pass 2, the game shows the mug in her hand and the cup in the sink, with no prompts.

**Pass 2: the game.**
1. The mug on her hand in both outfits.
2. An upper-body layer (the action's bones above the hips) holding frame 1 and playing 1–84 once per sip, every 5–10 s (on the tuning panel), with the rules above.
3. Her speed capped at walking while she holds the mug.
4. Gadgets locked.
5. The pot's and sink's prompts (item 56's placement; the sink's prompt at `Mug Empty`'s place), and the cup in the sink shown.
6. `green_coffee` in Ink and the save, the seat's rule, and the three lines (the pot answers in the landed scene and after the sink).
7. The mug hidden when she sits.

*Build ~1 h. Review: 1–2 rounds of ~10 min.*

> **[Agent note]** **Pass 2, as built (2026-11-18; owner: "go"):** `coffee.ts`; `model.ts` splits the movement's upper half again (the right arm, `RIGHT_ARM`), the coffee's arm clip twice (hold at frame 1, sip played) and the mug's tracks the same; the mug left out of the outfits (shown in both) and of her height. `main.ts`: KEPT `green_coffee`, the seat's rule, `Character.walkOnly`, gadgets unusable while holding, `__coffee()`. Ink: `green_coffee`, knots `seat_without_coffee`, `coffee_pot_again`, `coffee_pot_landed` (the owner's lines; also in the test story). Settings `coffeeSipMin` / `Max` (panel *Jetpack*). The loop moves only `Hand_r.IK` and a slight lean of `Body`; the lean isn't played (right arm only). **Dropping through the floor hatch** is a fall, not the climb: the mug stays in her hand (the plan's guess said hidden; to confirm). `landed-probe.js` pours a coffee before sitting. **Checks:** [`coffee-probe.js`](../../../app/prototypes/0.0.2/tools/coffee-probe.js) 17/17 (the prompts aimed, the seat's refusal, the mug, no gadgets, walk ≤ 1.5 m/s, sips, a conversation stops a sip, the ladder hides it for all 181 frames, the sink, the pot's two lines, landed); front screenshots in both outfits (hold, mid-sip). Smoke: the same 4 failures as before (the hull and thrusters walk-under, the single-sided count: now 5 of 32 with the double-sided `Coffee` material). > **Update 2026-11-18 (owner):** no running restriction (`Character.walkOnly` removed); she sips while talking too (a cutscene still stops a sip). Probe updated: she runs at 3.5 m/s holding it; a sip comes during a conversation. 17/17.

Not checked: sitting with the mug in hand (no probe), *Continue* with the mug (saving is off in the game).

## Done when

A probe pours, then walks: her speed never goes over walking, sips come 5–10 s apart, and the gadget buttons do nothing. It puts the cup in the sink (the cup shows), reloads, and finds everything as it was left. You look at the blend over the walk. Smoke once at the end.

**Story lever:** none.

## After

`features/interaction.md` (*Picking things up*: the coffee), `characters.md` (the upper-body layer), the code map, `tools/README.md`, `flying-scene.md` pass 3 marked superseded, and the tasks (SC-25…27).
