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
import type { Entities } from './entities';
import { run, type CommandTarget } from './commands';
import { Input } from './input';
import { loadModels, type ClimbTag, type Outfit, type PilotTag } from './model';
import { Physics } from './physics';
import { setReflections, setSingleSided, updateCutaway } from './cutaway';
import { loadCrew, type Crew } from './crew';
import { LookAt } from './look';
import { CutscenePlayer } from './cutscene';
import { Dialogue } from './dialogue';
import type { Interactable } from './interaction';
import { awayFromDoors, createDoorSounds, motorSound, type Pusher } from './doors';
import { Exhaust } from './exhaust';
import { ThrusterFlames } from './flames';
import { Clouds } from './clouds';
import { ExteriorLook } from './exterior';
import { Footsteps } from './footsteps';
import { crewInteractables, Interaction, respectLocks, shipInteractables, storyInteractables } from './interaction';
import { JetpackRack } from './jetpack';
import { Joystick } from './joystick';
import { LockerClothes } from './clothes';
import { Coffee, COFFEE_STATES, type CoffeeState } from './coffee';
import { facingOf, LadderClimb, shipLadders, type ClimbStart } from './ladders';
import { findLightMarkers, RoomLights } from './lights';
import { LoadProgress } from './loading';
import { readSave, clearSave, writeSave, type SaveData } from './save';
import { recentShots, restoreRecentShots, RANDOM_FLYBY } from './flight-shots/shots';
import { FIRST_SCENE, SceneDirector, TEST_SCENE } from './scenes';
import { GameStory } from './story';
import { WatchedConversation } from './watched';
import { ClosedWatch } from './when-closed';
import { SkipPrompt } from './skip-prompt';
import { addCollisionBoxes, furnitureAt, hullWallAt, loadShip, placeGear, SHADOW_LAYER, updateShip, type Ship } from './ship';
import { settings } from './settings';
import StartScreen, { type StartChoice } from './StartScreen.svelte';
import { Stations, stationsFolder } from './flight-test/stations';
import { CONTROL_SOURCES, Controls, controlsFolder } from './flight-test/controls';
import { ShipFlight } from './flight-test/flight';
import { Overlay, overlayFolder, overlayLook } from './flight-test/overlay';
import { BottomView, bottomFolder } from './flight-test/bottom-view';
import { keptApart } from './merge-rooms';
import { Stats } from './stats';
import { antialiasEnabled, createTuningPanel } from './tuning';
import { updateVisibility } from './visibility';
import { Wind } from './wind';
import { createWorld, updateWorld } from './world';
import { Treadmill } from './terrain';
import { Landmarks } from './landmarks';
import { LightColumn } from './light-column';
import { Synth } from './synth/synth';
import { PATCHES, SCANNER_PATCH } from './synth/presets';
import { PlanetShot } from './planet/shot';
import { Gadgets } from './gadgets';
import { BinocularView } from './binocular-view';

const STEP = 1 / 60; // fixed simulation step
/** Her left hand's bone and its length (m): the joystick points at its tail while she pilots, as the ship file's damped track does. */
const HAND = 'Hand_l';
const HAND_LENGTH = 0.141;
/** The binoculars' zoom sound dies away over this long (s) when the zoom stops. */
const ZOOM_SOUND_FADE = 0.08;
/** Without her model, her head is this far under the top of her height (m), as watched.ts takes the crew's. */
const HEAD_BELOW_TOP = 0.12;
/** Where cutscene 2's shots aim at her head, this far above her `Head` bone (m): standing, the old guess from her height (1.11 above her feet; the bone 0.695). */
const HEAD_ABOVE_BONE = 0.415;
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
 * After NEW GAME the screen is black while cutscene 1 runs behind it (SC-132): its first frames stall
 * once, about half a second in (SC-131). The black goes when the cutscene has passed this time (s)
 * and WARM_FRAMES quick frames have followed, or after WARM_LIMIT; the cutscene starts over under its fade.
 */
const BLACK_HELD = 1;
/** Landed on the plain: how far back along the sun the shadow camera sits (m), for the rocks nearest the ship (up to 190 m tall). */
const LANDED_SUN_BACK = 260;
/** The landed scene's ground collider reaches this far round the ship (m): past where the jetpack takes her in a while. */
const TERRAIN_COLLIDER = 2500;
/** An exterior cutscene's wind fades in over this long from its start (s; owner, 2026-10-24). */
const WIND_FADE_IN = 3;
/**
 * Scene 0050's wind starts once the title's last line is deleted (owner, 2026-11-11; about 8 s before the
 * cut) and fades in very slowly, over this long (s), its fade going on at the same pace into cutscene 1.
 */
const WIND_FADE_IN_0050 = 14;
/**
 * What the save keeps of her beyond the story (owner, 2026-10-22: the player never repeats an action
 * unless the story asks for it): each a setting kept with an Ink variable. The list grows as we go
 * (doc/plans/architecture/game-architecture/saving.md).
 */
/**
 * Dev builds, `?test` in the address: the checks' game (the test story, starting in the landed ship).
 * Without it the game's own story, from chapter 1.
 */
const TESTING = import.meta.env.DEV && new URLSearchParams(location.search).has('test');
/**
 * Dev builds, `?scene=<id>`: a new game from that point of the game's order, which then goes on as
 * usual: `planet` (scene 0050, the planet from space, then all that follows), `cutscene-1` (cutscene 1, the fly-by, then cutscene 2, then chapter 1: as a new game), `opening`
 * (cutscene 2, then chapter 1), or a scene's id (`chapter-1`, `landed`, the checks'…). A save isn't
 * continued meanwhile. Not in production builds (`import.meta.env.DEV` is false there).
 * The script's scene numbers work too (owner, 2026-11-08: `?scene=0700`), `SCENE_NUMBERS`.
 */
const ASKED_RAW = import.meta.env.DEV ? new URLSearchParams(location.search).get('scene') : null;
/**
 * The script's scene numbers (doc/story/scenes, `NNNN - Type - Description.md`) → the point they start.
 * 0400 (`flyby`): the `whats-that` scene, its intro (the flyby) played from the start. 0500: the
 * `whats-that` scene, the conversation at once. 0600 (`landing`): the landed scene, its intro (the
 * landing cutscene) played from the start (owner, 2026-11-10: every number goes to its scene).
 */
const SCENE_NUMBERS: Record<string, string> = { '0050': 'planet', '0100': 'cutscene-1', '0200': 'opening', '0300': 'chapter-1', '0400': 'flyby', '0500': 'whats-that', '0600': 'landing', '0700': 'landed' };
/** `?scene=landing` (0600): the landed scene, its landing cutscene played as a new game begins. */
const LANDING = 'landing';
/** `?scene=flyby` (0400): the `whats-that` scene, its flyby played as a new game begins. */
const FLYBY = 'flyby';
/**
 * `&shot=random` (flight-shots.md pass 3): the flyby (0400, a scene's intro `flyby`) swapped for a random
 * one, as `intro: "shot: random flyby"` plays it; to try random play, as nothing in the story is random yet.
 */
const FLYBY_PLAYED = import.meta.env.DEV && new URLSearchParams(location.search).get('shot') === 'random' ? `shot: ${RANDOM_FLYBY}` : FLYBY;
const ASKED = ASKED_RAW ? (SCENE_NUMBERS[ASKED_RAW] ?? ASKED_RAW) : null;
/**
 * Dev builds, `flight-test.html` (plan doc/plans/features/non-linear-travel/flight-test-scene.md): the flight
 * interfaces' test scene (`public/test/scenes/flight-test.json`), straight in: no animatic, the game begins by
 * itself once loaded (no start button; the sound waits for a first press, the browser's rule), never saved.
 * Her seat's *Sit down* without the coffee first.
 */
