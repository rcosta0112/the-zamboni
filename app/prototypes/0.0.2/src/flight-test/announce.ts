// A crew member's one-off line during flight (pass 5; owner, 2026-11-25): whoever's at a station says what
// they're doing, never a command from Dr. Green (she isn't the captain). Shown briefly and never blocks the
// player — dialogue.ts's conversation box holds her still, which flight can't afford. Test lines only, marked as
// such by the caller. Prototype code: only flight-test.html uses it (main.ts FLIGHT_TEST).

const SHOWN_S = 4;
const FADE_S = 0.6;

export class Announce {
  private text = '';
  private age = Infinity;
  private readonly root = document.createElement('div');

  constructor() {
    this.root.id = 'flight-announce';
    this.root.hidden = true;
    document.body.append(this.root);
  }

  /** A line, shown at once (replacing any still up). */
  say(speaker: string, line: string): void {
    this.text = `${speaker}: ${line}`;
    this.age = 0;
    this.root.hidden = false;
    this.root.style.opacity = '1';
    this.root.textContent = this.text;
  }

  update(dt: number): void {
    if (this.age > SHOWN_S + FADE_S) return;
    this.age += dt;
    if (this.age > SHOWN_S) this.root.style.opacity = String(Math.max(0, 1 - (this.age - SHOWN_S) / FADE_S));
    if (this.age > SHOWN_S + FADE_S) this.root.hidden = true;
  }

  /** Dev hook / probes: the line last shown, and whether it's still up. */
  get state(): { text: string; shown: boolean } {
    return { text: this.text, shown: !this.root.hidden };
  }
}
