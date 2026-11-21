/**
 * flame-editor.html: the thrusters' flames tuned (plan doc/plans/features/flame-editor.md; owner, 2026-11-21).
 * The shot editor's page (tools.css) and preview (preview.ts): a saved shot picked from `shots.json` loops on the
 * right; the sidebar shows every flame and bloom value of `settings` (flame-keys.ts) as they are now, a nudge shown
 * at once (the flames read `settings` every frame), amber with the saved value under it. *Save* writes them as
 * the defaults in src/settings.ts (POST /__flames, vite.config.ts); the game shows them once reloaded.
 * Preview only, never saved: the bloom forced on (flybys don't key it; the landing does), the flames held still.
 * Dev only, as tools.html. Mouse-first, as the other tuning pages.
 */

import type { ShipKey } from '../cutscene';
import { settings } from '../settings';
import { ShotPreview } from './preview';
import { FLAME_KEYS, GLOW_KEYS, ALL_FLAME_KEYS, type FlameKey } from './flame-keys';
import { flybyTrack, playedLength, type FlybyValues, type HandheldKey } from './flyby';

interface SavedShot {
  kind: 'flyby';
  seed: number;
  values: FlybyValues;
  saved: string;
}

type Value = number | string | boolean;
const values = settings as unknown as Record<string, Value>;
/** The values as saved in settings.ts (as loaded; updated by a save). */
const saved: Record<string, Value> = Object.fromEntries(ALL_FLAME_KEYS.map((k) => [k.key, values[k.key]!]));
const SHOT_KEY = 'flame-editor.shot';
const FRAME = 1 / 24;

const side = document.getElementById('side')!;
const view = document.getElementById('view')!;
const status = document.getElementById('status')!;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, parent: HTMLElement, text?: string, cls?: string) => {
  const e = parent.appendChild(document.createElement(tag));
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};

let sway: ShipKey[] = [];
let handheld: HandheldKey[] = [];
let shots: Record<string, SavedShot> = {};
let shotName: string | null = null;
let preview: ShotPreview | null = null;

/** A sidebar section, folded or open (remembered). */
function section(title: string): HTMLElement {
  const d = el('details', side);
  const key = `flame-editor.open.${title}`;
  d.open = localStorage.getItem(key) !== '0';
  el('summary', d, title);
  d.addEventListener('toggle', () => localStorage.setItem(key, d.open ? '1' : '0'));
  return el('div', d);
}

// The sidebar.
const shotList = el('div', section('Shots'), undefined, 'saved');
const fields: { k: FlameKey; tr: HTMLElement; input: HTMLInputElement; now: HTMLElement }[] = [];
function valueGrid(parent: HTMLElement, keys: FlameKey[]): void {
  const grid = el('div', parent, undefined, 'values');
  for (const k of keys) {
    const tr = el('label', grid, undefined, 'field');
    el('span', tr, k.label).title = `${k.label} (settings.${k.key})`;
    const input = el('input', tr);
    input.type = k.kind === 'number' ? 'number' : k.kind === 'colour' ? 'color' : 'checkbox';
    if (k.kind === 'number') {
      input.step = String(k.step);
      if (k.min !== undefined) input.min = String(k.min);
      if (k.max !== undefined) input.max = String(k.max);
    }
    const now = el('div', tr, '', 'now');
    input.addEventListener('input', () => {
      if (k.kind === 'number') {
        const n = Number(input.value);
        if (input.value === '' || !Number.isFinite(n)) return;
        values[k.key] = n;
      } else if (k.kind === 'colour') values[k.key] = input.value;
      else values[k.key] = input.checked;
      show(false);
    });
    fields.push({ k, tr, input, now });
  }
}
valueGrid(section('Flames'), FLAME_KEYS);
const glowSec = section('Bloom per nozzle');
const glowRow = el('div', glowSec, undefined, 'row');
const glowLabel = el('label', glowRow);
const glowBox = el('input', glowLabel);
glowBox.type = 'checkbox';
el('span', glowLabel, 'Preview: bloom on (flybys don’t key it; the landing does)');
valueGrid(glowSec, GLOW_KEYS);
const holdSec = section('Hold');
const holdRow = el('div', holdSec, undefined, 'row');
const holdLabel = el('label', holdRow);
const holdBox = el('input', holdLabel);
holdBox.type = 'checkbox';
el('span', holdLabel, 'Hold the flames still (no flicker, the grain stopped)');
const saveRow = el('div', section('Save'), undefined, 'row');
const saveBtn = el('button', saveRow, 'Save', 'main');
const revertBtn = el('button', saveRow, 'Revert');
el('small', saveRow, 'Save: the defaults in src/settings.ts.');
glowBox.checked = localStorage.getItem('flame-editor.glow') === '1';
holdBox.checked = localStorage.getItem('flame-editor.hold') === '1';

