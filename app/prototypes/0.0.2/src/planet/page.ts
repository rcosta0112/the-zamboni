// planet.html: a page for tuning the planet shot (plan: doc/plans/features/planet-cinematic.md), dev only
// (not in the build). Blender's camera (8.54 m away, 36 mm sensor) and sun; the panel edits the preset
// live; the saved presets (presets.json) are fetched from the dev server, not imported, so saving
// doesn't reload the page. The last preset edited is kept in the browser.

import * as THREE from 'three/webgpu';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { createPlanet, type PlanetPreset } from './planet';
import { createSky, type SkyPreset } from './sky';
import { applyGrain, GRAIN_OFF, type GrainPreset } from './grain';

/** The shot's look: the planet (with its atmosphere), the sky and the grain. */
type ShotPreset = PlanetPreset & { sky: SkyPreset; grain: GrainPreset };

interface PresetFile {
  default: string;
  presets: Record<string, ShotPreset>;
}

const STORE = 'zamboni-planet-preset';
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

let file = (await (await fetch('/__planet/presets')).json()) as PresetFile;
const defaultPreset = (): ShotPreset => {
  const p = clone(file.presets[file.default]!);
  p.grain = { ...GRAIN_OFF, ...p.grain }; // presets saved before the grain
  return p;
};

/**
 * A preset kept or pasted from an older page, its missing values (at any depth) filled from `base`, so
 * a value added since doesn't break the panel (found 2026-11-10: the patch stops, a black page).
 */
function fill<T>(base: T, kept: unknown): T {
  const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
  if (!isObject(base) || !isObject(kept)) return (kept === undefined || typeof kept !== typeof base ? base : kept) as T;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(kept)) out[key] = key in base ? fill(base[key], kept[key]) : kept[key];
  return out as T;
}

/** Copies `from`'s values into `into`'s own objects, so the panel's sliders stay bound to them. */
function copyInto(into: unknown, from: unknown): void {
  if (typeof into !== 'object' || into === null || typeof from !== 'object' || from === null) return;
  const a = into as Record<string, unknown>;
  const b = from as Record<string, unknown>;
  for (const key of Object.keys(b)) {
    if (typeof a[key] === 'object' && a[key] !== null && typeof b[key] === 'object' && b[key] !== null) copyInto(a[key], b[key]);
    else a[key] = b[key];
  }
}

function load(): ShotPreset {
  try {
    const saved = localStorage.getItem(STORE);
    if (saved) return fill(defaultPreset(), JSON.parse(saved));
  } catch {
    /* none kept, or storage blocked */
  }
  return defaultPreset();
}
const preset = load();

// Blender's scene: camera at (0, -8.538, 0) looking along +Y; Blender (x, y, z) is Three (x, z, -y).
const canvas = document.getElementById('view') as HTMLCanvasElement;
const info = document.getElementById('info') as HTMLElement;
const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
await renderer.init();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Blender's view: ACES 1.3

const view = { focalLength: 50, spin: 0, exposure: 1, sunStrength: 7 };
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
camera.filmGauge = 36; // Blender's sensor (fit: the wider side)
camera.position.set(0, 0, 8.538);

const sun = new THREE.DirectionalLight(0xffffff, view.sunStrength);
sun.position.set(0.348, 0.625, 0.699).multiplyScalar(10); // Blender's Sun, (0.894, -0.069, 6.8) rad
scene.add(sun);

const planet = createPlanet(preset);
const sky = createSky(preset.sky);
applyGrain(preset.grain);
scene.add(sky.mesh);
// Dragging on the planet's page turns it (owner, 2026-11-09): sideways spins it about its own axis
// (the spin slider follows), up and down tips it towards or away from the camera (`tip`, a view-only
// turn about the screen's horizontal axis). Double-click resets the tip.
const tip = new THREE.Group();
tip.add(planet.root);
scene.add(tip);

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.setFocalLength(view.focalLength);
}
window.addEventListener('resize', resize);
resize();

function changed(): void {
  planet.apply(preset);
  sky.apply(preset.sky);
  applyGrain(preset.grain);
  try {
    localStorage.setItem(STORE, JSON.stringify(preset));
  } catch {
    /* storage blocked: it just won't be remembered */
  }
}
function viewChanged(): void {
  camera.setFocalLength(view.focalLength);
  planet.spin.rotation.z = THREE.MathUtils.degToRad(view.spin);
  renderer.toneMappingExposure = view.exposure;
  sun.intensity = view.sunStrength;
}

