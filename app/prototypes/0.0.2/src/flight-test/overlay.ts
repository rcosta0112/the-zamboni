// The flight test scene's 2D overlay (owner, 2026-11-23: "a quick 2d overlay for the controls; just buttons and
// sliders with text labels in them; semi-transparent; each station its own overlay"). Prototype code: only
// flight-test.html uses it (main.ts FLIGHT_TEST).
// - Her seat (`pilot`): ShipFlight's six controls (the tuning panel's, which stay): a change goes through its
//   locks (`ShipFlight.use`: refused, the reason shown), the labels read back from it each frame; a non-interactive
//   readout line, the course (main.ts sets `pilotCourseText` each frame from the nav screen's ship and the
//   course set below).
// - Navigation: *Map zoom* drives the navigation screen's zoom steps (nav-screen.ts; zoomed in all the way at
//   first); a button per signal found at the signal station (`signals`, pass 5's first part), picking one as the
//   course (`onSetCourse`, main.ts: Adam Red's line, the waypoint mark). Signal: the band and two dials drive
//   `SignalStation` (main.ts), which locks a target and reports it found once.
// - Input while it's on: the D-pad / arrows up and down pick an item, left and right move a slider (or flip a
//   button), A / Enter flips a button; B is left to the caller (get up). The mouse clicks it when not captured
//   (a slider: click or drag along it). Each station keeps its selection.
// - While it's on, the 3D controls (controls.ts) take no input (main.ts); the panel's *overlay* turns it off.

import type GUI from 'three/addons/libs/lil-gui.module.min.js';
import type { ShipFlight } from './flight';
import type { FoundSignal, SignalStation } from './signals';
import type { StationId } from './stations';
import { DEFAULT_ZOOM, ZOOM_STEPS } from '../planet/nav-screen';

interface ButtonItem {
  kind: 'button';
  id: string;
  /** The text in it, from the state. */
  label: () => string;
  /** Lit (on). */
  on: () => boolean;
  press: () => void;
}

interface SliderItem {
  kind: 'slider';
  id: string;
  label: () => string;
  /** 0..1. */
  get: () => number;
  set: (v: number) => void;
}

type Item = ButtonItem | SliderItem;

/** A slider's step per press (D-pad, arrows). */
const SLIDER_STEP = 0.1;

/** The panel's switch (folder *Flight test: overlay*). */
export const overlayLook = { on: true, opacity: 0.55 };

export class Overlay {
  /** The placeholder stations' values (dev hook `__overlay().values`). */
  /** The panel's switch and opacity (dev hook: `__overlay().look`). */
  readonly look = overlayLook;
  readonly values = { band: 'signal' as 'signal' | 'infrared', dial1: 0.5, dial2: 0.5, zoom: DEFAULT_ZOOM }; // zoom: the map's step (ZOOM_STEPS)
  /** The pilot's course readout line (main.ts sets it each frame from the nav screen and `course`). */
  pilotCourseText = '';
  /** The signal picked as the course at navigation, or null (dev hook: `__overlay().course`). */
  private courseSignal: FoundSignal | null = null;
  private readonly root = document.createElement('div');
  private readonly items: Record<StationId, Item[]>;
  private readonly elements = new Map<Item, HTMLElement>();
  private readonly selected: Record<StationId, number> = { pilot: 0, navigation: 0, signal: 0 };
  private readonly pilotCourseEl = document.createElement('div');
  private station: StationId | null = null;
  private foundCount = -1;
  private readonly zoomItem: SliderItem;

