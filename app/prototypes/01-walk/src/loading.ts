// What the start screen's progress bar measures. The load is a fixed list of parts, each with its
// share of the bar; a part reports how far it has got (0..1). Downloads report bytes where the
// server gives a total, and jump to done where it doesn't. Building the shaders is one call that
// can't report anything: its share creeps toward full with time (see `creep`), and jumps at the end.
// Plan: doc/plans/features/start-screen.md

/** Each part's share of the bar (they add up to 1). */
const SHARES = { physics: 0.05, sounds: 0.05, models: 0.15, ship: 0.3, crew: 0.1, shaders: 0.35 };

export type LoadPart = keyof typeof SHARES;

export class LoadProgress {
  private done: Record<LoadPart, number> = { physics: 0, sounds: 0, models: 0, ship: 0, crew: 0, shaders: 0 };
  private creeping: { part: LoadPart; since: number; over: number } | null = null;

  /** @param onChange called with the whole load's share (0..1) each time it grows */
  constructor(private onChange: (share: number) => void) {}

  /** The whole load, 0..1. */
  get share(): number {
    let sum = 0;
    for (const part of Object.keys(SHARES) as LoadPart[]) sum += SHARES[part] * this.done[part];
    return sum;
  }

  /** A part has got this far (0..1). It never goes back. */
  set(part: LoadPart, share: number): void {
    const value = Math.min(1, Math.max(this.done[part], share));
    if (value === this.done[part]) return;
    this.done[part] = value;
    if (value === 1 && this.creeping?.part === part) this.creeping = null;
    this.onChange(this.share);
  }

  /** Everything is done (also when the load failed: the game starts with what it has). */
  finish(): void {
    for (const part of Object.keys(SHARES) as LoadPart[]) this.set(part, 1);
  }

  /**
   * A part that can't report: from now on it creeps toward nine tenths, getting two thirds of the
   * way there every `over` seconds, until it's set to 1.
   */
  creep(part: LoadPart, over: number): void {
    this.creeping = { part, since: performance.now(), over };
  }

  /** Per frame. */
  update(): void {
    if (!this.creeping) return;
    const t = (performance.now() - this.creeping.since) / 1000 / this.creeping.over;
    this.set(this.creeping.part, 0.9 * (1 - Math.exp(-t)));
  }
}

/**
 * For several files downloaded together (GLTFLoader's `loadAsync(url, onProgress)`): one handler
 * per file, and `report` gets the share of all their bytes that have arrived. A file whose size
 * the server doesn't give counts for nothing until the part is set to done.
 */
export function downloads(count: number, report: (share: number) => void): ((event: ProgressEvent) => void)[] {
  const loaded = new Array<number>(count).fill(0);
  const total = new Array<number>(count).fill(0);
  return loaded.map((_, i) => (event: ProgressEvent) => {
    if (!event.lengthComputable) return;
    loaded[i] = event.loaded;
    total[i] = event.total;
    // Until every file's size is known, the total isn't.
    if (total.some((t) => t === 0)) return;
    report(loaded.reduce((a, b) => a + b, 0) / total.reduce((a, b) => a + b, 0));
  });
}