// The status bar.
const nudgeNote = el('span', status);
const saveNote = el('span', status);
const shotNote = el('small', status);

// The picture.
const playRow = el('div', view, undefined, 'row');
const playBtn = el('button', playRow, 'Play', 'main');
const pauseBtn = el('button', playRow, 'Pause');
const backBtn = el('button', playRow, '◀ frame');
const stepBtn = el('button', playRow, 'frame ▶');
const timeNote = el('small', playRow, '');
const gridLabel = el('label', playRow);
const gridBox = el('input', gridLabel);
gridBox.type = 'checkbox';
el('span', gridLabel, 'Thirds');
const loadNote = el('small', playRow, 'Loading the preview…');
const player = el('div', el('div', view, undefined, 'stage'), undefined, 'player');
const frameBox = el('div', player, undefined, 'frame');
const canvas = el('canvas', frameBox);
el('div', frameBox, undefined, 'thirds');
const bar = el('div', player, undefined, 'progress');
const head = el('div', bar, undefined, 'head');
gridBox.checked = localStorage.getItem('shot-editor.thirds') === '1'; // shared with the shot editor
frameBox.classList.toggle('grid', gridBox.checked);
gridBox.addEventListener('change', () => {
  frameBox.classList.toggle('grid', gridBox.checked);
  localStorage.setItem('shot-editor.thirds', gridBox.checked ? '1' : '0');
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) document.exitPointerLock();
});

const same = (a: Value, b: Value) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a === b);
const nudgedKeys = () => ALL_FLAME_KEYS.filter((k) => !same(values[k.key]!, saved[k.key]!));
let saveMessage = '';

function show(all: boolean): void {
  for (const { k, tr, input, now } of fields) {
    const v = values[k.key]!;
    if (all || document.activeElement !== input) {
      if (k.kind === 'on') input.checked = v as boolean;
      else input.value = k.kind === 'number' ? String(Math.round((v as number) * 1e4) / 1e4) : (v as string);
    }
    const nudged = !same(v, saved[k.key]!);
    tr.classList.toggle('nudged', nudged);
    if (!nudged) now.textContent = '';
    else if (k.kind === 'colour') now.innerHTML = `saved: ${saved[k.key]}<span class="swatch" style="background:${saved[k.key]}"></span>`;
    else now.textContent = `saved: ${saved[k.key] === true ? 'on' : saved[k.key] === false ? 'off' : saved[k.key]}`;
  }
  const n = nudgedKeys().length;
  nudgeNote.className = n ? 'warn' : 'ok';
  nudgeNote.textContent = n ? `${n} value${n > 1 ? 's' : ''} changed, not saved` : '✓ as saved';
  saveBtn.disabled = revertBtn.disabled = !n;
  saveNote.textContent = saveMessage;
  saveNote.className = saveMessage.startsWith('Saved') ? 'ok' : 'problems';
  shotNote.textContent = shotName ? `Shot “${shotName}”` : 'No saved shots';
}

function drawShots(): void {
  shotList.innerHTML = '';
  const names = Object.keys(shots);
  if (!names.length) el('small', shotList, 'None yet: save one in the shot editor.');
  for (const name of names) {
    const row = el('div', shotList, undefined, name === shotName ? 'on' : '');
    el('span', row, name);
    el('small', row, `${playedLength(shots[name]!.values).toFixed(1)} s`);
    row.addEventListener('click', () => pick(name));
  }
}

