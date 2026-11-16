// scanner-synth.html: a page for tuning the scanner's sound by ear (owner, 2026-11-16), dev only (not
// in the build). One note, chosen from a list; two oscillators, low-pass filter, envelope, reverb and
// vibrato (synth.ts). Held to play, as R1 in the game. Its presets (scanner-patches.json) are fetched
// from the dev server, not imported, so saving doesn't reload the page. Plan:
// doc/plans/features/scanner-synth.md.

import GUI from 'three/addons/libs/lil-gui.module.min.js';
import type { PatchFile } from './presets';
import { Synth, resonanceToQ, type Patch, type Wave } from './synth';

const STORE = 'zamboni-scanner-synth-patch';
const ROUTE = '/__synth/scanner';

let file = (await (await fetch(ROUTE)).json()) as PatchFile;

/** The notes offered: C1 to C7, sharps included. */
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES = [...Array(6).keys()].flatMap((i) => NAMES.map((n) => `${n}${i + 1}`)).concat('C7');

/** A patch with the vibrato's settings always there (the panel edits them). */
type ScannerPatch = Patch & Required<Pick<Patch, 'vibratoRate' | 'vibratoDepth' | 'vibratoDelay'>>;

/** Fills what an older patch lacks, and keeps it to one note, no line, no light. */
function single(p: Partial<Patch>): ScannerPatch {
  const base = file.patches[file.default]!;
  const out = { ...base, ...p } as ScannerPatch;
  out.vibratoRate ??= 6;
  out.vibratoDepth ??= 0;
  out.vibratoDelay ??= 0;
  out.held = NOTES.includes(out.held.trim()) ? out.held.trim() : 'A3';
  out.line = '';
  out.lightDepth = 0;
  out.lightCutoff = 0;
  return out;
}

function load(): ScannerPatch {
  try {
    const saved = localStorage.getItem(STORE);
    if (saved) return single(JSON.parse(saved) as Partial<Patch>);
  } catch {
    /* none kept, or storage blocked */
  }
  return single({});
}

const patch = load();
let synth: Synth | null = null;

const playButton = document.getElementById('play') as HTMLButtonElement;
const latchBox = document.getElementById('latch') as HTMLInputElement;
const now = document.getElementById('now') as HTMLElement;

function getSynth(): Synth {
  synth ??= new Synth(new AudioContext(), { ...patch });
  void synth.context.resume();
  return synth;
}

function shown(): void {
  const on = synth?.playing ?? false;
  playButton.classList.toggle('on', on);
  playButton.textContent = latchBox.checked ? (on ? 'Stop' : 'Play') : on ? 'Playing…' : 'Hold to play';
}

function press(): void {
  const s = getSynth();
  if (latchBox.checked && s.playing) s.stop();
  else s.play();
  shown();
}

function letGo(): void {
  if (latchBox.checked || !synth?.playing) return;
  synth.stop();
  shown();
}

playButton.addEventListener('pointerdown', (e) => {
  playButton.setPointerCapture(e.pointerId);
  press();
});
playButton.addEventListener('pointerup', letGo);
playButton.addEventListener('pointercancel', letGo);
addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat || (e.target as HTMLElement).closest('input, select, textarea')) return;
  e.preventDefault();
  press();
});
addEventListener('keyup', (e) => {
  if (e.code === 'Space') letGo();
});
addEventListener('blur', letGo);
latchBox.addEventListener('change', () => {
  if (!latchBox.checked && synth?.playing) synth.stop();
  shown();
});

function changed(): void {
  synth?.set({ ...patch });
  try {
    localStorage.setItem(STORE, JSON.stringify(patch));
  } catch {
    /* storage blocked: it just won't be remembered */
  }
  now.textContent = `Filter Q ${resonanceToQ(patch.resonance).toFixed(2)}`;
}

const gui = new GUI({ title: 'Scanner patch' });

/** Saves the patch in scanner-patches.json under `name`, as the default. */
async function saveAs(name: string): Promise<void> {
  const res = await fetch(ROUTE, { method: 'POST', body: JSON.stringify({ name, patch }) });
  if (!res.ok) {
    now.textContent = `Not saved: ${(await res.json()).error ?? res.status}`;
    return;
  }
  file = (await res.json()) as PatchFile;
  actions.preset = file.default;
  presetControl = presetControl.options(Object.keys(file.patches)).name('preset');
  now.textContent = `Saved "${file.default}" as the default (src/synth/scanner-patches.json).`;
}

const actions = {
  preset: file.default,
  copy: () => void navigator.clipboard.writeText(JSON.stringify(patch, null, 2)),
  save: () => void saveAs(actions.preset),
  saveNew: () => {
    const name = prompt('Name of the new preset');
    if (name?.trim()) void saveAs(name.trim());
  },
  reset: () => {
    Object.assign(patch, single(file.patches[actions.preset]!));
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    changed();
  },
};
gui.add(actions, 'save').name('Save as default');
gui.add(actions, 'saveNew').name('Save as new preset…');
gui.add(actions, 'copy').name('Copy patch');
let presetControl: { options(o: string[]): typeof presetControl; name(n: string): typeof presetControl } = gui
  .add(actions, 'preset', Object.keys(file.patches))
  .name('preset');
gui.add(actions, 'reset').name('Load preset (loses changes)');

const WAVES: Wave[] = ['square', 'sawtooth', 'triangle', 'sine'];
gui.add(patch, 'held', NOTES).name('note (C4 = middle C)').onChange(changed);
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

const vibrato = gui.addFolder('Vibrato');
vibrato.add(patch, 'vibratoRate', 0.1, 20, 0.1).name('rate (Hz)').onChange(changed);
vibrato.add(patch, 'vibratoDepth', 0, 200, 1).name('depth (± cents)').onChange(changed);
vibrato.add(patch, 'vibratoDelay', 0, 5, 0.01).name('fade-in (s)').onChange(changed);

const reverb = gui.addFolder('Reverb');
reverb.add(patch, 'reverbTime', 0.1, 10, 0.1).name('length (s)').onFinishChange(changed);
reverb.add(patch, 'reverbMix', 0, 1, 0.01).name('mix (0 dry, 1 wet)').onChange(changed);

changed();
shown();
