/**
 * The navigation station's screen, drawn: the planet map (map.ts), its 2D overlay (map-overlay.ts) and the CRT
 * pass (crt.ts), with the view, the zoom steps, following the ship and the marks. Shared by the map's test page
 * (map-page.ts, onto its canvas) and the flight test's cockpit screen (flight-test/nav-screen.ts, into a render
 * target on `Navigation_Display`'s face). Plan doc/plans/features/non-linear-travel/planet-map-page.md;
 * flight test pass 5.
 * - The map is drawn into `picture` only when something changed (or every frame while the ship moves or the view
 *   pans); the CRT pass runs then, and when its noise or flicker ticks.
 * - The overlay is a 2D canvas the caller gives (the page's, shown hidden under the CRT; a detached one for the
 *   cockpit), uploaded as a texture.
 */

import * as THREE from 'three/webgpu';
import presets from './presets.json';
import type { PlanetPreset } from './planet';
import { contourSpacingAt, createPlanetMap, DEFAULT_LOOK, MAP_ASPECT, travel, type MapLook, type MapView, type PlanetMap } from './map';
import { drawMapOverlay, type MapMark } from './map-overlay';
import { createCrt, type Crt } from './crt';

/** The zoom steps (plan): the screen's width in degrees; 360 = the whole globe. */
export const ZOOM_STEPS = [
  { name: 'Whole globe', width: 360 },
  { name: '64°', width: 64 },
  { name: '16°', width: 16 },
  { name: '4°', width: 4 },
  { name: 'Quadrants (2°)', width: 2 },
];
/** The zoom it opens at: zoomed in all the way (owner, 2026-11-25). */
export const DEFAULT_ZOOM = ZOOM_STEPS.length - 1;

/** Panning at full stick: this share of the screen's width per second. The whole globe pans as if 120° wide. */
const PAN_SHARE = 0.5;
const PAN_WIDTH_WHOLE = 120;
/**
 * 0050's last frame (shot.ts: the planet's end spin and tip, Blender's tilt, the camera on +Z): the point
 * facing the camera, where the crew will explore (owner, 2026-11-24). Worked out once with the meridian at
 * 111.4° (.export/end-frame.mjs). In that frame north is turned 17.5° from up; the map is north up or
 * heading up instead (owner, 2026-11-24).
 */
export const SHOT_END = { northSouth: 74.0, eastWest: 199.5 };
/** Test marks around 0050's region, one of each kind, so the icons show on opening (not story places). */
export const TEST_MARKS: MapMark[] = [
  { kind: 'waypoint', northSouth: 76.5, eastWest: 197.5 },
  { kind: 'signal', northSouth: 75.5, eastWest: 201.5 },
  { kind: 'visited', northSouth: 73.5, eastWest: 198.5 },
];

/** The map's orientation, the player's choice: north up, or the ship's heading up. */
export type Orientation = 'north' | 'heading';

/** The ship on the map: where it is, its heading (degrees clockwise from north) and speed (degrees of arc per second). */
export interface MapShip {
  northSouth: number;
  eastWest: number;
  heading: number;
  speed: number;
  moving: boolean;
}

/** The look as the map page keeps it in the browser (the cockpit's screen reads the same one). */
export const LOOK_STORE = 'zamboni-planet-map-look';

export function loadLook(): MapLook {
  try {
    const kept = localStorage.getItem(LOOK_STORE);
    if (kept) {
      const saved = JSON.parse(kept) as Partial<MapLook>;
      // Saved before the spacing by zoom (step 3b): the contours' values taken anew.
      if (saved.contourSplit?.length !== DEFAULT_LOOK.contourSplit.length) {
        delete saved.contourSplit;
        delete saved.contourSpacing;
        delete saved.deepest;
      }
      // Smoothing per zoom step (2026-11-25; was one value).
      if (!Array.isArray(saved.smoothing) || saved.smoothing.length !== DEFAULT_LOOK.smoothing.length) delete saved.smoothing;
      return {
        ...DEFAULT_LOOK,
        ...saved,
        contourSplit: [...(saved.contourSplit ?? DEFAULT_LOOK.contourSplit)],
        smoothing: [...(saved.smoothing ?? DEFAULT_LOOK.smoothing)],
      };
    }
  } catch {
    /* none kept, or storage blocked */
  }
  return { ...DEFAULT_LOOK, contourSplit: [...DEFAULT_LOOK.contourSplit], smoothing: [...DEFAULT_LOOK.smoothing] };
}

/** The 0050 planet's preset (the map's land and sea). */
export function defaultPreset(): PlanetPreset {
  return presets.presets[presets.default as keyof typeof presets.presets] as unknown as PlanetPreset;
}

export interface NavScreen {
  readonly map: PlanetMap;
  readonly crt: Crt;
  readonly look: MapLook;
  readonly view: MapView;
  readonly ship: MapShip;
  readonly marks: MapMark[];
  readonly zoomStep: number;
  readonly orientation: Orientation;
  readonly following: boolean;
  /** The last map draw's and overlay draw's CPU time (ms). */
  readonly timings: { draw: number; overlay: number };
  setZoom(step: number): void;
  setOrientation(next: Orientation): void;
  setFollowing(on: boolean): void;
  /** The look changed (the same object, its values edited). */
  lookChanged(): void;
  /** The screen's size in pixels; `pixel`: the overlay's line widths' scale (the device pixel ratio on the page). */
  setSize(width: number, height: number, pixel: number): void;
  redraw(): void;
  /**
   * One frame: the ship moves, the view pans (`pan`: x right, y up, length ≤ 1; panning stops following) or
   * follows; drawn into `target` (null: the canvas) when something changed or the CRT ticked. Returns what was
   * drawn: 'map' (everything), 'crt' (the CRT pass only) or null.
   */
  frame(dt: number, seconds: number, pan: [number, number], target: THREE.RenderTarget | null): 'map' | 'crt' | null;
}