const FLIGHT_TEST = import.meta.env.DEV && location.pathname === '/flight-test.html';
const FLIGHT_TEST_SCENE = 'flight-test';
// Its consoles kept out of the per-room merge, to be split into controls (flight-test/controls.ts).
if (FLIGHT_TEST) for (const name of Object.values(CONTROL_SOURCES).flat()) keptApart.add(name);
/** The checkpoint save and *Continue*: off in the game for now (owner, 2026-10-24); kept in the checks' game, whose probes test it. */
const SAVING = TESTING;
/** The animatic's parts, before the first scene. */
const ANIMATIC_STEPS = ['planet', 'cutscene-1', 'opening'];
/** Cutscene 2's last shot, outside: the ship changing course (a track, as cutscene 1; owner, 2026-10-28). */
const OPENING_EXTERIOR = 'cutscene-2-exterior';
const firstScene = FLIGHT_TEST ? FLIGHT_TEST_SCENE : ASKED ? (ANIMATIC_STEPS.includes(ASKED) ? FIRST_SCENE : ASKED === LANDING ? 'landed' : ASKED === FLYBY ? 'whats-that' : ASKED) : TESTING ? TEST_SCENE : FIRST_SCENE;
/** What a new game plays before its first scene: the whole animatic (from the planet), from cutscene 1, cutscene 2 only, or nothing. */
const animaticFrom: 'planet' | 'cutscene-1' | 'opening' | null =
  FLIGHT_TEST ? null : ASKED === 'opening' ? 'opening' : ASKED === 'cutscene-1' ? 'cutscene-1' : ASKED === 'planet' ? 'planet' : TESTING || ASKED ? null : 'planet';
