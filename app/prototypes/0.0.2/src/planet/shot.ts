// Scene 0050, *Spaaaace* (doc/story/scenes/0050 - Cutscene exterior - Spaaaace.md): the planet BMTM-640 B
// from space, the lens zooming 20 → 180 mm in one shot while the camera orbits slowly, the planet's name
// then two more lines, one at a time. Played by main.ts before cutscene 1 in a new game (and `?scene=0050`).
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
  duration: 30, // owner, 2026-11-10: 20% faster than the first 36 s (the title's times unchanged)
  /** mm: the lens at the start and the end. */
  from: 20,
  to: 180,
  /**
   * The ease in: the zoom's progress is (t / duration) to this power, on an even-to-the-eye scale (the
   * focal length multiplied by the same amount each step). 1: even throughout; 2: starts still, fastest
   * at the end.
   */
  ease: 3.5, // owner, 2026-11-10: eased more (was 2), so the planet stays clear of the title's third line
  /**
   * The orbit round the planet (about the screen's vertical), in degrees a second at the start's lens,
   * sped up with the zoom: times (focal length / `from`) to the power `orbitFollowsZoom` (owner,
   * 2026-11-10: at a steady speed it looked stopped once zoomed in, the zoom swamping it). With 0.396 and
   * 1: 0.4°/s at 20 mm, 3.6°/s at 180 mm, about 31° in all (sped up with the zoom, 2026-11-10: the same path).
   */
  orbitSpeed: 0.396,
  orbitFollowsZoom: 1,
  /**
   * The planet's pose at the shot's end (owner, 2026-11-10: "end with the planet at this position", a
   * view set on the planet page by dragging): the page's *spin* (degrees about its own axis) and its tip
   * (degrees, towards or away from the camera). The orbit ends on the page's camera.
   */
  endSpin: -54.6,
  endTip: -11.5,
  /**
   * The title's lines, one at a time (owner, 2026-11-10): the first starts typing at `titleAt` (s),
   * seconds per letter (each with the dialogue's key sound); held this long once typed (s), then deleted
   * letter by letter from the end, as with a quick backspace (s per letter; no fade); the next line
   * starts `titleGap` s after the last one is gone.
   */
  titleAt: 1.5,
  titlePerLetter: 0.09,
  titleHold: 3,
  titlePerDelete: 0.035,
  titleGap: 2,
  /** s: the typing waits this long after a colon (owner, 2026-11-10: *status:* … *unexplored*). */
  titleColonPause: 0.5,
};

/** The typed lines, as in the scene file (doc/story/scenes/0050; owner's lines 2 and 3, 2026-11-10). */
const TITLE = ['BMTM-640 B', 'Status: unexplored', 'A signal of unknown origin was detected.'];
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
  /** Each line: its element, its letters, when it starts typing, when its deleting starts, when it's gone (s). */
  private readonly lines: { el: HTMLDivElement; letters: HTMLSpanElement[]; typedAt: number[]; start: number; deleteAt: number; gone: number }[] = [];
  /** Letters typed so far (for the key sound). */
  private typedCount = 0;
  /** Called for each letter typed while it plays (main.ts: the dialogue's key sound). */
  onType: (() => void) | null = null;
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
    // As on the planet page: the tip a turn about the screen's horizontal, round the planet's own spin.
    const tip = new THREE.Group();
    tip.rotation.x = THREE.MathUtils.degToRad(SHOT.endTip);
    planet.spin.rotation.z = THREE.MathUtils.degToRad(SHOT.endSpin);
    tip.add(planet.root);
    this.scene.add(tip);
    this.radius = preset.atmosphere.size;
    this.sky = createSky(preset.sky);
    this.scene.add(this.sky.mesh);

    // Each line's letters laid out from the start, unseen until typed, so the line doesn't shift as it
    // grows. One line at a time: typed, held, deleted, then the next after a gap.
    this.title = titleEl;
    let at = SHOT.titleAt;
    for (const text of TITLE) {
      const el = document.createElement('div');
      const letters = [...text].map((ch) => {
        const span = document.createElement('span');
        span.textContent = ch;
        el.append(span);
        return span;
      });
      // When each letter is typed: one every titlePerLetter, a pause after a colon.
      const typedAt: number[] = [];
      let next = at;
      for (const span of letters) {
        typedAt.push(next);
        next += SHOT.titlePerLetter + (span.textContent === ':' ? SHOT.titleColonPause : 0);
      }
      const deleteAt = typedAt[typedAt.length - 1]! + SHOT.titleHold;
      const gone = deleteAt + (letters.length - 1) * SHOT.titlePerDelete;
      this.lines.push({ el, letters, typedAt, start: at, deleteAt, gone });
      at = gone + SHOT.titleGap;
    }
    this.title.replaceChildren(...this.lines.map((l) => l.el));
    // The orbit's angle at 256 steps, added up from its speed, ending on the planet page's camera.
    const steps = 256;
    let angle = 0;
    this.orbitTable.push(0);
    for (let i = 0; i < steps; i++) {
      const focal = focalAt(((i + 0.5) / steps) * SHOT.duration);
      angle += SHOT.orbitSpeed * Math.pow(focal / SHOT.from, SHOT.orbitFollowsZoom) * (SHOT.duration / steps);
      this.orbitTable.push(angle);
    }
    for (let i = 0; i <= steps; i++) this.orbitTable[i]! -= angle;
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
    this.typedCount = 0;
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

    // The orbit: round the planet (at the origin), ending on the page's camera (angle 0).
    const angle = THREE.MathUtils.degToRad(this.orbitAt(t));
    this.camera.position.set(Math.sin(angle) * DISTANCE, 0, Math.cos(angle) * DISTANCE);
    this.camera.lookAt(0, 0, 0);
    this.sky.update(this.camera);

    // The line on now: typed in, held, then deleted from the end (a quick backspace).
    let typedAll = 0;
    for (const line of this.lines) {
      const n = line.letters.length;
      const typed = line.typedAt.filter((at) => at <= t).length;
      const deleted = Math.min(n, Math.max(0, Math.floor((t - line.deleteAt) / SHOT.titlePerDelete) + 1));
      line.letters.forEach((span, i) => (span.style.visibility = i < typed - deleted ? 'visible' : 'hidden'));
      const on = t >= line.start && t <= line.gone;
      line.el.hidden = !on;
      if (on) this.placeTitle(aspect, line.start);
      typedAll += line.letters.slice(0, typed).filter((span) => span.textContent !== ' ').length;
    }
    // A key sound per letter typed, in play only (not when `time` is set by hand: `update(0)`).
    if (this.playing && dt > 0 && typedAll > this.typedCount) this.onType?.();
    this.typedCount = typedAll;

    if (this.playing && this.time >= SHOT.duration) this.end(false);
  }

  /**
   * A line halfway between the planet's lowest point and the top of the bottom bar (style.css `#bars`:
   * the picture at 2.39:1). The planet as it is when the line starts (`at`, s; owner, 2026-11-10:
   * placed for each line); the line stays put while it's up. The planet keeps growing: by the third
   * line's end (30 s shot) it reaches the line.
   */
  private placeTitle(aspect: number, at: number): void {
    const h = window.innerHeight;
    const w = window.innerWidth;
    const focal = focalAt(at);
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
