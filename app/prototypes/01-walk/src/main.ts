// Prototype 01 — Walk. A capsule walking around a large floor, third-person camera.
// Plan: doc/plans/prototypes/01-walk.md

import * as THREE from 'three/webgpu';
import { FollowCamera } from './camera';
import { Character } from './character';
import { Input } from './input';
import { loadModels } from './model';
import { Physics } from './physics';
import { updateCutaway } from './cutaway';
import { loadShip, updateShip, type Ship } from './ship';
import { settings } from './settings';
import { Stats } from './stats';
import { antialiasEnabled, createTuningPanel } from './tuning';
import { updateVisibility } from './visibility';
import { createWorld, updateWorld } from './world';

const STEP = 1 / 60; // fixed simulation step
const TONE_MAPPING = { ACES: THREE.ACESFilmicToneMapping, AgX: THREE.AgXToneMapping, Neutral: THREE.NeutralToneMapping };
const MAX_STEPS = 5; // per frame, so a long pause doesn't spiral

async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: antialiasEnabled(), powerPreference: 'high-performance' });
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

  let ship: Ship | null = null;
  loadModels()
    .then(({ models, zamboniFileHeight }) => {
      character.setModels(models);
      return loadShip(scene, physics, settings.zamboniHeight / zamboniFileHeight);
    })
    .then(async (s) => {
      // Build the ship's shaders now, not the first time each part comes into view (that stalled
      // the first frames). compileAsync skips what's outside the view, so culling is off meanwhile.
      const culled: THREE.Object3D[] = [];
      s.object.traverse((o) => {
        if (o.frustumCulled) culled.push(o);
        o.frustumCulled = false;
      });
      const start = performance.now();
      await renderer.compileAsync(scene, view.camera);
      for (const o of culled) o.frustumCulled = true;
      console.info(`[01-walk] ship shaders compiled in ${Math.round(performance.now() - start)} ms`);
      ship = s;
    })
    .catch((err: unknown) => console.warn('[01-walk] models or ship not loaded (the capsule stays):', err));

  const view = new FollowCamera(window.innerWidth / window.innerHeight);

  // Dev only: reachable from the browser console and test scripts.
  if (import.meta.env.DEV) Object.assign(window, { __settings: settings, __renderer: renderer, __character: character, __physics: physics, __ship: () => ship, __view: view, __THREE: THREE, __cut: () => ({ holeAmount, insideAmount }) });

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
    // When the render is smaller than the window, the browser stretches it: hard square pixels, or smoothed.
    canvas.style.imageRendering = settings.pixelated ? 'pixelated' : 'auto';
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    view.camera.aspect = window.innerWidth / window.innerHeight;
    view.camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // See-through hull: furniture cuts 0 outside the ship, eased to 1 inside; the structure's hole
  // eased to 1 while something solid hides her.
  let insideAmount = 0;
  let holeAmount = 0;
  const chest = new THREE.Vector3();
  const stepChest = new THREE.Vector3();

  let last = performance.now();
  let accumulator = 0;

  // Paused while the mouse is released (Esc, or the browser taking it back). Clicking the view
  // captures it again and resumes; so does any gamepad button.
  const pausedEl = document.querySelector<HTMLElement>('#paused')!;
  let paused = false;
  const setPaused = (on: boolean) => {
    paused = on;
    pausedEl.hidden = !on;
  };
  document.addEventListener('pointerlockchange', () => setPaused(document.pointerLockElement !== canvas));

  renderer.setAnimationLoop((now: number) => {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;

    input.poll();
    if (paused && input.padPressed) setPaused(false);
    if (paused) {
      // Nothing moves; the frame is still drawn (the tuning panel works while paused).
      accumulator = 0;
      input.consumeJump();
      input.consumeLook(dt);
      renderer.render(scene, view.camera);
      return;
    }

    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < MAX_STEPS) {
      // Indoors: the same "inside" test as the see-through hull, on the simulated position.
      stepChest.copy(character.position).y += settings.cutTargetHeight;
      const indoors = ship !== null && ship.interior.containsPoint(stepChest);
      character.update(STEP, input, view.yaw, physics, indoors);
      accumulator -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) accumulator = 0;

    character.render(accumulator / STEP);
    character.animate(dt);
    // Inside the ship: the hull is cut and the camera doesn't collide. Outside: camera collision.
    chest.copy(character.root.position).y += settings.cutTargetHeight;
    const inside = ship !== null && ship.interior.containsPoint(chest);
    view.collide = !inside && settings.cameraCollision ? (from, to) => physics.castRay(from, to) : null;
    view.update(dt, input, character.root.position);
    // See-through: which furniture hides her, and whether anything solid does (the hole).
    const active = inside && settings.seeThrough;
    let holeOpen = active;
    if (ship) {
      const feet = character.root.position;
      holeOpen = updateVisibility(ship.cutUnits, {
        hull: ship.hullUnit,
        camera: view.camera.position,
        feet,
        height: settings.zamboniHeight,
        facing: character.facing,
        moving: character.movedSpeed > 0.3,
        active,
        deck: feet.y >= ship.upperFloorY - 0.5 ? 1 : 0,
      }, dt);
    }
    // Ease toward the targets (0.3 s); once there, stay (the old version stepped away every other
    // frame when already at the target, which made the hole flicker).
    insideAmount = easeTo(insideAmount, active ? 1 : 0, dt / 0.3);
    holeAmount = easeTo(holeAmount, holeOpen ? 1 : 0, dt / 0.3);
    updateCutaway(view.camera.position, chest, character.root.position.y, holeAmount, insideAmount, {
      radius: settings.cutRadius,
      softness: settings.cutSoftness,
      backColor: settings.cutBackColor,
      furnitureLook: settings.furnitureLook,
      minVisibility: settings.furnitureMinVisibility,
      showOccluders: settings.showOccluders,
      nearPart: settings.furnitureNearPart,
      waist: settings.furnitureWaist * settings.zamboniHeight,
      ownColour: settings.cutOwnColour,
      shade: settings.cutShade,
    });
    updateWorld(world, scene, character.root.position);
    if (ship) updateShip(ship, dt);
    renderer.toneMappingExposure = settings.exposure;
    renderer.toneMapping = TONE_MAPPING[settings.toneMapping];

    renderer.render(scene, view.camera);
    renderer.getDrawingBufferSize(size);
    stats.frame(dt, size.x, size.y);
  });
}

function easeTo(value: number, target: number, step: number): number {
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
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
