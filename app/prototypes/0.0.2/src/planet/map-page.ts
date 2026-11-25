/**
 * planet-map.html: the planet map's test page (plan doc/plans/features/non-linear-travel/planet-map-page.md,
 * flight test pass 4). The navigation station's big screen alone, at its shape (`MAP_ASPECT`), the shot
 * editor's layout (tools.css). **Loads no game files** (no `.glb`, textures or sounds): the planet's code and
 * preset (`presets.json`, imported) only, so the map has the 0050 planet's land and sea.
 * Step 1: the globe in green lines; the look set in the sidebar, kept in the browser.
 * Step 2: zoom in fixed steps (L2 out / R2 in, Q / E, the wheel), pan (left stick, WASD; a share of the screen
 * per second, so every step feels the same), follow the simulated ship (R3 / F; panning stops it). The ship is
 * a heading and a speed in the sidebar.
 * Step 3: the 2D overlay (map-overlay.ts): the grid by zoom, sector names on the edges, quadrant names at the
 * closest step, the marks (waypoints, signals, visited sites; added at the centre in the sidebar) and the ship.
 * Step 3b: the contours' spacing by zoom step, nested (the look's `contourSplit`), so every step shows about as
 * many lines; main and minor lines.
 * Step 3c: a CRT look (crt.ts): the map drawn into a render target, the overlay's canvas as a texture, both shown
 * through one pass with scanlines, noise and flicker (the overlay canvas itself hidden).
 * Dev only, as tools.html.
 */

import * as THREE from 'three/webgpu';
import presets from './presets.json';
import type { PlanetPreset } from './planet';
import { contourSpacingAt, createPlanetMap, DEFAULT_LOOK, MAP_ASPECT, quadrantName, travel, type MapLook, type MapView } from './map';
import { drawMapOverlay, type MapMark, type MarkKind } from './map-overlay';
import { createCrt } from './crt';

/** The zoom steps (plan): the screen's width in degrees; 360 = the whole globe. */
const ZOOM_STEPS = [
  { name: 'Whole globe', width: 360 },
  { name: '64°', width: 64 },
  { name: '16°', width: 16 },
  { name: '4°', width: 4 },
  { name: 'Quadrants (2°)', width: 2 },
];

/** Panning at full stick: this share of the screen's width per second. The whole globe pans as if 120° wide. */
const PAN_SHARE = 0.5;
const PAN_WIDTH_WHOLE = 120;
const DEAD_ZONE = 0.15;
/**
 * 0050's last frame (shot.ts: the planet's end spin and tip, Blender's tilt, the camera on +Z): the point
 * facing the camera, where the crew will explore (owner, 2026-11-24). Worked out once with the meridian at
 * 111.4° (.export/end-frame.mjs). In that frame north is turned 17.5° from up; the map is north up or
 * heading up instead (owner, 2026-11-24).
 */
const SHOT_END = { northSouth: 74.0, eastWest: 199.5 };
/** Test marks around 0050's region, one of each kind, so the icons show on opening (not story places). */
const TEST_MARKS: MapMark[] = [
  { kind: 'waypoint', northSouth: 76.5, eastWest: 197.5 },
  { kind: 'signal', northSouth: 75.5, eastWest: 201.5 },
  { kind: 'visited', northSouth: 73.5, eastWest: 198.5 },
];
/** Standard-mapping pad buttons (by position): L2, R2, R3, the top face button (placeholder). */
const PAD = { out: 6, in: 7, follow: 11, orient: 3 };
/** The map's orientation, the player's choice: north up, or the ship's heading up. */
type Orientation = 'north' | 'heading';

/** The simulated ship: where it is, its heading (degrees clockwise from north) and speed (degrees of arc per second). */
interface Ship {
  northSouth: number;
  eastWest: number;
  heading: number;
  speed: number;
  moving: boolean;
}

const STORE = 'zamboni-planet-map-look';
const side = document.getElementById('side')!;
const status = document.getElementById('status')!;
const canvas = document.getElementById('map') as HTMLCanvasElement;
const overlay = document.getElementById('overlay') as HTMLCanvasElement;

