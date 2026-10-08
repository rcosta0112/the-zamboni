// Prototype 01 — Walk. A capsule walking around a large floor, third-person camera.
// Plan: doc/plans/prototypes/01-walk.md

import * as THREE from 'three/webgpu';
import { FollowCamera } from './camera';
import { Character } from './character';
import { Input } from './input';
import { loadModels } from './model';
import { Physics } from './physics';
import { loadShip, type Ship } from './ship';
import { settings } from './settings';
import { Stats } from './stats';
import { createTuningPanel } from './tuning';
import { createWorld, updateWorld } from './world';

const STEP = 1 / 60; // fixed simulation step
const TONE_MAPPING = { ACES: THREE.ACESFilmicToneMapping, AgX: THREE.AgXToneMapping, Neutral: THREE.NeutralToneMapping };
const MAX_STEPS = 5; // per frame, so a long pause doesn't spiral

async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  await renderer.init();

  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  console.info(`[01-walk] rendering with ${backend}`);

  const scene = new THREE.Scene();
  const world = createWorld(scene);


  const character = new Character();
  scene.add(character.root);
  // Physics: a capsule the size of the character (Part 1 height), and the ground.
  const radius = 0.28;
  const physics = await Physics.create({ radius, halfHeight: settings.zamboniHeight / 2 - radius }, character.position);

  // Character models, then the ship at the same scale; the capsule stays if they fail to load.
  // Dev only: settings, renderer and character reachable from the browser console and test scripts.
  if (import.meta.env.DEV) Object.assign(window, { __settings: settings, __renderer: renderer, __character: character, __physics: physics });

  let ship: Ship | null = null;
  loadModels()
    .then(({ models, zamboniFileHeight }) => {
      character.setModels(models);
      return loadShip(scene, physics, settings.zamboniHeight / zamboniFileHeight);
    })
    .then((s) => (ship = s))
    .catch((err: unknown) => console.warn('[01-walk] models or ship not loaded (the capsule stays):', err));

  const view = new FollowCamera(window.innerWidth / window.innerHeight);

  const gui = createTuningPanel({
    cameraDistance: () => view.syncDistance(),
    pixelRatio: () => resize(),
  });
  const input = new Input(canvas, () => (gui._closed ? gui.open() : gui.close()));

  const stats = new Stats(document.querySelector<HTMLElement>('#stats')!, backend);
  showHelp();

  const size = new THREE.Vector2();
  function resize(): void {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.maxPixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    view.camera.aspect = window.innerWidth / window.innerHeight;
    view.camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  let accumulator = 0;

  renderer.setAnimationLoop((now: number) => {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;

    input.poll();

    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < MAX_STEPS) {
      character.update(STEP, input, view.yaw, physics);
      accumulator -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) accumulator = 0;

    character.render(accumulator / STEP);
    character.animate(dt);
    view.update(dt, input, character.root.position);
    updateWorld(world, scene, character.root.position);
    if (ship) ship.collider.visible = settings.showColliders;
    renderer.toneMappingExposure = settings.exposure;
    renderer.toneMapping = TONE_MAPPING[settings.toneMapping];

    renderer.render(scene, view.camera);
    renderer.getDrawingBufferSize(size);
    stats.frame(dt, size.x, size.y);
  });
}

function showHelp(): void {
  const el = document.querySelector<HTMLElement>('#help')!;
  el.textContent =
    'Gamepad: left stick move · right stick camera · A jump · D-pad zoom · View: tuning\n' +
    'Keyboard: click to capture mouse · WASD move · Shift walk · Space jump · wheel zoom · Y invert · ` tuning';
}

start().catch((err: unknown) => {
  console.error(err);
  document.body.textContent = `Failed to start: ${String(err)}`;
});
