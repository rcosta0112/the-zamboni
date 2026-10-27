// Action-based input. The gamepad is the main input; keyboard and mouse are secondary.
// The rest of the prototype reads actions (move, look, jump…), never raw buttons.

import { settings } from './settings';

export type Device = 'gamepad' | 'keyboard';

// Standard-mapping button indices (Xbox names).
const PAD_A = 0;
const PAD_B = 1; // Circle on a PlayStation controller
const PAD_RT = 7; // right trigger (R2): fly; analog on most pads (owner, 2026-10-14)
const PAD_VIEW = 8;
/** A trigger value this far from both 0 and 1 shows the trigger is analog. */
const ANALOG_MARGIN = 0.02;
const PAD_START = 9; // Options on a PlayStation controller
const PAD_UP = 12; // the D-pad
const PAD_DOWN = 13;
/** How far the left stick goes before it moves a menu's choice. */
const MENU_PUSH = 0.5;

export class Input {
  /** Movement on the ground plane: x = right, y = forward, length 0..1. */
  readonly move = { x: 0, y: 0 };
  /** Keyboard walk modifier (Shift). The stick walks by being pushed less far. */
  walkHeld = false;
  /** The jetpack: held, not latched (Space, R2). */
  flyHeld = false;
  /**
   * How far R2 is pressed (0..1) when it's analog and flying her; null when she flies by Space or
   * a digital trigger, which count as R2 held fully.
   */
  flyTrigger: number | null = null;
  lastDevice: Device = 'keyboard';
  /** A gamepad button went down this frame. */
  padPressed = false;
  /** The gamepad's pause button (Start / Options) went down this frame. */
  pausePressed = false;
  /** A menu's choice moved this frame: -1 up, 1 down, 0 not (the D-pad, or the left stick pushed past halfway). */
  menuStep = 0;

  private keys = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;
  private jumpLatched = false;
  private interactLatched = false;
  private skipLatched = false;
  /** Enter, Space or a mouse click: advances the dialogue box (as interact does). */
  private confirmLatched = false;
  /** W / S or the arrows, for a conversation's topics: -1 up, 1 down (the start screen reads its own keys). */
  private keyStep = 0;
  private padButtons: boolean[] = [];
  private padLook = { x: 0, y: 0 };
  private menuStick = 0;
  /**
   * The pad whose R2 has been seen between 0 and 1: it's analog. A digital trigger only ever reports
   * 0 or 1; an analog one passes through values between as it goes down, so it shows itself on its
   * first press. Until then it counts as digital.
   */
  private analogPad: string | null = null;
  private onTogglePanel: () => void;

