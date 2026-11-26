// The flight test scene's controls (plan doc/plans/features/non-linear-travel/flight-test-scene.md, pass 2;
// owner, 2026-11-23): selecting and using the consoles' controls from a station's camera.
// - **The meshes in place** (owner: no stand-in boxes): the consoles' objects (CONTROL_SOURCES) are kept out of
//   the per-room merge on this page (merge-rooms.ts `keptApart`, set by main.ts before the ship loads), split
//   into their loose parts here (vertices welded at 1 mm), and the obvious ones made controls: a few cm to
//   half a metre, inside the station's region; a part inside a bigger one (a knob on its ring) joins it. Each
//   control gets its own meshes (the source's material and vertices, its triangles), on a pivot at its middle
//   so it can move: a dial turns, a button goes in. The rest of each source is drawn as one mesh; the source
//   itself is hidden (still there for the see-through's rays and the colliders, as the merged originals).
// - **The highlight: an outline** (owner: a yellow in the palette's key; the palette texture has none): a
//   shell of the control pushed out along smoothed normals by `px` pixels, drawn where the control itself isn't
//   (a stencil mask of the control first), over everything.
// - **The pad and keys:** the D-pad or the arrows move the selection by direction (the nearest control that
//   way on screen); each station keeps its own. A, Enter: use it (a dial: grab it, the D-pad turns it, A or
//   B lets go). B, C, Backspace with nothing grabbed: main.ts gets her up (the pilot's station only).
// - **The mouse** (captured): a 2 × 2 light grey cursor at the screen's centre; the control under it is the
//   selection; a click uses it, click and drag turns a dial (the look held meanwhile).
// - **A label** next to the selected control (owner, 2026-11-23): small, to the right of it on screen (to the left
//   if there's no room), kept inside the screen. Placeholder text for now (`placeholderLabel`): its kind and number.
// Prototype code: only flight-test.html uses it (main.ts FLIGHT_TEST). A real list of controls once the owner
// has redesigned the panels (then the controls file, plan pass 1, replaces the parts found here).

import * as THREE from 'three/webgpu';
import { cameraPosition, length, modelWorldMatrix, normalLocal, positionGeometry, positionLocal, uniform, vec4 } from 'three/tsl';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type GUI from 'three/addons/libs/lil-gui.module.min.js';
import type { StationId } from './stations';

/** Each station's console: the ship file's objects (node names as loaded) whose loose parts become controls. */
export const CONTROL_SOURCES: Record<StationId, string[]> = {
  pilot: [
    'Dashboard_Center', 'Compass', 'Horizon', 'Nav_Display', 'External_Cameras_Display',
    'Engine_Tilt_Lever', 'Engine_Tilt_Rail', 'Landing_Gear_Lever', 'Landing_Gear_Rail',
    'Thrust_Lever', 'Thrust_Rail', 'Light', 'Button_Panel001',
  ],
  navigation: ['Navigation_Display'],
  signal: ['Dashboard_Body001', 'Signal_Receiver001', 'Signal_Receiver002'],
};

/** Where a station's controls may be (ship space, three's axes: +x is to the left seen from the seats); none: the whole source. Her seat: the main dashboard from the centre panel rightwards, and the throttles. */
const REGIONS: Partial<Record<StationId, THREE.Box3>> = {
  pilot: new THREE.Box3(new THREE.Vector3(-1.7, 4.0, 3.6), new THREE.Vector3(0.6, 4.9, 4.4)),
};
/** A part's largest side (m) to count as a control: a screen may be bigger (bigger ones are housings and panels). */
const MIN_SIZE = 0.02;
const MAX_SIZE = 0.25;
const MAX_SCREEN = 1;
/** A part joins a bigger one it sits in only up to this many times smaller (a knob on its ring; not a dial on a whole panel). */
const NEST_RATIO = 2.2;
/** Materials of housings, never controls. */
const HOUSING = /Black Metal/;
const SCREEN = /Map|CRT|Emission|Screen/i;
/** Sources that are dials by name (`Dial.008`, `Dials.001`). */
const DIAL_NAME = /^Dials?\d*$/;
/** A pad's step turns a grabbed dial this much (rad); a mouse drag this much per radian of look. */
const DIAL_STEP = THREE.MathUtils.degToRad(15);
const DIAL_DRAG = 2.5;
/** A press: how far in (m) and how long (s). */
const PRESS_DEPTH = 0.004;
const PRESS_SECONDS = 0.22;

