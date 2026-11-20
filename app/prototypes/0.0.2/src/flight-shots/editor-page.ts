/**
 * shot-editor.html: the flight shots' editor (plan doc/plans/features/flight-shots.md, pass 2), flybys for now.
 * A seed's shot (`generateFlyby`: re-rolled if it fails the checks), shown as its values (nudged here), a plan
 * from above and the buckets; the next seeds as small plans; **played in a loop** on the right in the
 * preview (preview.ts: the ship, sky, sun, scenery and flames only, not the game; owner, 2026-11-20), for
 * the framing and the camera's movement; a value nudged while it plays changes it at once. Saved under a name in
 * `public/cutscenes/shots.json` (POST /__shots, vite.config.ts) with its seed **and every value**; a saved shot
 * loaded shows "this seed now" beside each value. Warnings: saved shots sharing most of its buckets (in script
 * order once the `# shot:` tag exists, pass 3; against every saved shot for now).
 * Dev only, as tools.html. The editor's controls are mouse-first, as the other tuning pages (plan).
 */

import type { ShipKey } from '../cutscene';
import { ShotPreview } from './preview';
import { checkFlyby, flybyBuckets, flybyTrack, generateFlyby, shared, NOSE_BEARING, type Buckets, type FlybyValues } from './flyby';

interface SavedShot {
  kind: 'flyby';
  seed: number;
  values: FlybyValues;
  saved: string;
}

/** The fields shown, in order: label, the value's path, step. */
const FIELDS: { label: string; get: (v: FlybyValues) => number; set: (v: FlybyValues, n: number) => void; step: number }[] = [
  { label: 'length (s)', get: (v) => v.duration, set: (v, n) => (v.duration = n), step: 0.1 },
  { label: 'bearing from (°)', get: (v) => v.bearing[0], set: (v, n) => (v.bearing[0] = n), step: 1 },
  { label: 'bearing to (°)', get: (v) => v.bearing[1], set: (v, n) => (v.bearing[1] = n), step: 1 },
  { label: 'distance from (m)', get: (v) => v.distance[0], set: (v, n) => (v.distance[0] = n), step: 1 },
  { label: 'distance to (m)', get: (v) => v.distance[1], set: (v, n) => (v.distance[1] = n), step: 1 },
  { label: 'height (m)', get: (v) => v.height, set: (v, n) => (v.height = n), step: 1 },
  { label: 'yaw off (°)', get: (v) => v.yaw, set: (v, n) => (v.yaw = n), step: 0.5 },
  { label: 'pitch off (°)', get: (v) => v.pitch, set: (v, n) => (v.pitch = n), step: 0.5 },
  { label: 'lens fov (°)', get: (v) => v.fov, set: (v, n) => (v.fov = n), step: 0.5 },
  { label: 'roll (°)', get: (v) => v.roll, set: (v, n) => (v.roll = n), step: 0.5 },
  { label: 'sway from (s)', get: (v) => v.swayStart, set: (v, n) => (v.swayStart = n), step: 0.1 },
];
const THUMBS = 8;
const DEG = Math.PI / 180;

const side = document.getElementById('side')!;
const view = document.getElementById('view')!;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, parent: HTMLElement, text?: string, cls?: string) => {
  const e = parent.appendChild(document.createElement(tag));
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};

let sway: ShipKey[] = [];
let saved: Record<string, SavedShot> = {};
let seed = 1;
/** The shot being edited (the seed's, or a saved one's, nudged or not). */
let values: FlybyValues;
/** What the seed gives now (the generator as it is today). */
let seedNow: FlybyValues;
let rerolls = 0;
/** The saved shot loaded, if any. */
let loadedName: string | null = null;
let nudged = new Set<string>();

