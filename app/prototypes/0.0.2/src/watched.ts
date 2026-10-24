// A watched conversation (owner, 2026-10-22: cutscene 2, the opening in the cockpit): a story knot's
// lines in the dialogue box, not played but watched. The camera is its own, decoupled from her, with
// a long lens (owner: the cinematic look); it's fixed on whoever speaks and cuts to the next speaker
// with each line. Each line moves on by itself a moment after it's typed out (`autoNext`), so the
// player can just sit and watch; a press completes or skips a line as usual.
// The data, `public/conversations/<id>.json`: the knot, the wait, and a shot per speaker (the ship
// file's Blender coordinates): `from`, where the camera looks from (the owner's angle); `look`, what
// it looks at when not at the speaker (Ogawa over the comms: the cockpit); `frame`, how much it
// frames (m, top to bottom). The camera looks at the speaker's head from that side; if that's too
// close for the long lens it backs away along the same line (outside the ship is fine: owner). If
// something opaque is in the way (glass lets it through; their own seat doesn't count), the shot is
// turned a little at a time, either way, until one sees them (through a window); if none does, it
// stops in front of the wall. The lens is set to frame the character from where it ends up. A speaker with no shot gets one the same way from beside
// their seat, on their outboard side (the owner's for the pilot's seat, mirrored).
// main.ts treats it as a cutscene while it plays (she stands still, nothing can be used, the
// see-through is off, the crew drawn, the black bars) and renders through its camera.
// Plan: doc/plans/features/flying-scene.md (pass 1, the animatic)

import * as THREE from 'three/webgpu';
import { fromBlender } from './commands';
import type { Dialogue } from './dialogue';
import type { Entities } from './entities';
import type { GameStory } from './story';

type Vec = [number, number, number];

export interface Shot {
  /** Where the camera looks from (it may back away along the line to its subject). */
  from?: Vec;
  /** What it looks at, if not the speaker's head. */
  look?: Vec;
  /** How much it frames, top to bottom (m). */
  frame?: number;
}

export interface WatchedData {
  /** The story knot whose lines it shows. */
  knot: string;
  /** How long a line typed out stays before the next (s). */
  wait: number;
  /** The shot per speaker (character id), in the ship file's Blender coordinates. */
  shots: Record<string, Shot>;
}

/** The long lens's widest view (degrees, vertical): about 70 mm on a full-frame camera. */
const LENS_FOV = 20;
/** A speaker framed head and shoulders: this much, top to bottom (m)... */
const FRAME = 0.9;
/** ...centred this far under the head (her head in the upper third). */
const FRAME_BELOW_HEAD = 0.15;
/** Something else framed (`look`): this much (m). */
const FRAME_WIDE = 2.2;
/** Where the camera looks from when a speaker has no shot, from their head (Blender: out to their side, a little ahead, above): the owner's for the pilot's seat. */
const BESIDE = new THREE.Vector3(0.67, -0.16, 0.12);
/** The camera stops this far in front of something opaque in its way (m). */
const CLEAR = 0.1;
/** Nothing this close to what it frames counts as in the way (m): their own seat, its headrest. */
const OWN_SEAT = 0.6;
/** A blocked shot is tried turned by these (degrees about the vertical), in order. */
const TURNS = [15, -15, 30, -30, 45, -45, 60, -60, 75, -75];
/** The head is this far under the top of a character's bounds (m). */
const HEAD_BELOW_TOP = 0.12;

