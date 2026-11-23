// The flight test scene's take-off and landing (plan doc/plans/features/non-linear-travel/flight-test-scene.md,
// pass 3; prototype code: only flight-test.html uses it, main.ts FLIGHT_TEST).
// - **The controls on the tuning panel for now** (owner, 2026-11-23), until the owner's controls file (SC-196):
//   engine power (on/off), engine tilt (down: hover; forward: cruise), thrust (0..1), gear (up/down), ramp
//   (open/closed), lights (no lights in the ship yet: kept, does nothing).
// - **The locks:** a change the step before doesn't allow is refused, the panel's control put back, and the
//   reason shown (the panel's *lock* line and a note on screen) for LOCK_SECONDS.
// - **The motion:** the ship never moves (the treadmill: terrain.ts); its height over the ground is
//   `settings.flightHeight` and its speed the treadmill's pace. Tilted down, thrust sets the height it rises to
//   (0: on the ground, 1: HOVER_MAX); tilted forward, it climbs to the terrain's cruising height and thrust is
//   its speed. With the gear up it won't come lower than GEAR_CLEAR.
// - **What it drives** (main.ts): the gear (`gear`, 1 up), the turbines turned down (`turbines`, the landing's
//   angles), the flames (`flames`, seen only from outside) and the engine noise (`noise`, `noisePower`).
// - **Owner, 2026-11-23:** the climb starts very slowly and curves up (the ship's weight: the acceleration itself
//   grows, JERK, up to ACCEL); the noise follows the thrust (NOISE_IDLE at none) and is twice as loud while it
//   moves up or down (NOISE_VERTICAL); her piloting loop, and the joystick with it, plays only while it moves
//   forward (`stick`).

import * as THREE from 'three/webgpu';
import type GUI from 'three/addons/libs/lil-gui.module.min.js';
import type { Openable } from '../entities';
import { settings } from '../settings';

/** Hover heights (m over the ground): thrust 1 rises to HOVER_MAX; the gear raised from GEAR_CLEAR; tilted forward from HOVER_MIN. */
const HOVER_MAX = 30;
const GEAR_CLEAR = 4;
const HOVER_MIN = 10;
/** Cruising (m over the flat ground): the travel terrain's height (ice-plain's 110 m). */
const CRUISE = 110;
/** Fastest climb or descent (m/s); how quickly it gets there (s). */
const CLIMB = 8;
const CLIMB_EASE = 0.8;
/** The climb's acceleration: at most ACCEL (m/s²), reached by growing JERK (m/s³) a second: a slow, heavy start. */
const ACCEL = 2;
const JERK = 0.7;
/** Braking: the rate kept low enough to stop at this deceleration (m/s²) in the distance left, and the
 *  acceleration eased off or reversed this much quicker than it grows (m/s³). */
const BRAKE = 1;
const BRAKE_JERK = 4;
/** The noise: its level with the engines on and no thrust (1 at full thrust); times this much more while moving up or down (at VERTICAL_RATE m/s or more). */
const NOISE_IDLE = 0.4;
const NOISE_VERTICAL = 1;
const VERTICAL_RATE = 1;
/** Her piloting loop's speed follows the pace: full from this pace up. */
const STICK_PACE = 0.15;
/** Slowest climb or descent while it isn't there yet (m/s): a touchdown, not a creep. */
const MIN_RATE = 1.2;
/** Seconds: the engines spooling up or down; the gear; the turbines tilting; the speed changing. */
const SPOOL = 2.5;
const GEAR_SECONDS = 4;
const TILT_SECONDS = 4;
const SPEED_EASE = 4;
/** The turbines turned down (degrees, back pair and front pair): the landing's (flight-shots/landing.ts). */
const TURBINES_DOWN: [number, number] = [90, 115];
/** The front pair's share of the flames (the landing's). */
const FRONT_FLAMES = 0.6;
/** A refusal's reason shown this long (s). */
const LOCK_SECONDS = 4;