/** The plan from above: the ship at the middle (its nose down the picture), the camera's path, its view at both ends. */
function plan(v: FlybyValues, size: number, marker?: number): string {
  const reach = Math.max(80, ...v.distance) * 1.15;
  const k = size / 2 / reach;
  // Blender x → right, y → up the picture (the nose, -Y, points down).
  const px = (x: number) => size / 2 + x * k;
  const py = (y: number) => size / 2 - y * k;
  const points: string[] = [];
  const at = (s: number) => {
    const e = v.pace === 'eased' ? (1 - Math.cos(Math.PI * s)) / 2 : s;
    const b = (v.bearing[0] + (v.bearing[1] - v.bearing[0]) * e) * DEG;
    const d = v.distance[0] + (v.distance[1] - v.distance[0]) * e;
    return [d * Math.cos(b), d * Math.sin(b), b / DEG + 180 + v.yaw] as const;
  };
  for (let i = 0; i <= 40; i++) {
    const [x, y] = at(i / 40);
    points.push(`${px(x).toFixed(1)},${py(y).toFixed(1)}`);
  }
  const look = (s: number, colour: string) => {
    const [x, y, h] = at(s);
    const half = (v.fov * 16) / 9 / 2;
    const len = Math.hypot(x, y) * 0.5;
    const tip = (a: number) => `${px(x + len * Math.cos((h + a) * DEG)).toFixed(1)},${py(y + len * Math.sin((h + a) * DEG)).toFixed(1)}`;
    return `<polygon points="${px(x).toFixed(1)},${py(y).toFixed(1)} ${tip(half)} ${tip(-half)}" fill="${colour}" opacity="0.18"/><circle cx="${px(x)}" cy="${py(y)}" r="${size > 120 ? 4 : 2.5}" fill="${colour}"/>`;
  };
  const nose = NOSE_BEARING * DEG;
  const shipLen = Math.max(6, 22 * k);
  const ship = `<line x1="${px(-Math.cos(nose) * shipLen / k / 2)}" y1="${py(-Math.sin(nose) * shipLen / k / 2)}" x2="${px((Math.cos(nose) * shipLen) / k / 2)}" y2="${py((Math.sin(nose) * shipLen) / k / 2)}" stroke="#d8dbe0" stroke-width="${size > 120 ? 4 : 3}" marker-end="url(#n${size})"/>`;
  const mark = marker !== undefined ? (() => { const [x, y] = at(marker); return `<circle cx="${px(x)}" cy="${py(y)}" r="5" fill="none" stroke="#fff" stroke-width="2"/>`; })() : '';
  return `<svg class="plan" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><marker id="n${size}" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 z" fill="#d8dbe0"/></marker></defs>${look(0, '#7fc27f')}${look(1, '#e0a040')}<polyline points="${points.join(' ')}" fill="none" stroke="#9aa0a8" stroke-width="1.5"/>${ship}${mark}</svg>`;
}

/** The preview, once built (null: loading, or it failed). */
let preview: ShotPreview | null = null;

/** Where the sun is, as a bearing in ship space (undefined until the preview has loaded). */
function sunBearing(): number | undefined {
  return preview?.sunBearing();
}

// The page's parts.
const seedRow = el('div', side, undefined, 'seed');
el('span', seedRow, 'Seed');
const prev = el('button', seedRow, '◀');
const seedInput = el('input', seedRow);
seedInput.type = 'number';
const next = el('button', seedRow, '▶');
const dice = el('button', seedRow, 'Random');
const seedNote = el('small', side);
el('h2', side, 'Values');
const table = el('table', side);
const paceRow = el('div', side, undefined, 'row');
el('span', paceRow, 'pace');
const pace = el('select', paceRow);
for (const p of ['even', 'eased']) el('option', pace, p).value = p;
const resetBtn = el('button', paceRow, 'Back to the seed’s');
el('h2', side, 'Checks');
const checks = el('div', side);
el('h2', side, 'Buckets');
const bucketsEl = el('div', side, undefined, 'buckets');
const warnings = el('div', side);
el('h2', side, 'Save');
const saveRow = el('div', side, undefined, 'row');
const nameInput = el('input', saveRow);
nameInput.placeholder = 'flyby-arrival';
const saveBtn = el('button', saveRow, 'Save', 'main');
const saveNote = el('small', side);
el('h2', side, 'Saved shots');
const savedList = el('div', side, undefined, 'saved');

