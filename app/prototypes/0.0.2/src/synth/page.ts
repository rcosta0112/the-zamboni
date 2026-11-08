// synth.html: a page for tuning the synth's patches by ear (owner, 2026-11-08), dev only (not in
// the build). The panel edits the patch live; a simulated light shaft (the game's pulse and flicker,
// light-shaft.ts `advance`, with the same settings) drives the light input. The saved patches
// (patches.json) are fetched from the dev server, not imported, so saving doesn't reload the page.

import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { settings } from '../settings';
import type { PatchFile } from './presets';
import { Synth, type Patch, type Wave } from './synth';

const STORE = 'zamboni-synth-patch';

let file = (await (await fetch('/__synth/patches')).json()) as PatchFile;
const defaultPatch = () => file.patches[file.default]!;

/** The last patch edited here (kept in the browser, saved or not), else the saved default. */
function load(): Patch {
  try {
    const saved = localStorage.getItem(STORE);
    if (saved) return { ...defaultPatch(), ...(JSON.parse(saved) as Partial<Patch>) };
  } catch {
    /* none kept, or storage blocked */
  }
  return { ...defaultPatch() };
}

function save(): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(patch));
  } catch {
    /* storage blocked: it just won't be remembered */
  }
}

const patch = load();
let synth: Synth | null = null;

/** The shaft's light, as light-shaft.ts makes it (a copy of its `advance`; keep the two alike). */
const shaft = {
  simulate: true,
  pulsePeriod: settings.shaftPulsePeriod,
  pulseDepth: settings.shaftPulseDepth,
  flickerRate: settings.shaftFlickerRate,
  flickerDepth: settings.shaftFlickerDepth,
  time: 0,
  flickerLeft: 0,
  flickerValue: 1,
  nextJump: 0,
  jitter: 1,
  advance(dt: number): number {
    if (!this.simulate) return 1;
    dt = Math.max(0, Math.min(dt, 0.1));
    this.time += dt;
    const pulse = 1 - this.pulseDepth * (0.5 - 0.5 * Math.cos((2 * Math.PI * this.time) / Math.max(0.1, this.pulsePeriod)));
    if (this.flickerLeft <= 0 && Math.random() < this.flickerRate * dt) {
      this.flickerLeft = 0.1 + Math.random() * 0.35;
      this.nextJump = 0;
    }
    if (this.flickerLeft > 0) {
      this.flickerLeft -= dt;
      this.nextJump -= dt;
      if (this.nextJump <= 0) {
        this.flickerValue = 1 - this.flickerDepth * Math.random();
        this.nextJump = 0.02 + Math.random() * 0.05;
      }
    } else {
      this.flickerValue = 1;
    }
    this.jitter += (1 - 0.06 * Math.random() - this.jitter) * Math.min(1, dt * 30);
    return Math.max(0, Math.min(1, pulse * this.flickerValue * this.jitter));
  },
};

const playButton = document.getElementById('play') as HTMLButtonElement;
const bar = document.getElementById('bar') as HTMLElement;
const now = document.getElementById('now') as HTMLElement;

function toggle(): void {
  synth ??= new Synth(new AudioContext(), { ...patch });
  void synth.context.resume();
  if (synth.playing) synth.stop();
  else synth.play();
  playButton.textContent = synth.playing ? 'Stop' : 'Play';
}
playButton.addEventListener('click', toggle);

function changed(): void {
  synth?.set({ ...patch });
  save();
  now.textContent = `Filter Q ${(synth?.q ?? 0.707 * 2 ** (5 * patch.resonance)).toFixed(2)}`;
}

const gui = new GUI({ title: 'Synth patch' });
/** Saves the patch in patches.json under `name`, as the default (the game's too). */
async function saveAs(name: string): Promise<void> {
  const res = await fetch('/__synth/patches', { method: 'POST', body: JSON.stringify({ name, patch }) });
  if (!res.ok) {
    now.textContent = `Not saved: ${(await res.json()).error ?? res.status}`;
    return;
  }
  file = (await res.json()) as PatchFile;
  actions.preset = file.default;
  presetControl = presetControl.options(Object.keys(file.patches)).name('preset');
  now.textContent = `Saved "${file.default}" as the default (src/synth/patches.json).`;
}