/** The panel's controls (folder *Flight test: her seat*): stand-ins for the owner's controls file. */
interface Panel {
  power: boolean;
  tiltForward: boolean;
  thrust: number;
  gearUp: boolean;
  rampOpen: boolean;
  lights: boolean;
}

export class ShipFlight {
  readonly panel: Panel = { power: false, tiltForward: false, thrust: 0, gearUp: false, rampOpen: false, lights: false };
  /** The readouts (the panel's, listened): height over the ground (m), climb (m/s), speed (m/s), what it's doing, the last refusal. */
  readonly readout = { altitude: '0.0 m', climb: '0.0 m/s', speed: '0 m/s', state: 'landed, engines off', lock: '' };
  /** The engines' level, 0..1 (spooling). */
  engines = 0;
  /** The gear raised, 0 down .. 1 up. */
  gear = 0;
  /** The turbines tilted, 0 down .. 1 forward. */
  tilt = 0;
  /** Height over the ground under the ship (m) and its rate (m/s). */
  altitude = 0;
  private climb = 0;
  /** The climb's acceleration now (m/s²): changes at most JERK a second. */
  private accel = 0;
  /** The treadmill's pace, 0..1 (times the terrain's speed). */
  pace = 0;
  private lockLeft = 0;
  private readonly note = document.createElement('div');
  /** Each panel control's previous value, to put it back when refused. */
  private readonly before: Panel = { ...this.panel };
  private readonly controllers = new Map<keyof Panel, { setValue(v: unknown): unknown; updateDisplay(): unknown }>();
  private reverting = false;
  /** `settings.flightHeight` as this keeps it (written every frame; the terrain's own set on load overridden). */
  private height = NaN;

  constructor(
    /** The ground's height under the ship in `settings.flightHeight`'s terms (terrain.ts `standingHeight`). */
    private readonly ground: () => number,
    /** The cargo ramp, once the ship is in. */
    private readonly rampOf: () => Openable | null,
  ) {
    this.note.id = 'flight-lock';
    Object.assign(this.note.style, { position: 'fixed', left: '50%', bottom: '18%', translate: '-50% 0', padding: '4px 10px', background: 'rgba(120, 20, 10, 0.85)', color: '#fff', font: '13px system-ui, sans-serif', borderRadius: '3px', pointerEvents: 'none', zIndex: '6' });
    this.note.hidden = true;
    document.body.append(this.note);
  }

  private get ramp(): Openable | null {
    return this.rampOf();
  }

  /** On the ground (touching, the gear down). */
  get landed(): boolean {
    return this.altitude < 0.05 && this.climb <= 0.01;
  }

  /** The flight keys main.ts hands to the gear, turbines, flames and noise (as a cutscene's `flight`). */
  get keys(): { gear: number; turbines: [number, number]; flames: number; front: number; reach: number; glow: number; noise: number } {
    const down = 1 - this.tilt;
    const push = this.panel.tiltForward ? this.pace : this.panel.thrust;
    return {
      gear: this.gear,
      turbines: [TURBINES_DOWN[0] * down, TURBINES_DOWN[1] * down],
      flames: this.engines * (0.35 + 0.65 * push),
      front: FRONT_FLAMES,
      reach: 1,
      glow: this.engines,
      noise: this.engines * (NOISE_IDLE + (1 - NOISE_IDLE) * push) * (1 + NOISE_VERTICAL * Math.min(1, Math.abs(this.climb) / VERTICAL_RATE)),
    };
  }

  /** Her piloting loop's speed, 0..1: it plays only while the ship moves forward. */
  get stick(): number {
    return Math.min(1, this.pace / STICK_PACE);
  }