function loadLook(): MapLook {
  try {
    const kept = localStorage.getItem(STORE);
    if (kept) {
      const saved = JSON.parse(kept) as Partial<MapLook>;
      // Saved before the spacing by zoom (step 3b): the contours' values taken anew.
      if (saved.contourSplit?.length !== DEFAULT_LOOK.contourSplit.length) {
        delete saved.contourSplit;
        delete saved.contourSpacing;
        delete saved.deepest;
      }
      // Smoothing per zoom step (2026-11-25; was one value).
      if (!Array.isArray(saved.smoothing) || saved.smoothing.length !== DEFAULT_LOOK.smoothing.length) delete saved.smoothing;
      return {
        ...DEFAULT_LOOK,
        ...saved,
        contourSplit: [...(saved.contourSplit ?? DEFAULT_LOOK.contourSplit)],
        smoothing: [...(saved.smoothing ?? DEFAULT_LOOK.smoothing)],
      };
    }
  } catch {
    /* none kept, or storage blocked */
  }
  return { ...DEFAULT_LOOK, contourSplit: [...DEFAULT_LOOK.contourSplit], smoothing: [...DEFAULT_LOOK.smoothing] };
}

/** A labelled input in a `.values` grid; `onInput` gets its value. */
function field(parent: HTMLElement, label: string, input: HTMLInputElement | HTMLSelectElement, onInput: (value: string) => void): void {
  const box = parent.appendChild(document.createElement('label'));
  box.className = 'field';
  box.appendChild(document.createElement('span')).textContent = label;
  box.appendChild(input);
  input.addEventListener('input', () => onInput(input.value));
}

function numberInput(value: number, step: number, min?: number, max?: number): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = String(step);
  if (min !== undefined) input.min = String(min);
  if (max !== undefined) input.max = String(max);
  input.value = String(value);
  return input;
}

function checkbox(on: boolean): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = on;
  return input;
}

function section(title: string): HTMLElement {
  const details = side.appendChild(document.createElement('details'));
  details.open = true;
  details.appendChild(document.createElement('summary')).textContent = title;
  const values = details.appendChild(document.createElement('div'));
  values.className = 'values';
  return values;
}