  /** P, keyboard only (owner, 2026-10-27): the panel's *quality*, high (pixel ratio 1) or low (0.5). */
  constructor(private canvas: HTMLCanvasElement, onTogglePanel: () => void, onQuality: () => void) {
    this.onTogglePanel = onTogglePanel;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.lastDevice = 'keyboard';
      // Space flies (held, read in poll); C jumps (owner, 2026-10-12).
      if (e.code === 'KeyC') this.jumpLatched = true;
      if (e.code === 'KeyE') this.interactLatched = true;
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') this.confirmLatched = true;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keyStep = -1;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keyStep = 1;
      // In a cutscene any key but the tuning panel's shows the skip prompt (Esc also releases the mouse: the game pauses).
      if (e.code !== 'Backquote') this.skipLatched = true;
      if (e.code === 'KeyY') settings.invertY = !settings.invertY;
      if (e.code === 'KeyP') {
        settings.pixelRatio = settings.pixelRatio === 1 ? 0.5 : 1;
        onQuality();
      }
      if (e.code === 'Backquote') this.onTogglePanel();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('click', () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.confirmLatched = true;
    });
    // A click anywhere also shows a cutscene's skip prompt (owner, 2026-10-24): the window's, since
    // the cutscene's black and bars lie over the canvas.
    window.addEventListener('mousedown', () => {
      this.skipLatched = true;
      this.lastDevice = 'keyboard';
    });
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
      this.lastDevice = 'keyboard';
    });
  }

  /** Poll the gamepad and rebuild the move vector. Call once per rendered frame. */
  poll(): void {
    const pad = firstGamepad();
    let padMoveX = 0;
    let padMoveY = 0;
    this.padLook.x = 0;
    this.padLook.y = 0;
    this.padPressed = false;
    this.pausePressed = false;
    this.menuStep = 0;
    let padFly = false;
    let trigger: number | null = null;

    if (pad) {
      const [lx, ly] = deadZone(pad.axes[0] ?? 0, pad.axes[1] ?? 0, settings.stickDeadZone);
      const [rx, ry] = deadZone(pad.axes[2] ?? 0, pad.axes[3] ?? 0, settings.stickDeadZone);
      padMoveX = lx;
      padMoveY = -ly;
      this.padLook.x = rx;
      this.padLook.y = ry;

      const pressed = pad.buttons.map((b) => b.pressed);
      const justPressed = (i: number) => pressed[i] === true && this.padButtons[i] !== true;
      this.padPressed = pressed.some((_, i) => justPressed(i));
      if (justPressed(PAD_A)) this.jumpLatched = true;
      if (justPressed(PAD_B)) this.interactLatched = true;
      if (justPressed(PAD_VIEW)) this.onTogglePanel();
      this.pausePressed = justPressed(PAD_START);
      // Any button shows a cutscene's skip prompt but pause and the tuning panel's.
      if (pressed.some((_, i) => justPressed(i) && i !== PAD_START && i !== PAD_VIEW)) this.skipLatched = true;
      // The stick steps once each time it's pushed past halfway, again only after it comes back.
      const stick = (pad.axes[1] ?? 0) > MENU_PUSH ? 1 : (pad.axes[1] ?? 0) < -MENU_PUSH ? -1 : 0;
      if (justPressed(PAD_UP)) this.menuStep = -1;
      else if (justPressed(PAD_DOWN)) this.menuStep = 1;
      else if (stick !== this.menuStick) this.menuStep = stick;
      this.menuStick = stick;
      const rt = pad.buttons[PAD_RT];
      if (rt) {
        if (rt.value > ANALOG_MARGIN && rt.value < 1 - ANALOG_MARGIN) this.analogPad = pad.id;
        if (this.analogPad === pad.id) {
          padFly = rt.value > settings.flyTriggerOff;
          if (padFly) trigger = rt.value;
        } else padFly = rt.pressed || rt.value >= 0.5;
      }

      if (lx || ly || rx || ry || pressed.some(Boolean)) this.lastDevice = 'gamepad';
      this.padButtons = pressed;
    }

    let keyX = 0;
    let keyY = 0;
    if (this.keys.has('KeyD')) keyX += 1;
    if (this.keys.has('KeyA')) keyX -= 1;
    if (this.keys.has('KeyW')) keyY += 1;
    if (this.keys.has('KeyS')) keyY -= 1;
    const keyLen = Math.hypot(keyX, keyY);
    this.walkHeld = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const spaceFly = this.keys.has('Space');
    this.flyHeld = spaceFly || padFly;
    // Space wins: held, it counts as R2 held fully whatever the trigger does.
    this.flyTrigger = spaceFly ? null : trigger;

    if (keyLen > 0) {
      this.move.x = keyX / keyLen;
      this.move.y = keyY / keyLen;
    } else {
      this.move.x = padMoveX;
      this.move.y = padMoveY;
    }
  }

  /** Camera look this frame, in radians (yaw, pitch). Positive pitch raises the camera. */
  consumeLook(dt: number): { yaw: number; pitch: number } {
    const invert = settings.invertY ? -1 : 1;
    const yaw =
      -this.mouseDX * settings.mouseSensitivity - this.padLook.x * settings.stickLookSpeed * dt;
    const pitch =
      (this.mouseDY * settings.mouseSensitivity + this.padLook.y * settings.stickLookSpeed * dt) *
      invert;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { yaw, pitch };
  }

  /** The gamepad's R2 has shown itself to be analog. */
  get analogTrigger(): boolean {
    return this.analogPad !== null;
  }

  /** True once per interact press (E, gamepad B / Circle). An Enter or a click since is dropped. */
  consumeInteract(): boolean {
    const i = this.interactLatched;
    this.interactLatched = false;
    this.confirmLatched = false;
    return i;
  }

  /** A conversation's topics: the selection's step this frame (-1 up, 1 down), from the pad's `menuStep` or the keys. */
  consumeChoiceStep(): number {
    const step = this.menuStep || this.keyStep;
    this.keyStep = 0;
    return step;
  }

  /** True once per press that advances the dialogue box: interact, Enter, Space or a click. */
  consumeAdvance(): boolean {
    const a = this.interactLatched || this.confirmLatched;
    this.interactLatched = false;
    this.confirmLatched = false;
    return a;
  }

  /** No movement, flying or jump this frame (a conversation holds her still; the camera still turns). Call after `poll`. */
  hold(): void {
    this.move.x = 0;
    this.move.y = 0;
    this.walkHeld = false;
    this.flyHeld = false;
    this.flyTrigger = null;
    this.jumpLatched = false;
  }

  /** The button held to skip a cutscene is down: E, the pad's interact (B / Circle). */
  get skipHeld(): boolean {
    return this.keys.has('KeyE') || this.padButtons[PAD_B] === true;
  }

  /** True once per press that shows a cutscene's skip prompt (any pad button but Start and View; any key but the panel's; a click). */
  consumeSkip(): boolean {
    const s = this.skipLatched;
    this.skipLatched = false;
    return s;
  }

  /** True once per jump press; stays latched until a fixed update consumes it. */
  consumeJump(): boolean {
    const j = this.jumpLatched;
    this.jumpLatched = false;
    return j;
  }
}

function firstGamepad(): Gamepad | null {
  for (const pad of navigator.getGamepads?.() ?? []) {
    if (pad && pad.connected) return pad;
  }
  return null;
}

/** Radial dead zone, rescaled so output still reaches 0..1 smoothly. */
function deadZone(x: number, y: number, zone: number): [number, number] {
  const len = Math.hypot(x, y);
  if (len < zone) return [0, 0];
  const scaled = Math.min(1, (len - zone) / (1 - zone));
  return [(x / len) * scaled, (y / len) * scaled];
}