  /** Per frame. */
  update(dt: number): void {
    dt = Math.max(0, dt);
    const p = this.panel;
    if (this.ramp && !this.reverting && this.ramp.open !== p.rampOpen) this.set('rampOpen', this.ramp.open); // opened from its keypad
    this.engines = approach(this.engines, p.power ? 1 : 0, dt / SPOOL);
    this.gear = approach(this.gear, p.gearUp ? 1 : 0, dt / GEAR_SECONDS);
    this.tilt = approach(this.tilt, p.tiltForward ? 1 : 0, dt / TILT_SECONDS);
    // The height it's going to (`settings.flightHeight`'s terms: held over the flat ground, so cruising it
    // doesn't follow the hills), and the speed.
    const cruising = this.tilt > 0.5;
    const ground = this.ground();
    if (Number.isNaN(this.height)) this.height = ground; // it starts on the ground (the scene's terrain would fly at its own height)
    let target = cruising ? Math.max(CRUISE, ground + HOVER_MAX) : ground + p.thrust * HOVER_MAX * this.engines;
    if (this.gear > 0 && target < ground + GEAR_CLEAR) target = Math.min(ground + GEAR_CLEAR, Math.max(target, ground + this.altitude)); // the gear up: not lower than this
    if (this.engines < 0.05 && this.altitude > 0) target = ground + this.altitude; // no lift, no fall: the engines can't go off in the air (a lock)
    const off = target - this.height;
    // The rate it can still brake from in the distance left (BRAKE); at least MIN_RATE only going down to the
    // ground (a touchdown, not a creep), never toward a height in the air (it would overshoot and slide back).
    const touchdown = off < 0 && target <= ground + 0.01;
    const rate = Math.min(CLIMB, Math.sqrt(2 * BRAKE * Math.abs(off)));
    const wanted = Math.abs(off) < 0.02 ? 0 : Math.sign(off) * (touchdown ? Math.max(MIN_RATE, rate) : rate);
    // The acceleration wanted (toward that rate): grown gradually from a standstill (the curve up, the weight),
    // eased off and reversed quicker (braking on time).
    const accelWanted = THREE.MathUtils.clamp((wanted - this.climb) / CLIMB_EASE, -ACCEL, ACCEL);
    const easing = Math.abs(accelWanted) < Math.abs(this.accel) || accelWanted * this.climb < 0;
    this.accel = approach(this.accel, accelWanted, (easing ? BRAKE_JERK : JERK) * dt);
    this.climb += this.accel * dt;
    const next = this.height + this.climb * dt;
    // Arrived (passing the target, or there and nearly still): held there, still; never under the ground.
    const passing = (off > 0 && next >= target) || (off < 0 && next <= target);
    const settled = Math.abs(target - next) < 0.05 && Math.abs(this.climb) < 0.3;
    if (passing || settled) {
      this.height = target;
      this.climb = this.accel = 0;
    } else this.height = Math.max(ground, next);
    settings.flightHeight = this.height;
    this.altitude = this.height - ground;
    if (this.altitude === 0 && this.climb < 0) this.climb = this.accel = 0; // touched down
    this.pace += ((cruising ? p.thrust : 0) - this.pace) * (1 - Math.exp(-dt / SPEED_EASE));
    if (this.pace < 1e-3 && !cruising) this.pace = 0;
    // The readouts.
    const r = this.readout;
    r.altitude = `${this.altitude.toFixed(1)} m`;
    r.climb = `${this.climb.toFixed(1)} m/s`;
    r.speed = `${Math.round(this.pace * settings.flightSpeed)} m/s`;
    r.state = this.landed ? (this.engines > 0.5 ? 'landed, engines on' : 'landed, engines off') : cruising ? (this.pace > 0.05 ? 'cruising' : 'tilted forward') : this.gear > 0 && p.thrust * HOVER_MAX < GEAR_CLEAR && this.altitude < GEAR_CLEAR + 0.5 ? 'held up: lower the gear to land' : Math.abs(this.climb) > 0.3 ? (this.climb > 0 ? 'climbing' : 'descending') : 'hovering';
    this.lockLeft = Math.max(0, this.lockLeft - dt);
    if (this.lockLeft === 0) {
      r.lock = '';
      this.note.hidden = true;
    }
  }

