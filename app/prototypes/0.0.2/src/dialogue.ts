// A conversation on screen: the lines a story knot gave (story.ts), one at a time in the dialogue
// box (@zamboni/ui's DialogueBox). The line types out (settings.dialogueCharMs a character, at once
// with *reduced motion*); the button (E, the pad's interact, Enter or a click) shows the whole line,
// then goes to the next, then ends. Presses this soon after the last are ignored (a double press
// skips nothing unread), and for a moment after the end nothing can be used (the press that ended it
// doesn't start it again). Each press that does something clicks (the one that starts it is the
// interaction's, which clicks too: interaction.ts); a typewriter key sounds every few characters as the line types (settings.dialogueTypeEvery).
// Topics (Ink's choices; owner, 2026-10-22): after the last line, a screen of her own lines to
// choose from, in the box under her name, the first selected; up / down move the selection (no wrap),
// the button picks it (`onChoose`), and the story's next lines (the answer) come back through `start`.
// main.ts holds her still while one is on; the camera still turns (owner, 2026-10-21).
// Time is the game's: it stops with the pause.
// Plan: doc/plans/features/dialogue.md (passes 1, 2, topics)

import type { DialogueView } from '@zamboni/ui';
import type { Device } from './input';
import { settings } from './settings';
import { displayName, type Line } from './story';

const GLYPH: Record<Device, string> = { gamepad: '◯', keyboard: 'E' };

/** No topics (one array, so the box isn't redrawn for a new empty one each frame). */
const NO_TOPICS: string[] = [];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export class Dialogue {
  private lines: Line[] = [];
  /** The line on screen; `lines.length` is the topics' screen, when there are topics. */
  private index = 0;
  /** Her lines to choose from after the last line (none: it ends there). */
  private topics: string[] = [];
  private selected = 0;
  /** Characters typed of the current line (fractional between frames). */
  private typed = 0;
  private sincePress = Infinity;
  private cooldown = 0;
  private shown: DialogueView | null = null;
  /** A conversation has ended, or a knot that says nothing (main.ts saves). */
  onEnded: (() => void) | null = null;
  /** A topic was picked (its index): the story runs on and calls `start` with what follows. */
  onChoose: ((index: number) => void) | null = null;

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
    return this.index < this.lines.length || this.choosing;
  }

  /** It just ended: nothing can be used yet. */
  get cooling(): boolean {
    return this.cooldown > 0;
  }

  /** The topics' screen is up. */
  private get choosing(): boolean {
    return this.topics.length > 0 && this.index === this.lines.length;
  }

  /** The screen: a line, or the topics (`selected` the one marked), for checks. */
  get line(): (Line & { done: boolean; topics: string[]; selected: number }) | null {
    if (this.choosing) return { speaker: displayName('green'), text: '', done: true, topics: [...this.topics], selected: this.selected };
    const line = this.lines[this.index];
    return line ? { ...line, done: this.done, topics: [], selected: 0 } : null;
  }

  /**
   * A knot's lines up to its topics (story.ts `onLines`): starts a conversation (the press that
   * started it counts as the last press), or goes on with one after a topic is picked. Nothing to say
   * and no topics: a knot that says nothing, or the conversation's end.
   */
  start(lines: Line[], topics: string[] = []): void {
    const going = this.active;
    if (lines.length === 0 && topics.length === 0) {
      if (going) this.end();
      else this.onEnded?.();
      return;
    }
    this.lines = lines;
    this.index = 0;
    this.typed = 0;
    this.topics = topics;
    this.selected = 0;
    if (!going) this.sincePress = 0;
  }

  private get done(): boolean {
    return this.typed >= [...(this.lines[this.index]?.text ?? '')].length;
  }

  private end(): void {
    this.lines = [];
    this.index = 0;
    this.topics = [];
    this.cooldown = settings.dialogueCooldown;
    this.render(null);
    this.onEnded?.();
  }

  /** Per frame: the typing, a press (complete, next, pick, end), the selection's step (-1 up, 1 down), the box. */
  update(dt: number, pressed: boolean, step: number, device: Device): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.sincePress += dt;
    if (!this.active) {
      if (this.shown) this.render(null);
      return;
    }
    if (pressed && this.sincePress >= settings.dialogueDebounce) {
      this.sincePress = 0;
      this.click();
      if (this.choosing) {
        if (this.onChoose) this.onChoose(this.selected); // the story calls `start` with what follows
        else this.end();
        if (!this.active) return;
      } else if (!this.done) this.typed = [...this.lines[this.index]!.text].length;
      else if (this.index < this.lines.length - 1 || this.topics.length > 0) {
        this.index++;
        this.typed = 0;
      } else {
        this.end();
        return;
      }
    } else if (this.choosing) {
      if (step) this.selected = Math.min(this.topics.length - 1, Math.max(0, this.selected + step));
    } else if (!this.done) {
      const length = [...this.lines[this.index]!.text].length;
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
    if (this.choosing) {
      this.render({ speaker: displayName('green'), text: '', typed: 0, action: 'Choose', glyph: GLYPH[device], topics: this.topics, selected: this.selected });
      return;
    }
    const line = this.lines[this.index]!;
    const done = this.done;
    const last = this.index === this.lines.length - 1 && this.topics.length === 0;
    this.render({
      speaker: line.speaker,
      text: line.text,
      typed: Math.floor(this.typed),
      action: !done ? 'Skip' : last ? 'End' : 'Next',
      glyph: GLYPH[device],
      topics: NO_TOPICS,
      selected: 0,
    });
  }

  /** The box, only when what it shows changes. */
  private render(view: DialogueView | null): void {
    const s = this.shown;
    if (view && s && s.text === view.text && s.typed === view.typed && s.action === view.action && s.glyph === view.glyph && s.speaker === view.speaker && s.topics === view.topics && s.selected === view.selected) return;
    this.shown = view;
    this.show(view);
  }
}