export type ControlKind = 'button' | 'dial' | 'screen';

/** PLACEHOLDER (not the owner's copy): a control's label until the panels are redesigned and the controls named. */
const placeholderLabel = (c: Control) => `${c.kind[0]!.toUpperCase()}${c.kind.slice(1)} ${c.id.split('-').pop()}`;
/** The label's gap from the control on screen, and from the screen's edges (px). */
const LABEL_GAP = 8;
const LABEL_EDGE = 8;

export interface Control {
  id: string;
  station: StationId;
  kind: ControlKind;
  /** A child of the ship at the control's middle: turned (a dial) or moved (a press) with its meshes. */
  pivot: THREE.Object3D;
  /** The control's meshes (the sources' materials and vertices, its triangles), children of the pivot. */
  meshes: THREE.Mesh[];
  /** Its middle (ship space). */
  centre: THREE.Vector3;
  /** Its face's normal toward the station, ship space: a dial's axis, a press's direction (set the first time it's seen). */
  axis: THREE.Vector3 | null;
  /** A dial's turn (rad). */
  turn: number;
  /** Seconds since its last press; Infinity: at rest. */
  pressed: number;
  /** The outline's shell and its masks (one per mesh), shown while it's selected. */
  outline: THREE.Mesh[];
}

/** The panel's settings (folder *Flight test: controls*). */
export const controlLook = { colour: '#ffc400', px: 3, all: false };

interface Island {
  source: THREE.Mesh;
  /** Vertex indices, three per triangle. */
  triangles: number[];
  box: THREE.Box3;
  size: number;
}

export class Controls {
  readonly list: Control[] = [];
  /** The panel's settings (dev hook: `__controls().look`). */
  readonly look = controlLook;
  /** The selection at each station (the pad's; the mouse's is what's under the cursor). */
  private readonly kept = new Map<StationId, Control>();
  private station: StationId | null = null;
  /** The control highlighted now. */
  selected: Control | null = null;
  /** A dial grabbed: by the pad (A) or the mouse (held). */
  grabbed: Control | null = null;
  private grabbedByMouse = false;
  /** The mouse points (the cursor) rather than the pad or arrows stepping. */
  private pointing = false;
  private readonly cursor = document.createElement('div');
  private readonly label = document.createElement('div');
  private readonly box = new THREE.Box3();
  private readonly colour = uniform(new THREE.Vector3(1, 0.8, 0)); // linear RGB
  private readonly pixel = uniform(0.002);
  private readonly px = uniform(controlLook.px);
  private readonly shellMaterial: THREE.MeshBasicNodeMaterial;
  private readonly maskMaterial: THREE.MeshBasicNodeMaterial;
  private readonly ray = new THREE.Raycaster();
  private readonly v = new THREE.Vector3();
  private readonly colourTemp = new THREE.Color();
  private flash = 0;

  constructor(
    private readonly ship: THREE.Object3D,
    /** A use's click (main.ts: the interaction's sound). */
    private readonly click: () => void,
  ) {
    this.shellMaterial = this.makeShellMaterial();
    this.maskMaterial = this.makeMaskMaterial();
    Object.assign(this.cursor.style, { position: 'fixed', left: '50%', top: '50%', width: '2px', height: '2px', margin: '-1px 0 0 -1px', background: '#d0d0d0', pointerEvents: 'none', zIndex: '5', display: 'none' });
    this.cursor.id = 'control-cursor';
    document.body.append(this.cursor);
    this.label.id = 'control-label';
    this.label.hidden = true;
    document.body.append(this.label);
    ship.updateWorldMatrix(true, true);
    for (const station of Object.keys(CONTROL_SOURCES) as StationId[]) this.build(station);
    console.info(`[0.0.2] flight test controls: ${(Object.keys(CONTROL_SOURCES) as StationId[]).map((s) => `${s} ${this.list.filter((c) => c.station === s).length}`).join(', ')}`);
  }

  /** A dial follows the mouse: main.ts holds the look meanwhile. */
  get dragging(): boolean {
    return this.grabbed !== null && this.grabbedByMouse;
  }