// The panel.
let message = '';
const gui = new GUI({ title: 'Planet' });
async function saveAs(name: string): Promise<void> {
  const res = await fetch('/__planet/presets', { method: 'POST', body: JSON.stringify({ name, preset }) });
  if (!res.ok) {
    message = `Not saved: ${(await res.json()).error ?? res.status}`;
    return;
  }
  file = (await res.json()) as PresetFile;
  actions.preset = file.default;
  presetControl.options(Object.keys(file.presets)).name('preset');
  message = `Saved "${file.default}" as the default (src/planet/presets.json).`;
}
const actions = {
  preset: file.default,
  save: () => void saveAs(actions.preset),
  saveNew: () => {
    const name = prompt('Name of the new preset');
    if (name?.trim()) void saveAs(name.trim());
  },
  copy: () => void navigator.clipboard.writeText(JSON.stringify(preset, null, 2)),
  load: () => {
    copyInto(preset, fill(defaultPreset(), clone(file.presets[actions.preset]!)));
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    changed();
  },
  newSeed: () => {
    preset.seed = Math.floor(Math.random() * 10000);
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
    changed();
  },
};
gui.add(actions, 'save').name('Save as default');
gui.add(actions, 'saveNew').name('Save as new preset…');
gui.add(actions, 'copy').name('Copy preset');
let presetControl: { options(o: string[]): typeof presetControl; name(n: string): typeof presetControl } = gui.add(actions, 'preset', Object.keys(file.presets)).name('preset');
gui.add(actions, 'load').name('Load preset (loses changes)');

const viewFolder = gui.addFolder('View');
viewFolder.add(view, 'focalLength', 20, 180, 1).name('focal length (mm)').onChange(viewChanged);
const spinControl = viewFolder.add(view, 'spin', -180, 180, 0.5).name('spin (°)').onChange(viewChanged);
viewFolder.add(view, 'exposure', 0.2, 3, 0.01).onChange(viewChanged);
viewFolder.add(view, 'sunStrength', 0, 20, 0.1).name('sun strength').onChange(viewChanged);

const shape = gui.addFolder('Continents');
shape.add(preset, 'seed', 0, 10000, 1).onChange(changed);
shape.add(actions, 'newSeed').name('New seed');
shape.add(preset, 'scale', 0.5, 20, 0.01).onChange(changed);
shape.add(preset, 'detail', 0, 16, 0.1).name('detail (octaves)').onChange(changed);
shape.add(preset, 'roughness', 0, 1, 0.01).onChange(changed);
shape.add(preset, 'lacunarity', 1, 4, 0.01).onChange(changed);
shape.add(preset, 'warp', 0, 2, 0.01).onChange(changed);
shape.add(preset, 'warpScale', 0.1, 10, 0.01).name('warp scale').onChange(changed);
shape.add(preset, 'seaLevel', 0, 1, 0.001).name('sea level').onChange(changed);
shape.add(preset, 'coastSoftness', 0, 4, 0.1).name('coast softness (px)').onChange(changed);
shape.add(preset, 'lodBias', -4, 4, 0.1).name('detail bias (octaves)').onChange(changed);

function colourRamp(name: string, stops: { at: number; colour: string }[]): void {
  const folder = gui.addFolder(name);
  stops.forEach((stop, i) => {
    folder.addColor(stop, 'colour').name(`colour ${i + 1}`).onChange(changed);
    folder.add(stop, 'at', 0, 1, 0.001).name(`at ${i + 1}`).onChange(changed);
  });
  folder.close();
}
colourRamp('Land, outside the band', preset.coast);
colourRamp('Land, in the band', preset.green);
colourRamp('Sea', preset.ocean);

const bandFolder = gui.addFolder('Band (latitude: 0 south, 1 north)');
preset.band.forEach((stop, i) => {
  bandFolder.add(stop, 'at', 0, 1, 0.001).name(`at ${i + 1}`).onChange(changed);
  bandFolder.add(stop, 'value', 0, 1, 0.01).name(`value ${i + 1}`).onChange(changed);
});
bandFolder.add(preset, 'bandMix', 0, 1, 0.001).name('noise mix').onChange(changed);
bandFolder.add(preset.bandNoise, 'scale', 0.5, 30, 0.1).name('noise scale').onChange(changed);
bandFolder.add(preset.bandNoise, 'detail', 0, 8, 0.1).name('noise detail').onChange(changed);
bandFolder.add(preset.bandNoise, 'roughness', 0, 1, 0.01).name('noise roughness').onChange(changed);
bandFolder.add(preset.bandNoise, 'lacunarity', 1, 4, 0.01).name('noise lacunarity').onChange(changed);
bandFolder.add(preset.bandNoise, 'from', 0, 1, 0.001).name('noise from').onChange(changed);
bandFolder.add(preset.bandNoise, 'to', 0, 1, 0.001).name('noise to').onChange(changed);
bandFolder.close();

