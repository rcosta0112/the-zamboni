/**
 * The shot editor's preview (flight-shots.md, pass 2; owner, 2026-11-20: "no need to load the game in the
 * editor, just the assets needed for the shot; the shot plays in a loop"). For framing and the camera's
 * movement only: the ship (its outside lit as the exterior shots light it: exterior.ts), the sky, haze and
 * sun (world.ts), the flight's scenery (terrain.ts's treadmill), the thrusters' flames, the gear raised,
 * the cargo ramp closed.
 * No crew, her, story, sound, start screen or skip: the track loops (its time wrapped, never ended).
 */

import * as THREE from 'three/webgpu';
import { CutscenePlayer, type Track } from '../cutscene';
import { setReflections, setSingleSided } from '../cutaway';
import { ExteriorLook } from '../exterior';
import { ThrusterFlames } from '../flames';
import { Physics } from '../physics';
import { settings } from '../settings';
import { loadShip, placeGear, SHADOW_LAYER, updateShip, type Ship } from '../ship';
import { Treadmill } from '../terrain';
import { createWorld, updateWorld, type World } from '../world';

const TONE_MAPPING = { ACES: THREE.ACESFilmicToneMapping, AgX: THREE.AgXToneMapping, Neutral: THREE.NeutralToneMapping };
const DEG = Math.PI / 180;

export class ShotPreview {
  /** The track looping, or null (a still: the shot's first frame once one was set). */
  private track: Track | null = null;
  private looping = false;
  private last = 0;
  /** The part looped, seconds into the track (the editor's trim), or null: the whole. */
  private window: [number, number] | null = null;

  private constructor(
    private readonly renderer: THREE.WebGPURenderer,
    private readonly scene: THREE.Scene,
    private readonly world: World,
    private readonly ship: Ship,
    private readonly player: CutscenePlayer,
    private readonly treadmill: Treadmill,
    private readonly flames: ThrusterFlames | null,
  ) {}

