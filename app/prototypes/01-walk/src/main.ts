// Prototype 01 — Walk. A capsule walking around a large floor, third-person camera.
// Plan: doc/plans/prototypes/01-walk.md

import * as THREE from 'three/webgpu';
import { mount, unmount } from 'svelte';
import '@zamboni/ui/tokens.css';
import { GameAudio } from './audio';
import { Boombox } from './boombox';
import { FollowCamera } from './camera';
import { Character } from './character';
import { Input } from './input';
import { loadModels } from './model';
import { Physics } from './physics';
import { setReflections, setSingleSided, updateCutaway } from './cutaway';
import { loadCrew, type Crew } from './crew';
import { createDoorSounds, motorSound, type Pusher } from './doors';
import { Footsteps } from './footsteps';
import { findDevice, Interaction, shipInteractables } from './interaction';
import { JetpackRack } from './jetpack';
import { Ladders, shipLadders } from './ladders';
import { findLightMarkers, RoomLights } from './lights';
import { LoadProgress } from './loading';
import { addCollisionBoxes, loadShip, SHADOW_LAYER, updateShip, type Ship } from './ship';
import { settings } from './settings';
import StartScreen from './StartScreen.svelte';
import { Stats } from './stats';
import { antialiasEnabled, createTuningPanel } from './tuning';
import { updateVisibility } from './visibility';
import { createWorld, updateWorld } from './world';

const STEP = 1 / 60; // fixed simulation step
const TONE_MAPPING = { ACES: THREE.ACESFilmicToneMapping, AgX: THREE.AgXToneMapping, Neutral: THREE.NeutralToneMapping };
const MAX_STEPS = 5; // per frame, so a long pause doesn't spiral
/** The start screen's music dies away over this long once the button is used (s). */
const THEME_FADE = 1.5;
/** The start screen is taken away this long after the button is used (ms): its own fade is 600. */
const SCREEN_LEAVES = 700;
/** The start button comes after this many frames in a row made in under a tenth of a second... */
const WARM_FRAMES = 5;
/** ...or this long after the load (s), on a machine where no frame is that quick. */
const WARM_LIMIT = 6;

