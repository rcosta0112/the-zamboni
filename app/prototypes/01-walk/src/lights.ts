// Room lights inside the ship: one or two ambient lights per room (owner, 2026-10-09), from the
// light markers in the ship file ("light ..." empties with a `light` custom property: glTF can't
// carry Blender's area lights). Point lights, unshadowed.
// Budget: four real-time lights on at once, the ones nearest Dr. Green, so the room she's in is
// lit. The four lights always exist (changing the number of lights recompiles every shader); they
// move between markers, fading out and back in. "All" gives every marker its own light, to compare.
// Plan: doc/plans/features/ship-contents.md

import * as THREE from 'three/webgpu';
import { settings } from './settings';

export interface LightMarker {
  name: string;
  room: string;
  position: THREE.Vector3; // world
  color: THREE.Color;
}

/** The light markers in the ship, in world space. */
export function findLightMarkers(ship: THREE.Object3D): LightMarker[] {
  ship.updateMatrixWorld(true);
  const markers: LightMarker[] = [];
  ship.traverse((o) => {
    const light = o.userData.light as { room: string; color: number[] } | undefined;
    if (!light) return;
    const [r = 1, g = 1, b = 1] = light.color;
    markers.push({ name: o.name, room: light.room, position: o.getWorldPosition(new THREE.Vector3()), color: new THREE.Color(r, g, b) });
  });
  return markers;
}

/** Seconds for a light to fade out or in when it moves to another marker. */
const FADE = 0.4;

interface Slot {
  light: THREE.PointLight;
  marker: LightMarker | null;
  level: number; // 0..1
}

export class RoomLights {
  private slots: Slot[] = [];
  private mode = '';

  constructor(
    private scene: THREE.Scene,
    private markers: LightMarker[],
  ) {}

  /** Per frame, with Dr. Green's position. */
  update(focus: THREE.Vector3, dt: number): void {
    const mode = `${settings.roomLights}`;
    if (mode !== this.mode) this.rebuild(mode);

    const all = settings.roomLights === 'all';
    const wanted = all
      ? this.markers
      : [...this.markers].sort((a, b) => a.position.distanceToSquared(focus) - b.position.distanceToSquared(focus)).slice(0, this.slots.length);
    const step = dt / FADE;
    for (const slot of this.slots) {
      if (slot.marker && wanted.includes(slot.marker)) {
        slot.level = Math.min(1, slot.level + step);
      } else {
        slot.level = Math.max(0, slot.level - step);
        if (slot.level === 0) slot.marker = null;
      }
    }
    // Free slots take the wanted markers that no slot has yet.
    for (const marker of wanted) {
      if (this.slots.some((s) => s.marker === marker)) continue;
      const free = this.slots.find((s) => s.marker === null);
      if (!free) break;
      free.marker = marker;
      free.light.position.copy(marker.position);
      free.light.color.copy(marker.color);
    }
    for (const slot of this.slots) {
      slot.light.intensity = settings.roomLightIntensity * slot.level;
      slot.light.distance = settings.roomLightRange;
    }
  }

  private rebuild(mode: string): void {
    for (const slot of this.slots) this.scene.remove(slot.light);
    const count = mode === 'all' ? this.markers.length : Math.min(4, this.markers.length);
    this.slots = Array.from({ length: count }, () => {
      const light = new THREE.PointLight(0xffffff, 0, settings.roomLightRange, 2);
      light.castShadow = false;
      this.scene.add(light);
      return { light, marker: null, level: 0 };
    });
    this.mode = mode;
  }
}
