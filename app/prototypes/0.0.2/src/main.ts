// Prototype 01 — Walk. A capsule walking around a large floor, third-person camera.
// Plan: doc/plans/prototypes/01-walk.md

import * as THREE from 'three/webgpu';
import { mount, unmount } from 'svelte';
import '@zamboni/ui/tokens.css';
import { DialogueBox } from '@zamboni/ui';
import { GameAudio } from './audio';
import { Boombox } from './boombox';
import { FollowCamera } from './camera';
import { Character } from './character';
import { run, type CommandTarget } from './commands';
import { Input } from './input';
import { loadModels, type ClimbTag, type Outfit } from './model';
import { Physics } from './physics';
import { setReflections, setSingleSided, updateCutaway } from './cutaway';
import { loadCrew, type Crew } from './crew';
import { CutscenePlayer } from './cutscene';
import { Dialogue } from './dialogue';
import { awayFromDoors, createDoorSounds, motorSound, type Pusher } from './doors';
import { Exhaust } from './exhaust';
import { Footsteps } from './footsteps';
import { crewInteractables, Interaction, respectLocks, shipInteractables, storyInteractables } from './interaction';
import { JetpackRack } from './jetpack';
import { LockerClothes } from './clothes';
import { facingOf, LadderClimb, shipLadders, type ClimbStart } from './ladders';
import { findLightMarkers, RoomLights } from './lights';
import { LoadProgress } from './loading';
import { readSave, clearSave, writeSave, type SaveData } from './save';
import { FIRST_SCENE, SceneDirector } from './scenes';
import { GameStory } from './story';
import { addCollisionBoxes, furnitureAt, hullWallAt, loadShip, SHADOW_LAYER, updateShip, type Ship } from './ship';
import { settings } from './settings';
import StartScreen, { type StartChoice } from './StartScreen.svelte';
import { Stats } from './stats';
import { antialiasEnabled, createTuningPanel } from './tuning';
import { updateVisibility } from './visibility';
import { Wind } from './wind';
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
/**
 * What the save keeps of her beyond the story (owner, 2026-10-22: the player never repeats an action
 * unless the story asks for it): each a setting kept with an Ink variable. The list grows as we go
 * (doc/plans/architecture/game-architecture/saving.md).
 */
const KEPT: { ink: string; get: () => boolean | string; set: (value: unknown) => void }[] = [
  { ink: 'green_outfit', get: () => settings.outfit, set: (v) => (v === 'jumpsuit' || v === 'parka') && (settings.outfit = v) },
  { ink: 'green_jetpack', get: () => settings.wearingJetpack, set: (v) => typeof v === 'boolean' && (settings.wearingJetpack = v) },
];