  constructor(
    private readonly flight: ShipFlight,
    private readonly signals: SignalStation,
    /** A found signal picked as the course (press on its button at navigation): main.ts announces it and marks the map. */
    private readonly onSetCourse: (found: FoundSignal) => void,
  ) {
    const f = flight;
    const p = f.panel;
    const v = this.values;
    const toggle = (key: 'power' | 'tiltForward' | 'gearUp' | 'rampOpen' | 'lights') => () => f.use(key, !p[key]);
    // The map's zoom steps on a slider: a press moves one step; a click or drag picks the nearest.
    this.zoomItem = { kind: 'slider', id: 'zoom', label: () => `Map zoom: ${ZOOM_STEPS[v.zoom]!.name}`, get: () => v.zoom / (ZOOM_STEPS.length - 1), set: (z) => (v.zoom = zoomStepFor(z, v.zoom)) };
    this.items = {
      pilot: [
        { kind: 'button', id: 'power', label: () => `Engines: ${p.power ? 'on' : 'off'}`, on: () => p.power, press: toggle('power') },
        { kind: 'slider', id: 'thrust', label: () => `Thrust ${Math.round(p.thrust * 100)}%`, get: () => p.thrust, set: (t) => f.use('thrust', round(t)) },
        { kind: 'button', id: 'tilt', label: () => `Engine tilt: ${p.tiltForward ? 'forward' : 'down'}`, on: () => p.tiltForward, press: toggle('tiltForward') },
        { kind: 'button', id: 'gear', label: () => `Gear: ${p.gearUp ? 'up' : 'down'}`, on: () => p.gearUp, press: toggle('gearUp') },
        { kind: 'button', id: 'ramp', label: () => `Ramp: ${p.rampOpen ? 'open' : 'closed'}`, on: () => p.rampOpen, press: toggle('rampOpen') },
        { kind: 'button', id: 'lights', label: () => `Lights: ${p.lights ? 'on' : 'off'}`, on: () => p.lights, press: toggle('lights') },
      ],
      navigation: [this.zoomItem],
      signal: [
        { kind: 'button', id: 'band', label: () => `Band: ${v.band}`, on: () => v.band === 'infrared', press: () => (v.band = v.band === 'signal' ? 'infrared' : 'signal') },
        { kind: 'slider', id: 'dial-1', label: () => `Dial 1: ${Math.round(v.dial1 * 100)}`, get: () => v.dial1, set: (d) => (v.dial1 = round(d)) },
        { kind: 'slider', id: 'dial-2', label: () => `Dial 2: ${Math.round(v.dial2 * 100)}`, get: () => v.dial2, set: (d) => (v.dial2 = round(d)) },
      ],
    };
    this.root.id = 'flight-overlay';
    this.root.hidden = true;
    document.body.append(this.root);
  }

  /** The signal picked as the course, or null (dev hook, and main.ts's ETA readout). */
  get course(): FoundSignal | null {
    return this.courseSignal;
  }

  /** A found signal's button: navigation's list, rebuilt when `signals.found` grows. */
  private navSignalItems(): ButtonItem[] {
    return this.signals.found.map((found): ButtonItem => ({
      kind: 'button',
      id: `signal-${found.id}`,
      label: () => `${found.quadrant} (${found.band})${this.courseSignal?.id === found.id ? ' — course' : ''}`,
      on: () => this.courseSignal?.id === found.id,
      press: () => {
        this.courseSignal = found;
        this.onSetCourse(found);
      },
    }));
  }

  /** Shown now (a station on and the panel's switch on): main.ts gives it the D-pad and A instead of the 3D controls. */
  get active(): boolean {
    return this.station !== null && overlayLook.on;
  }