  /**
   * Per frame, after the station's camera is placed. `input` null: nothing taken (a cutscene, a line).
   * @returns true when B was pressed with nothing grabbed (main.ts: she gets up, from the pilot's station).
   */
  update(
    station: StationId | null,
    camera: THREE.PerspectiveCamera,
    drawingHeight: number,
    dt: number,
    input: { step: [number, number] | null; use: boolean; back: boolean; captured: boolean; mouseMoved: boolean; held: boolean; drag: number } | null,
  ): boolean {
    if (station !== this.station) {
      this.grabbed = null;
      this.station = station;
    }
    const linear = this.colourTemp.set(controlLook.colour); // a hex string is sRGB: set() makes it linear
    this.px.value = controlLook.px;
    this.pixel.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / Math.max(1, drawingHeight);
    let getUp = false;
    const here = station ? this.list.filter((c) => c.station === station) : [];
    camera.updateMatrixWorld();
    for (const c of here) if (!c.axis) c.axis = this.faceNormal(c, camera);
    if (station && input) {
      if (input.mouseMoved && input.captured) this.pointing = true;
      if (input.step || !input.captured) this.pointing = false;
      if (this.pointing) {
        // The mouse: what's under the cursor; a click uses it, a dial follows the drag while held.
        if (!this.grabbed) this.selected = this.under(camera, here);
        if (this.grabbed && this.grabbedByMouse) {
          this.grabbed.turn -= input.drag * DIAL_DRAG;
          if (!input.held) this.grabbed = null;
        } else if (input.use && this.selected) this.use(this.selected, true, input.held);
        if (input.back) {
          if (this.grabbed) this.grabbed = null;
          else getUp = true;
        }
      } else {
        // The pad and the arrows.
        if (this.grabbed && this.grabbedByMouse) this.grabbed = null;
        let selected = this.kept.get(station) ?? null;
        if (!selected || selected.station !== station) selected = this.nearestToCentre(camera, here);
        if (this.grabbed) {
          if (input.step) this.grabbed.turn -= (input.step[0] || input.step[1]) * DIAL_STEP;
          if (input.use || input.back) this.grabbed = null;
        } else {
          if (input.step && selected) selected = this.stepFrom(selected, input.step, camera, here) ?? selected;
          if (input.use && selected) this.use(selected, false, false);
          else if (input.back) getUp = true;
        }
        this.selected = selected;
        if (selected) this.kept.set(station, selected);
      }
    } else if (!station) this.selected = null;
    // The look: the dials' turns, the presses, the outline.
    this.flash = Math.max(0, this.flash - Math.max(0, dt));
    if (this.flash > 0) linear.lerp(new THREE.Color(1, 1, 1), this.flash / 0.15);
    this.colour.value.set(linear.r, linear.g, linear.b);
    for (const c of this.list) {
      c.pressed += Math.max(0, dt);
      const t = c.pressed / PRESS_SECONDS;
      const depth = t < 1 ? PRESS_DEPTH * Math.sin(Math.PI * Math.min(1, t)) : 0;
      c.pivot.position.copy(c.centre);
      if (c.axis) {
        c.pivot.position.addScaledVector(c.axis, -depth);
        c.pivot.quaternion.setFromAxisAngle(c.axis, c.turn);
      }
      const shown = station !== null && (c === this.selected || (controlLook.all && c.station === station));
      for (const o of c.outline) o.visible = shown;
    }
    this.cursor.style.display = station && input && input.captured && this.pointing ? 'block' : 'none';
    this.placeLabel(station ? this.selected : null, camera);
    return getUp;
  }

  /** The label beside the control: right of its bounds on screen (left if there's no room), centred on it vertically, inside the screen. */
  private placeLabel(c: Control | null, camera: THREE.PerspectiveCamera): void {
    const corners: THREE.Vector3[] = [];
    if (c) {
      this.box.setFromObject(c.pivot);
      for (let i = 0; i < 8; i++) {
        const p = new THREE.Vector3(i & 1 ? this.box.max.x : this.box.min.x, i & 2 ? this.box.max.y : this.box.min.y, i & 4 ? this.box.max.z : this.box.min.z).project(camera);
        if (p.z < 1) corners.push(p);
      }
    }
    if (!c || corners.length < 8) {
      this.label.hidden = true;
      return;
    }
    const text = placeholderLabel(c);
    if (this.label.textContent !== text) this.label.textContent = text;
    this.label.hidden = false;
    const width = window.innerWidth, height = window.innerHeight;
    const xs = corners.map((p) => (p.x * 0.5 + 0.5) * width);
    const ys = corners.map((p) => (-p.y * 0.5 + 0.5) * height);
    const w = this.label.offsetWidth, h = this.label.offsetHeight;
    let x = Math.max(...xs) + LABEL_GAP;
    if (x + w > width - LABEL_EDGE) x = Math.min(...xs) - LABEL_GAP - w;
    x = THREE.MathUtils.clamp(x, LABEL_EDGE, Math.max(LABEL_EDGE, width - LABEL_EDGE - w));
    const y = THREE.MathUtils.clamp((Math.min(...ys) + Math.max(...ys)) / 2 - h / 2, LABEL_EDGE, Math.max(LABEL_EDGE, height - LABEL_EDGE - h));
    this.label.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
  }

