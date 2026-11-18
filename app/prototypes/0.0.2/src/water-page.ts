// water-test.html: the pond water's test page (plan: doc/plans/features/ice-and-water.md, pass 2), dev
// only (not in the build). A pond with a sloped bed (shallow shelf, deeper middle, a gentle beach and a
// steep bank), rocks crossing the surface, two blocks of ice under it, three icebergs through it (the
// ice: ice.ts, pass 1) and a capsule (a character's size) walking in and out of the water. Drag to
// orbit, wheel to zoom. The panel edits both looks live; the last ones are kept in the browser (Copy
// puts one on the clipboard, for the game's defaults later).

import * as THREE from 'three/webgpu';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWater, WATER_DEFAULTS, type WaterLook } from './water';
import { createIce, ICE_DEFAULTS, type IceLook } from './ice';
import { noiseTile } from './terrain';

const STORE = 'zamboni-water-look';
const ICE_STORE = 'zamboni-ice-look';
const canvas = document.getElementById('view') as HTMLCanvasElement;
const info = document.getElementById('info') as HTMLElement;
const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
await renderer.init();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color().setRGB(0.2, 0.6, 1);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
camera.position.set(6, 4.5, 7);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, -0.2, 0);
controls.enableDamping = true;

// The penguin file's sun (yellowish) and a sky light.
const sun = new THREE.DirectionalLight(new THREE.Color().setRGB(0.993, 1, 0.377), 3);
sun.position.set(4, 8, 3);
scene.add(sun, new THREE.HemisphereLight(new THREE.Color().setRGB(0.3, 0.6, 1), new THREE.Color().setRGB(0.5, 0.45, 0.4), 1.2));

// The bed: 14 m square; a bowl 0.9 m deep at the middle, a shallow shelf, a gentle beach (−x) and a
// steep bank (+x), both up above the water.
const BED = 14;
const bedGeo = new THREE.PlaneGeometry(BED, BED, 96, 96).rotateX(-Math.PI / 2);
const pos = bedGeo.attributes.position as THREE.BufferAttribute;
const step = THREE.MathUtils.smoothstep;
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i);
  const z = pos.getZ(i);
  const r = Math.hypot(x * 0.9, z);
  const bowl = -0.9 * (1 - step(r, 1, 4.5));
  const shelf = -0.25 * (1 - step(r, 4.2, 5.2));
  const beach = 0.35 * step(-x, 4.6, 7);
  const bank = 0.6 * step(x, 4.3, 4.8);
  const far = 0.4 * step(Math.abs(z), 5, 6.5);
  pos.setY(i, bowl + shelf + beach + bank + far + 0.02 * Math.sin(x * 3.1) * Math.cos(z * 2.7));
}
bedGeo.computeVertexNormals();
const bed = new THREE.Mesh(bedGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.55, 0.62, 0.62), roughness: 1 }));
scene.add(bed);

// Rocks through the surface, and ice under it (as the penguin file's submerged blocks).
const rockMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.25, 0.27, 0.3), roughness: 0.9, flatShading: true });
const rocks: [number, number, number][] = [[-1.5, 1.2, 0.6], [2.2, -1.8, 0.45], [0.6, 2.8, 0.35], [-3.2, -2.2, 0.5]];
for (const [x, z, s] of rocks) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMat);
  rock.position.set(x, -0.1, z);
  rock.rotation.set(x, z, s * 3);
  scene.add(rock);
}
// The ice (ice.ts): the submerged blocks and three icebergs through the surface, faceted as the file's.
const ice = createIce();
const iceLook: IceLook = { ...ICE_DEFAULTS, ...(JSON.parse(localStorage.getItem(ICE_STORE) ?? '{}') as Partial<IceLook>) };
ice.set(iceLook);
const iceMat = ice.material;
const bergs: [number, number, number, number][] = [[3.2, 0.9, 0.4, 1.1], [-0.6, -3.4, 0.3, 0.8], [5.6, 1.6, 0.5, 1.3]];
for (const [x, z, y, s] of bergs) {
  const berg = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0).scale(1.3, 0.7, 1), iceMat);
  berg.position.set(x, y - 0.3, z);
  berg.rotation.set(0.2, x * 2, 0.1);
  scene.add(berg);
}
const ices: [number, number, number, number][] = [[0.8, -0.45, 0.2, 0.7], [-2, -0.12, -0.8, 0.5]];
for (const [x, y, z, s] of ices) {
  const block = new THREE.Mesh(new THREE.BoxGeometry(s * 1.4, s * 0.5, s), iceMat);
  block.position.set(x, y, z);
  block.rotation.y = x;
  scene.add(block);
}
// A character's size, walking from the beach into the shallows and back.
const walker = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.8, 4, 12), new THREE.MeshStandardMaterial({ color: 0xe05030 }));
scene.add(walker);

// The water.
const water = createWater(noiseTile(256, 32));
const look: WaterLook = { ...WATER_DEFAULTS, ...(JSON.parse(localStorage.getItem(STORE) ?? '{}') as Partial<WaterLook>) };
water.set(look);
const surface = new THREE.Mesh(new THREE.PlaneGeometry(BED, BED).rotateX(-Math.PI / 2), water.material);
scene.add(surface);