/** Her coffee (coffee.ts), once the ship is loaded. */
let coffee: Coffee | null = null;
/** She may sip now (main loop: on the ground, not climbing, seated or in a cutscene), for the drink press and its prompt. */
let coffeeCanSip = false;
const KEPT: { ink: string; get: () => boolean | string; set: (value: unknown) => void }[] = [
  { ink: 'green_outfit', get: () => settings.outfit, set: (v) => (v === 'jumpsuit' || v === 'parka') && (settings.outfit = v) },
  { ink: 'green_jetpack', get: () => settings.wearingJetpack, set: (v) => typeof v === 'boolean' && (settings.wearingJetpack = v) },
  { ink: 'green_coffee', get: () => coffee?.state ?? 'none', set: (v) => coffee !== null && COFFEE_STATES.includes(v as CoffeeState) && (coffee.state = v as CoffeeState) },
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
  // The animatic after NEW GAME (never shown again: *Continue* goes past it; not in the checks' game):
  // scene 0050 (the planet from space: planet/shot.ts, its own scene and camera), cutscene 1, the ship outside (`cutscene`, from the owner's fly-by), then cutscene 2 watched in the
  // ship (`watched`), ending on its exterior shot (`cutscene` again). Each can be skipped: a skip in the
  // conversation skips the exterior shot too.
  const barsEl = document.querySelector<HTMLElement>('#bars')!; // every cutscene's black bars
  const skipPrompt = new SkipPrompt(document.querySelector<HTMLElement>('#skip')!);
  let animatic: 'planet' | 'cutscene-1' | 'opening' | typeof OPENING_EXTERIOR | null = null; // the part last started
  const planetShot = animaticFrom === 'planet' ? new PlanetShot(document.querySelector<HTMLElement>('#title-card')!) : null;
  // A skip anywhere in the animatic skips the rest of it too, on to chapter 1 (0300; owner, 2026-11-18): each later part
  // started and skipped on the same frame (its end state, none of it drawn). A skip in cutscene 2 already did (no exterior shot).
  let skipAll = false;
  const playOpening = () => {
    animatic = 'opening';
    void watched?.play('opening', view.camera.aspect).catch((err: unknown) => console.warn('[0.0.2] cutscene 2 not played:', err));
    if (!skipAll || !watched?.playing) return;
    watched.skip();
    watched.update(view.camera.aspect, 0); // ended now: its onEnded (skipped: no exterior shot)
  };

  const renderer = new THREE.WebGPURenderer({ canvas, antialias: antialiasEnabled(), powerPreference: 'high-performance', stencil: FLIGHT_TEST }); // flight-test.html: the controls' outline uses the stencil
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
  let look: LookAt | null = null; // whoever she talks to and she look at each other (look.ts)
  let roomLights: RoomLights | null = null;
  let interaction: Interaction | null = null;
  let ladders: LadderClimb | null = null;
  let climbTag: ClimbTag | null = null;
  let pilotTag: PilotTag | null = null; // where she sits piloting (her model's `pilot` tag)
  // Seated (the `seat` command, chapter 1's start): her piloting loop in her seat, held there until
  // she gets up (*Get up*: placed where the scene starts her, the aisle behind the seat).
  const seated = new Set<string>();
  let aisle: { at: THREE.Vector3; yaw: number } | null = null; // where the scene started her
  let getUp: Interactable | null = null;
  let sitDown: Interactable | null = null; // *Sit down* at her seat, in a scene with `sitDown` (chapter 1: on to the landed scene)
  let joystick: Joystick | null = null;
  /** flight-test.html's station cameras (Tab / Shift+Tab), once the ship and crew are in. */
  let stations: Stations | null = null;
  let controls: Controls | null = null;
  /** flight-test.html's take-off and landing (pass 3): the controls on the panel for now, the ship's height and speed. */
  const shipFlight = FLIGHT_TEST ? new ShipFlight(() => treadmill?.standingHeight() ?? settings.flightHeight, () => ship?.rampState ?? null) : null;
  /** The camera drawn: a station's, or the game's. */
  const overlay = shipFlight ? new Overlay(shipFlight) : null; // flight-test.html: each station's 2D overlay
  const bottomView = shipFlight ? new BottomView(renderer, scene) : null; // flight-test.html: the view under the ship (pass 3b)
  const gameCamera = () => (stations?.current ? stations.camera : view.camera);
  const hand = new THREE.Vector3();
  const handAxis = new THREE.Vector3();
  let boombox: Boombox | null = null;
  let rack: JetpackRack | null = null;
  let clothes: LockerClothes | null = null;
  const inkSeen: Record<string, unknown> = {}; // KEPT's Ink variables as last seen
  let doorSounds: (() => void) | null = null;
  let director: SceneDirector | null = null;
  /** The scene's `whenClosed` (chapter 1: the viewport closed, Dr. Ogawa). */
  let closedWatch: ClosedWatch | null = null;
  let story: GameStory | null = null;
  let cutscene: CutscenePlayer | null = null;
  let treadmill: Treadmill | null = null; // the scenery going by while the ship flies
  let rockColliders: { remove: () => void } | null = null; // the landed scene's nearest rocks
  let landmarks: Landmarks | null = null; // the landed scene's buildings (the temple)
  // The temple's chord (owner, 2026-11-08), played by the synth where the shaft's `hum` is.
  let chord: { at: THREE.Object3D; synth: Synth; place: ReturnType<GameAudio['placed']> } | null = null;
  let flames: ThrusterFlames | null = null; // behind the turbines in exterior cutscenes
  const clouds = new Clouds(scene); // on the ground in the landing cutscene
  let exterior: ExteriorLook | null = null; // the hull's outside lit by the outside, in exterior cutscenes
  let watched: WatchedConversation | null = null; // cutscene 2: a conversation the player watches
  let afterWatched: ((skipped: boolean) => void) | null = null; // what a watched conversation starts at its end (a `watch` command's `then` scene)
  let saved: SaveData | null = null; // the checkpoint save read at load: *Continue*
  let shown: StartChoice = 'new'; // what the scene under the start screen is: a new game's, or the save's
  let loaded = false; // the models, the ship and its shaders (or they failed: the game starts anyway)
  loadModels((share) => loading.set('models', share))
    .then(({ models, climbTag: tag, pilotTag: pilot }) => {
      loading.set('models', 1);
      climbTag = tag;
      pilotTag = pilot;
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
      look = makeLook(character, s.entities, seated);
      const markers = findLightMarkers(s.object);
      roomLights = new RoomLights(scene, markers);
      roomLights.update(character.position, 0);
      console.info(`[0.0.2] room lights: ${markers.map((m) => m.name).join(', ')}`);
      const turbineNodes = s.turbines.map((t) => t.node);
      flames = await ThrusterFlames.load(s.object, scene, turbineNodes, s.turbines.filter((t) => t.front).map((t) => t.node)).catch((err: unknown) => {
        console.warn('[0.0.2] thruster flames not shown:', err);
        return null;
      });
      // Build the ship's shaders now, not the first time each part comes into view (that stalled
      // the first frames). compileAsync skips what's outside the view, so culling is off meanwhile.
      const culled: THREE.Object3D[] = [];
      s.object.traverse((o) => {
        if (o.frustumCulled) culled.push(o);
        o.frustumCulled = false;
      });
      // Single-sided as the settings have it (the loop sets it only once loaded): set after the build,
      // it changed every ship material, rebuilt only as each came into view (cutscene 3's first cuts
      // stalled, its lines typing in jumps; 2026-11-07).
      setSingleSided(settings.singleSided);
      // Both her outfits too, or the first swap stalls (item 72).
      character.model?.showEveryOutfit();
      const start = performance.now();
      await renderer.compileAsync(scene, view.camera, null, (e) => loading.set('shaders', e.loaded / e.total));
      for (const o of culled) o.frustumCulled = true;
      console.info(`[0.0.2] ship shaders compiled in ${Math.round(performance.now() - start)} ms`);
      if (import.meta.env.DEV) Object.assign(window, { __shipCompiledIn: Math.round(performance.now() - start) });
      // The first scene (or `?scene=<id>` in dev builds), before the doors' sounds start listening.
      const disabled = new Set<string>();
      const target: CommandTarget = {
        entities: s.entities,
        disabled,
        locked: new Set(),
        seated,
        play: (id, at) => audio.play(id, at),
        story: null,
        cutscene: (id) => void cutscene?.play(id).catch((err: unknown) => console.warn('[0.0.2] cutscene not played:', err)),
        // A watched conversation from a scene's commands (chapter 1's first lines): nothing after it (not cutscene 2's
        // exterior shot, even with `animatic` still 'opening' after cutscene 2 was skipped).
        watch: (id, then) => {
          if (!watched) return console.warn(`[0.0.2] conversation ${id} not played: no story`);
          afterWatched = then ? (skipped) => void goTo(then, !skipped).catch((err: unknown) => console.warn(`[0.0.2] scene ${then} not started:`, err)) : () => {};
          void watched.play(id, view.camera.aspect).catch((err: unknown) => {
            console.warn(`[0.0.2] conversation ${id} not played:`, err);
            afterWatched = null;
          });
        },
        scene: (id) => void goTo(id).catch((err: unknown) => console.warn(`[0.0.2] scene ${id} not started:`, err)),
      };
      cutscene = new CutscenePlayer(s.object, (command) => run(command, target), [s.shadowCaster, s.interiorShadowCaster, s.glassShadowCaster]);
      // The sun as a bearing in the ship's space (Blender's, degrees from +X toward +Y): a flight shot's sun bucket.
      cutscene.sunBearing = () => {
        const local = world.sun.position.clone().sub(world.sun.target.position).applyQuaternion(s.object.quaternion.clone().invert());
        return (Math.atan2(-local.z, local.x) * 180) / Math.PI; // three's (x, y, z) → Blender's (x, -z, y)
      };
      // A checkpoint at a cutscene's end: the scene's, with the story as it is then.
      cutscene.onEnded = (id) => {
        if (begun && director?.current) checkpoint(director.current);
        if (id === 'cutscene-1' && animatic === 'cutscene-1') playOpening();
      };
      // The story first: a scene's setup reads it.
      target.story = await GameStory.load(TESTING ? '/test/story.json' : '/story/story.json', (command) => run(command, target)).catch((err: unknown) => {
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
      if (story) watched = new WatchedConversation(s.object, s.entities, story, dialogue, herHead);
      if (watched)
        watched.onEnded = (skipped) => {
          const after = afterWatched;
          afterWatched = null;
          if (after) return after(skipped);
          if (skipped || animatic !== 'opening') return;
          animatic = OPENING_EXTERIOR;
          void cutscene?.play(OPENING_EXTERIOR).catch((err: unknown) => console.warn('[0.0.2] cutscene 2 exterior not played:', err));
        };
      // The animatic's data now, so each part starts on the frame it's asked for (no frame of the ship's inside before it).
      if (planetShot) await renderer.compileAsync(planetShot.scene, planetShot.camera).catch((err: unknown) => console.warn('[0.0.2] the planet shot not compiled:', err));
      if (animaticFrom === 'planet' || animaticFrom === 'cutscene-1') await cutscene.load('cutscene-1').catch((err: unknown) => console.warn('[0.0.2] cutscene 1 not loaded:', err));
      if (animaticFrom) await watched?.load('opening').catch((err: unknown) => console.warn('[0.0.2] cutscene 2 not loaded:', err));
      if (!FLIGHT_TEST) await watched?.load('chapter-1-start').catch((err: unknown) => console.warn('[0.0.2] chapter 1 start not loaded:', err)); // so it starts on its frame
      if (ASKED === LANDING) await cutscene.load(LANDING).catch((err: unknown) => console.warn('[0.0.2] landing not loaded:', err));
      if (ASKED === FLYBY) await cutscene.load(FLYBY_PLAYED).catch((err: unknown) => console.warn('[0.0.2] flyby not loaded:', err));
      if (firstScene === 'whats-that') await watched?.load('whats-that').catch((err: unknown) => console.warn('[0.0.2] whats-that not loaded:', err));
      if (animaticFrom) await cutscene.load(OPENING_EXTERIOR).catch((err: unknown) => console.warn('[0.0.2] cutscene 2 exterior not loaded:', err));
      // Her place at a scene's start: its start, or her seat if the setup seated her (the start kept for getting up).
      const seat = s.entities.get('cockpit-seat-pilot')?.object ?? null;
      /** Her in her seat if she's seated there (false, and standing, without her model's pilot tag). */
      const sitHer = (): boolean => {
        const sitting = tagPlace(s.object, pilotTag?.at, pilotTag?.facing);
        if (!sitting) {
          console.warn('[0.0.2] her model has no pilot tag: she stays standing');
          seated.delete('green');
          return false;
        }
        placeHer(sitting.feet, sitting.facing);
        return true;
      };
      director = new SceneDirector(
        s,
        target,
        (at, yaw) => {
          aisle = { at: at.clone(), yaw };
          if (!seated.has('green') || !sitHer()) placeHer(at, yaw);
        },
        TESTING,
      );
      closedWatch = new ClosedWatch(s.entities, (command) => run(command, target));
      if (seat) {
        let seatCentre: THREE.Vector3 | null = null;
        const chestBox = new THREE.Box3();
        const seatForward = new THREE.Vector3();
        const toSeat = new THREE.Vector3();
        getUp = {
          name: 'Get up',
          objects: [seat],
          verb: () => 'Get up',
          act: () => {
            seated.delete('green');
            if (aisle) placeHer(aisle.at, aisle.yaw);
            // What the scene does as she gets up (chapter 1: her line).
            for (const command of director?.data?.getUp ?? []) run(command, target);
          },
        };
        // Back in her seat, in a scene that says what that does (chapter 1: the landed scene; its
        // requirements, Ogawa and the coffee, are the flying scene's pass 2).
        sitDown = {
          name: 'Sit down',
          objects: [seat],
          verb: () => 'Sit down',
          available: () => !seated.has('green') && (director?.data?.sitDown !== undefined), // `"sitDown": []`: offered, does nothing more
          // Offered whenever she's in the cockpit behind the seat and she or the camera looks forward
          // (owner, 2026-11-18): from all the aisle, before *Talk to Adam* beside it.
          claims: (chest, facing, cameraForward) => {
            if (!seatCentre) {
              // Once: the seat doesn't move in the ship, nor the ship turn.
              seatCentre = new THREE.Box3().setFromObject(seat).getCenter(new THREE.Vector3());
              const yaw = tagPlace(s.object, pilotTag?.at, pilotTag?.facing)?.facing ?? 0;
              seatForward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
            }
            if (!s.roomsOf(chestBox.set(chest, chest)).includes('cockpit')) return false;
            if (toSeat.subVectors(chest, seatCentre).dot(seatForward) >= 0) return false; // beside it or in front
            const cone = Math.cos(THREE.MathUtils.degToRad(SEAT_LOOK_DEG));
            const camera = Math.hypot(cameraForward.x, cameraForward.z);
            const byCamera = camera > 1e-3 && (cameraForward.x * seatForward.x + cameraForward.z * seatForward.z) / camera >= cone;
            const byFacing = -Math.sin(facing) * seatForward.x - Math.cos(facing) * seatForward.z >= cone;
            return byCamera || byFacing;
          },
          act: () => {
            // A coffee first (owner, 2026-11-18): her line until she has poured one.
            if (coffee && !coffee.poured && !FLIGHT_TEST) {
              run({ do: 'story', knot: 'seat_without_coffee' }, target);
              return;
            }
            coffee?.sitDown(); // the mug in her hand is gone
            seated.add('green');
            sitHer();
            for (const command of director?.data?.sitDown ?? []) run(command, target);
          },
        };
      } else console.warn('[0.0.2] the ship has no cockpit-seat-pilot: she cannot get up from it');
      joystick = Joystick.find(s.object);
      if (FLIGHT_TEST) {
        stations = new Stations(s.object, (who) => (who === 'green' ? (character.model?.object ?? null) : (s.entities.get(who)?.object ?? null)));
        controls = new Controls(s.object, () => audio.play('ui_interact'));
        bottomView?.place(s.object, s.interior.min.y);
      }
      // The scenery round the ship's centre, under its belly (the hull's bottom).
      const shipBox = new THREE.Box3().setFromObject(s.object);
      const shipCentre = { x: (shipBox.min.x + shipBox.max.x) / 2, z: (shipBox.min.z + shipBox.max.z) / 2 };
      treadmill = new Treadmill(scene, { ...shipCentre, belly: s.interior.min.y }, world.floor, world.reflections, world.sun);
      const lit = treadmill;
      landmarks = new Landmarks(scene, physics, (m) => lit.lightOutside(m, false), lit.landmarkLight);
      // Landed on the terrain (the landed scene): her ground is its hills, not the flat snow's.
      director.onTravel = (terrain, parkedAt) =>
        void treadmill
          ?.set(terrain, parkedAt)
          .then(() => {
            const parked = treadmill?.parkedAt != null;
            physics.setGround(parked ? treadmill!.groundMesh(TERRAIN_COLLIDER) : null);
            // The rocks nearest the ship collide (their convex hulls).
            rockColliders?.remove();
            rockColliders = parked && treadmill!.nearRocks.length > 0 ? physics.addStaticConvex(treadmill!.nearRocks) : null;
            // The scene's buildings on that ground (the temple), only while parked.
            const t = treadmill!;
            return landmarks?.show(parked ? (director?.data?.landmarks ?? []) : [], { object: s.object, centre: shipCentre }, (x, z) => t.groundY(x, z), t.nearRocks);
          })
          .catch((err: unknown) => console.warn('[0.0.2] terrain not shown:', err));
      view.groundAt = (x, z) => treadmill?.groundY(x, z) ?? 0;
      // The hull's outside as the exterior shots light it: its shaders built now, not at the first cut.
      const outside = treadmill;
      exterior = new ExteriorLook(s, (m, reflects) => outside.lightOutside(m, reflects));
      exterior.set(true);
      const unculled: THREE.Object3D[] = [];
      s.object.traverse((o) => {
        if (o.frustumCulled) unculled.push(o);
        o.frustumCulled = false;
      });
      const compiling = performance.now();
      await renderer.compileAsync(scene, view.camera);
      for (const o of unculled) o.frustumCulled = true;
      exterior.set(false);
      exterior.compiledIn = Math.round(performance.now() - compiling);
      console.info(`[0.0.2] the hull's outside: shaders compiled in ${exterior.compiledIn} ms`);
      // A save at each scene start, once the game has begun (not the scene under the start screen).
      director.onStarted = (id) => {
        if (begun) checkpoint(id);
      };
      saved = !SAVING
        ? null
        : await readSave().catch((err: unknown) => {
            console.warn('[0.0.2] save not read:', err);
            return null;
          });
      // Under the start screen: the save's scene, as *Continue* will find it (a new game's if the
      // address asks for a scene).
      if (saved && !ASKED && (await startFrom(saved))) shown = 'continue';
      else {
        // A save that can't be continued isn't offered; nor one while the address asks for a point.
        if (saved) saved = null;
        await director.start(firstScene).catch((err: unknown) => console.warn('[0.0.2] scene not started:', err));
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
      coffee = new Coffee(s.entities, (knot) => run({ do: 'story', knot }, target), () => target.story?.get('ship_flying') === true);
      const others = [...(boombox ? [boombox.interactable] : []), ...rack.interactables, ...clothes.interactables, ...coffee.interactables, ...ladders.interactables, ...(landmarks ? [landmarks.hologramToggle] : [])];
      const crewTargets = crewInteractables(s.entities, () => target.story, (knot, id) => {
        look?.set(['green', id]);
        run({ do: 'story', knot }, target);
      });
      const storyTargets = storyInteractables(s.entities, () => target.story, (command) => run(command, target));
      // Her seat's own knot gives way to *Sit down* while that's offered.
      const offered = sitDown;
      if (offered && seat)
        for (const t of storyTargets) {
          if (t.objects[0] !== seat) continue;
          const own = t.available;
          t.available = () => !offered.available!() && (own?.() ?? true);
        }
      if (offered) storyTargets.push(offered);
      const items = [...shipInteractables(s.entities, s.doors, others, (id, at) => audio.play(id, at), s.rampState), ...crewTargets, ...storyTargets];
      interaction = new Interaction(respectLocks(items, () => target.story, (command) => run(command, target), target.locked, () => audio.play('ui_wrong')), physics, document.querySelector<HTMLElement>('#prompt')!, (then) => audio.play('ui_interact', undefined, then));
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
  const lightColumn = new LightColumn(scene); // cutscene 3's column of light on the horizon (a placeholder)
  const gadgets = new Gadgets(); // her binoculars (gadgets.ts)
  const binocularView = new BinocularView(); // their zoom in first person, and the gadget prompt
  let zoomSound: -1 | 0 | 1 = 0; // which zoom sound is playing (binocularView.moving when it started)
  let scanSound = false; // the scanner's sound playing
  let scanSynth: Synth | null = null; // the scanner's sound (made on first use: the synth's *Scanner* patch)
  const eye = new THREE.Vector3();

  // Dev only: reachable from the browser console and test scripts.
  if (import.meta.env.DEV) Object.assign(window, { __settings: settings, __renderer: renderer, __scene: scene, __world: world, __character: character, __physics: physics, __ship: () => ship, __coffee: () => coffee, __entity: (id: string) => ship?.entities.get(id) ?? null, __view: view, __THREE: THREE, __cut: () => ({ holeAmount, insideAmount }), __crew: () => crew, __look: () => look, __director: () => director, __treadmill: () => treadmill, __landmarks: () => landmarks, __flames: () => flames, __clouds: clouds, __exterior: () => exterior, __cutscene: () => cutscene, __watched: () => watched, __skip: skipPrompt,__story: () => story, __interaction: () => interaction, __dialogue: dialogue, __ladders: () => ladders, __boxes: () => ship?.boxColliders ?? null, __audio: audio, __boombox: () => boombox, __rack: () => rack, __clothes: () => clothes, __outfit: (set?: Outfit) => (set ? (settings.outfit = set) : settings.outfit), __exhaust: exhaust, __footsteps: footsteps, __wind: wind, __start: () => ({ ready, begun, share: loading.share, shown, animatic, black }), __planetShot: planetShot, __gadgets: gadgets, __binocularView: binocularView, __scanSynth: () => scanSynth, __save: { read: readSave, clear: clearSave, recentShots }, __stations: () => stations, __controls: () => controls, __flight: () => shipFlight, __overlay: () => overlay, __bottomView: () => bottomView });

  const round = (v: number) => Math.round(v * 1000) / 1000;
  const gui = createTuningPanel({ pixelRatio: () => resize(), outerDoors: () => director?.applyOuterDoors() }, () => ({
    feet: character.position.toArray().map(round),
    yaw: round(view.yaw),
    pitch: round(view.pitch),
    camera: view.camera.position.toArray().map(round),
    cargoRampOpen: settings.cargoRampOpen,
    doorsOpen: ship?.doors.filter((d) => d.open).map((d) => d.name) ?? [],
    wearingJetpack: settings.wearingJetpack,
  }));
  if (FLIGHT_TEST) {
    shipFlight!.folder(gui); // her seat's controls (take-off and landing), on top
    overlayFolder(gui); // the 2D overlay's switch
    controlsFolder(gui); // the controls' outline
    stationsFolder(gui); // the station cameras' nudges
    bottomFolder(gui, bottomView!); // the view under the ship and its cost
  }
  gui.hide(); // until the start screen is gone: it would lie over it
  const input = new Input(canvas, () => (gui._closed ? gui.open() : gui.close()), () => resize());

  const stats = new Stats(document.querySelector<HTMLElement>('#stats')!, backend);
  showHelp();

  const size = new THREE.Vector2();
  function resize(): void {
    renderer.setPixelRatio(settings.pixelRatio);
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
  let heardOutside = false; // an exterior cutscene plays: the sound is heard from its camera, outside
  let windIn = 0; // the wind's fade-in so far (0..1): from an exterior cutscene's start, or scene 0050's last seconds, on into cutscene 1
  let windSlow = false; // the fade started in scene 0050: at its slow pace until done
  let indoorLight = 0; // 0..1, eased: she's inside the ship (whether or not the see-through hull is on)
  let holeAmount = 0;
  let wasWatching = false; // a cutscene played last frame
  const chest = new THREE.Vector3();
  const stepChest = new THREE.Vector3();

  /**
   * A scene started by the `scene` command (chapter 1's *Sit down*; a `watch` command's `then`): it, its
   * `intro` cutscene and the conversations its `begin` watches fetched first, then the scene and its intro
   * on the same frame, so the old scene's state is never drawn under it. `withIntro` false: no intro (the
   * conversation before it was skipped, as cutscene 2's skip skips its exterior shot).
   */
  async function goTo(id: string, withIntro = true): Promise<void> {
    if (!director) return;
    const loaded = await director.load(id);
    const data = loaded.intro === FLYBY ? { ...loaded, intro: FLYBY_PLAYED } : loaded;
    if (data.intro && withIntro) await cutscene?.load(data.intro).catch((err: unknown) => console.warn(`[0.0.2] cutscene ${data.intro} not loaded:`, err));
    for (const command of data.begin ?? []) if (command.do === 'watch') await watched?.load(command.id).catch((err: unknown) => console.warn(`[0.0.2] conversation ${command.id} not loaded:`, err));
    director.apply(id, data);
    if (data.intro && withIntro) void cutscene?.play(data.intro).catch((err: unknown) => console.warn(`[0.0.2] cutscene ${data.intro} not played:`, err));
  }

  /** Her feet there (world), facing `yaw`, the camera behind her: a scene's start, her seat, getting up. */
  function placeHer(at: THREE.Vector3, yaw: number): void {
    physics.teleport(at);
    character.position.copy(at);
    character.verticalVelocity = 0;
    character.speed = 0;
    character.velocity.set(0, 0, 0);
    view.yaw = yaw;
    character.facing = yaw; // she faces the way the camera looks
    character.settle(); // while seated no step moves her: drawn where she is
  }

  /** Her head (world), for cutscene 2's shots: from her `Head` bone as the animation has it (seated too); from her feet without a model. */
  const headPoint = new THREE.Vector3();
  function herHead(): THREE.Vector3 {
    const bone = character.model?.object.getObjectByName('Head');
    if (!bone) return headPoint.copy(character.position).setY(character.position.y + settings.zamboniHeight - HEAD_BELOW_TOP);
    bone.updateWorldMatrix(true, false);
    return bone.getWorldPosition(headPoint).setY(headPoint.y + HEAD_ABOVE_BONE);
  }

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
      restoreRecentShots(save.recentShots);
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
    if (!story || !SAVING) return;
    void writeSave({ checkpoint: id, location: 'ship', story: story.state(), missionData: [], chat: [], recentShots: recentShots() }).catch((err: unknown) => console.warn('[0.0.2] not saved:', err));
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
  const blackEl = document.querySelector<HTMLElement>('#black')!;
  const whiteEl = document.querySelector<HTMLElement>('#white')!; // scene 0050's end, under the bars
  /** The black after NEW GAME (or the white after scene 0050), while it's up (BLACK_HELD): how long, the quick frames in a row, which. */
  let black: { time: number; smooth: number; el: HTMLElement } | null = null;
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
        if (!ok) await director?.start(firstScene);
      });
    } else if (choice === 'new' && shown !== 'new') {
      story?.reset();
      restoreRecentShots(undefined);
      void director?.start(firstScene).catch((err: unknown) => console.warn('[0.0.2] scene not started:', err));
    } else if (director?.current) checkpoint(director.current);
    if (choice === 'new' && animaticFrom === 'planet' && planetShot) {
      input.consumeSkip(); // the press that started it
      animatic = 'planet';
      planetShot.onEnded = () => playCutscene1(whiteEl); // played out or skipped: cutscene 1 next, from white (owner, 2026-11-10)
      planetShot.onType = () => audio.play('ui_type'); // the dialogue's key sound
      planetShot.play();
    } else if (choice === 'new' && animaticFrom === 'cutscene-1') {
      input.consumeSkip(); // the press that started it
      playCutscene1();
    } else if (choice === 'new' && animaticFrom === 'opening') {
      input.consumeSkip();
      playOpening();
    } else if (choice === 'new' && ASKED === LANDING) {
      input.consumeSkip();
      void cutscene?.play(LANDING).catch((err: unknown) => console.warn('[0.0.2] landing not played:', err));
    } else if (choice === 'new' && ASKED === FLYBY) {
      input.consumeSkip();
      void cutscene?.play(FLYBY_PLAYED).catch((err: unknown) => console.warn('[0.0.2] flyby not played:', err));
    }
    // The click waits for the sound to be on: this may be the first thing the player has done.
    void audio.unlock().then(() => audio.play('ui_click'));
    audio.setLoop('mus_part1_theme', false, THEME_FADE);
    audio.noiseHeld = false; // the ship's noise, held under the start screen
    // A click captures the mouse, as clicking the view does.
    if (byPointer) void Promise.resolve(canvas.requestPointerLock()).catch(() => undefined);
    gui.show();
    setTimeout(() => void unmount(startScreen), SCREEN_LEAVES);
  }

  /** Cutscene 1, from black, or white after scene 0050 (held while its first frames stall: `black`). */
  const renderPlanet = () => drawPlanet(renderer, planetShot!);
  function playCutscene1(from: HTMLElement = blackEl): void {
    animatic = 'cutscene-1';
    from.style.opacity = ''; // scene 0050's fade, set each frame, gives way to the class
    from.style.transition = '';
    if (skipAll) {
      const played = cutscene?.play('cutscene-1');
      cutscene?.skip(); // loaded: started above, ended now (its onEnded: cutscene 2, skipped too)
      void played?.then(() => cutscene?.track?.id === 'cutscene-1' && cutscene.skip()).catch(() => playOpening());
      if (!cutscene) playOpening();
      return;
    }
    from.classList.add('on');
    black = { time: 0, smooth: 0, el: from };
    void cutscene?.play('cutscene-1').catch((err: unknown) => {
      console.warn('[0.0.2] cutscene 1 not played:', err);
      playOpening();
    });
  }

  renderer.setAnimationLoop((now: number) => {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;

    input.poll();
    // A conversation holds her still: no move, jump or flight. The camera still turns (owner, 2026-10-21).
    if (dialogue.active) input.hold();
    // Sound: a gamepad button turns it on, as a key or a click does (if the browser counts it).
    if (input.padPressed) void audio.unlock();
    // An exterior cutscene: the ship's noise mixed in as the camera zooms in (or comes near, with a fixed
    // lens: `heardNear`), up to nearly its level inside.
    audio.noiseShare = planetShot?.playing ? 0 : heardOutside ? (cutscene?.heardNear ?? 1) * settings.cutsceneShipNoiseEnd : 1; // space: silent
    audio.noiseOpen = heardOutside;
    audio.update(dt, heardOutside ? 1 : indoorLight);
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
          // CONTINUE whenever there's a save (none while the address asks for a point: `?scene=`).
          startScreen.setReady(saved !== null);
          if (FLIGHT_TEST) begin(false, 'new'); // no start button: straight in
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
      if (planetShot?.playing) renderPlanet();
      else renderer.render(scene, cutscene?.playing ? cutscene.camera : watched?.playing ? watched.camera : gameCamera());
      return;
    }

    // A cutscene: its own camera; she stands still, nothing can be used, the see-through is off.
    watched?.update(view.camera.aspect, dt);
    const inSpace = planetShot?.playing ?? false; // scene 0050
    const watching = inSpace || (cutscene?.playing ?? false) || (watched?.playing ?? false);
    barsEl.classList.toggle('on', watching || black !== null); // kept through the cut from scene 0050's white
    // Any press shows "Hold X to skip" (with dialogue, only X itself); held long enough, it skips (skip-prompt.ts). What's pressed in play isn't a skip later.
    const skipping = skipPrompt.update(dt, watching, input.consumeSkip(), input.skipHeld, input.lastDevice, !(cutscene?.playing ?? false) && (watched?.playing ?? false));
    if (skipping && (animatic === 'planet' || animatic === 'cutscene-1')) skipAll = true;
    if (inSpace) {
      if (skipping) planetShot!.skip();
      else planetShot!.update(dt, view.camera.aspect);
      if (planetShot!.playing) {
        whiteEl.style.transition = 'none'; // set each frame: its own fade, not the CSS one (that's for fading out)
        whiteEl.style.opacity = String(planetShot!.white); // its last seconds: to white
      }
      input.consumeJump();
      input.consumeLook(dt);
    } else if (cutscene?.playing) {
      if (skipping) cutscene.skip();
      else cutscene.update(dt, view.camera.aspect);
      // The gear held under the rocking hull on every frame, not only on the fixed steps (no lag).
      if (ship && cutscene.playing) {
        ship.gearRaised = cutscene.flight?.gear ?? null;
        ship.gearHold = cutscene.gearHold;
        placeGear(ship);
      }
      input.consumeJump();
      input.consumeLook(dt);
    } else if (skipping) watched?.skip();
    if (black) {
      black.time += dt;
      black.smooth = dt < 0.1 ? black.smooth + 1 : 0;
      const going = cutscene?.playing ?? false;
      // Skipped (or it failed to start): the black goes now.
      if ((!going && black.time > 0.5) || black.time > WARM_LIMIT || (going && cutscene!.time >= BLACK_HELD && black.smooth >= WARM_FRAMES)) {
        if (going) {
          cutscene!.time = 0;
          cutscene!.update(0, view.camera.aspect);
        }
        black.el.classList.remove('on');
        black = null;
      }
    }
    character.root.visible = !(cutscene?.hides('her') ?? false); // after a skip, shown on the same frame
    // A watched conversation: the presses go to the box; no jump, the camera is its own.
    if (watched?.playing) {
      input.consumeJump();
      input.consumeLook(dt);
    }

    // The scene's `begin` once she's the player's: the game begun, the animatic over.
    if (begun && !watching && !black) director?.takeOver();

    if (begun) accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < MAX_STEPS) {
      // Indoors: the same "inside" test as the see-through hull, on the simulated position.
      stepChest.copy(character.position).y += settings.cutTargetHeight;
      const indoors = ship !== null && ship.interior.containsPoint(stepChest);
      // Moving the ramp from its keypad holds her there until it gets there (owner, 2026-11-07):
      // walking onto it mid-move stopped it and left her stuck. Cleared on arrival (ship.ts).
      const atKeypad = settings.cargoRampByKeypad !== null;
      if (atKeypad && !watching) {
        character.speed = 0;
        character.velocity.set(0, 0, 0);
        character.settle();
        input.consumeJump();
      } else if (!watching && !seated.has('green') && !ladders?.update(STEP, input, view.yaw, character, physics)) character.update(STEP, input, view.yaw, view.pitch, physics, indoors);
      // Doors and the ramp after her own move: a moving door pushes her out of its way.
      if (ship) {
        // A cutscene that keys the flight (the landing) moves the gear itself.
        ship.gearRaised = cutscene?.flight?.gear ?? shipFlight?.keys.gear ?? null; // flight-test.html: its controls
        ship.turbinesDown = cutscene?.flight?.turbines ?? shipFlight?.keys.turbines ?? null;
        ship.gearHold = cutscene?.gearHold ?? null;
        updateShip(ship, STEP, false, pusher);
      }
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

    // Seated: her piloting loop in her seat (no move, no jump: the camera still turns); the joystick at her left hand.
    const sitting = seated.has('green');
    if (sitting) input.consumeJump();
    // B, C, Backspace (flight-test.html: let go of a dial, get up); the D-pad's and the mouse's for its controls. Dropped elsewhere.
    const backPressed = input.consumeBack();
    const selectStep = input.consumeSelectStep();
    const mouseMoved = input.consumeMouseMoved();
    if (character.model) character.model.seated = sitting;
    if (character.model && shipFlight) character.model.pilotSpeed = shipFlight.stick; // flight-test.html: her loop (and the joystick) only while moving forward (owner, 2026-11-23)
    // Her gadget (the binoculars, the scanner): out into her hands by its button, used by R1 (the binoculars raised to her eyes, a toggle; the scanner on while it's held); put away at once while her hands are taken.
    // No gadgets while she holds her coffee (owner, 2026-11-18): their buttons do nothing.
    const climbing = ladders?.climbing ?? false;
    const gadgetUse = input.consumeGadgetUse();
    gadgets.update(dt, input.consumeGadget(), gadgetUse, input.gadgetUseHeld, !sitting && !climbing && !watching && !dialogue.active && !(coffee?.holding ?? false), character.model?.gadgetSeconds ?? 0);
    // Her coffee: a sip only on the ground, not climbing, seated or in a cutscene (talking is fine: owner, 2026-11-18).
    if (coffee) {
      const canSip = character.grounded && !character.flying && !character.parachuting && !sitting && !climbing && !watching;
      // A sip on demand (owner, 2026-11-19): the right mouse button (R1's latch; no gadgets while she holds it). The pad's A: below, after the interaction.
      if (gadgetUse) coffee.drink(canSip);
      coffeeCanSip = canSip;
      coffee.update(dt, canSip, character.model?.coffeeSeconds ?? 0);
      if (character.model) {
        character.model.coffeeHeld = coffee.held;
        character.model.coffeeSip = coffee.sip;
        character.model.coffeeSipShare = coffee.sipShare;
      }
    }
    if (character.model) {
      character.model.gadgetHeld = gadgets.held;
      character.model.gadgetRaised = gadgets.raised;
      character.model.gadgetShown = gadgets.shown;
      character.model.gadgetScan = gadgets.scan;
    }
    // The scanner's sound (owner, 2026-11-16): the synth's *Scanner* patch (scanner-synth.html), its
    // note held while she scans (the attack on R1 down), released when she lets go (the patch's release).
    const scanning = gadgets.out === 'scanner' && gadgets.using;
    if (scanning !== scanSound) {
      if (scanning) (scanSynth ??= new Synth(audio.context, { ...SCANNER_PATCH }, audio.bus('sfx'))).play();
      else scanSynth?.stop();
      scanSound = scanning;
    }
    character.render(accumulator / STEP);
    character.animate(dt);
    const handBone = sitting ? (character.model?.object.getObjectByName(HAND) ?? null) : null;
    if (handBone) {
      handBone.updateWorldMatrix(true, false);
      // The bone's tail: along its Y axis from its head.
      handBone.getWorldPosition(hand).addScaledVector(handAxis.setFromMatrixColumn(handBone.matrixWorld, 1).normalize(), HAND_LENGTH);
    }
    joystick?.update(handBone ? hand : null);
    // Inside the ship: the hull is cut and the camera doesn't collide. Outside: camera collision.
    chest.copy(character.root.position).y += settings.cutTargetHeight;
    const inside = ship !== null && ship.interior.containsPoint(chest);
    // Above the ground she's on the ship (its ramps, before she's "inside"); the landed scene's ground has hills.
    footsteps.update(character, inside || character.position.y > view.groundAt(character.position.x, character.position.z) + 0.15, ladders?.climbing ?? false);
    // Not under the start screen: its music is heard there.
    // An exterior cutscene starts with the wind alone, faded in from its start, and lowered under the
    // ship's noise as the camera zooms in or comes near (owner, 2026-10-24; 2026-11-06).
    // Scene 0050 (space) is silent until the title's last line is deleted; the slow fade then carries on
    // through the cut into cutscene 1 (and the black at its start), not started again.
    const windTail = planetShot?.playing ? planetShot.time >= planetShot.titleGone : false;
    if (windTail) windSlow = true;
    if (windTail || heardOutside) windIn = Math.min(1, windIn + Math.max(0, dt) / (windSlow ? WIND_FADE_IN_0050 : WIND_FADE_IN));
    else if (!black) windIn = 0;
    if (windIn >= 1 || (!windTail && !heardOutside && !black)) windSlow = false;
    if (begun) wind.update(dt, chest, ship, planetShot?.playing ? windIn : heardOutside ? windIn * THREE.MathUtils.lerp(1, settings.cutsceneWindEnd, cutscene!.heardNear) : null);
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
    // Through the binoculars: first person at them (at her eyes), she's hidden. Nothing of hers is held
    // (owner, 2026-11-16: she walks, runs, jumps and flies as usual); standing, she turns with the view,
    // moving, toward where she goes (camera-relative, as in third person).
    const gadgetObject = character.model?.gadgetObject ?? null;
    const firstPerson = gadgets.firstPerson && !watching && gadgetObject !== null;
    const zoom = input.consumeZoom();
    // Her coffee's "A to Drink" (owner, 2026-11-19): not while talking; on the pad not while A has a target to use (its prompt shows instead).
    const drinkPrompt = (coffee?.canDrink(coffeeCanSip) ?? false) && !watching && !dialogue.active && !(input.lastDevice === 'gamepad' && (interaction?.target ?? null) !== null);
    const lens = binocularView.update(dt, !watching && !dialogue.active ? gadgets.out : null, firstPerson, zoom.hold, zoom.steps, view.baseFov, input.lastDevice, drinkPrompt);
    // The zoom's motor: heard while the magnification moves, from its start each time; cut short when it stops.
    if (binocularView.moving !== zoomSound) {
      if (zoomSound !== 0) audio.stop(zoomSound > 0 ? 'sfx_binoculars_zoom_in' : 'sfx_binoculars_zoom_out', undefined, ZOOM_SOUND_FADE);
      if (binocularView.moving !== 0) audio.play(binocularView.moving > 0 ? 'sfx_binoculars_zoom_in' : 'sfx_binoculars_zoom_out');
      zoomSound = binocularView.moving;
    }
    if (firstPerson) {
      if (input.move.x === 0 && input.move.y === 0) {
        const turn = view.yaw - character.facing;
        character.turnBy(Math.atan2(Math.sin(turn), Math.cos(turn)));
      }
      gadgetObject.updateWorldMatrix(true, false);
      view.firstPerson(dt, input, gadgetObject.getWorldPosition(eye), lens);
    } else if (!watching && !stations?.current) view.update(dt, input, character.root.position, inside, character.flying ? character.flightShare : 0);
    // flight-test.html: Tab / Shift+Tab or R1 / L1 to the next / previous station's camera (not in a cutscene).
    if (stations) {
      // Seated: a station's camera (the pilot's on sitting down); standing: the game's.
      const seatedNow = seated.has('green');
      if (seatedNow && !stations.current) stations.enter(0);
      else if (!seatedNow && stations.current) stations.leave();
      const step = input.consumeStation();
      if (step && !watching) stations.cycle(step);
      // The look turns the station's camera instead; a dial dragged by the mouse takes it.
      const look = stations.current && !watching ? input.consumeLook(dt) : null;
      const dragging = controls?.dragging ?? false;
      stations.update(view.camera.aspect, dragging ? null : look);
      // The station's 2D overlay (flight-test/overlay.ts): while it's on, it takes the D-pad and A; B still gets her up.
      const free = stations.current !== null && !watching && !dialogue.active && !dialogue.cooling;
      const overlayOn = overlay !== null && overlayLook.on && stations.current !== null;
      if (overlay) overlay.update(stations.current, free && overlayOn ? { step: selectStep, use: input.consumeUse() } : null);
      if (overlayOn) {
        controls?.update(null, stations.camera, size.y, dt, null); // the 3D controls' outline and label hidden
        if (free && backPressed && stations.current === 'pilot' && getUp) {
          audio.play('ui_interact');
          getUp.act();
        }
      }
      // Its controls (flight-test/controls.ts): selected, highlighted, used; B with nothing grabbed gets her up from the pilot's station.
      else if (controls) {
        const input_ = free ? { step: selectStep, use: input.consumeUse(), back: backPressed, captured: input.captured, mouseMoved, held: input.leftHeld, drag: dragging && look ? look.yaw : 0 } : null;
        if (controls.update(stations.current, stations.camera, size.y, dt, input_) && stations.current === 'pilot' && getUp) {
          audio.play('ui_interact');
          getUp.act();
        }
      }
    }
    // She fades out when the camera comes close (not in a cutscene: its own camera), the glow with her.
    const shown = watching ? 1 : firstPerson || stations?.herHidden ? 0 : stations?.current ? 1 : view.shown; // another station's camera: all of her (the orbit's fade is stale)
    character.setShown(shown);
    // The jetpack's glow, at its nozzles as the animation left them, facing the camera.
    exhaust.update(dt, character.jetpack, character.flying || character.parachuting, character.flyTrigger, view.camera, shown);
    // See-through: which furniture hides her, and whether anything solid does (the hole).
    const active = inside && settings.seeThrough && !watching && !firstPerson && !stations?.current; // a station's camera: nothing cut
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
    updateCutaway(gameCamera().position, chest, character.root.position.y, holeAmount, insideAmount, {
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
      glassDim: settings.glassDim,
      glassHighlights: settings.glassHighlights,
    });
    // A conversation: the button completes the line, then the next, picks a topic, or ends it.
    const talking = dialogue.active;
    const step = input.consumeChoiceStep();
    dialogue.update(dt, talking && input.consumeAdvance(), talking ? step : 0, input.lastDevice);
    helpEl.hidden = dialogue.active || watching || firstPerson; // it sits where the box and the skip prompt go
    // A door closed that the scene minds (chapter 1: the viewport; Dr. Ogawa asks for it open, then it opens).
    closedWatch?.update(director?.data?.whenClosed, dialogue.active);
    // Interaction: the target nearest the screen centre within her reach; E / A uses it.
    const pressed = input.consumeInteract();
    // While she climbs nothing else can be used (owner: control is taken, but not the camera); nor
    // while she talks, nor for a moment after.
    if (interaction) interaction.only = sitting ? getUp : null;
    interaction?.update(chest, character.facing, gameCamera(), input.lastDevice, pressed, (ladders?.climbing ?? false) || watching || talking || dialogue.active || dialogue.cooling || firstPerson || (stations?.current ?? null) !== null); // flight-test.html: nothing at a station (A uses its controls, B gets up)
    // The interact button with nothing to use: a sip of her coffee (owner, 2026-11-19).
    if (pressed && coffee && (interaction?.target ?? null) === null && !talking && !dialogue.active && !dialogue.cooling) coffee.drink(coffeeCanSip);
    // The scanner aims at the closest of these (scanner pass 3): next frame's, from this frame's.
    if (character.model) character.model.scanTargets = interaction?.inReach ?? [];
    indoorLight = easeTo(indoorLight, inside ? 1 : 0, dt / 0.5);
    // Landed on the plain, the shadow camera reaches back to the big rocks' tops (terrain.ts `nearRocks`) and its square is wider.
    const landed = treadmill?.parkedAt != null;
    updateWorld(world, scene, character.root.position, indoorLight, landed ? LANDED_SUN_BACK : 30, landed ? settings.shadowRangeLanded : settings.shadowRangeOutdoors);
    // The cutscene player's are the exterior shots (cutscene 2's are watched.ts).
    // flight-test.html: its take-off and landing, the ship's height and speed, its keys when no cutscene keys them.
    if (shipFlight && ship && treadmill?.group.visible && !cutscene?.playing) shipFlight.update(dt);
    const flight = cutscene?.flight ?? shipFlight?.keys ?? null;
    flames?.update(dt, cutscene?.playing ?? false, flight ? { strength: flight.flames, front: flight.front ?? 1, reach: flight.reach ?? 1, glow: flight.glow ?? 0 } : null, cutscene?.playing ? cutscene.camera : gameCamera(), size.y);
    audio.noiseKeyed = flight?.noise ?? null; // flight-test.html: the thrust's, twice while climbing or descending
    audio.noisePower = flight?.flames ?? null;
    clouds.update(cutscene?.track?.clouds ?? null, cutscene?.time ?? 0, cutscene ? cutscene.restFrame : scene, world.sun, cutscene?.playing ? cutscene.camera : gameCamera());
    // The hull's outside lit by the outside whenever the camera drawing is outside the ship, in any
    // scene; inside, as the interior is (owner, 2026-10-23: the interior's light unchanged). Not for
    // cutscene 2: its shots are of the cockpit, even when the long lens backs out through a window
    // (the glass as the sky's mirror washed them out).
    const drawing = cutscene?.playing ? cutscene.camera : watched?.playing ? watched.camera : gameCamera(); // flight-test.html: a station's
    exterior?.set(ship !== null && !watched?.playing && !ship.interior.containsPoint(drawing.position));
    heardOutside = ship !== null && (cutscene?.playing ?? false) && !ship.interior.containsPoint(cutscene!.camera.position);
    treadmill?.update(dt, drawing, cutscene?.track?.speed ?? shipFlight?.pace ?? 1);
    lightColumn.update(dt, watched?.column ?? false, ship?.object ?? null, drawing);
    // While the ship flies, the cameras see as far as the scenery goes (a cutscene's shot sets its own).
    const far = treadmill?.group.visible ? Math.max(500, treadmill.far) : 500;
    for (const camera of [view.camera, watched?.camera, stations?.camera]) {
      if (camera && camera.far !== far) {
        camera.far = far;
        camera.updateProjectionMatrix();
      }
    }
    crew?.mixer.update(dt);
    // She and whoever she talks to look at each other, on top of both animations (ended with the box).
    if (look) {
      if (look.talking && !dialogue.active) look.set(null);
      look.update(dt);
    }
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

    landmarks?.update(drawing, size.y, scene.fog as THREE.Fog | null, dt);
    // The temple's sound (owner, 2026-11-08: the synth's *Temple chord*, tuned on synth.html; a
    // recorded hum before): placed at the light shaft's foot, louder as she nears (its falloff from
    // the panel), dipping with the light's pulse and flicker (the patch's `lightDepth`).
    const shaft = landmarks?.shownShaft ?? null;
    if (chord && chord.at !== shaft?.hum) {
      chord.synth.dispose();
      const place = chord.place;
      window.setTimeout(() => place.remove(), 1000);
      chord = null;
    }
    if (shaft) {
      if (!chord) {
        const place = audio.placed(shaft.hum, 'ambience', settings.templeHumFull, settings.templeHumGone);
        const synth = new Synth(audio.context, { ...PATCHES['Temple chord']! }, place.input);
        synth.play();
        chord = { at: shaft.hum, synth, place };
      }
      chord.place.falloff(settings.templeHumFull, settings.templeHumGone);
      chord.place.input.gain.value = settings.templeHumVolume;
      chord.synth.setLight(shaft.intensity);
    }
    if (planetShot?.playing) renderPlanet();
    else renderer.render(scene, cutscene?.playing ? cutscene.camera : watched?.playing ? watched.camera : gameCamera());
    renderer.getDrawingBufferSize(size);
    // flight-test.html: the view under the ship (pass 3b), every n-th frame at the pilot's station, after the
    // frame (the sun's shadow map reused); the flames and the hull's outside as from outside for it (the next
    // frame's updates put them back), then its corner over the frame.
    const atPilot = stations?.current === 'pilot' && !cutscene?.playing && !planetShot?.playing;
    if (bottomView?.due(atPilot)) {
      exterior?.set(true);
      flames?.update(0, true, flight ? { strength: flight.flames, front: flight.front ?? 1, reach: flight.reach ?? 1, glow: flight.glow ?? 0 } : null, bottomView.camera, bottomView.height);
      bottomView.draw(world.sun.shadow);
    }
    bottomView?.show(atPilot, size.x, size.y);
    stats.frame(dt, size.x, size.y);
  });
}

/** Scene 0050 drawn instead of the ship: the planet page's look (ACES, exposure 1). */
function drawPlanet(renderer: THREE.WebGPURenderer, shot: PlanetShot): void {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.render(shot.scene, shot.camera);
}

function easeTo(value: number, target: number, step: number): number {
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step);
}

