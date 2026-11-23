/**
 * shot-editor.html: the flight shots' editor (plan doc/plans/features/flight-shots.md, pass 2), flybys for now.
 * A seed's shot (`generateFlyby`: re-rolled if it fails the checks), shown as its values (nudged here), a plan
 * from above and the buckets; the next seeds as small plans; **played in a loop** on the right in the
 * preview (preview.ts: the ship, sky, sun, scenery and flames only, not the game; owner, 2026-11-20), for
 * the framing and the camera's movement; a value nudged while it plays changes it at once. Saved under a name in
 * `public/cutscenes/shots.json` (POST /__shots, vite.config.ts) with its seed **and every value**; a saved shot
 * loaded shows "this seed now" beside each value. Warnings: saved shots sharing most of its buckets (in script
 * order once the `# shot:` tag exists, pass 3; against every saved shot for now).
 * **Trim** (owner, 2026-11-20): a start and an end within the generated movement (`values.trim`); the bar under the
 * preview shows the whole movement, the cut parts shaded, its two handles dragged (or I / O at the playhead);
 * the preview loops the kept part; the checks and buckets read it; the game plays it only.
 * **Types** (landing-takeoff-shots.md): a dropdown under the title, *Flyby*, *Landing* (*Take-off* to come): each its own
 * generator, values, plan from above, checks, buckets and saved shots (`kind`); remembered in the browser. A landing's
 * motion is fixed (landing.ts), its camera and the **engines' power** are the values: the power's curve drawn under
 * the trim bar, its points dragged. The preview stands a landing on the landed plain.
 * Dev only, as tools.html. The editor's controls are mouse-first, as the other tuning pages (plan).
 */

import type { ShipKey, Track } from '../cutscene';
import { ShotPreview } from './preview';
import { checkFlyby, flybyBuckets, flybyCamera, flybyTrack, generateFlyby, inPicture, pairOf, paced, playedLength, screenBox, shared, sizeClass, trimOf, NOSE_BEARING, SHIP_CENTRE, type FlybyValues, type HandheldKey, type Pace, type Trimmed } from './flyby';
import { checkLanding, landingBuckets, landingTrack, landingValues, tripodKey, GEAR, TOUCHDOWN, type LandingValues, type TripodCamera } from './landing';
import type { SavedShot } from './shots';

/** The shot types (landing-takeoff-shots.md); take-off is pass 3. */
type Kind = 'flyby' | 'landing';
type ShotValues = FlybyValues | LandingValues;
type Field<V> = { label: string; get: (v: V) => number; set: (v: V, n: number) => void; step: number };

/** The trim's fields, every type's. */
const TRIM_FIELDS: Field<Trimmed>[] = [
  { label: 'trim start (s)', get: (v) => trimOf(v)[0], set: (v, n) => setTrim(v, n, trimOf(v)[1], 'start'), step: 0.1 },
  { label: 'trim end (s)', get: (v) => trimOf(v)[1], set: (v, n) => setTrim(v, trimOf(v)[0], n, 'end'), step: 0.1 },
];

/** A landing's fields: its (first) camera's; the power is drawn under the trim bar. */
const cam = (v: LandingValues): TripodCamera => v.cameras[0]!;
const LANDING_FIELDS: Field<LandingValues>[] = [
  { label: 'distance (m)', get: (v) => cam(v).distance, set: (v, n) => (cam(v).distance = Math.max(1, n)), step: 0.5 },
  { label: 'round (°)', get: (v) => cam(v).round, set: (v, n) => (cam(v).round = n), step: 1 },
  { label: 'height (m)', get: (v) => cam(v).height, set: (v, n) => (cam(v).height = n), step: 0.05 },
  { label: 'follows ship', get: (v) => cam(v).follow, set: (v, n) => (cam(v).follow = n), step: 0.05 },
  { label: 'lens fov (°)', get: (v) => cam(v).fov, set: (v, n) => (cam(v).fov = n), step: 0.5 },
  { label: 'lag (s)', get: (v) => cam(v).lag, set: (v, n) => (cam(v).lag = Math.max(0, n)), step: 0.05 },
  { label: 'aim left (°)', get: (v) => cam(v).aimLeft, set: (v, n) => (cam(v).aimLeft = n), step: 0.2 },
  { label: 'aim under (°)', get: (v) => cam(v).aimUnder, set: (v, n) => (cam(v).aimUnder = n), step: 0.2 },
  { label: 'handheld', get: (v) => cam(v).handheld, set: (v, n) => (cam(v).handheld = Math.max(0, n)), step: 0.1 },
  ...(TRIM_FIELDS as Field<LandingValues>[]),
];

