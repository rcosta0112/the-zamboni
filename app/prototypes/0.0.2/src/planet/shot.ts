// Scene 0050, *Spaaaace* (doc/story/scenes/0050 - Cutscene exterior - Spaaaace.md): the planet BMTM-640 B
// from space, the lens zooming 20 → 180 mm in one shot while the camera orbits slowly, the planet's name
// typed in below it. Played by main.ts before cutscene 1 in a new game (and `?scene=0050`).
//
// Owner, 2026-11-10: ease into the zoom, faster at the end; the shot lasts as long as the zoom (to be cut
// or adjusted later); the black bars as in every cutscene; the title centred across, and up and down
// halfway between the planet's lowest point and the top of the bottom bar.
//
// Its own scene and camera (Blender's: 8.54 m away, 36 mm sensor) with the planet page's default preset
// (presets.json); main.ts draws it instead of the ship while it plays. A function of time: `time` can be
// set and `update(0)` shows that moment.

import * as THREE from 'three/webgpu';
import { createPlanet, type PlanetPreset } from './planet';
import { createSky, type SkyPreset } from './sky';
import presets from './presets.json';

/** The shot's timing (owner, 2026-11-10: to cut or adjust later). */
export const SHOT = {
  /** s: the whole shot, the length of the zoom. */
  duration: 36,
  /** mm: the lens at the start and the end. */
  from: 20,
  to: 180,
  /**
   * The ease in: the zoom's progress is (t / duration) to this power, on an even-to-the-eye scale (the
   * focal length multiplied by the same amount each step). 1: even throughout; 2: starts still, fastest
   * at the end.
   */
  ease: 2,
  /**
   * The orbit round the planet (about the screen's vertical), in degrees a second at the start's lens,
   * sped up with the zoom: times (focal length / `from`) to the power `orbitFollowsZoom` (owner,
   * 2026-11-10: at a steady speed it looked stopped once zoomed in, the zoom swamping it). With 0.33 and
   * 1: 0.33°/s at 20 mm, 3°/s at 180 mm, about 31° in all.
   */
  orbitSpeed: 0.33,
  orbitFollowsZoom: 1,
  /**
   * The title: when it starts typing (s), seconds per letter; held this long once typed (s), then
   * deleted letter by letter from the end, as with a quick backspace (s per letter; owner, 2026-11-10:
   * no fade).
   */
  titleAt: 1.5,
  titlePerLetter: 0.09,
  titleHold: 3,
  titlePerDelete: 0.035,
};

const TITLE = 'BMTM-640 B';
/** Blender's camera distance (m). */
const DISTANCE = 8.538;

type ShotPreset = PlanetPreset & { sky: SkyPreset };
const file = presets as unknown as { default: string; presets: Record<string, ShotPreset> };