const air = gui.addFolder('Atmosphere');
air.add(preset.atmosphere, 'size', 1, 1.2, 0.001).onChange(changed);
air.addColor(preset.atmosphere, 'colour').onChange(changed);
air.add(preset.atmosphere, 'roughness', 0, 1, 0.01).name('roughness (glint)').onChange(changed);
air.add(preset.atmosphere, 'ior', 1, 2.5, 0.01).name('IOR (glint)').onChange(changed);
air.add(preset.atmosphere, 'rimIor', 1, 2, 0.001).name('rim (Fresnel IOR)').onChange(changed);
air.add(preset.atmosphere, 'cloudAmount', 0, 1, 0.01).name('clouds').onChange(changed);
air.add(preset.atmosphere, 'cloudScale', 0.1, 20, 0.01).name('cloud scale').onChange(changed);
air.add(preset.atmosphere, 'cloudDetail', 0, 8, 0.1).name('cloud detail').onChange(changed);
air.add(preset.atmosphere, 'cloudRoughness', 0, 1, 0.01).name('cloud roughness').onChange(changed);
air.add(preset.atmosphere, 'cloudLacunarity', 1, 4, 0.01).name('cloud lacunarity').onChange(changed);
air.add(preset.atmosphere, 'cloudFrom', 0, 1, 0.001).name('cloud from').onChange(changed);
air.add(preset.atmosphere, 'cloudTo', 0, 1, 0.001).name('cloud to').onChange(changed);
air.close();

const stars = gui.addFolder('Stars');
stars.add(preset.sky, 'seed', 0, 10000, 1).onChange(changed);
stars.add(preset.sky, 'reference', 10, 180, 1).name('as many as Blender at (mm)').onChange(changed);
preset.sky.layers.forEach((layer, i) => {
  stars.add(layer, 'scale', 5, 500, 1).name(`layer ${i + 1} scale`).onChange(changed);
  stars.add(layer, 'size', 0.5, 10, 0.1).name(`layer ${i + 1} size (px)`).onChange(changed);
});
stars.add(preset.sky.patches, 'strength', 0, 6, 0.01).name('brightness').onChange(changed);
stars.add(preset.sky.patches, 'scale', 0.1, 20, 0.01).name('patch scale').onChange(changed);
stars.add(preset.sky.patches, 'from', 0, 1, 0.001).name('patches: black at').onChange(changed);
stars.add(preset.sky.patches, 'to', 0, 1, 0.001).name('patches: white at').onChange(changed);
stars.add(preset.sky.tint, 'spread', 0, 1, 0.01).name('tint spread').onChange(changed);
preset.sky.tint.stops.forEach((stop, i) => {
  stars.addColor(stop, 'colour').name(`tint ${i + 1}`).onChange(changed);
  stars.add(stop, 'at', 0, 1, 0.001).name(`tint ${i + 1} from`).onChange(changed);
});
stars.addColor(preset.sky.nebula, 'colour').name('nebula colour').onChange(changed);
stars.add(preset.sky.nebula, 'scale', 0.05, 10, 0.01).name('nebula scale').onChange(changed);
stars.add(preset.sky.nebula, 'from', 0, 1, 0.001).name('nebula from').onChange(changed);
stars.add(preset.sky.nebula, 'to', 0, 1, 0.001).name('nebula to').onChange(changed);
stars.close();

// Grain like the EEVEE render's (owner, 2026-11-10).
const grain = gui.addFolder('Grain');
grain.add(preset.grain, 'amount', 0, 1, 0.005).onChange(changed);
grain.add(preset.grain, 'size', 0.5, 4, 0.05).name('size (px)').onChange(changed);
grain.add(preset.grain, 'response', 0, 1, 0.01).name('more in the darks').onChange(changed);
grain.add(preset.grain, 'colour', 0, 1, 0.01).name('colour (0: grey)').onChange(changed);
grain.add(preset.grain, 'moving').name('new each frame').onChange(changed);

const shading = gui.addFolder('Shading');
shading.add(preset, 'bump', 0, 1, 0.01).name('coast bump').onChange(changed);
shading.add(preset, 'emission', 0, 1, 0.01).onChange(changed);
shading.add(preset, 'rimIor', 1, 2, 0.01).name('rim (Fresnel IOR)').onChange(changed);
shading.close();

viewChanged();

let drag: { x: number; y: number } | null = null;
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  // Slower when zoomed in, so the surface under the cursor moves about as fast at every focal length.
  const degPerPixel = (0.3 * 50) / view.focalLength;
  view.spin = THREE.MathUtils.euclideanModulo(view.spin + (e.clientX - drag.x) * degPerPixel + 180, 360) - 180;
  tip.rotation.x = THREE.MathUtils.clamp(tip.rotation.x + THREE.MathUtils.degToRad((e.clientY - drag.y) * degPerPixel), -Math.PI / 2, Math.PI / 2);
  drag = { x: e.clientX, y: e.clientY };
  spinControl.updateDisplay();
  viewChanged();
});
const endDrag = () => (drag = null);
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('dblclick', () => (tip.rotation.x = 0));
canvas.style.cursor = 'grab';

// Dev hooks for checks.
Object.assign(window, { __planet: { preset, view, planet, sky, camera, renderer, viewChanged, changed } });

let last = performance.now();
let smoothed = 16;
renderer.setAnimationLoop((now: number) => {
  smoothed += (now - last - smoothed) * 0.05;
  last = now;
  sky.update(camera);
  renderer.render(scene, camera);
  info.textContent = `${view.focalLength} mm · ${smoothed.toFixed(1)} ms a frame${message ? ` · ${message}` : ''}`;
});