/** The fields shown, in order: label, the value's path, step. */
const FIELDS: Field<FlybyValues>[] = [
  { label: 'length (s)', get: (v) => v.duration, set: (v, n) => (v.duration = n), step: 0.1 },
  { label: 'bearing from (°)', get: (v) => v.bearing[0], set: (v, n) => (v.bearing[0] = n), step: 1 },
  { label: 'bearing to (°)', get: (v) => v.bearing[1], set: (v, n) => (v.bearing[1] = n), step: 1 },
  { label: 'distance from (m)', get: (v) => v.distance[0], set: (v, n) => (v.distance[0] = n), step: 1 },
  { label: 'distance to (m)', get: (v) => v.distance[1], set: (v, n) => (v.distance[1] = n), step: 1 },
  { label: 'height from (m)', get: (v) => pairOf(v.height)[0], set: (v, n) => (v.height = [n, pairOf(v.height)[1]]), step: 1 },
  { label: 'height to (m)', get: (v) => pairOf(v.height)[1], set: (v, n) => (v.height = [pairOf(v.height)[0], n]), step: 1 },
  { label: 'yaw off from (°)', get: (v) => yawPair(v)[0], set: (v, n) => (v.yaw = [n, yawPair(v)[1]]), step: 0.5 },
  { label: 'yaw off to (°)', get: (v) => yawPair(v)[1], set: (v, n) => (v.yaw = [yawPair(v)[0], n]), step: 0.5 },
  { label: 'pitch off from (°)', get: (v) => pairOf(v.pitch)[0], set: (v, n) => (v.pitch = [n, pairOf(v.pitch)[1]]), step: 0.5 },
  { label: 'pitch off to (°)', get: (v) => pairOf(v.pitch)[1], set: (v, n) => (v.pitch = [pairOf(v.pitch)[0], n]), step: 0.5 },
  { label: 'lens fov from (°)', get: (v) => pairOf(v.fov)[0], set: (v, n) => (v.fov = [n, pairOf(v.fov)[1]]), step: 0.5 },
  { label: 'lens fov to (°)', get: (v) => pairOf(v.fov)[1], set: (v, n) => (v.fov = [pairOf(v.fov)[0], n]), step: 0.5 },
  { label: 'roll (°)', get: (v) => v.roll, set: (v, n) => (v.roll = n), step: 0.5 },
  { label: 'sway from (s)', get: (v) => v.swayStart, set: (v, n) => (v.swayStart = n), step: 0.1 },
  // The handheld wobble (pass 2d): 0100's camera shake, from the sway's moment, scaled (1: as 0100's; 0: none).
  { label: 'handheld', get: (v) => v.handheld ?? 0, set: (v, n) => (n ? (v.handheld = n) : delete v.handheld), step: 0.1 },
  // The pace as a cubic-bezier curve (pass 2d): even and eased shown as their curves; a nudge makes it a curve.
  ...[0, 1, 2, 3].map((i) => ({
    label: `pace curve ${['x1', 'y1', 'x2', 'y2'][i]}`,
    get: (v: FlybyValues) => curveOf(v.pace)[i]!,
    set: (v: FlybyValues, n: number) => {
      const c = [...curveOf(v.pace)] as [number, number, number, number];
      c[i] = i % 2 === 0 ? Math.min(1, Math.max(0, n)) : n; // x within 0..1, so time only runs forward
      v.pace = c;
    },
    step: 0.02,
  })),
  ...(TRIM_FIELDS as Field<FlybyValues>[]),
];
/** The shortest trimmed shot (s). */
const MIN_TRIM = 0.5;
/** Sets the trim, kept within the movement and at least `MIN_TRIM` long (the other end pushed if needed);
 *  the whole movement: no trim stored. */
function setTrim(v: Trimmed, a: number, b: number, moving: 'start' | 'end'): void {
  const d = v.duration;
  const m = Math.min(MIN_TRIM, d);
  a = Math.min(Math.max(0, a), d);
  b = Math.min(Math.max(0, b), d);
  if (moving === 'end') {
    b = Math.max(b, m);
    a = Math.min(a, b - m);
  } else {
    a = Math.min(a, d - m);
    b = Math.max(b, a + m);
  }
  a = Math.round(a * 100) / 100;
  b = Math.round(b * 100) / 100;
  if (a <= 0.005 && b >= d - 0.005) delete v.trim;
  else v.trim = [a, b];
}
const THUMBS = 8;
/** A pace as a cubic-bezier curve: even exactly, eased (a half cosine) nearly. */
const curveOf = (p: Pace): [number, number, number, number] => (p === 'even' ? [1 / 3, 1 / 3, 2 / 3, 2 / 3] : p === 'eased' ? [0.36, 0, 0.64, 1] : p);
/** The view's turn at the start and the end (a single number: the same at both). */
const yawPair = (v: FlybyValues): [number, number] => (typeof v.yaw === 'number' ? [v.yaw, v.yaw] : v.yaw);
const DEG = Math.PI / 180;

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
/** 0100's camera shake (`handheld.json`), for the values' `handheld`. */
let handheld: HandheldKey[] = [];
let saved: Record<string, SavedShot> = {};
let seed = 1;
/** The type being edited (remembered). */
let kind: Kind = localStorage.getItem('shot-editor.type') === 'landing' ? 'landing' : 'flyby';
/** The shot being edited (the seed's, or a saved one's, nudged or not). */
let values: ShotValues;
/** What the seed gives now (the generator as it is today). */
let seedNow: ShotValues;
const isLanding = (v: ShotValues): v is LandingValues => v.kind === 'landing';
/** The saved shots of the type being edited (a shot saved before types: a flyby). */
const savedOfKind = (): [string, SavedShot][] => Object.entries(saved).filter(([, s]) => (s.kind ?? 'flyby') === kind);
/** A seed's values for the type being edited. */
function generate(n: number): { values: ShotValues; rerolls: number } {
  if (kind === 'landing') return { values: landingValues(n), rerolls: 0 };
  const g = generateFlyby(n, undefined, { swayLength: sway[sway.length - 1]?.t });
  return { values: g.values, rerolls: g.rerolls };
}
/** The fields of the values' type. */
const fieldsOf = (v: ShotValues): Field<ShotValues>[] => (isLanding(v) ? LANDING_FIELDS : FIELDS) as Field<ShotValues>[];
let rerolls = 0;
/** The saved shot loaded, if any. */
let loadedName: string | null = null;
let nudged = new Set<string>();