export class WatchedConversation {
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.05, 500);
  /** The conversation is on (from `play` to the dialogue's end). */
  playing = false;
  /** The speaker the camera is on (for checks). */
  speaker: string | null = null;
  private data: WatchedData | null = null;
  /** The conversations fetched so far, by id. */
  private readonly loaded = new Map<string, WatchedData>();
  /** What can stand between the camera and the speaker: the ship's opaque meshes (not glass, not the crew). */
  private solid: THREE.Mesh[] | null = null;
  private readonly ray = new THREE.Raycaster();

  constructor(
    private readonly ship: THREE.Object3D,
    private readonly entities: Entities,
    private readonly story: GameStory,
    private readonly dialogue: Dialogue,
    /** Her head (world): main.ts, from her head bone (she may be seated). */
    private readonly herHead: () => THREE.Vector3,
  ) {}

  /** Fetches a conversation's data (once), so a later `play` starts it at once: main.ts loads cutscene 2's with the game. */
  async load(id: string): Promise<WatchedData> {
    const known = this.loaded.get(id);
    if (known) return known;
    const response = await fetch(`/conversations/${id}.json`);
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error(`no conversation "${id}"`);
    const data = (await response.json()) as WatchedData;
    this.loaded.set(id, data);
    return data;
  }

  /** Starts it, the camera on the first speaker; on this frame if it was loaded. */
  async play(id: string, aspect = this.camera.aspect): Promise<void> {
    this.data = this.loaded.get(id) ?? (await this.load(id));
    this.playing = true;
    this.speaker = null;
    this.dialogue.autoNext = this.data.wait;
    this.story.run(this.data.knot);
    this.update(aspect);
  }

  /** Ends it now: the box closes (as at its last line), and `update` sees it. */
  skip(): void {
    if (this.playing && this.dialogue.active) this.dialogue.end();
  }

  /** Per frame: the camera on the line's speaker (a cut when it changes); the end when the box closes. */
  update(aspect: number): void {
    if (!this.playing) return;
    if (!this.dialogue.active) {
      this.playing = false;
      this.dialogue.autoNext = null;
      return;
    }
    if (this.camera.aspect !== aspect) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    const id = this.dialogue.line?.id ?? null;
    if (id === null || id === this.speaker) return;
    this.speaker = id;
    this.aim(id, this.data?.shots[id] ?? {});
  }

  /** The camera on the speaker (or the shot's `look`), from the shot's side, backed off for the lens, the lens set to frame them. */
  private aim(id: string, shot: Shot): void {
    const world = (v: Vec) => this.ship.localToWorld(fromBlender(v));
    const head = this.head(id);
    const frame = shot.look ? (shot.frame ?? FRAME_WIDE) : (shot.frame ?? FRAME);
    const target = shot.look ? world(shot.look) : head.clone().setY(head.y - FRAME_BELOW_HEAD);
    let from: THREE.Vector3;
    if (shot.from) from = world(shot.from);
    else {
      // Beside them, on their outboard side (the pilot's seat's shot, mirrored for the other side).
      const local = this.ship.worldToLocal(head.clone());
      const side = local.x >= 0 ? 1 : -1;
      from = world([0, 0, 0]).negate().add(world([BESIDE.x * side, BESIDE.y, BESIDE.z])).add(head);
    }
    const given = from.clone().sub(target);
    let distance = Math.max(given.length(), frame / 2 / Math.tan(THREE.MathUtils.degToRad(LENS_FOV / 2)));
    given.normalize();
    // Not through a wall: the first turn of the shot that sees them, else the shot as given, stopped in front of the wall.
    const blockedAt = (dir: THREE.Vector3) => {
      this.ray.set(target, dir);
      this.ray.near = OWN_SEAT;
      this.ray.far = distance;
      return this.ray.intersectObjects(this.solidMeshes(), false)[0]?.distance ?? null;
    };
    let away = given;
    const first = blockedAt(given);
    if (first !== null) {
      const up = new THREE.Vector3(0, 1, 0);
      const clear = TURNS.map((deg) => given.clone().applyAxisAngle(up, THREE.MathUtils.degToRad(deg))).find((dir) => blockedAt(dir) === null);
      if (clear) away = clear;
      else distance = Math.max(CLEAR, first - CLEAR);
    }
    this.camera.position.copy(target).addScaledVector(away, distance);
    this.camera.lookAt(target);
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(frame / 2 / distance));
    this.camera.updateProjectionMatrix();
  }

  /** The ship's meshes that hide what's behind them: drawn, not glass, not the crew (found once). */
  private solidMeshes(): THREE.Mesh[] {
    if (this.solid) return this.solid;
    const crew = new Set<THREE.Object3D>();
    for (const e of this.entities.ofKind('character')) e.object.traverse((o) => crew.add(o));
    const solid: THREE.Mesh[] = [];
    // Only what's drawn (the colliders and collision boxes are hidden meshes in the ship).
    this.ship.traverseVisible((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || crew.has(o) || (o as THREE.SkinnedMesh).isSkinnedMesh) return;
      const material = mesh.material as THREE.MeshPhysicalMaterial;
      if (Array.isArray(material) || material.transparent || (material.transmission ?? 0) > 0) return;
      solid.push(mesh);
    });
    this.solid = solid;
    return solid;
  }

  /** A character's head (world): hers from main.ts, the crew's from their bounds. */
  private head(id: string): THREE.Vector3 {
    const object = id === 'green' ? null : this.entities.get(id)?.object;
    if (!object) return this.herHead().clone();
    const box = new THREE.Box3().setFromObject(object, true);
    return box.getCenter(new THREE.Vector3()).setY(box.max.y - HEAD_BELOW_TOP);
  }
}