export class PlanetShot {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 1000);
  /** s since it started. */
  time = 0;
  playing = false;
  /** Called once at its end, played out or skipped. */
  onEnded: ((skipped: boolean) => void) | null = null;
  private readonly sky;
  /** The planet's outline radius (the atmosphere's). */
  private readonly radius: number;
  private readonly title: HTMLElement;
  private readonly letters: HTMLSpanElement[] = [];
  /** The orbit's angle (degrees) at even steps of the shot: its speed follows the zoom (`orbitAt`). */
  private readonly orbitTable: number[] = [];

  constructor(titleEl: HTMLElement) {
    const preset = file.presets[file.default]!;
    this.scene.background = new THREE.Color(0x000000);
    this.camera.filmGauge = 36; // Blender's sensor (fit: the wider side)
    const sun = new THREE.DirectionalLight(0xffffff, 7);
    sun.position.set(0.348, 0.625, 0.699).multiplyScalar(10); // Blender's Sun, as on the planet page
    this.scene.add(sun);
    const planet = createPlanet(preset);
    this.scene.add(planet.root);
    this.radius = preset.atmosphere.size;
    this.sky = createSky(preset.sky);
    this.scene.add(this.sky.mesh);

    // Every letter laid out from the start, unseen until typed, so the line doesn't shift as it grows.
    this.title = titleEl;
    this.title.replaceChildren(
      ...[...TITLE].map((ch) => {
        const span = document.createElement('span');
        span.textContent = ch;
        this.letters.push(span);
        return span;
      }),
    );
    // The orbit's angle at 256 steps, added up from its speed, centred on the planet page's view.
    const steps = 256;
    let angle = 0;
    this.orbitTable.push(0);
    for (let i = 0; i < steps; i++) {
      const focal = focalAt(((i + 0.5) / steps) * SHOT.duration);
      angle += SHOT.orbitSpeed * Math.pow(focal / SHOT.from, SHOT.orbitFollowsZoom) * (SHOT.duration / steps);
      this.orbitTable.push(angle);
    }
    const half = angle / 2;
    for (let i = 0; i <= steps; i++) this.orbitTable[i]! -= half;
    this.update(0, 16 / 9);
  }

  /** The orbit's angle (degrees) at `t` s. */
  private orbitAt(t: number): number {
    const x = (THREE.MathUtils.clamp(t / SHOT.duration, 0, 1) * (this.orbitTable.length - 1));
    const i = Math.min(Math.floor(x), this.orbitTable.length - 2);
    return THREE.MathUtils.lerp(this.orbitTable[i]!, this.orbitTable[i + 1]!, x - i);
  }

  play(): void {
    this.time = 0;
    this.playing = true;
    this.title.hidden = false;
  }

  skip(): void {
    if (this.playing) this.end(true);
  }

  /** Each frame while it plays (also used to set it up before the first frame: `update(0)`). */
  update(dt: number, aspect: number): void {
    if (this.playing) this.time += dt;
    const t = Math.min(this.time, SHOT.duration);
    const focal = focalAt(t);
    this.camera.aspect = aspect;
    this.camera.setFocalLength(focal); // also updates the projection

    // The orbit: round the planet (at the origin), a half each side of the page's camera.
    const angle = THREE.MathUtils.degToRad(this.orbitAt(t));
    this.camera.position.set(Math.sin(angle) * DISTANCE, 0, Math.cos(angle) * DISTANCE);
    this.camera.lookAt(0, 0, 0);
    this.sky.update(this.camera);

    this.placeTitle(aspect);
    // Typed in, held, then deleted from the end (a quick backspace).
    const n = this.letters.length;
    const typed = Math.min(n, Math.max(0, Math.floor((t - SHOT.titleAt) / SHOT.titlePerLetter) + 1));
    const deleteAt = SHOT.titleAt + (n - 1) * SHOT.titlePerLetter + SHOT.titleHold;
    const deleted = Math.min(n, Math.max(0, Math.floor((t - deleteAt) / SHOT.titlePerDelete) + 1));
    const shown = typed - deleted;
    this.letters.forEach((span, i) => (span.style.visibility = i < shown ? 'visible' : 'hidden'));

    if (this.playing && this.time >= SHOT.duration) this.end(false);
  }

  /**
   * The title halfway between the planet's lowest point (as it is when the title starts typing) and the top of the bottom bar (style.css `#bars`: the picture at 2.39:1).
   */
  private placeTitle(aspect: number): void {
    const h = window.innerHeight;
    const w = window.innerWidth;
    const focal = focalAt(SHOT.titleAt);
    // Vertical half-height of the view at that focal length (36 mm across the wider side, as Three's filmGauge).
    const halfFilm = 18 / Math.max(aspect, 1);
    const halfV = halfFilm / focal;
    const edge = Math.tan(Math.asin(this.radius / DISTANCE)) / halfV; // the planet's lowest point, 0..1 of the half-height
    const planetBottom = h / 2 + (edge * h) / 2;
    const barTop = h - Math.max(0, (h - w / 2.39) / 2);
    this.title.style.top = `${(planetBottom + barTop) / 2}px`;
  }

  private end(skipped: boolean): void {
    this.playing = false;
    this.title.hidden = true;
    this.onEnded?.(skipped);
  }
}

/** The lens (mm) at `t` s: the zoom eased in, on an even-to-the-eye scale. */
function focalAt(t: number): number {
  const u = THREE.MathUtils.clamp(t / SHOT.duration, 0, 1);
  return SHOT.from * Math.pow(SHOT.to / SHOT.from, Math.pow(u, SHOT.ease));
}