async function start(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#view')!;
  // The start screen first: it covers the view while everything below loads, with a bar for it.
  const startScreen = mount(StartScreen, { target: document.querySelector<HTMLElement>('#start')!, props: { onstart: (byPointer: boolean, choice: StartChoice) => begin(byPointer, choice) } });
  const loading = new LoadProgress((share) => startScreen.setProgress(share));
  // The dialogue box over the view: a story knot's lines, one at a time.
  const dialogueBox = mount(DialogueBox, { target: document.querySelector<HTMLElement>('#dialogue')! });
  const dialogue = new Dialogue((view) => dialogueBox.show(view), () => audio.play('ui_interact'), () => audio.play('ui_type'));
  const helpEl = document.querySelector<HTMLElement>('#help')!;

  const renderer = new THREE.WebGPURenderer({ canvas, antialias: antialiasEnabled(), powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  await renderer.init();

  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'WebGPU' : 'WebGL2';
  console.info(`[0.0.2] rendering with ${backend}`);

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
  let ladders: LadderClimb | null = null;
  let climbTag: ClimbTag | null = null;
  let boombox: Boombox | null = null;
  let rack: JetpackRack | null = null;
  let clothes: LockerClothes | null = null;
  const inkSeen: Record<string, unknown> = {}; // KEPT's Ink variables as last seen
  let doorSounds: (() => void) | null = null;
  let director: SceneDirector | null = null;
  let story: GameStory | null = null;
  let cutscene: CutscenePlayer | null = null;
  let saved: SaveData | null = null; // the checkpoint save read at load: *Continue*
  let shown: StartChoice = 'new'; // what the scene under the start screen is: a new game's, or the save's
  let loaded = false; // the models, the ship and its shaders (or they failed: the game starts anyway)
  loadModels((share) => loading.set('models', share))
    .then(({ models, climbTag: tag }) => {
      loading.set('models', 1);
      climbTag = tag;
      character.setModels(models);
      return loadShip(scene, physics, (share) => loading.set('ship', share));
    })
    .then(async (s) => {
      // The crew placed in the ship, and the room lights, before the shaders are built.
      // The ship's shadow comes from one merged mesh that only the sun's shadow camera sees.
      world.sun.shadow.camera.layers.enable(SHADOW_LAYER);
      loading.set('ship', 1);
      crew = await loadCrew(s.object, physics, s.entities, (share) => loading.set('crew', share));
      loading.set('crew', 1);
      const markers = findLightMarkers(s.object);
      roomLights = new RoomLights(scene, markers);
      roomLights.update(character.position, 0);
      console.info(`[0.0.2] room lights: ${markers.map((m) => m.name).join(', ')}`);
      // Build the ship's shaders now, not the first time each part comes into view (that stalled
      // the first frames). compileAsync skips what's outside the view, so culling is off meanwhile.
      const culled: THREE.Object3D[] = [];
      s.object.traverse((o) => {
        if (o.frustumCulled) culled.push(o);
        o.frustumCulled = false;
      });
      // Both her outfits too, or the first swap stalls (item 72).
      character.model?.showEveryOutfit();
      const start = performance.now();
      await renderer.compileAsync(scene, view.camera, null, (e) => loading.set('shaders', e.loaded / e.total));
      for (const o of culled) o.frustumCulled = true;
      console.info(`[0.0.2] ship shaders compiled in ${Math.round(performance.now() - start)} ms`);
      // The first scene (or `?scene=<id>` in dev builds), before the doors' sounds start listening.
      const disabled = new Set<string>();
      const target: CommandTarget = {
        entities: s.entities,
        disabled,
        play: (id, at) => audio.play(id, at),
        story: null,
        cutscene: (id) => void cutscene?.play(id).catch((err: unknown) => console.warn('[0.0.2] cutscene not played:', err)),
      };
      cutscene = new CutscenePlayer(s.object, (command) => run(command, target));
      // A checkpoint at a cutscene's end: the scene's, with the story as it is then.
      cutscene.onEnded = () => {
        if (begun && director?.current) checkpoint(director.current);
      };
      // The story first: a scene's setup reads it.
      target.story = await GameStory.load('/test/story.json', (command) => run(command, target)).catch((err: unknown) => {
        console.warn('[0.0.2] story not loaded:', err);
        return null;
      });
      story = target.story;
      // A knot that says nothing has ended at once; a conversation when the box ends it: saved either way.
      if (story) {
        story.onLines = (lines, topics) => dialogue.start(lines, topics);
        dialogue.onChoose = (index) => story?.choose(index);
      }
      dialogue.onEnded = saveNow;
      director = new SceneDirector(s, target, (at, yaw) => {
        physics.teleport(at);
        character.position.copy(at);
        character.verticalVelocity = 0;
        character.speed = 0;
        character.velocity.set(0, 0, 0);
        view.yaw = yaw;
      });
      // A save at each scene start, once the game has begun (not the scene under the start screen).
      director.onStarted = (id) => {
        if (begun) checkpoint(id);
      };
      saved = await readSave().catch((err: unknown) => {
        console.warn('[0.0.2] save not read:', err);
        return null;
      });
      // Under the start screen: the save's scene, as *Continue* will find it (a new game's if the
      // address asks for a scene).
      const asked = import.meta.env.DEV ? new URLSearchParams(location.search).get('scene') : null;
      if (saved && !asked && (await startFrom(saved))) shown = 'continue';
      else {
        // A save that can't be continued isn't offered.
        if (saved && !asked) saved = null;
        await director.start(asked ?? FIRST_SCENE).catch((err: unknown) => console.warn('[0.0.2] scene not started:', err));
      }
      const box = s.entities.ofKind('boombox')[0]?.object;
      if (box) boombox = new Boombox(box, audio);
      else console.warn('[0.0.2] the ship has no boombox');
      // The doors' sounds, and the cargo ramp's motor (the ramp isn't a door in the code).
      const doors = createDoorSounds(s.object, s.doors, audio);
      const rampTarget = () => (settings.cargoRampOpen ? 1 : 0);
      const ramp = motorSound(audio, s.ramp, () => s.rampAmount !== rampTarget() && !s.rampWaiting, () => s.rampAmount === rampTarget());
      doorSounds = () => {
        doors();
        ramp();
      };
      rack = new JetpackRack(s.entities, s.interior.getCenter(new THREE.Vector3()).x, (id, at) => audio.play(id, at));
      if (rack.slots.length === 0) console.warn('[0.0.2] the ship has no jetpack rack');
      ladders = new LadderClimb(shipLadders(s.entities, physics, s.ladderColliders), character, () => character.model?.climb ?? null, climbStart(s.object, climbTag), (margin) => awayFromDoors(s.doors, margin));
      clothes = new LockerClothes(s.entities, (id, at) => audio.play(id, at));
      const others = [...(boombox ? [boombox.interactable] : []), ...rack.interactables, ...clothes.interactables, ...ladders.interactables];
      const crewTargets = crewInteractables(s.entities, () => target.story, (knot) => run({ do: 'story', knot }, target));
      const storyTargets = storyInteractables(s.entities, () => target.story, (command) => run(command, target));
      const items = [...shipInteractables(s.entities, s.doors, others, (id, at) => audio.play(id, at), s.rampState), ...crewTargets, ...storyTargets];
      interaction = new Interaction(respectLocks(items, () => target.story, (command) => run(command, target)), physics, document.querySelector<HTMLElement>('#prompt')!, (then) => audio.play('ui_interact', undefined, then));
      interaction.roomsOf = s.roomsOf;
      interaction.disabled = disabled;
      // After everything that measures the ship with rays (the ladders, the doors' ramp).
      addCollisionBoxes(s, physics);
      wind.setShip(s);
      ship = s;
    })
    .catch((err: unknown) => console.warn('[0.0.2] models or ship not loaded (the capsule stays):', err))
    .finally(() => (loaded = true));

  const view = new FollowCamera(window.innerWidth / window.innerHeight);
  const audio = new GameAudio(view.camera);
  // The start screen's music: heard there if the browser lets sound play before the player has done
  // anything (it does for a site they've played sound on before), or once they press or click something.
  audio.setLoop('mus_part1_theme', true, 0.5);
  const footsteps = new Footsteps((id, level) => audio.play(id, undefined, undefined, level));
  let rungs = 0; // hands on the ladder's rungs so far
  let jetSounding = false; // the jetpack's sound is on
  const wind = new Wind(audio);
  const exhaust = new Exhaust(scene);

  // Dev only: reachable from the browser console and test scripts.
  if (import.meta.env.DEV) Object.assign(window, { __settings: settings, __renderer: renderer, __scene: scene, __world: world, __character: character, __physics: physics, __ship: () => ship, __entity: (id: string) => ship?.entities.get(id) ?? null, __view: view, __THREE: THREE, __cut: () => ({ holeAmount, insideAmount }), __crew: () => crew, __director: () => director, __cutscene: () => cutscene, __story: () => story, __interaction: () => interaction, __dialogue: dialogue, __ladders: () => ladders, __boxes: () => ship?.boxColliders ?? null, __audio: audio, __boombox: () => boombox, __rack: () => rack, __clothes: () => clothes, __outfit: (set?: Outfit) => (set ? (settings.outfit = set) : settings.outfit), __exhaust: exhaust, __footsteps: footsteps, __wind: wind, __start: () => ({ ready, begun, share: loading.share, shown }), __save: { read: readSave, clear: clearSave } });

  const round = (v: number) => Math.round(v * 1000) / 1000;
  const gui = createTuningPanel({ pixelRatio: () => resize() }, () => ({
    feet: character.position.toArray().map(round),
    yaw: round(view.yaw),
    pitch: round(view.pitch),
    camera: view.camera.position.toArray().map(round),
    cargoRampOpen: settings.cargoRampOpen,
    doorsOpen: ship?.doors.filter((d) => d.open).map((d) => d.name) ?? [],
    wearingJetpack: settings.wearingJetpack,
  }));
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
  let wasWatching = false; // a cutscene played last frame
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

  /** The saved checkpoint started again: the story as it was, then its scene. False if it couldn't be. */
  async function startFrom(save: SaveData): Promise<boolean> {
    if (!director || !story) return false;
    try {
      story.restore(save.story);
      await director.start(save.checkpoint);
      return true;
    } catch (err: unknown) {
      console.warn('[0.0.2] the save could not be continued:', err);
      story.reset();
      return false;
    }
  }

  /** The checkpoint save: the scene just started and the story's state. */
  function checkpoint(id: string): void {
    if (!story) return;
    void writeSave({ checkpoint: id, location: 'ship', story: story.state(), missionData: [], chat: [] }).catch((err: unknown) => console.warn('[0.0.2] not saved:', err));
  }

  /** The checkpoint written again with the story as it is now (after a conversation, or KEPT changed); not during a cutscene: its end saves. */
  function saveNow(): void {
    if (begun && director?.current && !cutscene?.playing) checkpoint(director.current);
  }

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
  function begin(byPointer: boolean, choice: StartChoice): void {
    if (begun) return;
    begun = true;
    // The scene under the screen is the one chosen, or it starts now (and saves, as every scene start does).
    if (choice === 'continue' && shown !== 'continue' && saved) {
      void startFrom(saved).then(async (ok) => {
        if (!ok) await director?.start(FIRST_SCENE);
      });
    } else if (choice === 'new' && shown !== 'new') {
      story?.reset();
      void director?.start(FIRST_SCENE).catch((err: unknown) => console.warn('[0.0.2] scene not started:', err));
    } else if (director?.current) checkpoint(director.current);
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
    // A conversation holds her still: no move, jump or flight. The camera still turns (owner, 2026-10-21).
    if (dialogue.active) input.hold();
    // Sound: a gamepad button turns it on, as a key or a click does (if the browser counts it).
    if (input.padPressed) void audio.unlock();
    audio.update(dt, indoorLight);
    if (!begun) {
      // The start screen covers the view, and nothing is simulated.
      loading.set('sounds', audio.loadedShare);
      if (input.menuStep) startScreen.move(input.menuStep);
      else if (input.padPressed) startScreen.press();
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
        // The bar's last part: quick frames in a row, or the time limit, whichever is further.
        loading.set('warm', Math.max(smooth / WARM_FRAMES, warmTime / WARM_LIMIT));
        if (smooth >= WARM_FRAMES || warmTime > WARM_LIMIT) {
          ready = true;
          loading.finish();
          // CONTINUE whenever there's a save, also when `?scene=` put another scene under the screen.
          startScreen.setReady(saved !== null);
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
      renderer.render(scene, cutscene?.playing ? cutscene.camera : view.camera);
      return;
    }

    // A cutscene: its own camera; she stands still, nothing can be used, the see-through is off.
    const watching = cutscene?.playing ?? false;
    if (cutscene && watching) {
      if (input.consumeSkip()) cutscene.skip();
      else cutscene.update(dt, view.camera.aspect);
      input.consumeJump();
      input.consumeLook(dt);
    } else input.consumeSkip(); // what's pressed in play isn't a skip later

    if (begun) accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < MAX_STEPS) {
      // Indoors: the same "inside" test as the see-through hull, on the simulated position.
      stepChest.copy(character.position).y += settings.cutTargetHeight;
      const indoors = ship !== null && ship.interior.containsPoint(stepChest);
      if (!watching && !ladders?.update(STEP, input, view.yaw, character, physics)) character.update(STEP, input, view.yaw, view.pitch, physics, indoors);
      // Doors and the ramp after her own move: a moving door pushes her out of its way.
      if (ship) updateShip(ship, STEP, false, pusher);
      accumulator -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS) accumulator = 0;
    doorSounds?.();
    boombox?.update();
    rack?.update();
    // What the save keeps of her (KEPT: her clothes, the jetpack): when Ink changes it (*Continue*, a
    // new game, a knot) she follows; otherwise Ink follows her (the locker, the rack, a command, the
    // tuning panel) and the checkpoint is written again.
    if (story) {
      let changed = false;
      for (const kept of KEPT) {
        const ink = story.get(kept.ink);
        if (ink !== inkSeen[kept.ink]) kept.set(ink);
        else if (kept.get() !== ink) {
          story.set(kept.ink, kept.get());
          changed = true;
        }
        inkSeen[kept.ink] = story.get(kept.ink);
      }
      if (changed) saveNow();
    }
    clothes?.update(dt);
    if (ladders && ladders.rungs !== rungs) {
      rungs = ladders.rungs;
      audio.play('sfx_ladder_grab');
    }
    // The jetpack's sound loops while she flies or the auto-parachute fires (Part 1's, which stopped
    // dead; a short fade here).
    if ((character.flying || character.parachuting) !== jetSounding) {
      jetSounding = character.flying || character.parachuting;
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
    // Not under the start screen: its music is heard there.
    if (begun) wind.update(dt, chest, ship);
    // Indoors: inside the hull, in front of the bulkheads and the crew quarters' furniture.
    const s = ship;
    view.collide = !inside
      ? settings.cameraCollision ? (from, to) => physics.castRay(from, to) : null
      : s && (settings.cameraInsideHull || settings.cameraCollidesFurniture || settings.cameraCollidesBulkheads)
        ? (from, to) => {
            const wall = settings.cameraInsideHull ? hullWallAt(s, from, to) : null;
            const blockers = [
              ...(settings.cameraCollidesFurniture ? s.cameraBlockers : []),
              ...(settings.cameraCollidesBulkheads ? s.cameraWalls : []),
            ];
            const boxes = settings.cameraCollidesFurniture ? s.cameraBoxes : [];
            const furniture = blockers.length > 0 || boxes.length > 0 ? furnitureAt(blockers, boxes, from, to) : null;
            return wall === null ? furniture : furniture === null ? wall : Math.min(wall, furniture);
          }
        : null;
    // In flight the camera's pitch steers her, so it may go below her; hovering it doesn't.
    // Not during a cutscene: the game's camera waits behind her for the hand-back.
    if (!watching) view.update(dt, input, character.root.position, inside, character.flying ? character.flightShare : 0);
    // She fades out when the camera comes close (not in a cutscene: its own camera), the glow with her.
    const shown = watching ? 1 : view.shown;
    character.setShown(shown);
    // The jetpack's glow, at its nozzles as the animation left them, facing the camera.
    exhaust.update(dt, character.jetpack, character.flying || character.parachuting, character.flyTrigger, view.camera, shown);
    // See-through: which furniture hides her, and whether anything solid does (the hole).
    const active = inside && settings.seeThrough && !watching;
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
    // A cut into or out of a cutscene doesn't fade the see-through: it's there or not at once.
    if (watching !== wasWatching) {
      insideAmount = active ? 1 : 0;
      holeAmount = holeOpen ? 1 : 0;
      wasWatching = watching;
    }
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
      fillColour: settings.hullGapBlack ? '#000000' : settings.hullGapColour,
      holeEnd: settings.holeEnd,
      holeBeyond: settings.holeBeyond,
    });
    // A conversation: the button completes the line, then the next, picks a topic, or ends it.
    const talking = dialogue.active;
    const step = input.consumeChoiceStep();
    dialogue.update(dt, talking && input.consumeAdvance(), talking ? step : 0, input.lastDevice);
    helpEl.hidden = dialogue.active; // it sits where the box goes
    // Interaction: the target nearest the screen centre within her reach; E / Circle uses it.
    const pressed = input.consumeInteract();
    // While she climbs nothing else can be used (owner: control is taken, but not the camera); nor
    // while she talks, nor for a moment after.
    interaction?.update(chest, character.facing, view.camera, input.lastDevice, pressed, (ladders?.climbing ?? false) || watching || talking || dialogue.active || dialogue.cooling);
    indoorLight = easeTo(indoorLight, inside ? 1 : 0, dt / 0.5);
    updateWorld(world, scene, character.root.position, indoorLight);
    crew?.mixer.update(dt);
    // The crew are back (owner, 2026-10-15), except while she's inside on the lower deck: they're all
    // upstairs, can't be cut, and would stand in the hole's way.
    if (crew) {
      const hullOnly = settings.seeThrough && settings.seeThroughStage === 'hull only';
      crew.object.visible = watching || !(hullOnly && active && character.root.position.y < (ship?.upperFloorY ?? 0) - 0.5);
    }
    roomLights?.update(character.root.position, dt);
    renderer.toneMappingExposure = settings.exposure;
    renderer.toneMapping = TONE_MAPPING[settings.toneMapping];
    // Until the start button is ready, both her outfits are drawn under the start screen, so their
    // see-through and shadow shaders are built in the warm-up with the rest (item 72).
    if (!ready) character.model?.showEveryOutfit();

    renderer.render(scene, cutscene?.playing ? cutscene.camera : view.camera);
    renderer.getDrawingBufferSize(size);
    stats.frame(dt, size.x, size.y);
  });
}

