// The coffee (2026-11-18; plan doc/plans/features/coffee.md). The galley's pot (kind `coffee-pot`):
// *Pour coffee* puts the mug in her right hand (no pouring animation). While she holds it she has no
// gadgets (main.ts) and sips at random every 5–10 s, talking too (`settings.coffeeSipMin`,
// `coffeeSipMax`): her drinking loop played once on her right arm (model.ts), held on its first
// frame between sips. The sink: *Put cup in sink* while she holds it; her mug goes and the cup in the
// sink (kind `sink-cup`, hidden till then) shows. One coffee only: after that, and once the ship has
// landed, the pot gets her line instead (Ink). Her seat wants a coffee first (main.ts). Sitting with
// the mug, it's gone (`done`). Kept with her in Ink's `green_coffee` (main.ts, KEPT).

import * as THREE from 'three/webgpu';
import type { Entities } from './entities';
import type { Interactable } from './interaction';
import { settings } from './settings';

/** Where her coffee is: not poured yet, in her hand, in the sink, or gone with her to her seat. */
export type CoffeeState = 'none' | 'holding' | 'sink' | 'done';
export const COFFEE_STATES: readonly CoffeeState[] = ['none', 'holding', 'sink', 'done'];

/** How long the mug's hold takes to come into her arm, and to go (s). */
const HOLD_SECONDS = 0.25;
/** How fast a sip stopped early (a jump) blends back to the hold (s). */
const SIP_STOP_SECONDS = 0.2;

export class Coffee {
  state: CoffeeState = 'none';
  /** How far the hold has come into her right arm: 0 .. 1 (model.ts). */
  held = 0;
  /** The sip's place in the drinking loop: 0 .. 1 (model.ts plays the clip at it). */
  sip = 0;
  /** The sip's share over the hold: 1 while one plays, eased to 0 when one is stopped early. */
  sipShare = 0;
  /** A sip is playing. */
  sipping = false;
  /** Seconds to the next sip (counted only while she may sip). */
  private untilSip = 0;
  /** Sips so far (for checks). */
  sips = 0;
  readonly interactables: Interactable[] = [];
  private readonly sinkCups: THREE.Object3D[];

  /**
   * `story(knot)` runs a knot (the pot's lines); `flying()`: the ship is in the air (after the
   * landing the pot only gets her line).
   */
  constructor(entities: Entities, story: (knot: string) => void, flying: () => boolean) {
    this.sinkCups = entities.ofKind('sink-cup').map((e) => e.object);
    const pots = entities.ofKind('coffee-pot');
    if (pots.length === 0) console.warn('[0.0.2] the ship has no coffee pot');
    if (this.sinkCups.length === 0) console.warn('[0.0.2] the ship has no cup in the sink');
    for (const pot of pots)
      this.interactables.push({
        name: pot.object.name,
        objects: [pot.object],
        verb: () => 'Pour coffee',
        available: () => this.state !== 'holding',
        act: () => {
          if (!flying()) story('coffee_pot_landed');
          else if (this.state !== 'none') story('coffee_pot_again');
          else this.pour();
        },
      });
    for (const cup of this.sinkCups)
      this.interactables.push({
        name: `${cup.name} (sink)`,
        objects: [cup],
        verb: () => 'Put cup in sink',
        available: () => this.state === 'holding',
        act: () => this.putInSink(),
      });
    this.update(0, false);
  }

  pour(): void {
    this.state = 'holding';
    this.sipping = false;
    this.sip = this.sipShare = 0;
    this.untilSip = this.nextWait();
  }

  putInSink(): void {
    this.state = 'sink';
    this.held = 0;
    this.stopSip(true);
  }

  /** She sits down: the mug in her hand is gone. */
  sitDown(): void {
    if (this.state !== 'holding') return;
    this.state = 'done';
    this.held = 0;
    this.stopSip(true);
  }

  /** Has poured a coffee (her seat's rule). */
  get poured(): boolean {
    return this.state !== 'none';
  }

  get holding(): boolean {
    return this.state === 'holding';
  }

  /**
   * Per frame. `canSip`: she's on the ground, not climbing, seated or in a cutscene. A sip going when
   * that ends (a jump) blends back to the hold.
   */
  update(dt: number, canSip: boolean, sipSeconds = 0): void {
    const t = Math.max(0, dt);
    for (const cup of this.sinkCups) cup.visible = this.state === 'sink';
    this.held = this.holding ? Math.min(1, this.held + t / HOLD_SECONDS) : Math.max(0, this.held - t / HOLD_SECONDS);
    if (!this.holding) return;
    if (this.sipping) {
      if (!canSip) this.stopSip(false);
      else {
        this.sip += t / (sipSeconds > 0 ? sipSeconds : 3.5);
        if (this.sip >= 1) {
          this.sip = 0;
          this.sipping = false;
          this.sipShare = 0;
          this.untilSip = this.nextWait();
        }
      }
    }
    if (!this.sipping) {
      this.sipShare = Math.max(0, this.sipShare - t / SIP_STOP_SECONDS);
      if (this.sipShare === 0) this.sip = 0;
      if (canSip && this.held >= 1) {
        this.untilSip -= t;
        if (this.untilSip <= 0) {
          this.sipping = true;
          this.sip = 0;
          this.sipShare = 1;
          this.sips++;
        }
      }
    }
  }

  /** Stops a sip: blended back to the hold (or at once). */
  private stopSip(atOnce: boolean): void {
    this.sipping = false;
    if (atOnce) this.sip = this.sipShare = 0;
    this.untilSip = this.nextWait();
  }

  private nextWait(): number {
    const lo = Math.min(settings.coffeeSipMin, settings.coffeeSipMax);
    const hi = Math.max(settings.coffeeSipMin, settings.coffeeSipMax);
    return lo + Math.random() * (hi - lo);
  }
}