/** The plan from above: the ship at the middle (its nose down the picture), the camera's path, its view at both ends. */
function plan(v: ShotValues, size: number, marker?: number): string {
  return isLanding(v) ? landingPlan(v, size, marker) : flybyPlan(v, size, marker);
}

/** A landing's plan from above: the ship at the middle (its nose down the picture; where it came in from, 4 m
 *  behind, dashed), each camera where it stands, its view at the kept part's ends; `marker` (0..1) its aim now. */
function landingPlan(v: LandingValues, size: number, marker?: number): string {
  const reach = Math.max(24, ...v.cameras.map((c) => c.distance)) * 1.25;
  const k = size / 2 / reach;
  const px = (x: number) => size / 2 + x * k;
  const py = (y: number) => size / 2 - y * k;
  const [t0, t1] = trimOf(v);
  const cameraAt = (t: number) => [...v.cameras].reverse().find((c) => c.start <= t + 1e-9) ?? v.cameras[0]!;
  const look = (t: number, colour: string, line = false) => {
    const c = cameraAt(t);
    const key = tripodKey(c, t);
    const [x, y] = key.at;
    const half = (key.fov * 16) / 9 / 2;
    const len = c.distance * 1.1;
    const tip = (a: number): [number, number] => [px(x + len * Math.cos((key.heading + a) * DEG)), py(y + len * Math.sin((key.heading + a) * DEG))];
    if (line) return `<line x1="${px(x)}" y1="${py(y)}" x2="${tip(0)[0].toFixed(1)}" y2="${tip(0)[1].toFixed(1)}" stroke="${colour}" stroke-width="1.5"/>`;
    const pt = (p: [number, number]) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    return `<polygon points="${px(x).toFixed(1)},${py(y).toFixed(1)} ${pt(tip(half))} ${pt(tip(-half))}" fill="${colour}" opacity="0.18"/><circle cx="${px(x)}" cy="${py(y)}" r="${size > 120 ? 4 : 2.5}" fill="${colour}"/>`;
  };
  const box = (x0: number, y0: number, x1: number, y1: number, extra: string) => `<rect x="${px(x0)}" y="${py(y1)}" width="${(x1 - x0) * k}" height="${(y1 - y0) * k}" ${extra}/>`;
  const nose = py(-5.15);
  const ship = box(-5.68, -1.15, 5.68, 14.48, 'fill="none" stroke="#9aa0a8" stroke-dasharray="2 3" opacity="0.6"') + box(-5.68, -5.15, 5.68, 10.48, 'fill="none" stroke="#d8dbe0" stroke-width="1.5"') + `<polygon points="${px(0)},${nose + 6} ${px(-2)},${nose - 1} ${px(2)},${nose - 1}" fill="#d8dbe0"/>`;
  const mark = marker !== undefined ? look(marker * v.duration, '#fff', true) : '';
  return `<svg class="plan" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${ship}${look(t0, '#7fc27f')}${look(t1, '#e0a040')}${mark}</svg>`;
}

function flybyPlan(v: FlybyValues, size: number, marker?: number): string {
  const reach = Math.max(80, ...v.distance) * 1.15;
  const k = size / 2 / reach;
  // Blender x → right, y → up the picture (the nose, -Y, points down).
  const px = (x: number) => size / 2 + x * k;
  const py = (y: number) => size / 2 - y * k;
  const points: string[] = [];
  const at = (s: number) => {
    const e = paced(v.pace, s);
    const b = (v.bearing[0] + (v.bearing[1] - v.bearing[0]) * e) * DEG;
    const d = v.distance[0] + (v.distance[1] - v.distance[0]) * e;
    const [y0, y1] = yawPair(v);
    return [d * Math.cos(b), d * Math.sin(b), b / DEG + 180 + y0 + (y1 - y0) * e] as const;
  };
  for (let i = 0; i <= 40; i++) {
    const [x, y] = at(i / 40);
    points.push(`${px(x).toFixed(1)},${py(y).toFixed(1)}`);
  }
  // Trimmed: the kept part drawn over the whole, the views at its ends.
  const [t0, t1] = trimOf(v).map((t) => (v.duration > 0 ? t / v.duration : 0)) as [number, number];
  const kept: string[] = [];
  if (v.trim) {
    for (let i = 0; i <= 40; i++) {
      const [x, y] = at(t0 + ((t1 - t0) * i) / 40);
      kept.push(`${px(x).toFixed(1)},${py(y).toFixed(1)}`);
    }
  }
  const look = (s: number, colour: string) => {
    const [x, y, h] = at(s);
    const half = (flybyCamera(v, s).fov * 16) / 9 / 2;
    const len = Math.hypot(x, y) * 0.5;
    const tip = (a: number) => `${px(x + len * Math.cos((h + a) * DEG)).toFixed(1)},${py(y + len * Math.sin((h + a) * DEG)).toFixed(1)}`;
    return `<polygon points="${px(x).toFixed(1)},${py(y).toFixed(1)} ${tip(half)} ${tip(-half)}" fill="${colour}" opacity="0.18"/><circle cx="${px(x)}" cy="${py(y)}" r="${size > 120 ? 4 : 2.5}" fill="${colour}"/>`;
  };
  const nose = NOSE_BEARING * DEG;
  const shipLen = Math.max(6, 22 * k);
  const ship = `<line x1="${px(-Math.cos(nose) * shipLen / k / 2)}" y1="${py(-Math.sin(nose) * shipLen / k / 2)}" x2="${px((Math.cos(nose) * shipLen) / k / 2)}" y2="${py((Math.sin(nose) * shipLen) / k / 2)}" stroke="#d8dbe0" stroke-width="${size > 120 ? 4 : 3}" marker-end="url(#n${size})"/>`;
  const mark = marker !== undefined ? (() => { const [x, y] = at(marker); return `<circle cx="${px(x)}" cy="${py(y)}" r="5" fill="none" stroke="#fff" stroke-width="2"/>`; })() : '';
  return `<svg class="plan" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><marker id="n${size}" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4 z" fill="#d8dbe0"/></marker></defs>${look(t0, '#7fc27f')}${look(t1, '#e0a040')}<polyline points="${points.join(' ')}" fill="none" stroke="#9aa0a8" stroke-width="1.5"${v.trim ? ' stroke-dasharray="2 3" opacity="0.6"' : ''}/>${kept.length ? `<polyline points="${kept.join(' ')}" fill="none" stroke="#d8dbe0" stroke-width="2"/>` : ''}${ship}${mark}</svg>`;
}