async function main(): Promise<void> {
  const preset = presets.presets[presets.default as keyof typeof presets.presets] as unknown as PlanetPreset;
  const look = loadLook();
  const ship: Ship = { northSouth: SHOT_END.northSouth, eastWest: SHOT_END.eastWest, heading: 45, speed: 0.05, moving: true };
  const view: MapView = { northSouth: ship.northSouth, eastWest: ship.eastWest, width: ZOOM_STEPS[0]!.width, roll: 0 }; // opens on 0050's region (owner, 2026-11-24)
  let orientation: Orientation = 'north';
  let zoomStep = 0;
  let following = true;
  const marks: MapMark[] = TEST_MARKS.map((m) => ({ ...m }));

  document.documentElement.style.setProperty('--aspect', String(MAP_ASPECT));
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false });
  await renderer.init();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.NoToneMapping;
  const map = createPlanetMap(preset, look);
  const quad = new THREE.QuadMesh(map.material);
  // Step 3c: the map into a render target (only when it changes), shown with the overlay through the CRT pass.
  const picture = new THREE.RenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const overlayTexture = new THREE.CanvasTexture(overlay);
  overlayTexture.colorSpace = THREE.SRGBColorSpace;
  overlayTexture.flipY = false; // the canvas's rows top-down, as the render target's
  const crt = createCrt(picture.texture, overlayTexture, MAP_ASPECT, look);
  const crtQuad = new THREE.QuadMesh(crt.material);

  let dirty = true;
  const redraw = () => (dirty = true);

  // The view: shown, and settable by number (the pad, keys and wheel are the real controls).
  const viewBox = section('View');
  const zoom = document.createElement('select');
  ZOOM_STEPS.forEach((z, i) => zoom.add(new Option(z.name, String(i))));
  field(viewBox, 'zoom step', zoom, (v) => setZoom(Number(v)));
  const ns = numberInput(view.northSouth, 1, 0, 180);
  const ew = numberInput(view.eastWest, 1, 0, 360);
  field(viewBox, 'centre N–S (°)', ns, (v) => ((view.northSouth = Math.min(179.9, Math.max(0.1, Number(v)))), setFollowing(false)));
  field(viewBox, 'centre E–W (°)', ew, (v) => ((view.eastWest = Number(v)), setFollowing(false)));
  const orient = document.createElement('select');
  orient.add(new Option('North up', 'north'));
  orient.add(new Option('Heading up', 'heading'));
  field(viewBox, 'up (top button / N)', orient, (v) => setOrientation(v as Orientation));
  const follow = checkbox(following);
  field(viewBox, 'follow ship (R3 / F)', follow, () => setFollowing(follow.checked));
  const shotView = side.appendChild(document.createElement('button'));
  shotView.textContent = "0050's last frame";
  shotView.title = 'The whole globe centred where scene 0050 ends: the region the crew explore';
  shotView.addEventListener('click', () => {
    setFollowing(false);
    Object.assign(view, { northSouth: SHOT_END.northSouth, eastWest: SHOT_END.eastWest });
    setZoom(0);
  });
  side.appendChild(document.createElement('small')).textContent = 'Zoom: L2 / R2, Q / E, the wheel. Pan: left stick, WASD (stops following).';

  // The simulated ship.
  const shipBox = section('Ship (simulated)');
  field(shipBox, 'heading (°)', numberInput(ship.heading, 5, 0, 360), (v) => ((ship.heading = Number(v)), redraw()));
  field(shipBox, 'speed (°/s)', numberInput(ship.speed, 0.01, 0), (v) => (ship.speed = Math.max(0, Number(v))));
  const moving = checkbox(ship.moving);
  field(shipBox, 'moving', moving, () => ((ship.moving = moving.checked), redraw()));
  const toCentre = side.appendChild(document.createElement('button'));
  toCentre.textContent = 'Ship to the centre';
  toCentre.addEventListener('click', () => {
    Object.assign(ship, { northSouth: view.northSouth, eastWest: view.eastWest });
    redraw();
  });

  // The marks (placeholders): added at the view's centre.
  const marksBox = section('Marks');
  const kind = document.createElement('select');
  kind.add(new Option('Waypoint ○', 'waypoint'));
  kind.add(new Option('Signal □', 'signal'));
  kind.add(new Option('Visited ×', 'visited'));
  field(marksBox, 'kind', kind, () => {});
  const addMark = side.appendChild(document.createElement('button'));
  addMark.textContent = 'Add at the centre';
  addMark.addEventListener('click', () => {
    marks.push({ kind: kind.value as MarkKind, northSouth: view.northSouth, eastWest: view.eastWest });
    redraw();
  });
  const clearMarks = side.appendChild(document.createElement('button'));
  clearMarks.textContent = 'Clear marks';
  clearMarks.addEventListener('click', () => {
    marks.length = 0;
    redraw();
  });

  function setZoom(step: number): void {
    zoomStep = Math.min(ZOOM_STEPS.length - 1, Math.max(0, step));
    view.width = ZOOM_STEPS[zoomStep]!.width;
    zoom.value = String(zoomStep);
    applyContours();
    redraw();
  }
  function applyContours(): void {
    const { spacing, split } = contourSpacingAt(look, zoomStep);
    map.setContours(spacing, split);
    map.setSmoothing(look.smoothing[zoomStep] ?? 0);
  }
  applyContours();
  function setOrientation(next: Orientation): void {
    orientation = next;
    orient.value = next;
    redraw();
  }
  function setFollowing(on: boolean): void {
    following = on;
    follow.checked = on;
    redraw();
  }

  // Keys (not while typing in the sidebar) and the wheel.
  const held = new Set<string>();
  const typing = (e: Event) => e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
  addEventListener('keydown', (e) => {
    if (typing(e)) return;
    const key = e.key.toLowerCase();
    held.add(key);
    if (e.repeat) return;
    if (key === 'q') setZoom(zoomStep - 1);
    else if (key === 'e') setZoom(zoomStep + 1);
    else if (key === 'f') setFollowing(!following);
    else if (key === 'n') setOrientation(orientation === 'north' ? 'heading' : 'north');
  });
  addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()));
  addEventListener('blur', () => held.clear());
  canvas.parentElement!.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (e.deltaY !== 0) setZoom(zoomStep + (e.deltaY < 0 ? 1 : -1));
    },
    { passive: false },
  );

  const padHeld = { out: false, in: false, follow: false, orient: false };
  /** This frame's pan (x right, y up, length ≤ 1) from the pad and the keys; acts on the pad's zoom and follow presses. */
  function readControls(): [number, number] {
    let x = 0, y = 0;
    const now = { out: false, in: false, follow: false, orient: false };
    for (const pad of navigator.getGamepads?.() ?? []) {
      if (!pad?.connected) continue;
      const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
      const len = Math.hypot(ax, ay);
      if (len > DEAD_ZONE) {
        const scaled = Math.min(1, (len - DEAD_ZONE) / (1 - DEAD_ZONE));
        x += (ax / len) * scaled;
        y -= (ay / len) * scaled;
      }
      now.out ||= !!pad.buttons[PAD.out]?.pressed;
      now.in ||= !!pad.buttons[PAD.in]?.pressed;
      now.follow ||= !!pad.buttons[PAD.follow]?.pressed;
      now.orient ||= !!pad.buttons[PAD.orient]?.pressed;
    }
    if (now.out && !padHeld.out) setZoom(zoomStep - 1);
    if (now.in && !padHeld.in) setZoom(zoomStep + 1);
    if (now.follow && !padHeld.follow) setFollowing(!following);
    if (now.orient && !padHeld.orient) setOrientation(orientation === 'north' ? 'heading' : 'north');
    Object.assign(padHeld, now);
    x += (held.has('d') ? 1 : 0) - (held.has('a') ? 1 : 0);
    y += (held.has('w') ? 1 : 0) - (held.has('s') ? 1 : 0);
    const len = Math.hypot(x, y);
    return len > 1 ? [x / len, y / len] : [x, y];
  }

  // The look, kept in the browser.
  const lookBox = section('Look');
  const lookChanged = () => {
    map.setLook(look);
    crt.setLook(look);
    applyContours();
    try {
      localStorage.setItem(STORE, JSON.stringify(look));
    } catch {
      /* storage blocked: not remembered */
    }
    redraw();
  };
  const colour = document.createElement('input');
  colour.type = 'color';
  colour.value = look.colour;
  field(lookBox, 'line colour', colour, (v) => ((look.colour = v), lookChanged()));
  const numeric: [string, keyof MapLook, number, number][] = [
    ['coastline (px)', 'coastWidth', 0.25, 0],
    ['contour lines (px)', 'contourWidth', 0.25, 0],
    ['contour spacing (globe)', 'contourSpacing', 0.005, 0.001],
    ['contours, rim dim', 'dim', 0.05, 0],
    ['minor contours', 'minor', 0.05, 0],
    ['fade depth', 'fadeDepth', 0.01, 0],
    ['deepest contour', 'deepest', 0.05, 0],
    ['grid brightness', 'grid', 0.05, 0],
  ];
  const inputs: Partial<Record<keyof MapLook, HTMLInputElement>> = {};
  for (const [label, key, step, min] of numeric) {
    const input = numberInput(look[key] as number, step, min);
    inputs[key] = input;
    field(lookBox, label, input, (v) => (((look[key] as number) = Number(v)), lookChanged()));
  }
  // By zoom step: the smoothing (noise layers left out), and into how many each step splits the step before's
  // contour gaps (none for the whole globe).
  const stepBox = section('Detail by zoom step');
  const smoothings: HTMLInputElement[] = [];
  const splits: HTMLInputElement[] = [];
  ZOOM_STEPS.forEach((z, i) => {
    const name = z.width >= 180 ? 'globe' : `${z.width}°`;
    const smooth = numberInput(look.smoothing[i] ?? 0, 0.25, 0);
    field(stepBox, `${name} smoothing`, smooth, (v) => ((look.smoothing[i] = Math.max(0, Number(v) || 0)), lookChanged()));
    smoothings.push(smooth);
    if (i === 0) {
      stepBox.appendChild(document.createElement('span')); // the globe has no split: keeps the rows paired
      return;
    }
    const split = numberInput(look.contourSplit[i - 1] ?? 1, 1, 1);
    field(stepBox, `${name} split`, split, (v) => ((look.contourSplit[i - 1] = Math.max(1, Math.round(Number(v)) || 1)), lookChanged()));
    splits.push(split);
  });
  // The CRT (step 3c).
  const crtBox = section('CRT');
  const crtFields: [string, keyof MapLook, number, number][] = [
    ['scanlines (count)', 'scanLines', 10, 1],
    ['scanline dark', 'scanDark', 0.05, 0],
    ['noise', 'noise', 0.025, 0],
    ['noise in darks', 'noiseResponse', 0.05, 0],
    ['noise size (lines)', 'noiseSize', 0.5, 0.5],
    ['noise rate (Hz)', 'noiseRate', 1, 0],
    ['noise on black', 'noiseOnBlack', 0.01, 0],
    ['flicker', 'flicker', 0.01, 0],
    ['flicker rate (Hz)', 'flickerRate', 1, 0],
  ];
  for (const [label, key, step, min] of crtFields) {
    const input = numberInput(look[key] as number, step, min);
    inputs[key] = input;
    field(crtBox, label, input, (v) => (((look[key] as number) = Number(v)), lookChanged()));
  }
  const reset = side.appendChild(document.createElement('button'));
  reset.textContent = 'Reset look';
  reset.addEventListener('click', () => {
    Object.assign(look, DEFAULT_LOOK);
    colour.value = look.colour;
    look.contourSplit = [...DEFAULT_LOOK.contourSplit];
    look.smoothing = [...DEFAULT_LOOK.smoothing];
    smoothings.forEach((input, i) => (input.value = String(look.smoothing[i])));
    for (const [, key] of [...numeric, ...crtFields]) inputs[key]!.value = String(look[key]);
    splits.forEach((input, i) => (input.value = String(look.contourSplit[i])));
    lookChanged();
  });

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, Math.round(box.width)), Math.max(1, Math.round(box.height)), false);
    overlay.width = renderer.domElement.width;
    overlay.height = renderer.domElement.height;
    picture.setSize(renderer.domElement.width, renderer.domElement.height);
    redraw();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const ctx = overlay.getContext('2d')!;
  let overlayMs = 0;
  function drawOverlay(): void {
    const t = performance.now();
    drawMapOverlay(ctx, map, {
      view,
      colour: look.colour,
      grid: look.grid,
      lineWidth: look.coastWidth * (window.devicePixelRatio || 1),
      border: 2 * (window.devicePixelRatio || 1), // 2 px (owner, 2026-11-24)
      ship,
      marks,
    });
    overlayMs = performance.now() - t;
  }

  // Drawn when something changed, and every frame while the ship moves or the view pans.
  let drawMs = 0;
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;

    // Heading up: the screen turned by the ship's heading, so it points up (at the centre, when following).
    view.roll = orientation === 'heading' ? ship.heading : 0;
    const [px, py] = readControls();
    if (px !== 0 || py !== 0) {
      if (following) setFollowing(false);
      const width = view.width >= 180 ? PAN_WIDTH_WHOLE : view.width;
      const bearing = (Math.atan2(px, py) * 180) / Math.PI + (view.roll ?? 0); // the stick's up is the screen's up
      Object.assign(view, travel(view.northSouth, view.eastWest, bearing, Math.hypot(px, py) * PAN_SHARE * width * dt));
      dirty = true;
    }
    if (ship.moving && ship.speed > 0) {
      Object.assign(ship, travel(ship.northSouth, ship.eastWest, ship.heading, ship.speed * dt));
      dirty = true;
    }
    if (following) Object.assign(view, { northSouth: ship.northSouth, eastWest: ship.eastWest });

    // The CRT's noise and flicker tick at their own stepped rates: the screen is shown again when one does.
    const ticked = crt.tick(now / 1000);
    if (!dirty) {
      if (ticked) crtQuad.render(renderer);
      return;
    }
    dirty = false;
    map.setView(view);
    const t = performance.now();
    renderer.setRenderTarget(picture);
    quad.render(renderer);
    renderer.setRenderTarget(null);
    drawMs = performance.now() - t;
    drawOverlay();
    overlayTexture.needsUpdate = true;
    crtQuad.render(renderer);
    if (document.activeElement !== ns) ns.value = view.northSouth.toFixed(2);
    if (document.activeElement !== ew) ew.value = view.eastWest.toFixed(2);
    status.innerHTML = '';
    status.appendChild(document.createElement('span')).textContent = `Centre ${quadrantName(view.northSouth, view.eastWest)} · ${ZOOM_STEPS[zoomStep]!.name}${following ? ' · following' : ''}`;
    status.appendChild(document.createElement('span')).textContent = `Ship ${quadrantName(ship.northSouth, ship.eastWest)}`;
    status.appendChild(document.createElement('span')).textContent = `Contours every ${contourSpacingAt(look, zoomStep).spacing.toPrecision(2)}`;
    status.appendChild(document.createElement('span')).textContent = `Meridian ${preset.meridian ?? 0}° · aspect ${MAP_ASPECT.toFixed(3)} · ${renderer.domElement.width} × ${renderer.domElement.height} px`;
    status.appendChild(document.createElement('small')).textContent = `${renderer.backend.constructor.name}, draw call ${drawMs.toFixed(1)} ms, overlay ${overlayMs.toFixed(1)} ms`;
  });

  // For the probe (step 4).
  Object.assign(window, {
    __planetMap: { SHOT_END, view, look, ship, marks, redraw, lookChanged, setZoom, setFollowing, setOrientation, steps: ZOOM_STEPS, aspect: MAP_ASPECT, following: () => following, zoomStep: () => zoomStep },
  });
}

if (!import.meta.env.DEV) side.textContent = 'The planet map runs on the dev server only.';
else void main();
