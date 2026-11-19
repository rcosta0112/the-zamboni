// The view through the binoculars (gadgets, pass 2; plan doc/plans/features/gadgets-binoculars.md):
// the magnification between `binocularZoomMin` and `binocularZoomMax` (the panel's Binoculars
// folder), L1 / L2 held move it in / out steadily (owner, 2026-11-16; L2 faster the further it's pressed), the mouse
// wheel steps it; it starts at the widest each time. `moving` gives the zoom sound's direction (main.ts:
// sfx_binoculars_zoom_in while it moves in, the same reversed while it moves out; owner, 2026-11-16). The lens it gives the camera (`fov`). No overlay
// (owner, 2026-11-16: removed). The prompt at the bottom right (owner, 2026-11-16): "R1 to Use" while
// they're out; looking through them "R1 to Close" over "L1 / L2 to Zoom" (owner, 2026-11-16); the
// last device's buttons, as icons. The scanner's (2026-11-16): "Hold R1 to Scan" while it's out.

import * as THREE from 'three/webgpu';
import type { GadgetId } from './gadgets';
import type { Device } from './input';
import { mouseGlyph, shoulderGlyph } from './pad-glyph';
import { settings } from './settings';

/** One wheel notch: this factor on the magnification. */
const WHEEL_STEP = 1.25;
/** A wheel notch counts as zooming this long (s): the zoom sound's length for one notch. */
const WHEEL_SOUND = 0.18;

/** A mouse, the right button filled (use) or the wheel (zoom). */
const mouse = mouseGlyph;

/** What the corner shows: 'use' while they're out, 'zoom' while looking through them (with 'close' over it); 'scan' while the scanner is out. */
type Prompt = 'use' | 'zoom' | 'scan' | null;
type PromptRow = 'use' | 'close' | 'zoom' | 'scan';
/** Each prompt's glyphs (key boxes, or the mouse icon) and words (`before` them, if any), by device. */
const PROMPTS: Record<PromptRow, Record<Device, { glyphs: string[]; words: string; before?: string }>> = {
  scan: { gamepad: { before: 'Hold', glyphs: [shoulderGlyph('R1')], words: 'to Scan' }, keyboard: { before: 'Hold', glyphs: [mouse('right')], words: 'to Scan' } },
  use: { gamepad: { glyphs: [shoulderGlyph('R1')], words: 'to Use' }, keyboard: { glyphs: [mouse('right')], words: 'to Use' } },
  close: { gamepad: { glyphs: [shoulderGlyph('R1')], words: 'to Close' }, keyboard: { glyphs: [mouse('right')], words: 'to Close' } },
  zoom: { gamepad: { glyphs: [shoulderGlyph('L1'), shoulderGlyph('L2')], words: 'to Zoom' }, keyboard: { glyphs: [mouse('wheel')], words: 'to Zoom' } },
};

/** One prompt as a pill: its glyphs (two with a slash between: "L1 / L2 to Zoom"), then its words. */
function pill({ glyphs, words, before }: { glyphs: string[]; words: string; before?: string }): HTMLElement {
  const el = document.createElement('div');
  el.className = 'pill';
  const boxes = glyphs.map((g) => {
    const span = document.createElement('span');
    span.className = 'glyph';
    span.innerHTML = g;
    return span;
  });
  el.append(...(before ? [before] : []), ...(boxes.length === 2 ? [boxes[0]!, '/', boxes[1]!] : boxes), words);
  return el;
}

export class BinocularView {
  /** The magnification now. */
  zoom = settings.binocularZoomMin;
  /** Which way the magnification is moving this frame (1 in, -1 out, 0 still): the zoom sound's cue. */
  moving: -1 | 0 | 1 = 0;
  private wheelLeft = 0;
  private wheelWay: -1 | 1 = 1;
  private on = false;
  /** What the prompt shows now (for checks), and on which device. */
  prompt: Prompt = null;
  private device: Device | null = null;
  private readonly el: HTMLDivElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'gadget-prompt';
    this.el.hidden = true;
    document.body.appendChild(this.el);
  }

  /**
   * Called every rendered frame. `out`: the gadget out (the binoculars in her hands or up); `on`: looking
   * through them. `hold`: L1 minus L2 (-1..1); `steps`: the wheel's notches (up positive). Returns the
   * lens for the camera (vertical degrees, from `baseFov`).
   */
  update(dt: number, out: GadgetId | null, on: boolean, hold: number, steps: number, baseFov: number, device: Device): number {
    const min = Math.max(1, settings.binocularZoomMin);
    const max = Math.max(min, settings.binocularZoomMax);
    if (on && !this.on) this.zoom = min; // each look starts at the widest
    this.on = on;
    const before = this.zoom;
    if (on) {
      this.zoom *= Math.pow(2, hold * settings.binocularZoomSpeed * Math.max(0, dt)) * Math.pow(WHEEL_STEP, steps);
      this.zoom = THREE.MathUtils.clamp(this.zoom, min, max);
    }
    // Still at either end, or let go: still. A notch that moved it sounds for WHEEL_SOUND.
    const change = on ? this.zoom / before : 1;
    if (steps !== 0 && Math.abs(change - 1) > 1e-4) {
      this.wheelLeft = WHEEL_SOUND;
      this.wheelWay = change > 1 ? 1 : -1;
    } else this.wheelLeft = on ? Math.max(0, this.wheelLeft - Math.max(0, dt)) : 0;
    this.moving = hold !== 0 && Math.abs(change - 1) > 1e-6 ? (change > 1 ? 1 : -1) : this.wheelLeft > 0 ? this.wheelWay : 0;
    this.showPrompt(on ? 'zoom' : out === 'binoculars' ? 'use' : out === 'scanner' ? 'scan' : null, device);
    const half = THREE.MathUtils.degToRad(baseFov / 2);
    return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) / this.zoom));
  }

  private showPrompt(prompt: Prompt, device: Device): void {
    if (prompt === this.prompt && device === this.device) return;
    this.prompt = prompt;
    this.device = device;
    this.el.hidden = prompt === null;
    if (prompt === null) return;
    // Looking through them, two (owner, 2026-11-16): "R1 to Close" over "L1 / L2 to Zoom".
    const rows: PromptRow[] = prompt === 'zoom' ? ['close', 'zoom'] : [prompt];
    this.el.replaceChildren(...rows.map((row) => pill(PROMPTS[row][device])));
  }
}