function track() {
  return flybyTrack(shots[shotName!]!.values, { id: 'flame-editor', sway, handheld });
}

function pick(name: string): void {
  shotName = name;
  localStorage.setItem(SHOT_KEY, name);
  drawShots();
  show(false);
  if (preview) {
    preview.setWindow(null);
    preview.play(track());
  }
}

saveBtn.addEventListener('click', async () => {
  const keys = nudgedKeys();
  const body = Object.fromEntries(keys.map((k) => [k.key, values[k.key]]));
  const r = await fetch('/__flames', { method: 'POST', body: JSON.stringify({ values: body }) });
  const data = await r.json();
  if (!r.ok) saveMessage = `Not saved: ${data.error}`;
  else {
    for (const k of keys) saved[k.key] = values[k.key]!;
    saveMessage = `Saved ${keys.length} value${keys.length > 1 ? 's' : ''} in src/settings.ts: reload the game to see them.`;
  }
  show(true);
});
revertBtn.addEventListener('click', () => {
  for (const k of ALL_FLAME_KEYS) values[k.key] = saved[k.key]!;
  saveMessage = '';
  show(true);
});
glowBox.addEventListener('change', () => {
  localStorage.setItem('flame-editor.glow', glowBox.checked ? '1' : '0');
  if (preview) preview.glowOn = glowBox.checked;
});
holdBox.addEventListener('change', () => {
  localStorage.setItem('flame-editor.hold', holdBox.checked ? '1' : '0');
  if (preview?.flames) preview.flames.held = holdBox.checked;
});

playBtn.addEventListener('click', () => preview?.resume());
pauseBtn.addEventListener('click', () => preview?.pause());
backBtn.addEventListener('click', () => preview?.seek(preview.time - FRAME));
stepBtn.addEventListener('click', () => preview?.seek(preview.time + FRAME));
// The bar: a click or a drag scrubs (held there; Play goes on).
let scrubbing = false;
const scrub = (e: PointerEvent) => {
  if (!preview || !shotName) return;
  const r = bar.getBoundingClientRect();
  preview.seek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * playedLength(shots[shotName]!.values));
};
bar.addEventListener('pointerdown', (e) => {
  scrubbing = true;
  bar.setPointerCapture(e.pointerId);
  scrub(e);
});
bar.addEventListener('pointermove', (e) => scrubbing && scrub(e));
bar.addEventListener('pointerup', () => (scrubbing = false));

function watch(): void {
  if (preview && shotName) {
    const length = playedLength(shots[shotName]!.values);
    timeNote.textContent = `${preview.time.toFixed(2)} / ${length.toFixed(1)} s`;
    head.style.left = `${Math.min(100, (preview.time / length) * 100)}%`;
  }
  requestAnimationFrame(watch);
}

async function main(): Promise<void> {
  sway = (await (await fetch('/cutscenes/sway.json')).json()).keys ?? [];
  handheld = (await (await fetch('/cutscenes/handheld.json')).json()).keys ?? [];
  shots = (await (await fetch('/__shots')).json()).shots ?? {};
  const names = Object.keys(shots);
  const last = localStorage.getItem(SHOT_KEY);
  shotName = last && shots[last] ? last : (names[0] ?? null);
  drawShots();
  show(true);
  requestAnimationFrame(watch);
  preview = await ShotPreview.create(canvas, 'ice-plain', (what) => (loadNote.textContent = `Loading the preview: ${what}…`)).catch((err: unknown) => {
    console.warn('[flame editor] preview not built:', err);
    loadNote.textContent = 'The preview failed to load (console).';
    return null;
  });
  if (!preview) return;
  (window as unknown as { __shotPreview: ShotPreview }).__shotPreview = preview; // dev hook, for the scratch checks
  loadNote.textContent = preview.flames ? '' : 'The flames failed to load (console).';
  preview.glowOn = glowBox.checked;
  if (preview.flames) preview.flames.held = holdBox.checked;
  if (shotName) preview.play(track());
}

if (!import.meta.env.DEV) side.textContent = 'The flame editor runs on the dev server only.';
else void main();
