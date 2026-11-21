# The flame editor (SC-189)

**Status:** **parked 2026-11-21** (owner: good enough for now; open items under *Parked*); draft 2026-11-21; **built the same day** on the owner's "do it" (as below; the settings.ts save chosen, no presets).

> **[Agent note]** As built: a flyby keys no flame values, so *bloom on* passes the flames a keyed strength of 1 with the bloom (preview.ts). The save doesn't hot-reload open pages (vite.config.ts skips settings.ts's update for 3 s): reload the game to see saved values. Step buttons move one frame at 24 fps. Scratch check `.export/scratch/flame-editor.mjs`: loads in ~11 s, nudge, hold, bloom, save (settings.ts restored after), a second shot; no console errors.

## Goal

A dev page for tuning the thrusters' flames (owner, 2026-11-21): the shot editor's layout, the saved shots' list kept (to watch the flames from any of them), the flames' current values in the sidebar.

## The design

- **`flame-editor.html`** + `src/flight-shots/flame-page.ts`, on the tools page under *Cutscenes*. Dev only, as the shot editor. The same page: the sidebar on the left (folding sections, scrolling), the picture on the right (16:9, fits the window), the bar under it, the status bar at the bottom. Its CSS shared with the shot editor (moved to one `tools.css`) so the two can't drift.
- **The picture:** the shot editor's preview (`ShotPreview`, unchanged), looping the shot picked.
- **Sidebar, top to bottom:**
  1. *Shots:* the saved shots (`shots.json`, as the shot editor lists them); one clicked plays. The first by default.
  2. *Flames:* every value of the *Flight: thruster flames* panel (colour, brightness, fade, grain, grain size, grain speed, flicker, flicker length, flicker speed), two to a row, its current value in each; a nudged one shown in amber with the saved value under it, as the shot editor does.
  3. *Bloom per nozzle:* the landing's glow values (core, halo, size, front pair, core size, halo brightness, out of the nozzle ×2, toward camera, flicker, flicker speed). Seen only where a shot keys the glow (0600's landing; flybys don't): a *preview: glow on* tick forces it on here, not saved.
  4. *Hold:* pause, step a frame, and a *freeze flicker* tick, to judge the shape without it moving (preview only).
  5. *Save* / *Revert*.
- **A value nudged shows at once** (the flames read `settings` every frame).
- **Saving:** `POST /__flames` rewrites those values' defaults in `src/settings.ts`, in place (each line's number or colour only; its comment kept), so the game needs no change and the values are in git as today. One "Saved, reload the game to see it" in the status bar.

## Alternative

A presets file as the planet page's (`/__planet/presets`: named looks, a default the game reads). More than asked; worth it only if you want several flame looks to compare or switch between (e.g. per scene). Say if so.

## Done when

The page loads with no console errors; picking a shot plays it; a nudge shows at once; save writes `settings.ts` (checked with a scratch probe, then reverted); check and build pass. One pass, no smoke (no game code changes).

## Parked (owner, 2026-11-21)

> **[Agent note]** Closed for now: *"the current versions of the flame and the editor are good enough for now. Keep the notes."* What's still open, for when this comes back:
>
> - **The editor doesn't list SC-190's shape values** (`flame-keys.ts`): old cones, base, base out, length, width, taper, edge, core width, core px, core length, core brightness. Only on the panel's *Flight: thruster flames*.
> - **Stale labels:** *fades by (share)* now means where the strip starts fading to its tip; the grain's labels still read as the cones'.
> - **SC-190 pass 2 not built:** bloom always on (flybys, 0100), the glow round the whole flame, the `flames` key as intensity. Until then nothing round shows when the strip is seen down its axis.
> - **Docs behind:** `features/scenery.md` still describes the flames as the fly-by's cones and the bloom as only where a track keys `glow`; no decision-log entry for the strip replacing the cones.
> - **Smoke not run** since the strip.
> - **The owner's call later:** drop the old cones (`thrusterFlameCones`).