/** The preview, once built (null: loading, or it failed). */
let preview: ShotPreview | null = null;

/** Where the sun is, as a bearing in ship space (undefined until the preview has loaded). */
function sunBearing(): number | undefined {
  return preview?.sunBearing();
}

// The page's parts. The type first (landing-takeoff-shots.md), under the title.
const typeRow = el('div', side, undefined, 'row');
el('span', typeRow, 'Type');
const typeSelect = el('select', typeRow);
for (const [k, label] of [['flyby', 'Flyby'], ['landing', 'Landing'], ['takeoff', 'Take-off (to come)']] as const) {
  const o = el('option', typeSelect, label);
  o.value = k;
  if (k === 'takeoff') o.disabled = true;
}
typeSelect.value = kind;
const seedRow = el('div', side, undefined, 'seed');
el('span', seedRow, 'Seed');
const prev = el('button', seedRow, '◀');
const seedInput = el('input', seedRow);
seedInput.type = 'number';
const next = el('button', seedRow, '▶');
const dice = el('button', seedRow, 'Random');
/** A sidebar section, folded or open (remembered). */
function section(title: string): HTMLElement {
  const d = el('details', side);
  const key = `shot-editor.open.${title}`;
  d.open = localStorage.getItem(key) !== '0';
  el('summary', d, title);
  d.addEventListener('toggle', () => localStorage.setItem(key, d.open ? '1' : '0'));
  return el('div', d);
}
const valuesSec = section('Values');
const table = el('div', valuesSec, undefined, 'values');
const paceRow = el('div', valuesSec, undefined, 'row');
el('span', paceRow, 'pace');
const pace = el('select', paceRow);
for (const p of ['even', 'eased', 'curve']) el('option', pace, p).value = p;
const resetBtn = el('button', paceRow, 'Back to the seed’s');
const bucketsEl = el('div', section('Buckets'), undefined, 'buckets');
const saveSec = section('Save');
const saveRow = el('div', saveSec, undefined, 'row');
const nameInput = el('input', saveRow);
nameInput.placeholder = 'flyby-1';
const saveBtn = el('button', saveRow, 'Save', 'main');
const savedList = el('div', section('Saved shots'), undefined, 'saved');
// The status bar (owner, 2026-11-20): the checks, then the warnings (re-rolls, close shots, saving), the shot loaded.
const checks = el('span', status);
const warnings = el('span', status);
const saveNote = el('span', status);
const seedNote = el('small', status);
/** The save's message, cleared by the next edit. */
let saveMessage = '';

const playRow = el('div', view, undefined, 'row');
const playBtn = el('button', playRow, 'Play', 'main');
const stopBtn = el('button', playRow, 'Pause');
const restartBtn = el('button', playRow, 'From the start');
const timeNote = el('small', playRow, '');
// The rule-of-thirds grid over the picture (owner, 2026-11-20: subtle), on or off, remembered.
const gridLabel = el('label', playRow);
const gridBox = el('input', gridLabel);
gridBox.type = 'checkbox';
el('span', gridLabel, 'Thirds');
// The framing guides (pass 2b): the ship's box on screen, its travel, the lead room ahead of it, its size.
const guideLabel = el('label', playRow);
const guideBox = el('input', guideLabel);
guideBox.type = 'checkbox';
el('span', guideLabel, 'Guides');
const gameNote = el('small', playRow, 'Loading the preview…');
const player = el('div', el('div', view, undefined, 'stage'), undefined, 'player');
const frameBox = el('div', player, undefined, 'frame');
const canvas = el('canvas', frameBox);
el('div', frameBox, undefined, 'thirds');
const guides = frameBox.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
guides.classList.add('guides');
gridBox.checked = localStorage.getItem('shot-editor.thirds') === '1';
frameBox.classList.toggle('grid', gridBox.checked);
guideBox.checked = localStorage.getItem('shot-editor.guides') === '1';
frameBox.classList.toggle('guided', guideBox.checked);
guideBox.addEventListener('change', () => {
  frameBox.classList.toggle('guided', guideBox.checked);
  localStorage.setItem('shot-editor.guides', guideBox.checked ? '1' : '0');
});
gridBox.addEventListener('change', () => {
  frameBox.classList.toggle('grid', gridBox.checked);
  localStorage.setItem('shot-editor.thirds', gridBox.checked ? '1' : '0');
});
// The shot's progress, under it: the whole movement, the trimmed-off parts shaded, the trim's two handles.
const bar = el('div', player, undefined, 'progress');
const cutBefore = el('div', bar, undefined, 'cut');
const cutAfter = el('div', bar, undefined, 'cut');
const barFill = el('div', bar, undefined, 'head');
const handleIn = el('div', bar, undefined, 'handle');
const handleOut = el('div', bar, undefined, 'handle');
handleIn.title = 'Trim: the start (drag; I at the playhead)';
handleOut.title = 'Trim: the end (drag; O at the playhead)';
// The engines' power (landing-takeoff-shots.md): its curve over the whole movement, its points dragged (a landing's).
const powerBox = el('div', player, undefined, 'power');
const powerSvg = powerBox.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
powerSvg.style.cssText = 'display:block;width:100%;height:56px;background:#14171c;border-radius:3px;margin-top:4px;touch-action:none;cursor:default';
const trimRow = el('div', view, undefined, 'row');
const inBtn = el('button', trimRow, 'Start here (I)');
const outBtn = el('button', trimRow, 'End here (O)');
const wholeBtn = el('button', trimRow, 'Untrim');
const trimNote = el('small', trimRow, '');
// The mouse is never captured here (owner, 2026-11-20): released at once if anything asks for it.
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) document.exitPointerLock();
});
const planRow = el('div', view, undefined, 'below');
const planBox = el('div', planRow);
const nextSeeds = el('div', planRow);
const strip = el('div', nextSeeds, undefined, 'strip');