const playRow = el('div', view, undefined, 'row');
const playBtn = el('button', playRow, 'Play', 'main');
const stopBtn = el('button', playRow, 'Pause');
const restartBtn = el('button', playRow, 'From the start');
const timeNote = el('small', playRow, '');
const gameNote = el('small', playRow, 'Loading the preview…');
const frameBox = el('div', view, undefined, 'frame');
const canvas = el('canvas', frameBox);
// The shot's progress, under it.
const bar = el('div', view, undefined, 'progress');
const barFill = el('div', bar);
// The mouse is never captured here (owner, 2026-11-20): released at once if anything asks for it.
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) document.exitPointerLock();
});
const planRow = el('div', view, undefined, 'below');
const planBox = el('div', planRow);
const nextSeeds = el('div', planRow);
el('small', nextSeeds, 'From above: the ship (its nose down), the camera’s path from green to orange, its view at each end. The seeds round this one:');
const strip = el('div', nextSeeds, undefined, 'strip');

const inputs = FIELDS.map((f) => {
  const tr = el('tr', table);
  el('td', tr, f.label);
  const input = el('input', el('td', tr));
  input.type = 'number';
  input.step = String(f.step);
  const now = el('td', tr, '', 'now');
  input.addEventListener('input', () => {
    const n = Number(input.value);
    if (!Number.isFinite(n)) return;
    f.set(values, n);
    nudged.add(f.label);
    show(false);
  });
  return { tr, input, now };
});
pace.addEventListener('change', () => {
  values.pace = pace.value as FlybyValues['pace'];
  nudged.add('pace');
  show(false);
});

function pickSeed(n: number): void {
  seed = Math.max(1, Math.floor(n));
  const g = generateFlyby(seed, undefined, { swayLength: sway[sway.length - 1]?.t });
  seedNow = g.values;
  rerolls = g.rerolls;
  values = structuredClone(seedNow);
  loadedName = null;
  nudged = new Set();
  show(true);
}

function load(name: string): void {
  const shot = saved[name]!;
  seed = shot.seed;
  seedNow = generateFlyby(seed, undefined, { swayLength: sway[sway.length - 1]?.t }).values;
  values = structuredClone(shot.values);
  loadedName = name;
  nameInput.value = name;
  nudged = new Set();
  show(true);
}

let currentBuckets: Buckets;

function show(all: boolean): void {
  seedInput.value = String(seed);
  seedNote.textContent = (loadedName ? `Saved shot “${loadedName}”. ` : '') + (rerolls ? `This seed failed the checks; re-rolled ${rerolls}× from it.` : '');
  FIELDS.forEach((f, i) => {
    const { tr, input, now } = inputs[i]!;
    if (all || document.activeElement !== input) input.value = String(f.get(values));
    tr.classList.toggle('nudged', nudged.has(f.label));
    const a = f.get(values), b = f.get(seedNow);
    now.textContent = loadedName ? (Math.abs(a - b) > 1e-6 ? `this seed now: ${b}` : '') : nudged.has(f.label) ? `seed: ${b}` : '';
  });
  pace.value = values.pace;
  const problems = checkFlyby(values);
  checks.innerHTML = problems.length ? problems.map((p) => `<div class="problems">✗ ${p}</div>`).join('') : '<div class="ok">✓ camera clear of the ground and the ship, the ship in frame, in sight</div>';
  checks.insertAdjacentHTML('beforeend', '<small>The ground is taken as flat (14 m under the belly) for now: hills not counted.</small>');
  currentBuckets = flybyBuckets(values, sunBearing());
  bucketsEl.innerHTML = Object.entries(currentBuckets).map(([k, v]) => `<span>${k}: ${v}</span>`).join('');
  if (currentBuckets.sun === undefined) bucketsEl.insertAdjacentHTML('beforeend', '<small>(the sun once the game has loaded)</small>');
  const close = Object.entries(saved)
    .filter(([name]) => name !== loadedName)
    .map(([name, s]) => [name, shared(currentBuckets, flybyBuckets(s.values, sunBearing()))] as const)
    .filter(([, same]) => same.length >= 5);
  warnings.innerHTML = close.map(([name, same]) => `<div class="warn">⚠ close to “${name}”: the same ${same.join(', ')}</div>`).join('');
  planBox.innerHTML = plan(values, 260);
  // The preview follows: a new seed or shot from its start, a nudge where it is.
  preview?.show(track(), all);
  if (all) drawStrip();
  drawSaved();
}