  /** Dev hook: a control selected by id (the pad's selection at its station). */
  select(id: string): Control | null {
    const c = this.list.find((x) => x.id === id) ?? null;
    if (c) {
      this.kept.set(c.station, c);
      if (c.station === this.station) this.selected = c;
    }
    return c;
  }

  private use(c: Control, byMouse: boolean, held: boolean): void {
    this.click();
    if (c.kind === 'dial') {
      // The mouse turns it while held; the pad grabs it until A or B.
      if (!byMouse || held) {
        this.grabbed = c;
        this.grabbedByMouse = byMouse;
      }
    } else if (c.kind === 'button') c.pressed = 0;
    else this.flash = 0.15; // a screen: nothing yet (the map is pass 4, the signal's pass 5)
  }

  /** The control under the screen's centre, if any. */
  private under(camera: THREE.Camera, here: Control[]): Control | null {
    this.ray.setFromCamera(new THREE.Vector2(0, 0), camera);
    let best: Control | null = null;
    let near = Infinity;
    for (const c of here) {
      for (const m of c.meshes) {
        const hit = this.ray.intersectObject(m, false)[0];
        if (hit && hit.distance < near) {
          near = hit.distance;
          best = c;
        }
      }
    }
    return best;
  }

  /** A control's middle on screen: x right, y up, x scaled by the aspect (so steps are judged as seen); null behind. */
  private onScreen(c: Control, camera: THREE.PerspectiveCamera): THREE.Vector2 | null {
    this.v.copy(c.centre).applyMatrix4(this.ship.matrixWorld).project(camera);
    if (this.v.z > 1) return null;
    return new THREE.Vector2(this.v.x * camera.aspect, this.v.y);
  }

  private nearestToCentre(camera: THREE.PerspectiveCamera, here: Control[]): Control | null {
    let best: Control | null = null;
    let near = Infinity;
    for (const c of here) {
      const p = this.onScreen(c, camera);
      if (p && p.length() < near) {
        near = p.length();
        best = c;
      }
    }
    return best;
  }

  /** The nearest control in that direction on screen (within 60° of it), the angle off it costing more than the distance. */
  private stepFrom(from: Control, step: [number, number], camera: THREE.PerspectiveCamera, here: Control[]): Control | null {
    const start = this.onScreen(from, camera);
    if (!start) return this.nearestToCentre(camera, here);
    const dir = new THREE.Vector2(step[0], step[1]).normalize();
    let best: Control | null = null;
    let score = Infinity;
    for (const c of here) {
      if (c === from) continue;
      const p = this.onScreen(c, camera);
      if (!p) continue;
      const d = p.sub(start);
      const dist = d.length();
      if (dist < 1e-4) continue;
      const cos = d.dot(dir) / dist;
      if (cos < 0.5) continue;
      const s = dist * (1 + 3 * (1 - cos));
      if (s < score) {
        score = s;
        best = c;
      }
    }
    return best;
  }

