// The flight test scene's bottom view (plan doc/plans/features/non-linear-travel/flight-test-scene.md, pass 3b;
// prototype code: only flight-test.html uses it, main.ts FLIGHT_TEST).
// - **One small external view under the ship**, looking straight down (the ship's nose at the top): drawn into a
//   tiny texture every EVERY-th frame, only while she's at the pilot's station; shown in a corner of the screen
//   until the controls file brings its screen (`scr-view-bottom`), which will take the same texture.
// - **Measured:** each draw's CPU time (the render call), its draw calls and triangles, on the panel's
//   *Flight test: bottom view* (the GPU's share shows only in the frame rate: compare with it off).
// - **Drawn after the frame**, with the sun's shadow map reused (not redrawn for this camera) and the flames
//   shown as from outside (main.ts: the next frame's updates put both back for the game's camera).

import * as THREE from 'three/webgpu';
import { texture, uv } from 'three/tsl';
import type GUI from 'three/addons/libs/lil-gui.module.min.js';

/** The CPU average's draws. */
const RECENT = 30;

/** The panel's values (folder *Flight test: bottom view*). */
export const bottomLook = { on: true, every: 10, width: 80, scale: 3, fov: 120 }; // 80 × 60 shown at 240 × 180 px, its pixels sharp; lens 120° (owner, 2026-11-24)

export class BottomView {
  readonly camera: THREE.PerspectiveCamera;
  /** The measurements (the panel's, listened): last draw's CPU ms, the average of the last RECENT (the first draws build
   *  shaders: left out once there are more), draw calls, triangles, draws so far. */
  readonly measured = { ms: '-', average: '-', drawCalls: 0, triangles: 0, draws: 0 };
  private target: THREE.RenderTarget;
  private frame = 0;
  private readonly recent: number[] = [];
  /** The corner: an orthographic scene with one quad showing the texture, drawn over the frame. */
  private readonly hud = new THREE.Scene();
  private readonly hudCamera = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
  private readonly quad: THREE.Mesh;
  /** The quad's texture (swapped when the size changes). */
  private readonly sampled: { value: THREE.Texture };
  private placed = false;

  constructor(
    private readonly renderer: THREE.WebGPURenderer,
    private readonly scene: THREE.Scene,
  ) {
    this.camera = new THREE.PerspectiveCamera(bottomLook.fov, 4 / 3, 0.1, 600);
    this.camera.name = 'flight test: bottom view';
    this.target = this.makeTarget();
    const material = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
    const sampled = texture(this.target.texture as THREE.Texture, uv().flipY()); // a render target's rows run the other way (the examples' way)
    material.colorNode = sampled.rgb;
    this.sampled = sampled;
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    this.quad.frustumCulled = false;
    this.hud.add(this.quad);
  }

  private makeTarget(): THREE.RenderTarget {
    const w = Math.max(16, Math.round(bottomLook.width));
    const target = new THREE.RenderTarget(w, Math.round((w * 3) / 4), { type: THREE.HalfFloatType, depthBuffer: true });
    target.texture.minFilter = target.texture.magFilter = THREE.NearestFilter;
    target.texture.name = 'flight test: bottom view';
    return target;
  }

  /** The texture it draws into (for the controls file's screen, later). */
  get texture(): THREE.Texture {
    return this.target.texture;
  }

  /** The texture's height (px): the flames' pixel size for it. */
  get height(): number {
    return this.target.height;
  }

  /** Under the hull's bottom (`belly`, world y: the ship's interior's lowest) at the ship's centre, looking down,
   *  its nose (world −z: the ground streams toward +z) at the top. */
  place(ship: THREE.Object3D, belly: number): void {
    const centre = new THREE.Box3().setFromObject(ship).getCenter(new THREE.Vector3());
    this.camera.position.set(centre.x, belly - 0.1, centre.z);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(centre.x, belly - 10, centre.z);
    ship.attach(this.camera); // it goes with the ship (the ship stays put: the treadmill), kept for safety
    this.placed = true;
  }