const actions = {
  preset: file.default,
  play: toggle,
  copy: () => void navigator.clipboard.writeText(JSON.stringify(patch, null, 2)),
  save: () => void saveAs(actions.preset),
  saveNew: () => {
    const name = prompt('Name of the new preset');
    if (name?.trim()) void saveAs(name.trim());
  },
  reset: () => {
    Object.assign(patch, file.patches[actions.preset]);
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    changed();
  },
};
gui.add(actions, 'play').name('Play / stop');
gui.add(actions, 'save').name('Save as default');
gui.add(actions, 'saveNew').name('Save as new preset…');
gui.add(actions, 'copy').name('Copy patch');
let presetControl: { options(o: string[]): typeof presetControl; name(n: string): typeof presetControl } = gui.add(actions, 'preset', Object.keys(file.patches)).name('preset');
gui.add(actions, 'reset').name('Load preset (loses changes)');

const WAVES: Wave[] = ['square', 'sawtooth', 'triangle', 'sine'];
gui.add(patch, 'volume', 0, 1, 0.01).onChange(changed);

const osc1 = gui.addFolder('Oscillator 1');
osc1.add(patch, 'osc1').name('on').onChange(changed);
osc1.add(patch, 'wave', WAVES).onChange(changed);
osc1.add(patch, 'level1', 0, 1, 0.01).name('level').onChange(changed);
osc1.add(patch, 'osc1Octave', -3, 3, 1).name('octave').onChange(changed);
osc1.add(patch, 'osc1Semis', -12, 12, 1).name('semitones').onChange(changed);
osc1.add(patch, 'osc1Detune', -100, 100, 1).name('detune (cents)').onChange(changed);

const osc2 = gui.addFolder('Oscillator 2');
osc2.add(patch, 'osc2').name('on').onChange(changed);
osc2.add(patch, 'osc2Wave', WAVES).name('wave').onChange(changed);
osc2.add(patch, 'level2', 0, 1, 0.01).name('level').onChange(changed);
osc2.add(patch, 'osc2Octave', -3, 3, 1).name('octave').onChange(changed);
osc2.add(patch, 'osc2Semis', -12, 12, 1).name('semitones').onChange(changed);
osc2.add(patch, 'osc2Detune', -100, 100, 1).name('detune (cents)').onChange(changed);

const filter = gui.addFolder('Filter (low-pass)');
filter.add(patch, 'cutoff', 50, 20000, 10).name('cutoff (Hz)').onChange(changed);
filter.add(patch, 'resonance', 0, 1, 0.01).onChange(changed);

const env = gui.addFolder('Envelope');
env.add(patch, 'attack', 0.001, 5, 0.001).name('attack (s)').onChange(changed);
env.add(patch, 'decay', 0.001, 5, 0.001).name('decay (s)').onChange(changed);
env.add(patch, 'sustain', 0, 1, 0.01).onChange(changed);
env.add(patch, 'release', 0.001, 10, 0.001).name('release (s)').onChange(changed);

const reverb = gui.addFolder('Reverb');
reverb.add(patch, 'reverbTime', 0.1, 10, 0.1).name('length (s)').onFinishChange(changed);
reverb.add(patch, 'reverbMix', 0, 1, 0.01).name('mix (0 dry, 1 wet)').onChange(changed);

const pattern = gui.addFolder('Notes (C4 = middle C)');
pattern.add(patch, 'held').name('held').onFinishChange(changed);
pattern.add(patch, 'line').name('line over it').onFinishChange(changed);
pattern.add(patch, 'step', 0.1, 20, 0.1).name('step (s)').onChange(changed);
pattern.add(patch, 'legato').name('slide (legato)').onChange(changed);
pattern.add(patch, 'glide', 0, 3, 0.01).name('slide time (s)').onChange(changed);

const light = gui.addFolder('Light');
light.add(patch, 'lightDepth', 0, 1, 0.01).name('volume follows light').onChange(changed);
light.add(patch, 'lightCutoff', 0, 6, 0.1).name('cutoff dips (octaves)').onChange(changed);
light.add(shaft, 'simulate').name('simulate the shaft');
light.add(shaft, 'pulsePeriod', 0.1, 10, 0.1).name('pulse period (s)');
light.add(shaft, 'pulseDepth', 0, 1, 0.01).name('pulse depth');
light.add(shaft, 'flickerRate', 0, 5, 0.05).name('flickers a second');
light.add(shaft, 'flickerDepth', 0, 1, 0.01).name('flicker depth');

changed();

let last = performance.now();
function frame(t: number): void {
  const value = shaft.advance((t - last) / 1000);
  last = t;
  bar.style.width = `${value * 100}%`;
  synth?.setLight(value);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
