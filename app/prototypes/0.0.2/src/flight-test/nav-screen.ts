// The flight test scene's navigation screen (plan doc/plans/features/non-linear-travel/flight-test-scene.md,
// pass 5, its first part; owner, 2026-11-25: "add the nav screen to the flight test scene"). Prototype code: only
// flight-test.html uses it (main.ts FLIGHT_TEST).
// - **The planet map on `Navigation_Display`'s face** (*Topographical Map*, split off as a screen by controls.ts):
//   planet/nav-screen.ts draws the map, its overlay and the CRT into a render target; the face's material is
//   swapped for one showing it (the face's UVs run 0..1 across it).
// - **The look is the map page's** (`planet-map.html`, kept in the browser): tuned there, seen here on reload.
// - **Drawn only while the navigation station is on** (the last picture stays on the face otherwise), after the
//   frame; the map only when something changed, the CRT pass when it ticks.
// - **The zoom:** the navigation overlay's *Map zoom* (its steps), zoomed in all the way at first.
// - **The ship on the map is still simulated** (0050's region, a fixed heading), moving as fast as the ship flies
//   forward; the real course comes with steering (pass 7).

import * as THREE from 'three/webgpu';
import { texture, uv, vec2 } from 'three/tsl';
import type GUI from 'three/addons/libs/lil-gui.module.min.js';
import { MAP_ASPECT } from '../planet/map';
import { createNavScreen, ZOOM_STEPS, type NavScreen } from '../planet/nav-screen';
import type { Control } from './controls';

/** The screen's material in the ship file. */
const FACE = /Topographical Map/;
/** The map on the ship at full forward pace: degrees of arc a second (the page's default speed). */
const FULL_PACE_SPEED = 0.05;

/** The panel's values (folder *Flight test: navigation screen*). */
export const navScreenLook = { width: 512, brightness: 1.5, flipU: false, flipV: false };

export class NavigationScreen {
  readonly screen: NavScreen;
  /** Dev hook: draws so far (everything / the CRT only). */
  readonly drawn = { map: 0, crt: 0 };
  private readonly target: THREE.RenderTarget;
  private readonly face: THREE.Mesh | null;
  private readonly brightness = { value: navScreenLook.brightness };
  private readonly flips = { u: navScreenLook.flipU, v: navScreenLook.flipV };
  private readonly material: THREE.MeshBasicNodeMaterial;
  private width = 0;
  private first = true;

  constructor(renderer: THREE.WebGPURenderer, controls: readonly Control[]) {
    this.screen = createNavScreen(renderer, document.createElement('canvas'));
    this.target = new THREE.RenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
    this.target.texture.name = 'flight test: navigation screen';
    this.material = new THREE.MeshBasicNodeMaterial();
    this.material.name = 'Navigation screen (planet map)';
    this.material.toneMapped = false; // a screen's light, not lit: its green as on the page
    this.buildColour();
    this.face = controls.filter((c) => c.station === 'navigation').flatMap((c) => c.meshes).find((m) => FACE.test((m.material as THREE.Material).name)) ?? null;
    if (this.face) this.face.material = this.material;
    else console.warn('[0.0.2] flight test: no Topographical Map face on Navigation_Display; the navigation screen is not shown');
    this.resize();
  }

  /** The material's colour: the render target on the face the right way round, flipped further as the panel says. */
  private buildColour(): void {
    // The face's UVs: u runs right to left as seen from the station, v top to bottom, so the render target's
    // picture (rows read the other way: bottom-view.ts's flipY) is turned half round. Checked 2026-11-25 (labels top left).
    const q = vec2(uv().x.oneMinus(), uv().y);
    const p = vec2(this.flips.u ? q.x.oneMinus() : q.x, this.flips.v ? q.y.oneMinus() : q.y);
    this.material.colorNode = texture(this.target.texture as THREE.Texture, p).rgb.mul(this.brightness.value);
    this.material.needsUpdate = true;
  }

  private resize(): void {
    const w = Math.max(64, Math.round(navScreenLook.width));
    if (w === this.width) return;
    this.width = w;
    const h = Math.round(w / MAP_ASPECT);
    this.target.setSize(w, h);
    this.screen.setSize(w, h, w / 512);
  }

  /** Per frame, after the scene's frame: `zoom` the overlay's step; `pace` the ship's forward pace (0..1). */
  update(dt: number, atNavigation: boolean, zoom: number, pace: number): void {
    if (!this.face || (!atNavigation && !this.first)) return;
    this.first = false;
    if (navScreenLook.brightness !== this.brightness.value || navScreenLook.flipU !== this.flips.u || navScreenLook.flipV !== this.flips.v) {
      Object.assign(this.brightness, { value: navScreenLook.brightness });
      Object.assign(this.flips, { u: navScreenLook.flipU, v: navScreenLook.flipV });
      this.buildColour();
    }
    this.resize();
    if (zoom !== this.screen.zoomStep) this.screen.setZoom(zoom);
    this.screen.ship.speed = FULL_PACE_SPEED * pace;
    const drew = this.screen.frame(dt, performance.now() / 1000, [0, 0], this.target);
    if (drew) this.drawn[drew]++;
  }

  /** Dev hook: shown, the zoom, the view, the draws. */
  get state(): { shown: boolean; zoom: string; centre: [number, number]; size: [number, number]; drawn: { map: number; crt: number } } {
    const v = this.screen.view;
    return { shown: this.face !== null, zoom: ZOOM_STEPS[this.screen.zoomStep]!.name, centre: [v.northSouth, v.eastWest], size: [this.target.width, this.target.height], drawn: { ...this.drawn } };
  }
}

export function navScreenFolder(gui: GUI): void {
  const folder = gui.addFolder('Flight test: navigation screen');
  folder.add(navScreenLook, 'width', 128, 1024, 32).name('width (px)');
  folder.add(navScreenLook, 'brightness', 0.25, 4, 0.05).name('brightness');
  folder.add(navScreenLook, 'flipU').name('flip across');
  folder.add(navScreenLook, 'flipV').name('flip up–down');
}