  /** Builds it in `canvas` (the ship's file, the scenery's, the shaders: a few seconds). */
  static async create(canvas: HTMLCanvasElement, terrain = 'ice-plain', onStep: (what: string) => void = () => {}): Promise<ShotPreview> {
    const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true;
    await renderer.init();
    const scene = new THREE.Scene();
    const world = createWorld(scene);
    setReflections(world.reflections);
    settings.shipFlying = true; // the flight's sun, the gear up, the flames on
    onStep('the ship');
    // loadShip adds the ship's colliders: a world for them, nothing simulated.
    const physics = await Physics.create({ radius: 0.28, halfHeight: 0.5 }, new THREE.Vector3(0, -100, 0));
    const ship = await loadShip(scene, physics);
    world.sun.shadow.camera.layers.enable(SHADOW_LAYER);
    settings.cargoRampOpen = false; // in flight: the ramp closed (owner, 2026-11-20)
    updateShip(ship, 0, true);
    placeGear(ship);
    setSingleSided(settings.singleSided);
    const flames = await ThrusterFlames.load(
      ship.object,
      scene,
      ship.turbines.map((t) => t.node),
      ship.turbines.filter((t) => t.front).map((t) => t.node),
    ).catch((err: unknown) => {
      console.warn('[shot preview] thruster flames not shown:', err);
      return null;
    });
    onStep('the scenery');
    const box = new THREE.Box3().setFromObject(ship.object);
    const treadmill = new Treadmill(scene, { x: (box.min.x + box.max.x) / 2, z: (box.min.z + box.max.z) / 2, belly: ship.interior.min.y }, world.floor, world.reflections, world.sun);
    await treadmill.set(terrain);
    const exterior = new ExteriorLook(ship, (m, reflects) => treadmill.lightOutside(m, reflects));
    exterior.set(true); // the camera is always outside here
    const player = new CutscenePlayer(ship.object, () => {}, [ship.shadowCaster, ship.interiorShadowCaster, ship.glassShadowCaster]);
    onStep('the shaders');
    // Everything built now, not as it comes into view.
    const culled: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (o.frustumCulled) culled.push(o);
      o.frustumCulled = false;
    });
    await renderer.compileAsync(scene, player.camera);
    for (const o of culled) o.frustumCulled = true;
    const preview = new ShotPreview(renderer, scene, world, ship, player, treadmill, flames);
    renderer.setAnimationLoop((now) => preview.frame(now));
    return preview;
  }

  get playing(): boolean {
    return this.looping;
  }

  /** Seconds into the shot. */
  get time(): number {
    return this.player.time;
  }

  /** The part to loop (the trim), seconds into the track; null: the whole. */
  setWindow(window: [number, number] | null): void {
    this.window = window && window[1] - window[0] > 1e-3 ? window : null;
  }

  /** Shows a track: looping from the start of the window (`restart`), or from where it was (a value nudged while it plays). */
  show(track: Track, restart: boolean): void {
    const time = restart ? (this.window?.[0] ?? 0) : Math.min(this.player.time, track.duration);
    this.track = track;
    void this.player.playTrack(track).then(() => {
      this.player.time = time;
      this.player.update(0, this.player.camera.aspect);
    });
  }

  play(track: Track): void {
    this.looping = true;
    this.show(track, true);
  }

  /** Held where it is. */
  pause(): void {
    this.looping = false;
  }

  /** Goes on looping from where it is (the window's start if outside it). */
  resume(): void {
    this.looping = true;
  }

  /** Held at `time` (s into the track): the editor's scrubbing. */
  seek(time: number): void {
    if (!this.track) return;
    this.looping = false;
    this.player.time = Math.min(Math.max(0, time), this.track.duration);
    this.player.update(0, this.player.camera.aspect);
  }

  /** The ship's box in its own space, Blender's coordinates (min, max): for the generator's SHIP_BOX. */
  shipBox(): [number[], number[]] {
    const o = this.ship.object;
    const inverse = o.matrixWorld.clone().invert();
    const box = new THREE.Box3();
    o.traverse((m) => {
      const g = (m as THREE.Mesh).geometry;
      if (!(m as THREE.Mesh).isMesh || !g || !m.visible) return;
      if (!g.boundingBox) g.computeBoundingBox();
      box.union(g.boundingBox!.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, m.matrixWorld)));
    });
    // three's (x, y, z) → Blender's (x, -z, y).
    return [[box.min.x, -box.max.z, box.min.y], [box.max.x, -box.min.z, box.max.y]];
  }

  /** The sun as a bearing in ship space (Blender's, degrees from +X toward +Y). */
  sunBearing(): number {
    const sun = this.world.sun;
    const d = sun.position.clone().sub(sun.target.position);
    const local = d.applyQuaternion(this.ship.object.quaternion.clone().invert());
    // three's (x, y, z) → Blender's (x, -z, y).
    return Math.atan2(-local.z, local.x) / DEG;
  }

  private frame(now: number): void {
    const dt = this.last ? Math.min(0.1, Math.max(0, (now - this.last) / 1000)) : 0;
    this.last = now;
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    if (canvas.width !== Math.round(w * devicePixelRatio) || canvas.height !== Math.round(h * devicePixelRatio)) {
      this.renderer.setPixelRatio(devicePixelRatio);
      this.renderer.setSize(w, h, false);
    }
    const camera = this.player.camera;
    const track = this.track;
    if (track && this.player.playing) {
      // Looped: the time wrapped, so the track never ends (no end state, nothing put back).
      if (this.looping) {
        const [a, b] = this.window ?? [0, track.duration];
        const t = this.player.time + dt;
        this.player.time = t < a || t >= b ? a + (t >= b ? (t - b) % (b - a) : 0) : t;
      }
      this.player.update(0, w / h);
    }
    const flight = this.player.flight;
    this.ship.gearRaised = flight?.gear ?? null;
    placeGear(this.ship);
    updateWorld(this.world, this.scene, this.ship.object.position, 0);
    this.flames?.update(dt, true, flight ? { strength: flight.flames, front: flight.front ?? 1, reach: flight.reach ?? 1, glow: flight.glow ?? 0 } : null, camera);
    // The scenery runs on while paused too: the ship is flying.
    this.treadmill.update(dt, camera, track?.speed ?? 1);
    this.renderer.toneMappingExposure = settings.exposure;
    this.renderer.toneMapping = TONE_MAPPING[settings.toneMapping];
    if (track) this.renderer.render(this.scene, camera);
  }
}
