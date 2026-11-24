/**
 * planet-map.html: the planet map's test page (plan doc/plans/features/non-linear-travel/planet-map-page.md,
 * flight test pass 4). The navigation station's big screen alone, at its shape (`MAP_ASPECT`), the shot
 * editor's layout (tools.css). **Loads no game files** (no `.glb`, textures or sounds): the planet's code and
 * preset (`presets.json`, imported) only, so the map has the 0050 planet's land and sea.
 * Step 1: the globe in green lines; the view (zoom step, centre) and the look set in the sidebar. The look is
 * kept in the browser. Steps 2–3 (pad zoom and pan, following the ship, the grid, labels and icons) to come.
 * Dev only, as tools.html.
 */

import * as THREE from 'three/webgpu';
import presets from './presets.json';
import type { PlanetPreset } from './planet';
import { createPlanetMap, DEFAULT_LOOK, MAP_ASPECT, quadrantName, type MapLook, type MapView } from './map';

/** The zoom steps (plan): the screen's width in degrees; 360 = the whole globe. */
const ZOOM_STEPS = [
  { name: 'Whole globe', width: 360 },
  { name: '64°', width: 64 },
  { name: '16°', width: 16 },
  { name: '4°', width: 4 },
  { name: 'Quadrants (2°)', width: 2 },
];

const STORE = 'zamboni-planet-map-look';
const side = document.getElementById('side')!;
const status = document.getElementById('status')!;
const canvas = document.getElementById('map') as HTMLCanvasElement;

function loadLook(): MapLook {
  try {
    const kept = localStorage.getItem(STORE);
    if (kept) return { ...DEFAULT_LOOK, ...(JSON.parse(kept) as Partial<MapLook>) };
  } catch {
    /* none kept, or storage blocked */
  }
  return { ...DEFAULT_LOOK };
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
  const view: MapView = { northSouth: 90, eastWest: 0, width: ZOOM_STEPS[0]!.width };

  document.documentElement.style.setProperty('--aspect', String(MAP_ASPECT));
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: false });
  await renderer.init();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.NoToneMapping;
  const map = createPlanetMap(preset, look);
  const quad = new THREE.QuadMesh(map.material);

  let dirty = true;
  const redraw = () => (dirty = true);

  // The view (step 2 replaces these with the pad's zoom and pan).
  const viewBox = section('View');
  const zoom = document.createElement('select');
  ZOOM_STEPS.forEach((z, i) => zoom.add(new Option(z.name, String(i))));
  field(viewBox, 'zoom step', zoom, (v) => ((view.width = ZOOM_STEPS[Number(v)]!.width), redraw()));
  field(viewBox, 'centre N–S (°)', numberInput(view.northSouth, 1, 0, 180), (v) => ((view.northSouth = Math.min(180, Math.max(0, Number(v)))), redraw()));
  field(viewBox, 'centre E–W (°)', numberInput(view.eastWest, 1, 0, 360), (v) => ((view.eastWest = Number(v)), redraw()));

  // The look, kept in the browser.
  const lookBox = section('Look');
  const lookChanged = () => {
    map.setLook(look);
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
    ['contour count', 'contours', 1, 0],
    ['contour spacing', 'contourSpacing', 0.005, 0.001],
    ['contours, rim dim', 'dim', 0.05, 0],
  ];
  const inputs: Partial<Record<keyof MapLook, HTMLInputElement>> = {};
  for (const [label, key, step, min] of numeric) {
    const input = numberInput(look[key] as number, step, min);
    inputs[key] = input;
    field(lookBox, label, input, (v) => (((look[key] as number) = Number(v)), lookChanged()));
  }
  const reset = side.appendChild(document.createElement('button'));
  reset.textContent = 'Reset look';
  reset.addEventListener('click', () => {
    Object.assign(look, DEFAULT_LOOK);
    colour.value = look.colour;
    for (const [, key] of numeric) inputs[key]!.value = String(look[key]);
    lookChanged();
  });

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, Math.round(box.width)), Math.max(1, Math.round(box.height)), false);
    redraw();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Drawn only when something changed (step 2's moving ship will draw every frame).
  let drawMs = 0;
  renderer.setAnimationLoop(() => {
    if (!dirty) return;
    dirty = false;
    map.setView(view);
    const t = performance.now();
    quad.render(renderer);
    drawMs = performance.now() - t;
    status.innerHTML = '';
    const centre = status.appendChild(document.createElement('span'));
    centre.textContent = `Centre ${quadrantName(view.northSouth, view.eastWest)}`;
    status.appendChild(document.createElement('span')).textContent = `Meridian ${preset.meridian ?? 0}° · aspect ${MAP_ASPECT.toFixed(3)} · ${renderer.domElement.width} × ${renderer.domElement.height} px`;
    status.appendChild(document.createElement('small')).textContent = `${renderer.backend.constructor.name}, draw call ${drawMs.toFixed(1)} ms`;
  });

  // For the probe (step 4).
  Object.assign(window, { __planetMap: { view, look, redraw, steps: ZOOM_STEPS, aspect: MAP_ASPECT } });
}

if (!import.meta.env.DEV) side.textContent = 'The planet map runs on the dev server only.';
else void main();