let inputs: { tr: HTMLLabelElement; input: HTMLInputElement; now: HTMLDivElement }[] = [];
/** The value fields of the type being edited (a new type: rebuilt). */
function buildInputs(): void {
  table.innerHTML = '';
  inputs = fieldsOf(values).map((f) => field(f));
  paceRow.style.display = isLanding(values) ? 'none' : '';
}
function field(f: Field<ShotValues>) {
  const tr = el('label', table, undefined, 'field');
  el('span', tr, f.label);
  const input = el('input', tr);
  input.type = 'number';
  input.step = String(f.step);
  const now = el('div', tr, '', 'now');
  input.addEventListener('input', () => {
    const n = Number(input.value);
    if (!Number.isFinite(n)) return;
    f.set(values, n);
    nudged.add(f.label);
    show(false);
  });
  return { tr, input, now };
}
pace.addEventListener('change', () => {
  if (isLanding(values)) return;
  values.pace = pace.value === 'curve' ? curveOf(values.pace) : (pace.value as 'even' | 'eased');
  nudged.add('pace');
  show(false);
});

typeSelect.addEventListener('change', () => {
  kind = typeSelect.value === 'landing' ? 'landing' : 'flyby';
  localStorage.setItem('shot-editor.type', kind);
  void preview?.setGround(kind === 'landing' ? 'landed' : 'flight');
  pickSeed(1);
});

function pickSeed(n: number): void {
  seed = Math.max(1, Math.floor(n));
  const g = generate(seed);
  seedNow = g.values;
  rerolls = g.rerolls;
  values = structuredClone(seedNow);
  loadedName = null;
  nudged = new Set();
  nameInput.value = autoName();
  show(true);
}

/** A new shot's name, from its seed (owner, 2026-11-20): `flyby-<seed>`, or `flyby-<seed>-2`, -3… if taken
 *  (another cut of the same seed). Editable before saving. */
function autoName(): string {
  const base = `${kind}-${seed}`;
  let name = base;
  for (let n = 2; saved[name]; n++) name = `${base}-${n}`;
  return name;
}

function load(name: string): void {
  const shot = saved[name]!;
  seed = shot.seed;
  values = structuredClone(shot.values);
  // Seed 0: a shot made from another camera, not drawn (0100, `tools/shot-from-track.mjs`): nothing to compare.
  seedNow = seed === 0 ? structuredClone(values) : generate(seed).values;
  loadedName = name;
  nameInput.value = name;
  nudged = new Set();
  show(true);
}

let currentBuckets: Record<string, string | undefined>;

let builtFor: Kind | null = null;