async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
  // The start screen first: it covers the view while everything below loads, with a bar for it.
  const startScreen = mount(StartScreen, { target: document.querySelector<HTMLElement>('#start')!, props: { onstart: (byPointer: boolean) => begin(byPointer) } });
  const loading = new LoadProgress((share) => startScreen.setProgress(share));

  const renderer = new THREE.WebGPURenderer({ canvas, antialias: antialiasEnabled(), powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  await renderer.init();

  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  console.info(`[01-walk] rendering with ${backend}`);

  const scene = new THREE.Scene();
  const world = createWorld(scene);
  setReflections(world.reflections);


  const character = new Character();
  scene.add(character.root);
  // Physics: a capsule the size of the character (Part 1 height), and the ground.
  const radius = 0.28;
  const physics = await Physics.create({ radius, halfHeight: settings.zamboniHeight / 2 - radius }, character.position);
  loading.set('physics', 1);

  // Character models, then the ship at the same scale; the capsule stays if they fail to load.

  let ship: Ship | null = null;
  let crew: Crew | null = null;
  let roomLights: RoomLights | null = null;
  let interaction: Interaction | null = null;
  let ladders: Ladders | null = null;
  let boombox: Boombox | null = null;
  let rack: JetpackRack | null = null;
  let doorSounds: (() => void) | null = null;
  let loaded = false; // the models, the ship and its shaders (or they failed: the game starts anyway)
  loadModels((share) => loading.set('models', share))
    .then(({ models, zamboniFileHeight }) => {
      loading.set('models', 1);
      character.setModels(models);
      return loadShip(scene, physics, settings.zamboniHeight / zamboniFileHeight, (share) => loading.set('ship', share));
    })
    .then(async (s) => {
      // The crew placed in the ship, and the room lights, before the shaders are built.
      // The ship's shadow comes from one merged mesh that only the sun's shadow camera sees.
      world.sun.shadow.camera.layers.enable(SHADOW_LAYER);
      loading.set('ship', 1);
      crew = await loadCrew(s.object, physics, (share) => loading.set('crew', share));
      loading.set('crew', 1);
      const markers = findLightMarkers(s.object);
      roomLights = new RoomLights(scene, markers);
      roomLights.update(character.position, 0);
      console.info(`[01-walk] room lights: ${markers.map((m) => m.name).join(', ')}`);
      // Build the ship's shaders now, not the first time each part comes into view (that stalled
      // the first frames). compileAsync skips what's outside the view, so culling is off meanwhile.
      const culled: THREE.Object3D[] = [];
      s.object.traverse((o) => {
        if (o.frustumCulled) culled.push(o);
        o.frustumCulled = false;
      });
      const start = performance.now();
      loading.creep('shaders', 4);
      await renderer.compileAsync(scene, view.camera);
      for (const o of culled) o.frustumCulled = true;
      console.info(`[01-walk] ship shaders compiled in ${Math.round(performance.now() - start)} ms`);
      const box = findDevice(s.object, 'boombox');
      if (box) boombox = new Boombox(box, audio);
      else console.warn('[01-walk] the ship has no boombox');
      // The doors' sounds, and the cargo ramp's motor (the ramp isn't a door in the code).
      const doors = createDoorSounds(s.object, s.doors, audio);
      const rampTarget = () => (settings.cargoRampOpen ? 1 : 0);
      const ramp = motorSound(audio, s.ramp, () => s.rampAmount !== rampTarget() && !s.rampWaiting, () => s.rampAmount === rampTarget());
      doorSounds = () => {
        doors();
        ramp();
      };
      rack = new JetpackRack(s.object, (id, at) => audio.play(id, at));
      if (rack.slots.length === 0) console.warn('[01-walk] the ship has no jetpack rack');
      const others = [...(boombox ? [boombox.interactable] : []), ...rack.interactables];
      interaction = new Interaction(shipInteractables(s.object, s.doors, others, (id, at) => audio.play(id, at)), physics, document.querySelector<HTMLElement>('#prompt')!);
      ladders = new Ladders(shipLadders(s.object, physics, s.ladderColliders));
      // After everything that measures the ship with rays (the ladders, the doors' ramp).
      addCollisionBoxes(s, physics);
      ship = s;
    })
    .catch((err: unknown) => console.warn('[01-walk] models or ship not loaded (the capsule stays):', err))
    .finally(() => (loaded = true));

  const view = new FollowCamera(window.innerWidth / window.innerHeight);
  const audio = new GameAudio(view.camera);
  // The start screen's music: heard there if the browser lets sound play before the player has done
  // anything (it does for a site they've played sound on before), or once they press or click something.
  audio.setLoop('mus_part1_theme', true, 0.5);
  const footsteps = new Footsteps((id, level) => audio.play(id, undefined, undefined, level));
  let rungs = 0; // hands on the ladder's rungs so far
  let jetSounding = false; // the jetpack's sound is on

  // Dev only: reachable from the browser console and test scripts.
  if (import.meta.env.DEV) Object.assign(window, { __settings: settings, __renderer: renderer, __scene: scene, __world: world, __character: character, __physics: physics, __ship: () => ship, __view: view, __THREE: THREE, __cut: () => ({ holeAmount, insideAmount }), __crew: () => crew, __interaction: () => interaction, __ladders: () => ladders, __boxes: () => ship?.boxColliders ?? null, __audio: audio, __boombox: () => boombox, __rack: () => rack,__footsteps: footsteps, __start: () => ({ ready, begun, share: loading.share }) });

  const gui = createTuningPanel({ pixelRatio: () => resize() });
  gui.hide(); // until the start screen is gone: it would lie over it
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
  let indoorLight = 0; // 0..1, eased: she's inside the ship (whether or not the see-through hull is on)
  let holeAmount = 0;
  const chest = new THREE.Vector3();
  const stepChest = new THREE.Vector3();

  // How a moving door moves her: sideways, through her controller; not while she's on a ladder.
  const pusher: Pusher = {
    push: (by) => {
      physics.move(by);
      character.position.copy(physics.feet);
    },
    climbing: () => ladders?.climbing ?? false,
    feet: () => character.position,
  };

  let last = performance.now();
  let accumulator = 0;

  // Paused while the mouse is released (Esc, or the browser taking it back), or by the gamepad's
  // Start / Options. Clicking the view captures the mouse again and resumes; so does any gamepad
  // button. The sound stops with the game. Not before the game has begun: the start screen is up.
  const pausedEl = document.querySelector<HTMLElement>('#paused')!;
  let paused = false;
  const setPaused = (on: boolean) => {
    if (!begun) return;
    paused = on;
    pausedEl.hidden = !on;
    audio.setPaused(on);
  };
  document.addEventListener('pointerlockchange', () => setPaused(document.pointerLockElement !== canvas));

  // The game begins when the start screen's button is used, which is also what turns the sound on:
  // browsers keep it off until a button, a key or a click (moving a stick doesn't count). The button
  // is there once everything is loaded.
  let ready = false;
  let begun = false;
  let warmTime = 0; // s of frames made since the load ended
  let smooth = 0; // how many of them in a row were quick
  function begin(byPointer: boolean): void {
    if (begun) return;
    begun = true;
    // The click waits for the sound to be on: this may be the first thing the player has done.
    void audio.unlock().then(() => audio.play('ui_click'));
    audio.setLoop('mus_part1_theme', false, THEME_FADE);
    // A click captures the mouse, as clicking the view does.
    if (byPointer) void Promise.resolve(canvas.requestPointerLock()).catch(() => undefined);
    gui.show();
    setTimeout(() => void unmount(startScreen), SCREEN_LEAVES);
  }

  renderer.setAnimationLoop((now: number) => {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;

    input.poll();
    // Sound: a gamepad button turns it on, as a key or a click does (if the browser counts it).
    if (input.padPressed) void audio.unlock();
    audio.update(dt, indoorLight);
    if (!begun) {
      // The start screen covers the view, and nothing is simulated.
      loading.update();
      loading.set('sounds', audio.loadedShare);
      if (input.padPressed) startScreen.press();
      // What was pressed to start isn't a jump or a use.
      input.consumeJump();
      input.consumeInteract();
      if (!loaded || audio.loadedShare < 1) {
        input.consumeLook(dt);
        return;
      }
      // Loaded: from here the frames are made as in the game, under the screen. The first ones
      // stall for a couple of seconds (the see-through shaders are built when they're first used),
      // and the button waits until that's over, so the game moves as soon as it's pressed.
      if (!ready) {
        warmTime += dt;
        smooth = warmTime > dt && dt < 0.1 ? smooth + 1 : 0;
        if (smooth >= WARM_FRAMES || warmTime > WARM_LIMIT) {
          ready = true;
          loading.finish();
          startScreen.setReady();
        }
      }
    } else if (paused && input.padPressed) setPaused(false);
    else if (input.pausePressed) {
      // Releasing the mouse pauses by itself; without it captured (a gamepad alone), pause here.
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      else setPaused(true);
    }
    if (paused) {
      // Nothing moves; the frame is still drawn (the tuning panel works while paused).
      accumulator = 0;
      input.consumeJump();
      input.consumeInteract();
      input.consumeLook(dt);
      renderer.render(scene, view.camera);
      return;
    }

    if (begun) accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < MAX_STEPS) {
      // Indoors: the same "inside" test as the see-through hull, on the simulated position.
      stepChest.copy(character.position).y += settings.cutTargetHeight;
      const indoors = ship !== null && ship.interior.containsPoint(stepChest);
      if (!ladders?.update(STEP, input, view.yaw, character, physics)) character.update(STEP, input, view.yaw, view.pitch, physics, indoors);
      // Doors and the ramp after her own move: a moving door pushes her out of its way.
      if (ship) updateShip(ship, STEP, false, pusher);
      accumulator -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) accumulator = 0;
    doorSounds?.();
    boombox?.update();
    rack?.update();
    if (ladders && ladders.rungs !== rungs) {
      rungs = ladders.rungs;
      audio.play('sfx_ladder_grab');
    }
    // The jetpack's sound loops while she flies (Part 1's, which stopped dead; a short fade here).
    if (character.flying !== jetSounding) {
      jetSounding = character.flying;
      if (jetSounding) audio.play('sfx_jetpack_loop');
      else audio.stop('sfx_jetpack_loop', undefined, 0.1);
    }
    // By R2 its level and pitch follow the trigger: quieter and lower hovering, full climbing.
    if (jetSounding) {
      const t = settings.jetSoundFollowsTrigger ? character.flyTrigger : null;
      audio.shape(
        'sfx_jetpack_loop',
        t === null ? 1 : THREE.MathUtils.lerp(settings.jetSoundLowLevel, 1, t * t),
        t === null ? 1 : THREE.MathUtils.lerp(settings.jetSoundLowRate, settings.jetSoundHighRate, t),
      );
    }

    character.render(accumulator / STEP);
    character.animate(dt);
    // Inside the ship: the hull is cut and the camera doesn't collide. Outside: camera collision.
    chest.copy(character.root.position).y += settings.cutTargetHeight;
    const inside = ship !== null && ship.interior.containsPoint(chest);
    // Above the ground she's on the ship (its ramps, before she's "inside"): the ground is flat for now.
    footsteps.update(character, inside || character.position.y > 0.15, ladders?.climbing ?? false);
    view.collide = !inside && settings.cameraCollision ? (from, to) => physics.castRay(from, to) : null;
    // Flying by Part 1's rule the camera's pitch steers her, so it may go below her; by R2 it doesn't.
    view.update(dt, input, character.root.position, inside, character.flying && character.flyTrigger === null);
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
    setSingleSided(settings.singleSided);
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
    // Interaction: the target nearest the screen centre within her reach; E / Circle uses it.
    const pressed = input.consumeInteract();
    interaction?.update(chest, view.camera, input.lastDevice, pressed);
    indoorLight = easeTo(indoorLight, inside ? 1 : 0, dt / 0.5);
    updateWorld(world, scene, character.root.position, indoorLight);
    crew?.mixer.update(dt);
    roomLights?.update(character.root.position, dt);
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
    'Gamepad: left stick move · right stick camera · A jump · R2 fly (half-way hovers) · B/◯ interact · Start/Options pause · View: tuning\n' +
    'Keyboard: click to capture mouse · WASD move · Shift walk · C jump · hold Space fly · E interact · Y invert · ` tuning\n' +
    'Ladders: walk into the foot; push toward the ladder to climb, away to climb down; at the top, push back or sideways to step off\n' +
    'Jetpack: take one from the rack in the cargo hold to fly; put it back there';
}

start().catch((err: unknown) => {
  console.error(err);
  document.body.textContent = `Failed to start: ${String(err)}`;
});