  /** Per frame: the station on (null: hidden) and, when free, this frame's input. */
  update(station: StationId | null, input: { step: [number, number] | null; use: boolean } | null): void {
    // A signal found since the last frame: navigation's list grows (its own button, picked for the course).
    if (this.signals.found.length !== this.foundCount) {
      this.foundCount = this.signals.found.length;
      this.items.navigation = [...this.navSignalItems(), this.zoomItem];
      if (this.station === 'navigation') this.selected.navigation = Math.min(this.selected.navigation, this.items.navigation.length - 1);
    }
    if (station !== this.station) {
      this.station = station;
      this.build();
    } else if (station === 'navigation' && this.elements.size !== this.items.navigation.length) {
      this.build(); // the list grew while already here
    }
    this.root.hidden = !this.active;
    this.root.style.setProperty('--overlay-opacity', String(overlayLook.opacity));
    if (!this.active || !station) return;
    const items = this.items[station];
    if (input?.step) {
      const [x, y] = input.step;
      const item = items[this.selected[station]];
      if (y) this.selected[station] = (this.selected[station] - y + items.length) % items.length;
      else if (item?.kind === 'slider') item.set(clamp01(item.get() + x * SLIDER_STEP));
      else if (item?.kind === 'button') item.press();
    }
    if (input?.use) {
      const item = items[this.selected[station]];
      if (item?.kind === 'button') item.press();
    }
    this.refresh();
  }

  /** The station's items as elements. */
  private build(): void {
    this.root.replaceChildren();
    this.elements.clear();
    const station = this.station;
    if (!station) return;
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = { pilot: 'Pilot', navigation: 'Navigation', signal: 'Signal' }[station];
    this.root.append(title);
    this.items[station].forEach((item, i) => {
      const el = document.createElement('div');
      el.className = item.kind;
      el.dataset.id = item.id;
      if (item.kind === 'slider') el.append(document.createElement('i'));
      el.append(document.createElement('span'));
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.selected[station] = i;
        if (item.kind === 'button') item.press();
        else {
          const at = (ev: PointerEvent) => {
            const r = el.getBoundingClientRect();
            item.set(clamp01((ev.clientX - r.left) / r.width));
          };
          at(e);
          el.setPointerCapture(e.pointerId);
          el.onpointermove = (ev) => ev.buttons && at(ev);
        }
      });
      this.root.append(el);
      this.elements.set(item, el);
    });
    if (station === 'pilot') {
      this.pilotCourseEl.className = 'readout';
      this.root.append(this.pilotCourseEl);
    }
  }

  /** The labels, fills and selection from the state. */
  private refresh(): void {
    const station = this.station;
    if (!station) return;
    if (station === 'pilot') this.pilotCourseEl.textContent = this.pilotCourseText || 'Course: none set';
    this.items[station].forEach((item, i) => {
      const el = this.elements.get(item);
      if (!el) return;
      const text = item.label();
      const span = el.lastElementChild as HTMLElement;
      if (span.textContent !== text) span.textContent = text;
      el.classList.toggle('selected', i === this.selected[station]);
      if (item.kind === 'button') el.classList.toggle('on', item.on());
      else (el.firstElementChild as HTMLElement).style.width = `${item.get() * 100}%`;
    });
  }

  /** Dev hook: the items' ids at a station, the selected one, and the state. */
  get state(): { station: StationId | null; active: boolean; items: string[]; selected: string | null } {
    const items = this.station ? this.items[this.station] : [];
    return { station: this.station, active: this.active, items: items.map((i) => i.id), selected: this.station ? (items[this.selected[this.station]]?.id ?? null) : null };
  }
}

export function overlayFolder(gui: GUI): void {
  const folder = gui.addFolder('Flight test: overlay');
  folder.add(overlayLook, 'on').name('overlay on (off: the 3D controls)');
  folder.add(overlayLook, 'opacity', 0.1, 1, 0.05).name('opacity');
}

/** The zoom step a slider value asks for: a press (one SLIDER_STEP off the current step's value) one step that
 *  way; a click or drag the nearest. */
function zoomStepFor(value: number, current: number): number {
  const last = ZOOM_STEPS.length - 1;
  const off = value - current / last;
  if (Math.abs(Math.abs(off) - SLIDER_STEP) < 1e-6) return Math.min(last, Math.max(0, current + Math.sign(off)));
  return Math.round(value * last);
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** To the slider's step's hundredths (no 0.30000000004). */
function round(v: number): number {
  return Math.round(v * 100) / 100;
}