function show(all: boolean): void {
  if (builtFor !== values.kind) {
    builtFor = values.kind;
    buildInputs();
  }
  seedInput.value = String(seed);
  seedNote.textContent = loadedName ? `Saved shot “${loadedName}”` : `Seed ${seed}`;
  fieldsOf(values).forEach((f, i) => {
    const { tr, input, now } = inputs[i]!;
    if (all || document.activeElement !== input) input.value = String(Math.round(f.get(values) * 1000) / 1000);
    tr.classList.toggle('nudged', nudged.has(f.label));
    const a = f.get(values), b = f.get(seedNow);
    now.textContent = loadedName ? (Math.abs(a - b) > 1e-6 ? `this seed now: ${b}` : '') : nudged.has(f.label) ? `seed: ${b}` : '';
  });
  if (!isLanding(values)) pace.value = typeof values.pace === 'string' ? values.pace : 'curve';
  const [ta, tb] = trimOf(values);
  const pc = (t: number) => `${(t / values.duration) * 100}%`;
  trimNote.textContent = values.trim
    ? `Plays ${ta.toFixed(2)}–${tb.toFixed(2)} s of the ${values.duration.toFixed(2)} s movement: ${(tb - ta).toFixed(2)} s.`
    : `Untrimmed: the whole ${values.duration.toFixed(2)} s.`;
  cutBefore.style.left = '0';
  cutBefore.style.width = pc(ta);
  cutAfter.style.left = pc(tb);
  cutAfter.style.right = '0';
  handleIn.style.left = pc(ta);
  handleOut.style.left = pc(tb);
  wholeBtn.disabled = !values.trim;
  const problems = isLanding(values) ? checkLanding(values) : checkFlyby(values);
  checks.className = problems.length ? 'problems' : 'ok';
  checks.textContent = problems.length ? problems.map((p) => `✗ ${p}`).join('   ') : '✓ checks passed';
  checks.title = isLanding(values)
    ? (problems.length ? problems.join('\n') : 'Camera above the ground, 6 m clear of the ship, the ship\'s middle in frame.') + '\nPass 1’s checks only; the ground taken as flat.'
    : (problems.length ? problems.join('\n') : 'Camera clear of the ground and the ship, the ship in frame, in sight.') + '\nThe ground is taken as flat (14 m under the belly) for now: hills not counted.';
  currentBuckets = bucketsOf(values);
  bucketsEl.innerHTML = Object.entries(currentBuckets).map(([k, v]) => `<span>${k}: ${v}</span>`).join('');
  if (!isLanding(values) && currentBuckets.sun === undefined) bucketsEl.insertAdjacentHTML('beforeend', '<small>(the sun once the game has loaded)</small>');
  // Close: all but two of the buckets the same (5 of 7 without the sun, 6 of 8 with it).
  const most = Object.values(currentBuckets).filter((b) => b !== undefined).length - 2;
  // A landing has three buckets so far: all the same is close.
  const least = isLanding(values) ? most + 2 : most;
  const close = savedOfKind()
    .filter(([name]) => name !== loadedName)
    .map(([name, s]) => [name, sharedBuckets(currentBuckets, bucketsOf(s.values))] as const)
    .filter(([, same]) => same.length >= least);
  const warns = [
    ...(rerolls && !loadedName ? [`seed ${seed} failed the checks; re-rolled ${rerolls}× from it`] : []),
    ...close.map(([name, same]) => `close to “${name}”: the same ${same.join(', ')}`),
  ];
  warnings.className = 'warn';
  warnings.textContent = warns.map((w) => `⚠ ${w}`).join('   ');
  warnings.title = warns.join('\n');
  saveNote.textContent = saveMessage;
  saveNote.className = saveMessage.startsWith('Saved') ? 'ok' : 'problems';
  saveMessage = '';
  planBox.innerHTML = plan(values, 260);
  drawPower();
  // The preview follows: a new seed or shot from its start (the trim's), a nudge where it is.
  preview?.setWindow(trimOf(values));
  preview?.show(track(), all);
  if (all) drawStrip();
  drawSaved();
}

function drawStrip(): void {
  strip.innerHTML = '';
  const first = Math.max(1, seed - 2);
  for (let s = first; s < first + THUMBS; s++) {
    const v = s === seed ? seedNow : generate(s).values;
    const box = el('div', strip, undefined, 'thumb' + (s === seed && !loadedName ? ' on' : ''));
    box.innerHTML = plan(v, 96);
    el('small', box, `${s} · ${v.duration.toFixed(1)} s`);
    box.addEventListener('click', () => pickSeed(s));
  }
}

function drawSaved(): void {
  savedList.innerHTML = '';
  const names = savedOfKind().map(([name]) => name);
  if (!names.length) el('small', savedList, 'None yet.');
  for (const name of names) {
    const row = el('div', savedList, undefined, name === loadedName ? 'on' : '');
    el('span', row, name);
    const v = saved[name]!.values;
    el('small', row, `seed ${saved[name]!.seed} · ${playedLength(v).toFixed(1)} s${v.trim ? ' (trimmed)' : ''}`);
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
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return void ((saveNote.className = 'problems'), (saveNote.textContent = 'A name in lower case, digits and dashes (it goes in the script: # shot: <name>).'));
  if (saved[name] && name !== loadedName && !confirm(`Replace the saved shot “${name}”?`)) return;
  const date = new Date().toISOString().slice(0, 10);
  const shot: SavedShot = isLanding(values) ? { kind: 'landing', seed, values: structuredClone(values), saved: date } : { kind: 'flyby', seed, values: structuredClone(values), saved: date };
  const r = await fetch('/__shots', { method: 'POST', body: JSON.stringify({ name, shot }) });
  const data = await r.json();
  if (!r.ok) return void ((saveNote.className = 'problems'), (saveNote.textContent = `Not saved: ${data.error}`));
  saved = data.shots;
  loadedName = name;
  nudged = new Set();
  saveMessage = `Saved as “${name}” in public/cutscenes/shots.json.`;
  show(true);
});

/** The whole movement (the preview loops the trimmed part of it, and shows the rest when scrubbed). */
function track(): Track {
  return isLanding(values) ? landingTrack(values, { id: 'shot-editor', whole: true }) : flybyTrack(values, { id: 'shot-editor', sway, handheld, whole: true });
}

/** The buckets, by type (as strings, for the list and the warnings). */
function bucketsOf(v: ShotValues): Record<string, string | undefined> {
  return { ...(isLanding(v) ? landingBuckets(v) : flybyBuckets(v, sunBearing())) };
}
const sharedBuckets = (a: Record<string, string | undefined>, b: Record<string, string | undefined>) => Object.keys(a).filter((k) => a[k] !== undefined && a[k] === b[k]);