  /** Due this frame (on, placed, at the pilot's station, every `every`-th frame). Counts the frame. */
  due(atPilot: boolean): boolean {
    if (!bottomLook.on || !this.placed || !atPilot) return false;
    this.frame = (this.frame + 1) % Math.max(1, Math.round(bottomLook.every));
    return this.frame === 0;
  }

  /** Draws the view into its texture (after the frame: the sun's shadow map reused). */
  draw(sunShadow: THREE.LightShadow | null): void {
    const r = this.renderer;
    if (this.target.width !== Math.max(16, Math.round(bottomLook.width))) {
      this.target.dispose();
      this.target = this.makeTarget();
      this.sampled.value = this.target.texture as THREE.Texture;
    }
    if (this.camera.fov !== bottomLook.fov) {
      this.camera.fov = bottomLook.fov;
      this.camera.updateProjectionMatrix();
    }
    const calls = r.info.render.drawCalls;
    const triangles = r.info.render.triangles;
    const auto = sunShadow?.autoUpdate ?? true;
    if (sunShadow) sunShadow.autoUpdate = false;
    const before = r.getRenderTarget();
    const start = performance.now();
    r.setRenderTarget(this.target);
    r.render(this.scene, this.camera);
    r.setRenderTarget(before);
    const ms = performance.now() - start;
    if (sunShadow) sunShadow.autoUpdate = auto;
    const m = this.measured;
    m.draws++;
    this.recent.push(ms);
    if (this.recent.length > RECENT) this.recent.shift();
    m.ms = `${ms.toFixed(2)} ms`;
    m.average = `${(this.recent.reduce((a, b) => a + b, 0) / this.recent.length).toFixed(2)} ms`;
    m.drawCalls = r.info.render.drawCalls - calls;
    m.triangles = r.info.render.triangles - triangles;
  }

  /** The corner over the frame (bottom right), every frame it's shown. */
  show(atPilot: boolean, width: number, height: number): void {
    if (!bottomLook.on || !this.placed || !atPilot || this.measured.draws === 0) return;
    const w = this.target.width * bottomLook.scale * devicePixelRatio;
    const h = this.target.height * bottomLook.scale * devicePixelRatio;
    const margin = 16 * devicePixelRatio;
    const c = this.hudCamera;
    if (c.right !== width || c.top !== height) {
      c.right = width;
      c.top = height;
      c.updateProjectionMatrix();
    }
    this.quad.scale.set(w, h, 1);
    this.quad.position.set(width - margin - w / 2, margin + h / 2, 0);
    const r = this.renderer;
    const autoClear = r.autoClear;
    r.autoClear = false;
    r.render(this.hud, c);
    r.autoClear = autoClear;
  }

  /** Dev hook: placed, the size, the measurements. */
  get state(): { placed: boolean; size: [number, number]; measured: BottomView['measured'] } {
    return { placed: this.placed, size: [this.target.width, this.target.height], measured: { ...this.measured } };
  }
}

export function bottomFolder(gui: GUI, view: BottomView): void {
  const folder = gui.addFolder('Flight test: bottom view');
  folder.add(bottomLook, 'on').name('on (pilot station)');
  folder.add(bottomLook, 'every', 1, 30, 1).name('drawn every n frames');
  folder.add(bottomLook, 'width', 64, 640, 16).name('width (px, 4:3)');
  folder.add(bottomLook, 'scale', 0.5, 4, 0.25).name('shown at (×)');
  folder.add(bottomLook, 'fov', 30, 120, 1).name('lens (°)');
  const m = view.measured;
  folder.add(m, 'ms').name('last draw (CPU)').disable().listen();
  folder.add(m, 'average').name(`average, last ${RECENT}`).disable().listen();
  folder.add(m, 'drawCalls').name('draw calls').disable().listen();
  folder.add(m, 'triangles').name('triangles').disable().listen();
  folder.add(m, 'draws').name('draws').disable().listen();
}