  /** Why a control can't go to this value now, or null. */
  private refusal(key: keyof Panel, value: Panel[keyof Panel]): string | null {
    const p = this.panel;
    switch (key) {
      case 'power':
        if (value && this.ramp && (this.ramp.open || this.ramp.amount > 0)) return 'Close the ramp first.';
        if (!value && !this.landed) return 'Land first: the engines stay on in the air.';
        return null;
      case 'thrust':
        if ((value as number) > 0 && this.engines < 0.99) return p.power ? 'The engines are still spooling up.' : 'The engines are off.';
        return null;
      case 'gearUp':
        if (value && this.altitude < GEAR_CLEAR - 0.05) return `Too low to raise the gear (${GEAR_CLEAR} m).`;
        if (!value && p.tiltForward) return 'Tilt the engines down first: too fast for the gear.';
        return null;
      case 'tiltForward':
        if (value && this.gear < 1) return 'Raise the gear first.';
        if (value && this.altitude < HOVER_MIN - 0.05) return `Climb to ${HOVER_MIN} m first.`;
        return null;
      case 'rampOpen':
        if (value && !this.landed) return 'Not in flight.';
        if (value && this.engines > 0) return 'Not while the engines run.';
        return null;
      default:
        return null;
    }
  }

  /** A panel change: taken, or refused (put back, the reason shown). */
  private changed(key: keyof Panel): void {
    if (this.reverting) return;
    const value = this.panel[key];
    const why = this.refusal(key, value);
    if (why) {
      this.set(key, this.before[key]);
      this.readout.lock = why;
      this.note.textContent = why;
      this.note.hidden = false;
      this.lockLeft = LOCK_SECONDS;
      return;
    }
    (this.before as unknown as Record<string, unknown>)[key] = value;
    if (key === 'rampOpen' && this.ramp) this.ramp.open = value as boolean;
  }

  /** Sets a control without asking (a refusal put back, the ramp moved from its keypad). */
  private set<K extends keyof Panel>(key: K, value: Panel[K]): void {
    this.reverting = true;
    this.panel[key] = value;
    this.before[key] = value;
    this.controllers.get(key)?.updateDisplay();
    this.reverting = false;
  }

  /** Dev hook (`__flight().use('power', true)`): as if changed on the panel; the refusal, or null. */
  use<K extends keyof Panel>(key: K, value: Panel[K]): string | null {
    this.panel[key] = value;
    this.controllers.get(key)?.updateDisplay();
    this.changed(key);
    return this.panel[key] === value ? null : this.readout.lock;
  }

  /** The panel's folder: the controls, then the readouts (the altimeter until the screens exist). */
  folder(gui: GUI): void {
    const folder = gui.addFolder('Flight test: her seat (take-off and landing)');
    const add = (key: keyof Panel, name: string, ...range: number[]) => {
      const k = key as never; // lil-gui's types want a key of one value type
      const c = (range.length ? folder.add(this.panel, k, range[0], range[1], range[2]) : folder.add(this.panel, k)).name(name).onChange(() => this.changed(key));
      this.controllers.set(key, c);
    };
    add('power', 'engine power');
    add('tiltForward', 'engine tilt: forward');
    add('thrust', 'thrust', 0, 1, 0.01);
    add('gearUp', 'gear up');
    add('rampOpen', 'ramp open');
    add('lights', 'lights (nothing yet)');
    for (const [key, name] of [['altitude', 'altimeter'], ['climb', 'climb'], ['speed', 'speed'], ['state', 'state'], ['lock', 'lock']] as const) folder.add(this.readout, key).name(name).disable().listen();
  }
}

/** `from` moved toward `to` by at most `step`. */
function approach(from: number, to: number, step: number): number {
  return from < to ? Math.min(to, from + step) : Math.max(to, from - step);
}
