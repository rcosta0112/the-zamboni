// Saved flight shots in the game (plan doc/plans/features/flight-shots.md, pass 3): a scene's `intro`
// names one, `"shot: <name>"` (a shot saved in the shot editor, `public/cutscenes/shots.json`), or
// `"shot: random flyby"` (one generated here). Random play draws a few seeds and plays the one least like
// the shots played lately (directed ones too); that memory is kept in the save (`SaveData.recentShots`).

import { randomFlyby, type Buckets, type FlybyValues } from './flyby';
import type { LandingValues } from './landing';

/** What the shot editor saves under a name: its type (`kind`; landing-takeoff-shots.md), seed and every value. */
export type SavedShot = { kind: 'flyby'; seed: number; values: FlybyValues; saved: string } | { kind: 'landing'; seed: number; values: LandingValues; saved: string };

/** `intro: "shot: random flyby"`. */
export const RANDOM_FLYBY = 'random flyby';

/** The shot's name from a cutscene id `shot: <name>`, or null. */
export function shotName(id: string): string | null {
  const m = /^shot:\s*(.+)$/.exec(id);
  return m ? m[1]!.trim() : null;
}

/** How many shots the memory keeps, newest first. */
export const MEMORY_LENGTH = 8;

/** The shots played lately (their buckets), newest first; per playthrough, kept in the save. */
let recent: Buckets[] = [];

export const recentShots = (): Buckets[] => recent.slice();

/** From a save (or a new game: none). */
export function restoreRecentShots(saved: Buckets[] | undefined): void {
  recent = Array.isArray(saved) ? saved.slice(0, MEMORY_LENGTH) : [];
}

export function rememberShot(buckets: Buckets): void {
  recent = [buckets, ...recent].slice(0, MEMORY_LENGTH);
}

/** A random flyby against the memory (`randomFlyby` in flyby.ts, which the checks run without a browser). */
export const randomAgainstMemory = (sunBearing?: number) => randomFlyby(sunBearing, recent);