export function createNavScreen(renderer: THREE.WebGPURenderer, overlay: HTMLCanvasElement, look: MapLook = loadLook(), preset: PlanetPreset = defaultPreset()): NavScreen {
  const ship: MapShip = { northSouth: SHOT_END.northSouth, eastWest: SHOT_END.eastWest, heading: 45, speed: 0.05, moving: true };
  const view: MapView = { northSouth: ship.northSouth, eastWest: ship.eastWest, width: ZOOM_STEPS[DEFAULT_ZOOM]!.width, roll: 0 }; // opens on 0050's region (owner, 2026-11-24)
  const marks: MapMark[] = TEST_MARKS.map((m) => ({ ...m }));
  const map = createPlanetMap(preset, look);
  const quad = new THREE.QuadMesh(map.material);
  const picture = new THREE.RenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const overlayTexture = new THREE.CanvasTexture(overlay);
  overlayTexture.colorSpace = THREE.SRGBColorSpace;
  overlayTexture.flipY = false; // the canvas's rows top-down, as the render target's
  const crt = createCrt(picture.texture, overlayTexture, MAP_ASPECT, look);
  const crtQuad = new THREE.QuadMesh(crt.material);
  const ctx = overlay.getContext('2d')!;
  const timings = { draw: 0, overlay: 0 };
  let zoomStep = DEFAULT_ZOOM;
  let orientation: Orientation = 'north';
  let following = true;
  let pixel = 1;
  let dirty = true;

  const applyContours = () => {
    const { spacing, split } = contourSpacingAt(look, zoomStep);
    map.setContours(spacing, split);
    map.setSmoothing(look.smoothing[zoomStep] ?? 0);
  };
  applyContours();

  const drawOverlay = () => {
    const t = performance.now();
    drawMapOverlay(ctx, map, {
      view,
      colour: look.colour,
      grid: look.grid,
      lineWidth: look.coastWidth * pixel,
      border: 2 * pixel, // 2 px (owner, 2026-11-24)
      ship,
      marks,
    });
    timings.overlay = performance.now() - t;
  };

  const screen: NavScreen = {
    map,
    crt,
    look,
    view,
    ship,
    marks,
    timings,
    get zoomStep() {
      return zoomStep;
    },
    get orientation() {
      return orientation;
    },
    get following() {
      return following;
    },
    setZoom(step) {
      zoomStep = Math.min(ZOOM_STEPS.length - 1, Math.max(0, Math.round(step)));
      view.width = ZOOM_STEPS[zoomStep]!.width;
      applyContours();
      dirty = true;
    },
    setOrientation(next) {
      orientation = next;
      dirty = true;
    },
    setFollowing(on) {
      following = on;
      dirty = true;
    },
    lookChanged() {
      map.setLook(look);
      crt.setLook(look);
      applyContours();
      dirty = true;
    },
    setSize(width, height, scale) {
      overlay.width = width;
      overlay.height = height;
      picture.setSize(width, height);
      pixel = scale;
      dirty = true;
    },
    redraw() {
      dirty = true;
    },
    frame(dt, seconds, [px, py], target) {
      // Heading up: the screen turned by the ship's heading, so it points up (at the centre, when following).
      view.roll = orientation === 'heading' ? ship.heading : 0;
      if (px !== 0 || py !== 0) {
        following = false;
        const width = view.width >= 180 ? PAN_WIDTH_WHOLE : view.width;
        const bearing = (Math.atan2(px, py) * 180) / Math.PI + (view.roll ?? 0); // the stick's up is the screen's up
        Object.assign(view, travel(view.northSouth, view.eastWest, bearing, Math.hypot(px, py) * PAN_SHARE * width * dt));
        dirty = true;
      }
      if (ship.moving && ship.speed > 0) {
        Object.assign(ship, travel(ship.northSouth, ship.eastWest, ship.heading, ship.speed * dt));
        dirty = true;
      }
      if (following) Object.assign(view, { northSouth: ship.northSouth, eastWest: ship.eastWest });

      // The CRT's noise and flicker tick at their own stepped rates: the screen is shown again when one does.
      const ticked = crt.tick(seconds);
      if (!dirty && !ticked) return null;
      const before = renderer.getRenderTarget();
      let drew: 'map' | 'crt' = 'crt';
      if (dirty) {
        dirty = false;
        drew = 'map';
        map.setView(view);
        const t = performance.now();
        renderer.setRenderTarget(picture);
        quad.render(renderer);
        timings.draw = performance.now() - t;
        drawOverlay();
        overlayTexture.needsUpdate = true;
      }
      renderer.setRenderTarget(target);
      crtQuad.render(renderer);
      renderer.setRenderTarget(before);
      return drew;
    },
  };
  return screen;
}