// The engines' power: the curve over the whole movement (0 at the bottom, POWER_TOP at the top), the gear and touchdown
// marked; a point dragged moves its time (between its neighbours) and level; a double-click on the line adds one,
// on a point removes it (two kept at least).
const POWER_TOP = 2.5;
let powerDrag: number | null = null;
function drawPower(): void {
  powerBox.style.display = isLanding(values) ? '' : 'none';
  if (!isLanding(values)) return;
  const w = powerSvg.clientWidth || 600, h = 56;
  powerSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const d = values.duration;
  const x = (t: number) => (t / d) * w;
  const y = (p: number) => h - 4 - (p / POWER_TOP) * (h - 8);
  const keys = values.power;
  const line = [[0, keys[0]![1]], ...keys, [d, keys[keys.length - 1]![1]]].map(([t, p]) => `${x(t!).toFixed(1)},${y(p!).toFixed(1)}`).join(' ');
  const mark = (t: number, label: string) => `<line x1="${x(t)}" y1="0" x2="${x(t)}" y2="${h}" stroke="#4a5058" stroke-dasharray="2 3"/><text x="${x(t) + 3}" y="11" fill="#7a808a" font-size="10">${label}</text>`;
  const [ta, tb] = trimOf(values);
  powerSvg.innerHTML =
    `<rect x="0" y="0" width="${x(ta)}" height="${h}" fill="#000" opacity="0.35"/><rect x="${x(tb)}" y="0" width="${w - x(tb)}" height="${h}" fill="#000" opacity="0.35"/>` +
    `<line x1="0" y1="${y(1)}" x2="${w}" y2="${y(1)}" stroke="#30353c"/><text x="3" y="${y(1) - 3}" fill="#5a606a" font-size="10">power 1</text>` +
    mark(GEAR[0], 'gear') + mark(TOUCHDOWN, 'touchdown') +
    `<polyline points="${line}" fill="none" stroke="#f2c060" stroke-width="2"/>` +
    keys.map(([t, p], i) => `<circle data-i="${i}" cx="${x(t)}" cy="${y(p)}" r="5" fill="${powerDrag === i ? '#fff' : '#f2c060'}" style="cursor:grab"><title>${t.toFixed(2)} s · ${p.toFixed(2)}</title></circle>`).join('');
}
const powerAtPointer = (e: PointerEvent | MouseEvent): [number, number] => {
  const r = powerSvg.getBoundingClientRect();
  const v = values as LandingValues;
  const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * v.duration;
  const p = Math.min(POWER_TOP, Math.max(0, ((r.height - 4 - (e.clientY - r.top)) / (r.height - 8)) * POWER_TOP));
  return [Math.round(t * 100) / 100, Math.round(p * 100) / 100];
};
powerSvg.addEventListener('pointerdown', (e) => {
  const i = Number((e.target as Element).getAttribute?.('data-i'));
  if (!isLanding(values) || !Number.isInteger(i) || (e.target as Element).tagName !== 'circle') return;
  powerDrag = i;
  powerSvg.setPointerCapture(e.pointerId);
});
powerSvg.addEventListener('pointermove', (e) => {
  if (powerDrag === null || !isLanding(values)) return;
  const keys = values.power;
  const [t, p] = powerAtPointer(e);
  const lo = powerDrag > 0 ? keys[powerDrag - 1]![0] + 0.05 : 0;
  const hi = powerDrag < keys.length - 1 ? keys[powerDrag + 1]![0] - 0.05 : values.duration;
  keys[powerDrag] = [Math.min(hi, Math.max(lo, t)), p];
  nudged.add('power');
  show(false);
});
powerSvg.addEventListener('pointerup', () => {
  powerDrag = null;
  drawPower();
});
powerSvg.addEventListener('dblclick', (e) => {
  if (!isLanding(values)) return;
  const keys = values.power;
  const i = Number((e.target as Element).getAttribute?.('data-i'));
  if ((e.target as Element).tagName === 'circle' && Number.isInteger(i)) {
    if (keys.length > 2) keys.splice(i, 1);
  } else {
    const [t, p] = powerAtPointer(e);
    keys.push([t, p]);
    keys.sort((a, b) => a[0] - b[0]);
  }
  nudged.add('power');
  show(false);
});

playBtn.addEventListener('click', () => preview?.play(track()));
stopBtn.addEventListener('click', () => preview?.pause());
restartBtn.addEventListener('click', () => {
  preview?.setWindow(trimOf(values));
  preview?.show(track(), true);
});

// Trimming.
const barTime = (e: PointerEvent) => {
  const r = bar.getBoundingClientRect();
  return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * values.duration;
};
function trimAt(which: 'start' | 'end', t: number): void {
  const [a, b] = trimOf(values);
  if (which === 'start') setTrim(values, t, b, 'start');
  else setTrim(values, a, t, 'end');
  nudged.add(which === 'start' ? 'trim start (s)' : 'trim end (s)');
}
/** Dragging a handle (the picture follows it) or scrubbing the bar (held there; Play goes on). */
let dragging: { what: 'start' | 'end' | 'scrub'; wasPlaying: boolean } | null = null;
function drag(e: PointerEvent): void {
  if (!dragging || !preview) return;
  const t = barTime(e);
  if (dragging.what === 'scrub') return void preview.seek(t);
  trimAt(dragging.what, t);
  // Held at the handle first, so the preview's re-show keeps that time.
  preview.seek(trimOf(values)[dragging.what === 'start' ? 0 : 1]);
  show(false);
}
for (const [target, what] of [[handleIn, 'start'], [handleOut, 'end'], [bar, 'scrub']] as const) {
  target.addEventListener('pointerdown', (e) => {
    if (dragging || !preview) return;
    e.stopPropagation();
    bar.setPointerCapture(e.pointerId);
    dragging = { what, wasPlaying: preview.playing };
    drag(e);
  });
}
bar.addEventListener('pointermove', drag);
bar.addEventListener('pointerup', () => {
  // A handle let go: playing on if it was (from the kept part's start once past its end); a scrub stays held.
  if (dragging && dragging.what !== 'scrub' && dragging.wasPlaying) preview?.resume();
  dragging = null;
});
function trimHere(which: 'start' | 'end'): void {
  if (!preview) return;
  const t = preview.time;
  preview.seek(t);
  trimAt(which, t);
  show(false);
}
inBtn.addEventListener('click', () => trimHere('start'));
outBtn.addEventListener('click', () => trimHere('end'));
wholeBtn.addEventListener('click', () => {
  delete values.trim;
  nudged.add('trim start (s)');
  nudged.add('trim end (s)');
  show(false);
});
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'KeyI') trimHere('start');
  else if (e.code === 'KeyO') trimHere('end');
});

