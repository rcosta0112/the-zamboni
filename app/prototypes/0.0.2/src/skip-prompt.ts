// Skipping a cutscene (owner, 2026-10-23, SC-126): any press (or a click, 2026-10-24) while one plays shows "Hold X to skip" (owner, 2026-10-28: the pad's X, ◯ before)
// at the bottom right (on mouse and keyboard the left mouse button, an icon: owner, 2026-10-28, E before;
// the prompt shows the last device used); holding the button
// that long skips it. A bar along the prompt's bottom fills while it's held (owner, 2026-10-28; none
// before). Both cutscenes: cutscene 1 (the
// player) and cutscene 2 (the watched conversation). After a skip the button must be let go before
// a hold counts again (cutscene 2 follows cutscene 1 at once).

import type { Device } from './input';

const GLYPH: Record<Device, string> = {
  gamepad: 'X',
  // A mouse, its left button filled.
  keyboard:
    '<svg viewBox="0 0 14 20" width="14" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-label="left mouse button">' +
    '<rect x="0.75" y="0.75" width="12.5" height="18.5" rx="6.25"/><path d="M7 0.75V8.5M0.75 8.5H13.25"/>' +
    '<path d="M7 0.75A6.25 6.25 0 0 0 0.75 7V8.5H7Z" fill="currentColor"/></svg>',
};
/** How long the button is held to skip (s; owner, 2026-10-28: 3 before). */
const HOLD = 2;
/** The prompt stays this long after the last press, unless the button is held (s). */
const SHOWN = 3;

export class SkipPrompt {
  /** How long the button has been held (s), for checks. */
  held = 0;
  private shownFor = 0;
  private needsRelease = false;
  private device: Device | null = null;
  private glyph = document.createElement('span');
  private fill = document.createElement('span');

  constructor(private readonly el: HTMLElement) {
    this.glyph.className = 'glyph';
    this.fill.className = 'fill';
    el.replaceChildren('Hold', this.glyph, 'to skip', this.fill); // spaced by the flex gap; the fill is out of the flow
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
    if (device !== this.device) {
      this.device = device;
      this.glyph.innerHTML = GLYPH[device];
      this.glyph.classList.toggle('mouse', device === 'keyboard');
    }
    this.fill.style.transform = `scaleX(${Math.min(1, this.held / HOLD)})`;
    this.el.hidden = this.shownFor <= 0 && this.held === 0;
    if (this.held < HOLD) return false;
    this.held = 0;
    this.shownFor = 0;
    this.needsRelease = true;
    this.el.hidden = true;
    return true;
  }
}