function easeTo(value: number, target: number, step: number): number {
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
}

/** Where the climbing animation starts, in the world: from the `climb` tag on her model (ship space). */
function climbStart(ship: THREE.Object3D, tag: ClimbTag | null): ClimbStart | null {
  if (!tag) return null;
  ship.updateMatrixWorld(true);
  const feet = ship.localToWorld(new THREE.Vector3(...tag.start));
  const ahead = ship.localToWorld(new THREE.Vector3(...tag.start).add(new THREE.Vector3(...tag.facing))).sub(feet);
  ahead.y = 0;
  return { feet, facing: facingOf(ahead.normalize()) };
}

function showHelp(): void {
  const el = document.querySelector<HTMLElement>('#help')!;
  el.textContent =
    'Gamepad: left stick move · right stick camera · A jump · R2 fly (half-way hovers; push the stick to fly, let go to glide) · B/◯ interact · Start/Options pause · View: tuning\n' +
    'Keyboard: click to capture mouse · WASD move · Shift walk · C jump · hold Space fly · E interact · Y invert · ` tuning\n' +
    'Ladder: at its foot, E / B to climb; from the floor above, drop through the opening\n' +
    'Jetpack: take one from the rack in the cargo hold to fly; put it back there';
}

start().catch((err: unknown) => {
  console.error(err);
  document.body.textContent = `Failed to start: ${String(err)}`;
});