/** Where the climbing animation starts, in the world: from the `climb` tag on her model (ship space). */
function climbStart(ship: THREE.Object3D, tag: ClimbTag | null): ClimbStart | null {
  return tag ? tagPlace(ship, tag.start, tag.facing) : null;
}

/** *Sit down* is offered from the aisle behind her seat while she or the camera looks within this of the seat's forward (deg). */
const SEAT_LOOK_DEG = 45;

/** A tag's place on her model (ship space: her feet and facing) in the world: the climb's start, her seat. */
function tagPlace(ship: THREE.Object3D, at: [number, number, number] | undefined, facing: [number, number, number] | undefined): ClimbStart | null {
  if (!at || !facing) return null;
  ship.updateMatrixWorld(true);
  const feet = ship.localToWorld(new THREE.Vector3(...at));
  const ahead = ship.localToWorld(new THREE.Vector3(...at).add(new THREE.Vector3(...facing))).sub(feet);
  ahead.y = 0;
  return { feet, facing: facingOf(ahead.normalize()) };
}

function showHelp(): void {
  const el = document.querySelector<HTMLElement>('#help')!;
  el.textContent =
    'Gamepad: left stick move · right stick camera · B jump · R2 fly (half-way hovers; push the stick to fly, let go to glide) · A interact · D-pad up binoculars, R1 look through them, L1 / L2 zoom · D-pad left scanner, hold R1 to scan · hold X skip a cutscene · Start/Options pause · View: tuning\n' +
    'Keyboard: click to capture mouse · WASD move · Shift walk · C jump · hold Space fly · left click interact · 1 binoculars, right click look through them, wheel zoom · 2 scanner, hold the right button to scan · hold the right button skip a cutscene · Y invert · P quality · ` tuning\n' +
    'Ladder: at its foot, left click / A to climb; from the floor above, drop through the opening\n' +
    'Jetpack: take one from the rack in the cargo hold to fly; put it back there';
}

start().catch((err: unknown) => {
  console.error(err);
  document.body.textContent = `Failed to start: ${String(err)}`;
});

/**
 * The lookers (look.ts): her, turning her whole body while she stands, and each crew member, their
 * root turned about their feet while standing; both turned back after (owner, 2026-11-07). Which way the
 * skeleton faces, in its `Body` bone's axes, is read from her model on its first frame.
 */
function makeLook(character: Character, entities: Entities, seated: Set<string>): LookAt {
  const look = new LookAt(() => {
    const body = character.model?.object.getObjectByName('Body');
    if (!body) return null;
    const yaw = character.root.rotation.y;
    return new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).applyQuaternion(body.getWorldQuaternion(new THREE.Quaternion()).invert());
  });
  look.add('green', { object: () => character.model?.object ?? null, seated: () => seated.has('green'), turnBody: (y) => character.turnBy(y) });
  for (const { id, object, kind } of entities.all()) {
    if (kind !== 'character') continue;
    look.add(id, {
      object: () => object,
      seated: () => seated.has(id),
      turnBody: (y) => {
        object.rotation.y += y;
        object.updateMatrixWorld(true);
      },
    });
  }
  return look;
}
