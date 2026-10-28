# A hand-held feel for cutscene 2's cameras

**Status:** *draft*, 2026-10-28; **approved the same day with free drift first** (owner: "lets try just free drift first. go"); **pass 1 built 2026-10-28**, the owner's to look at.

> **As built (2026-10-28; about 15 min against 30–45):** `watched.ts` `sway` and `rest`, the settings `handheld`, `handheldStrength`, `handheldSpeed`, `handheldOrbit` (**0 by default: free drift**, the camera turning on itself; 1 = orbiting the speaker), on the panel's *Camera* folder. Free drift moves only the view, so the cameras' positions stay the file's and the probe's 1 cm check is unchanged; a new check: the view drifts 0.094° over 2 s, at most 0.26° from the shot. The orbit tried once at strength 3: the camera moved up to 3.4 cm, Ogawa's head stayed within a few pixels on screen.

## Goal and scope

The owner (2026-10-28): *"add a hand-held effect to these cameras only during the cutscenes. It needs to be subtle because we're not trying to give people motion sickness. If it makes sense to the way the effect is implemented, make it so the camera movement is orbiting around the speaker."*

- **In:** cutscene 2's cameras (the watched conversation, `watched.ts`: the wide shot, then the owner's five `cutscene-2-*` cameras). The sway sits on top of the file's camera: the file stays the shot's rest pose.
- **Out:** the camera in play, and conversations in play: the owner's decision of 2026-10-21 stands (*"the camera stays the player's: no lock, no orbit"*, [dialogue](../../features/dialogue.md)). Cutscene 1, which already carries the fly-by's own shake at half strength ([scenery](../../features/scenery.md)). Later cutscenes made of tracks (`CutscenePlayer`) can take the same function when there's one to try it on.

## Constraints from the docs

- Gamepad first, nothing to press: the sway needs no input.
- The owner's cameras are placed exactly ([flying scene plan](flying-scene.md)); `opening-probe.js` checks each shot within 1 cm of the file. With the sway on, that check moves to the shot's **rest pose** (stage 2).
- Small values are tuned on the tuning panel, as everywhere else in 0.0.2.

## How it moves

- **A slow, smooth drift, never a shake.** Each axis is a sum of three slow sine waves at unrelated frequencies (about 0.07–0.3 Hz, a breath rather than a jitter), so it never repeats visibly and has no sudden moves. No per-frame randomness.
- **Orbiting the speaker: it makes sense, with one catch.** The camera turns rigidly about the speaker's head (their position from `head(id)`, already used by the shots), so the head stays where the owner framed it while the room behind slides a little. That's the gentlest kind of motion for the stomach: the eye rests on the speaker, and the speaker doesn't move. **The catch:** a pure orbit pins the speaker dead still on screen, which reads as a slow dolly arc more than as someone holding a camera. So **most of the motion is the orbit, plus a small share of free aim drift** (the camera turning on itself, so the speaker floats a few pixels). The share is on the panel: 0 is a pure orbit.
- **The wide shot has no speaker:** it orbits a point 3 m along its view (about the middle of the cockpit), which amounts to a gentle sway.
- **Sizes, first values** (to tune on the panel): orbit ±0.4° side to side and ±0.25° up and down, roll ±0.2°, aim drift 25% of the orbit. At the cameras' 1–2.5 m from the speakers that moves the camera by 1–2 cm: no risk of passing through anything.
- **A cut to the next speaker** takes the new shot's rest pose; the drift's clock runs on, so no shot starts from a jolt or from the same still frame.
- **Panel** (*Cutscenes*): *hand-held* on/off, *strength* (1 = the values above, 0 = off), *speed* (1 = the frequencies above), *aim drift share*.
- Not in this pass: a player-facing *reduce motion* option. When the game gets an accessibility menu, *strength* is what it would set to 0.

## The work

**Pass 1 (agent build about 30–45 min; review rounds 1–2, about 10 min each, tuned live on the panel).**

1. `watched.ts`: the shot's rest pose kept when it's aimed (position, orientation); each frame in `update`, the pose = rest pose turned about the pivot (the speaker's head, or the point 3 m ahead) by the orbit's yaw and pitch, then turned on itself by the aim drift and the roll. The settings in `settings.ts` and on the panel.
2. `opening-probe.js`: the 1 cm check on the rest pose (exposed for checks); new checks: the camera moves (more than 2 mm over 2 s, less than 4 cm from the rest pose), and the speaker's head stays within a few pixels of where the rest pose puts it.

## Done when

- Agent: `npm run check`, `npm run build`, the opening probe passes, screenshots at the start of a line and 2 s later, side by side.
- Owner: watches cutscene 2 at http://localhost:5202/?scene=opening and tunes *strength* and *speed* until it feels right; the values found become the defaults.

## Open questions

1. Orbit plus a small aim drift (recommended), or a pure orbit?
2. Should cutscene 1's fly-by shake stay as it is? It's the file's own camera shake, so it isn't touched here.

## After

`doc/features/scenery.md` or the flying scene's feature notes (cutscene 2's camera), the code map, `doc/steps/current.md`; the panel's new rows in the tuning docs.