/** The framing guides at `s` (0..1 through the shot), drawn over the picture in its pixels. */
function drawGuides(s: number): void {
  const w = frameBox.clientWidth, h = frameBox.clientHeight;
  if (!w || !h || isLanding(values)) return;
  guides.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const c = flybyCamera(values, s);
  const aspect = w / h;
  const px = (x: number) => ((x + 1) / 2) * w;
  const py = (y: number) => ((1 - y) / 2) * h;
  const box = screenBox(c, aspect);
  const centre = inPicture(c, SHIP_CENTRE, aspect);
  const ahead = inPicture(c, [SHIP_CENTRE[0], SHIP_CENTRE[1] - 5, SHIP_CENTRE[2]], aspect); // 5 m ahead of the nose (-Y)
  if (!box || !centre || !ahead) return void (guides.innerHTML = `<text x="12" y="22" class="label">the ship behind the camera</text>`);
  let out = '';
  // The lead room: from the box's leading edge to the frame's edge, on the side it travels to.
  const dx = (ahead[0] - centre[0]) * aspect, dy = ahead[1] - centre[1];
  const across = dx / Math.hypot(dx, dy || 1e-9);
  if (Math.abs(across) > 0.5) {
    const [x0, x1] = across > 0 ? [px(box[2]), w] : [0, px(box[0])];
    out += `<rect x="${x0.toFixed(1)}" y="0" width="${Math.max(0, x1 - x0).toFixed(1)}" height="${h}" class="room"/>`;
  }
  out += `<rect x="${px(box[0]).toFixed(1)}" y="${py(box[3]).toFixed(1)}" width="${(px(box[2]) - px(box[0])).toFixed(1)}" height="${(py(box[1]) - py(box[3])).toFixed(1)}" class="box"/>`;
  // The travel on screen: an arrow from the ship's centre.
  const len = Math.min(w, h) * 0.12;
  const n = Math.hypot(dx, dy) || 1;
  const [cx, cy] = [px(centre[0]), py(centre[1])];
  const [ux, uy] = [dx / n, -dy / n];
  const [tx, ty] = [cx + ux * len, cy + uy * len];
  out += `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" class="arrow"/>`;
  out += `<polygon points="${tx + ux * 8},${ty + uy * 8} ${tx - uy * 6},${ty + ux * 6} ${tx + uy * 6},${ty - ux * 6}" class="head"/>`;
  out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" class="head"/>`;
  const now = (box[2] - box[0]) / 2;
  const target = !isLanding(values) && values.size !== undefined ? ` · target ${(values.size * 100).toFixed(0)}% (${sizeClass(values.size)})` : '';
  out += `<text x="12" y="22" class="label">size ${(now * 100).toFixed(0)}% of the width (${sizeClass(now)})${target}</text>`;
  guides.innerHTML = out;
}

// Where the camera is, on the plan, and the time.
function watchPlay(): void {
  if (preview) {
    if (guideBox.checked && !isLanding(values)) drawGuides(Math.min(1, preview.time / values.duration));
    else if (isLanding(values)) guides.innerHTML = '';
    planBox.innerHTML = plan(values, 260, Math.min(1, preview.time / values.duration));
    const [a] = trimOf(values);
    timeNote.textContent = values.trim
      ? `${(preview.time - a).toFixed(1)} / ${playedLength(values).toFixed(1)} s (${preview.time.toFixed(1)} of ${values.duration.toFixed(1)} s)`
      : `${preview.time.toFixed(1)} / ${values.duration.toFixed(1)} s`;
    barFill.style.left = `${Math.min(100, (preview.time / values.duration) * 100)}%`;
  }
  requestAnimationFrame(watchPlay);
}

async function main(): Promise<void> {
  sway = (await (await fetch('/cutscenes/sway.json')).json()).keys ?? [];
  handheld = (await (await fetch('/cutscenes/handheld.json')).json()).keys ?? [];
  saved = (await (await fetch('/__shots')).json()).shots ?? {};
  pickSeed(1);
  requestAnimationFrame(watchPlay);
  preview = await ShotPreview.create(canvas, 'ice-plain', (what) => (gameNote.textContent = `Loading the preview: ${what}…`)).catch((err: unknown) => {
    console.warn('[shot editor] preview not built:', err);
    gameNote.textContent = 'The preview failed to load (console).';
    return null;
  });
  if (!preview) return;
  (window as unknown as { __shotPreview: ShotPreview }).__shotPreview = preview; // dev hook, for the scratch checks
  await preview.setGround(kind === 'landing' ? 'landed' : 'flight');
  gameNote.textContent = '';
  preview.setWindow(trimOf(values));
  preview.play(track());
  show(false); // the sun's bucket, now known
}

if (!import.meta.env.DEV) side.textContent = 'The shot editor runs on the dev server only.';
else void main();
