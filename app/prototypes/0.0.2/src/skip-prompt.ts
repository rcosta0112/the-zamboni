// Skipping a cutscene (owner, 2026-10-23, SC-126): any press while one plays shows "Hold ◯ to skip"
// at the bottom right (E on the keyboard: the prompt shows the last device used); holding the button
// that long skips it. No ring or bar fills while it's held (owner). Both cutscenes: cutscene 1 (the
// player) and cutscene 2 (the watched conversation). After a skip the button must be let go before
// a hold counts again (cutscene 2 follows cutscene 1 at once).

import type { Device } from './input';

const GLYPH: Record<Device, string> = { gamepad: '◯', keyboard: 'E' };
/** How long the button is held to skip (s). */
const HOLD = 3;
/** The prompt stays this long after the last press, unless the button is held (s). */
const SHOWN = 3;

export class SkipPrompt {
  /** How long the button has been held (s), for checks. */
  held = 0;
  private shownFor = 0;
  private needsRelease = false;
  private glyph = document.createElement('span');

  constructor(private readonly el: HTMLElement) {
    this.glyph.className = 'glyph';
    el.replaceChildren('Hold', this.glyph, 'to skip'); // spaced by the flex gap
  }

  /** The prompt is up. */
  get shown(): boolean {
    return !this.el.hidden;
  }

  /**
   * Per frame while not paused. `watching`: a cutscene plays; `pressed`: any button went down;
   * `holding`: the skip button is down. True when it's time to skip.
   */
  update(dt: number, watching: boolean, pressed: boolean, holding: boolean, device: Device): boolean {
    if (!holding) this.needsRelease = false;
    if (!watching) {
      this.held = 0;
      this.shownFor = 0;
      this.el.hidden = true;
      return false;
    }
    if (pressed) this.shownFor = SHOWN;
    else this.shownFor = Math.max(0, this.shownFor - dt);
    // A hold counts only with the prompt up (the press that started the game doesn't show it).
    this.held = holding && !this.needsRelease && (this.shownFor > 0 || this.held > 0) ? this.held + dt : 0;
    this.glyph.textContent = GLYPH[device];
    this.el.hidden = this.shownFor <= 0 && this.held === 0;
    if (this.held < HOLD) return false;
    this.held = 0;
    this.shownFor = 0;
    this.needsRelease = true;
    this.el.hidden = true;
    return true;
  }
}