  /** The control's faces toward the camera, their normals summed by area (ship space). */
  private faceNormal(c: Control, camera: THREE.Camera): THREE.Vector3 {
    const eye = this.ship.worldToLocal(camera.getWorldPosition(new THREE.Vector3()));
    const sum = new THREE.Vector3();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3();
    for (const m of c.meshes) {
      const toShip = new THREE.Matrix4().compose(c.centre, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)).multiply(m.matrix);
      const pos = m.geometry.getAttribute('position');
      const index = m.geometry.index!;
      for (let i = 0; i < index.count; i += 3) {
        a.fromBufferAttribute(pos, index.getX(i)).applyMatrix4(toShip);
        b.fromBufferAttribute(pos, index.getX(i + 1)).applyMatrix4(toShip);
        d.fromBufferAttribute(pos, index.getX(i + 2)).applyMatrix4(toShip);
        n.crossVectors(b.sub(a), d.sub(a));
        if (n.dot(this.v.copy(eye).sub(a)) > 0) sum.add(n);
      }
    }
    return sum.lengthSq() > 0 ? sum.normalize() : this.v.copy(eye).sub(c.centre).normalize().clone();
  }

  /** A station's controls: its sources' loose parts, filtered and nested. */
  private build(station: StationId): void {
    const shipInverse = new THREE.Matrix4().copy(this.ship.matrixWorld).invert();
    const sources: THREE.Mesh[] = [];
    for (const name of CONTROL_SOURCES[station]) {
      const node = this.ship.getObjectByName(name);
      if (!node) {
        console.warn(`[0.0.2] flight test controls: no ${name} in the ship`);
        continue;
      }
      node.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && !sources.includes(o as THREE.Mesh)) sources.push(o as THREE.Mesh);
      });
    }
    const region = REGIONS[station];
    const islands: Island[] = [];
    for (const source of sources) {
      const material = source.material as THREE.Material;
      if (Array.isArray(source.material) || HOUSING.test(material.name)) continue;
      const toShip = new THREE.Matrix4().multiplyMatrices(shipInverse, source.matrixWorld);
      for (const island of this.islandsOf(source, toShip)) {
        const centre = island.box.getCenter(new THREE.Vector3());
        const max = SCREEN.test(material.name) ? MAX_SCREEN : MAX_SIZE;
        if (island.size < MIN_SIZE || island.size > max || (region && !region.containsPoint(centre))) continue;
        islands.push(island);
      }
    }
    // Nesting: each part joins the smallest bigger part it sits in (its middle inside, at most NEST_RATIO smaller).
    islands.sort((a, b) => b.size - a.size);
    const parentOf = new Map<Island, Island>();
    for (let i = 0; i < islands.length; i++) {
      const small = islands[i]!;
      const centre = small.box.getCenter(new THREE.Vector3());
      for (let j = i - 1; j >= 0; j--) {
        const big = islands[j]!;
        if (big.size > small.size * NEST_RATIO || big.size <= small.size) continue;
        if (big.box.clone().expandByScalar(0.002).containsPoint(centre)) {
          parentOf.set(small, big);
          break;
        }
      }
    }
    const root = (i: Island): Island => {
      let r = i;
      while (parentOf.has(r)) r = parentOf.get(r)!;
      return r;
    };
    const groups = new Map<Island, Island[]>();
    for (const i of islands) {
      const r = root(i);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r)!.push(i);
    }
    // Left to right as seen from the station (roughly: by x along the console), numbered.
    const x = (g: Island[]) => g.reduce((sum, i) => sum + i.box.min.x + i.box.max.x, 0) / (2 * g.length);
    const ordered = [...groups.values()].sort((a, b) => x(a) - x(b));
    const taken = new Map<THREE.Mesh, Set<string>>(); // per source: the triangles moved into controls
    ordered.forEach((group, n) => {
      const box = new THREE.Box3();
      for (const i of group) box.union(i.box);
      const centre = box.getCenter(new THREE.Vector3());
      const kind: ControlKind = group.some((i) => SCREEN.test((i.source.material as THREE.Material).name))
        ? 'screen'
        : group.some((i) => DIAL_NAME.test(i.source.name)) || this.looksRound(group)
          ? 'dial'
          : 'button';
      const pivot = new THREE.Object3D();
      pivot.name = `control ${station} ${n + 1}`;
      pivot.position.copy(centre);
      this.ship.add(pivot);
      const meshes: THREE.Mesh[] = [];
      const outline: THREE.Mesh[] = [];
      const bySource = new Map<THREE.Mesh, number[]>();
      for (const i of group) bySource.set(i.source, [...(bySource.get(i.source) ?? []), ...i.triangles]);
      for (const [source, triangles] of bySource) {
        const set = taken.get(source) ?? new Set<string>();
        taken.set(source, set);
        triangles.forEach((_, k) => k % 3 === 0 && set.add(this.triangleKey(triangles, k)));
        const mesh = this.partMesh(source, triangles);
        // Its matrix: from the source's space to the pivot's.
        mesh.matrix.makeTranslation(-centre.x, -centre.y, -centre.z).multiply(new THREE.Matrix4().multiplyMatrices(shipInverse, source.matrixWorld));
        mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
        mesh.name = `${pivot.name} (${source.name})`;
        pivot.add(mesh);
        meshes.push(mesh);
        // The outline's mask: the same triangles, stencil only.
        const mask = new THREE.Mesh(mesh.geometry, this.maskMaterial);
        mask.renderOrder = 900;
        mask.frustumCulled = false;
        mask.name = `${mesh.name} mask`;
        mask.visible = false;
        mesh.add(mask);
        outline.push(mask);
      }
      const shell = new THREE.Mesh(this.shellGeometry(meshes), this.shellMaterial);
      shell.name = `${pivot.name} outline`;
      shell.renderOrder = 901;
      shell.frustumCulled = false;
      shell.visible = false;
      pivot.add(shell);
      outline.push(shell);
      this.list.push({ id: `${station}-${n + 1}`, station, kind, pivot, meshes, centre, axis: null, turn: 0, pressed: Infinity, outline });
    });
    // Each source: drawn as the rest of its triangles; the source hidden.
    for (const [source, set] of taken) {
      const index = source.geometry.index!;
      const rest: number[] = [];
      for (let t = 0; t < index.count; t += 3) {
        const tri = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
        if (!set.has(this.triangleKey(tri, 0))) rest.push(...tri);
      }
      const mesh = this.partMesh(source, rest);
      mesh.position.copy(source.position);
      mesh.quaternion.copy(source.quaternion);
      mesh.scale.copy(source.scale);
      mesh.name = `${source.name} (rest)`;
      source.parent!.add(mesh);
      source.visible = false;
    }
  }

  /** A triangle's identity by its three vertex indices (sorted). */
  private triangleKey(tris: ArrayLike<number>, k: number): string {
    const a = tris[k]!, b = tris[k + 1]!, c = tris[k + 2]!;
    const lo = Math.min(a, b, c), hi = Math.max(a, b, c);
    return `${lo},${a + b + c - lo - hi},${hi}`;
  }

  /** A mesh of some of the source's triangles: its vertices and material shared, the see-through's per-object values read from it. */
  private partMesh(source: THREE.Mesh, triangles: number[]): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(source.geometry.attributes)) geometry.setAttribute(name, attribute);
    const max = source.geometry.getAttribute('position').count;
    geometry.setIndex(new THREE.BufferAttribute(max > 65535 ? new Uint32Array(triangles) : new Uint16Array(triangles), 1));
    // Bounds from its own triangles (three's would cover every shared vertex: the whole source).
    const pos = source.geometry.getAttribute('position');
    const box = new THREE.Box3();
    const p = new THREE.Vector3();
    for (const i of triangles) box.expandByPoint(p.fromBufferAttribute(pos, i));
    geometry.boundingBox = box;
    geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
    const mesh = new THREE.Mesh(geometry, source.material);
    mesh.castShadow = false; // the ship's merged shadow casters already have them
    mesh.receiveShadow = source.receiveShadow;
    for (const key of ['cutStructure', 'cutFade', 'cutWhole', 'cutSolid']) Object.defineProperty(mesh.userData, key, { get: () => source.userData[key], enumerable: true });
    return mesh;
  }

  /** The source's loose parts (vertices welded at 1 mm), with their bounds in ship space. */
  private islandsOf(source: THREE.Mesh, toShip: THREE.Matrix4): Island[] {
    const geometry = source.geometry;
    const pos = geometry.getAttribute('position');
    const index = geometry.index;
    if (!index) return [];
    const weld = new Int32Array(pos.count);
    const keys = new Map<string, number>();
    for (let i = 0; i < pos.count; i++) {
      this.v.fromBufferAttribute(pos, i).applyMatrix4(toShip);
      const k = `${Math.round(this.v.x * 1000)},${Math.round(this.v.y * 1000)},${Math.round(this.v.z * 1000)}`;
      let w = keys.get(k);
      if (w === undefined) keys.set(k, (w = keys.size));
      weld[i] = w;
    }
    const parent = new Int32Array(keys.size).map((_, i) => i);
    const find = (a: number): number => {
      while (parent[a] !== a) a = parent[a] = parent[parent[a]!]!;
      return a;
    };
    for (let t = 0; t < index.count; t += 3) {
      const a = find(weld[index.getX(t)]!);
      parent[find(weld[index.getX(t + 1)]!)] = a;
      parent[find(weld[index.getX(t + 2)]!)] = a;
    }
    const byRoot = new Map<number, Island>();
    for (let t = 0; t < index.count; t += 3) {
      const r = find(weld[index.getX(t)]!);
      let island = byRoot.get(r);
      if (!island) byRoot.set(r, (island = { source, triangles: [], box: new THREE.Box3(), size: 0 }));
      for (let k = 0; k < 3; k++) {
        const i = index.getX(t + k);
        island.triangles.push(i);
        island.box.expandByPoint(this.v.fromBufferAttribute(pos, i).applyMatrix4(toShip));
      }
    }
    for (const island of byRoot.values()) {
      const s = island.box.getSize(this.v);
      island.size = Math.max(s.x, s.y, s.z);
    }
    return [...byRoot.values()];
  }

  /** Round and many-sided (a knob): at least 40 triangles and its two largest sides within 25% of each other. */
  private looksRound(group: Island[]): boolean {
    const triangles = group.reduce((n, i) => n + i.triangles.length / 3, 0);
    const box = new THREE.Box3();
    for (const i of group) box.union(i.box);
    const s = box.getSize(new THREE.Vector3()).toArray().sort((a, b) => b - a);
    return triangles >= 40 && s[1]! / s[0]! > 0.75;
  }

  /** The outline's shell: the control's triangles in the pivot's space, welded, with smoothed normals to push them out along. */
  private shellGeometry(meshes: THREE.Mesh[]): THREE.BufferGeometry {
    const plain: number[] = [];
    for (const m of meshes) {
      const pos = m.geometry.getAttribute('position');
      const index = m.geometry.index!;
      for (let i = 0; i < index.count; i++) {
        this.v.fromBufferAttribute(pos, index.getX(i)).applyMatrix4(m.matrix);
        plain.push(this.v.x, this.v.y, this.v.z);
      }
    }
    const bare = new THREE.BufferGeometry();
    bare.setAttribute('position', new THREE.Float32BufferAttribute(plain, 3));
    const welded = mergeVertices(bare, 1e-4);
    welded.computeVertexNormals();
    return welded;
  }

  /** The outline: the shell pushed out by `px` pixels, drawn where the control's mask isn't, over everything. */
  private makeShellMaterial(): THREE.MeshBasicNodeMaterial {
    const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: false, side: THREE.DoubleSide });
    material.name = 'Control outline';
    const world = modelWorldMatrix.mul(vec4(positionGeometry, 1)).xyz;
    const width = length(cameraPosition.sub(world)).mul(this.pixel).mul(this.px);
    material.positionNode = positionLocal.add(normalLocal.mul(width));
    material.colorNode = vec4(this.colour, 1);
    material.stencilWrite = true;
    material.stencilRef = 1;
    material.stencilFunc = THREE.NotEqualStencilFunc;
    material.stencilFail = THREE.KeepStencilOp;
    material.stencilZFail = THREE.KeepStencilOp;
    material.stencilZPass = THREE.KeepStencilOp;
    return material;
  }

  /** The control's own pixels marked in the stencil (nothing drawn), so the outline stays round it. */
  private makeMaskMaterial(): THREE.MeshBasicNodeMaterial {
    const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false, colorWrite: false, fog: false, side: THREE.DoubleSide });
    material.name = 'Control outline mask';
    material.stencilWrite = true;
    material.stencilRef = 1;
    material.stencilFunc = THREE.AlwaysStencilFunc;
    material.stencilZPass = THREE.ReplaceStencilOp;
    return material;
  }
}

/** The tuning panel's folder: the outline's colour and width, every control outlined. */
export function controlsFolder(gui: GUI): void {
  const folder = gui.addFolder('Flight test: controls (D-pad / arrows, A / click, B)');
  folder.addColor(controlLook, 'colour').name('outline colour');
  folder.add(controlLook, 'px', 1, 8, 0.5).name('outline width (px)');
  folder.add(controlLook, 'all').name("outline every control (the station's)");
}
