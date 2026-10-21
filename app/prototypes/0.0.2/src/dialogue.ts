// A conversation on screen: the lines a story knot gave (story.ts), one at a time in the dialogue
// box (@zamboni/ui's DialogueBox). The line types out (settings.dialogueCharMs a character, at once
// with *reduced motion*); the button (E, the pad's interact, Enter or a click) shows the whole line,
// then goes to the next, then ends. Presses this soon after the last are ignored (a double press
// skips nothing unread), and for a moment after the end nothing can be used (the press that ended it
// doesn't start it again). Each press that does something clicks (the one that starts it is the
// interaction's, which clicks too: interaction.ts); a typewriter key sounds every few characters as the line types (settings.dialogueTypeEvery).
// main.ts holds her still while one is on; the camera still turns (owner, 2026-10-21).
// Time is the game's: it stops with the pause.
// Plan: doc/plans/features/dialogue.md (pass 1)

import type { DialogueView } from '@zamboni/ui';
import type { Device } from './input';
import { settings } from './settings';
import type { Line } from './story';

const GLYPH: Record<Device, string> = { gamepad: '◯', keyboard: 'E' };

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export class Dialogue {
  private lines: Line[] = [];
  private index = 0;
  /** Characters typed of the current line (fractional between frames). */
  private typed = 0;
  private sincePress = Infinity;
  private cooldown = 0;
  private shown: DialogueView | null = null;

  /**
   * @param show draws the box (null: takes it away)
   * @param click the press's sound
   * @param key a typewriter key's sound
   */
  constructor(
    private readonly show: (view: DialogueView | null) => void,
    private readonly click: () => void = () => undefined,
    private readonly key: () => void = () => undefined,
  ) {}

  /** A conversation is on. */
  get active(): boolean {
    return this.index < this.lines.length;
  }

  /** It just ended: nothing can be used yet. */
  get cooling(): boolean {
    return this.cooldown > 0;
  }

  /** The line on screen, for checks. */
  get line(): (Line & { done: boolean }) | null {
    const line = this.lines[this.index];
    return line ? { ...line, done: this.done } : null;
  }

  /** Starts a conversation (the press that started it counts as the last press). */
  start(lines: Line[]): void {
    if (lines.length === 0) return;
    this.lines = lines;
    this.index = 0;
    this.typed = 0;
    this.sincePress = 0;
  }

  private get done(): boolean {
    return this.typed >= [...(this.lines[this.index]?.text ?? '')].length;
  }

  /** Per frame: the typing, a press (complete, next, end), the box. */
  update(dt: number, pressed: boolean, device: Device): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.sincePress += dt;
    if (!this.active) {
      if (this.shown) this.render(null);
      return;
    }
    const length = [...this.lines[this.index]!.text].length;
    if (pressed && this.sincePress >= settings.dialogueDebounce) {
      this.sincePress = 0;
      this.click();
      if (!this.done) this.typed = length;
      else if (++this.index < this.lines.length) this.typed = 0;
      else {
        this.lines = [];
        this.index = 0;
        this.cooldown = settings.dialogueCooldown;
        this.render(null);
        return;
      }
    } else if (!this.done) {
      const perChar = reducedMotion.matches ? 0 : settings.dialogueCharMs;
      const before = Math.floor(this.typed);
      this.typed = perChar > 0 ? Math.min(length, this.typed + (dt * 1000) / perChar) : length;
      // A key for each `every`-th character typed this frame (one at most), not for a space.
      const every = settings.dialogueTypeEvery;
      const chars = [...this.lines[this.index]!.text];
      if (perChar > 0 && every > 0) {
        for (let i = before; i < Math.floor(this.typed); i++) {
          if (i % every === 0 && chars[i]!.trim()) {
            this.key();
            break;
          }
        }
      }
    }
    const line = this.lines[this.index]!;
    const done = this.done;
    this.render({
      speaker: line.speaker,
      text: line.text,
      typed: Math.floor(this.typed),
      action: !done ? 'Skip' : this.index < this.lines.length - 1 ? 'Next' : 'End',
      glyph: GLYPH[device],
    });
  }

  /** The box, only when what it shows changes. */
  private render(view: DialogueView | null): void {
    const s = this.shown;
    if (view && s && s.text === view.text && s.typed === view.typed && s.action === view.action && s.glyph === view.glyph && s.speaker === view.speaker) return;
    this.shown = view;
    this.show(view);
  }
}