function drawStrip(): void {
  strip.innerHTML = '';
  const first = Math.max(1, seed - 2);
  for (let s = first; s < first + THUMBS; s++) {
    const v = s === seed ? seedNow : generateFlyby(s, undefined, { swayLength: sway[sway.length - 1]?.t }).values;
    const box = el('div', strip, undefined, 'thumb' + (s === seed && !loadedName ? ' on' : ''));
    box.innerHTML = plan(v, 96);
    el('small', box, `${s} · ${v.duration.toFixed(1)} s`);
    box.addEventListener('click', () => pickSeed(s));
  }
}

function drawSaved(): void {
  savedList.innerHTML = '';
  const names = Object.keys(saved);
  if (!names.length) el('small', savedList, 'None yet.');
  for (const name of names) {
    const row = el('div', savedList, undefined, name === loadedName ? 'on' : '');
    el('span', row, name);
    el('small', row, `seed ${saved[name]!.seed}`);
    row.addEventListener('click', () => load(name));
  }
}

prev.addEventListener('click', () => pickSeed(seed - 1));
next.addEventListener('click', () => pickSeed(seed + 1));
dice.addEventListener('click', () => pickSeed(1 + Math.floor(Math.random() * 99999)));
seedInput.addEventListener('change', () => pickSeed(Number(seedInput.value) || 1));
resetBtn.addEventListener('click', () => (loadedName ? load(loadedName) : pickSeed(seed)));

saveBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return void (saveNote.textContent = 'A name in lower case, digits and dashes (it goes in the script: # shot: <name>).');
  if (saved[name] && name !== loadedName && !confirm(`Replace the saved shot “${name}”?`)) return;
  const shot: SavedShot = { kind: 'flyby', seed, values: structuredClone(values), saved: new Date().toISOString().slice(0, 10) };
  const r = await fetch('/__shots', { method: 'POST', body: JSON.stringify({ name, shot }) });
  const data = await r.json();
  if (!r.ok) return void (saveNote.textContent = `Not saved: ${data.error}`);
  saved = data.shots;
  loadedName = name;
  nudged = new Set();
  saveNote.textContent = `Saved as “${name}” in public/cutscenes/shots.json.`;
  show(true);
});

function track() {
  return flybyTrack(values, { id: 'shot-editor', sway });
}

playBtn.addEventListener('click', () => preview?.play(track()));
stopBtn.addEventListener('click', () => preview?.pause());
restartBtn.addEventListener('click', () => preview?.show(track(), true));

// Where the camera is, on the plan, and the time.
function watchPlay(): void {
  if (preview) {
    planBox.innerHTML = plan(values, 260, Math.min(1, preview.time / values.duration));
    timeNote.textContent = `${preview.time.toFixed(1)} / ${values.duration.toFixed(1)} s`;
    barFill.style.width = `${Math.min(100, (preview.time / values.duration) * 100)}%`;
  }
  requestAnimationFrame(watchPlay);
}

async function main(): Promise<void> {
  const c1 = await (await fetch('/cutscenes/cutscene-1.json')).json();
  sway = c1.ship ?? [];
  saved = (await (await fetch('/__shots')).json()).shots ?? {};
  pickSeed(1);
  requestAnimationFrame(watchPlay);
  preview = await ShotPreview.create(canvas, 'ice-plain', (what) => (gameNote.textContent = `Loading the preview: ${what}…`)).catch((err: unknown) => {
    console.warn('[shot editor] preview not built:', err);
    gameNote.textContent = 'The preview failed to load (console).';
    return null;
  });
  if (!preview) return;
  gameNote.textContent = '';
  preview.play(track());
  show(false); // the sun's bucket, now known
}

if (!import.meta.env.DEV) side.textContent = 'The shot editor runs on the dev server only.';
else void main();
