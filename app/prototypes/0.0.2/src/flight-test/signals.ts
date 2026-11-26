// Flight test pass 5: tuning in a signal at the signal station. No story gates in this pass (owner, 2026-11-25):
// any target can be found, as many times as the player likes; each is only announced once. Prototype code: only
// flight-test.html uses it (main.ts FLIGHT_TEST).

import { quadrantName } from '../planet/map';

export type Band = 'signal' | 'infrared';

interface SignalTarget {
  id: string;
  band: Band;
  dial1: number;
  dial2: number;
  northSouth: number;
  eastWest: number;
}

/** Stand-in targets around 0050's region (planet/nav-screen.ts SHOT_END), one or two per band; test data only. */
const TARGETS: SignalTarget[] = [
  { id: 'sig-1', band: 'signal', dial1: 0.3, dial2: 0.7, northSouth: 78, eastWest: 204 },
  { id: 'sig-2', band: 'signal', dial1: 0.6, dial2: 0.2, northSouth: 71, eastWest: 193 },
  { id: 'ir-1', band: 'infrared', dial1: 0.5, dial2: 0.5, northSouth: 80, eastWest: 196 },
];

/** Both dials within this of a target's (overlay.ts's SLIDER_STEP is 0.1; under half a step to lock). */
const TOLERANCE = 0.04;

export interface FoundSignal {
  id: string;
  band: Band;
  quadrant: string;
  northSouth: number;
  eastWest: number;
}

export class SignalStation {
  /** Found so far, in order (dev hook `__signals().found`). */
  readonly found: FoundSignal[] = [];
  private readonly foundIds = new Set<string>();
  /** The target under both dials right now, for a lock light (dev hook); null off any. */
  lockedId: string | null = null;

  /** Per frame, the signal overlay's values: returns a newly found signal once, else null. */
  update(band: Band, dial1: number, dial2: number): FoundSignal | null {
    const target = TARGETS.find((t) => t.band === band && Math.abs(t.dial1 - dial1) <= TOLERANCE && Math.abs(t.dial2 - dial2) <= TOLERANCE) ?? null;
    this.lockedId = target?.id ?? null;
    if (!target || this.foundIds.has(target.id)) return null;
    this.foundIds.add(target.id);
    const found: FoundSignal = { id: target.id, band: target.band, quadrant: quadrantName(target.northSouth, target.eastWest), northSouth: target.northSouth, eastWest: target.eastWest };
    this.found.push(found);
    return found;
  }
}