// The panel: every value; colours as three's (linear) values.
const gui = new GUI({ title: 'Water' });
const changed = () => {
  water.set(look);
  localStorage.setItem(STORE, JSON.stringify(look));
};
type ColourKey = 'shallow' | 'deep' | 'line' | 'foam' | 'skyHorizon' | 'skyMiddle' | 'skyZenith';
type NumberKey = Exclude<keyof WaterLook, ColourKey>;
const colour = (folder: GUI, key: ColourKey) => {
  const holder = { c: new THREE.Color().setRGB(...look[key]) };
  folder.addColor(holder, 'c').name(key).onChange(() => {
    look[key] = [holder.c.r, holder.c.g, holder.c.b];
    changed();
  });
};
const num = (folder: GUI, key: NumberKey, min: number, max: number, by = 0.001) => folder.add(look, key, min, max, by).onChange(changed);
const depthF = gui.addFolder('Depth');
colour(depthF, 'shallow');
colour(depthF, 'deep');
num(depthF, 'maxDepth', 0.05, 3);
num(depthF, 'bands', 0, 6, 1);
num(depthF, 'opacityShallow', 0, 1);
num(depthF, 'opacityDeep', 0, 1);
const webF = gui.addFolder('Web');
colour(webF, 'line');
num(webF, 'cellScale', 0.5, 15);
num(webF, 'cellSpeed', 0, 3);
num(webF, 'lineLow', 0, 0.3);
num(webF, 'lineHigh', 0, 0.3);
num(webF, 'smoothness', 0, 1);
num(webF, 'lineStrength', 0, 1);
num(webF, 'lineDeep', 0, 1);
num(webF, 'warpScale', 0.05, 5);
num(webF, 'warpAmount', 0, 3);
num(webF, 'warpSpeed', 0, 0.3);
const foamF = gui.addFolder('Foam');
colour(foamF, 'foam');
num(foamF, 'foamWidth', 0.01, 0.6);
num(foamF, 'foamBreak', 0, 1);
num(foamF, 'foamNoiseScale', 0.5, 30);
num(foamF, 'foamSolid', 0, 1);
const surfF = gui.addFolder('Surface');
num(surfF, 'metalness', 0, 1);
num(surfF, 'roughness', 0, 1);
num(surfF, 'reflection', 0, 2);
colour(surfF, 'skyHorizon');
colour(surfF, 'skyMiddle');
colour(surfF, 'skyZenith');
const iceF = gui.addFolder('Ice');
const iceChanged = () => {
  ice.set(iceLook);
  localStorage.setItem(ICE_STORE, JSON.stringify(iceLook));
};
for (const key of ['colour', 'wrapTint', 'rim'] as const) {
  const holder = { c: new THREE.Color().setRGB(...iceLook[key]) };
  iceF.addColor(holder, 'c').name(key).onChange(() => {
    iceLook[key] = [holder.c.r, holder.c.g, holder.c.b];
    iceChanged();
  });
}
iceF.add(iceLook, 'metalness', 0, 1, 0.001).onChange(iceChanged);
iceF.add(iceLook, 'roughness', 0, 1, 0.001).onChange(iceChanged);
iceF.add(iceLook, 'wrap', 0, 1, 0.001).onChange(iceChanged);
iceF.add(iceLook, 'wrapStrength', 0, 3, 0.001).onChange(iceChanged);
iceF.add(iceLook, 'rimPower', 0.5, 8, 0.01).onChange(iceChanged);
iceF.add(iceLook, 'rimStrength', 0, 2, 0.001).onChange(iceChanged);
const walk = { on: true };
gui.add(walk, 'on').name('capsule walks');
gui.add({ copy: () => void navigator.clipboard.writeText(JSON.stringify(look, null, 2)) }, 'copy').name('Copy water look');
gui.add({ copy: () => void navigator.clipboard.writeText(JSON.stringify(iceLook, null, 2)) }, 'copy').name('Copy ice look');
gui.add({ reset: () => location.reload() }, 'reset').name('Reload');
gui.add({ defaults: () => { localStorage.removeItem(STORE); localStorage.removeItem(ICE_STORE); location.reload(); } }, 'defaults').name('Defaults');

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

(window as unknown as { __water: unknown }).__water = { water, look, ice, iceLook, camera, controls, walker, renderer, walk };

const down = new THREE.Vector3(0, -1, 0);
const ray = new THREE.Raycaster();
let last = performance.now();
let walked = 0;
let frames = 0;
let since = last;
renderer.setAnimationLoop((now: number) => {
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
  last = now;
  if (walk.on) walked += dt;
  // From the beach (above the water) to about knee-deep and back, every 10 s.
  const k = 0.5 - 0.5 * Math.cos((walked / 10) * Math.PI * 2);
  walker.position.set(-6.2 + 2.7 * k, 5, 0.6 + Math.sin(walked * 0.6) * 0.8);
  ray.set(walker.position, down);
  const hit = ray.intersectObject(bed)[0];
  walker.position.y = (hit?.point.y ?? 0) + 0.6;
  controls.update();
  renderer.render(scene, camera);
  frames++;
  if (now - since > 500) {
    const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2';
    info.textContent = `${((frames * 1000) / (now - since)).toFixed(0)} fps · ${backend}`;
    frames = 0;
    since = now;
  }
});
