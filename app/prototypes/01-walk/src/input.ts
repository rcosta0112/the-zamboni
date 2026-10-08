// Action-based input. The gamepad is the main input; keyboard and mouse are secondary.
// The rest of the prototype reads actions (move, look, jump…), never raw buttons.

import { settings } from './settings';

export type Device = 'gamepad' | 'keyboard';

// Standard-mapping button indices (Xbox names).
const PAD_A = 0;
const PAD_VIEW = 8;
const PAD_DPAD_UP = 12;
const PAD_DPAD_DOWN = 13;

export class Input {
  /** Movement on the ground plane: x = right, y = forward, length 0..1. */
  readonly move = { x: 0, y: 0 };
  /** Keyboard walk modifier (Shift). The stick walks by being pushed less far. */
  walkHeld = false;
  lastDevice: Device = 'keyboard';

  private keys = new Set<string>();
  private mouseDX = 0;
  private mouseDY = 0;
  private wheel = 0;
  private jumpLatched = false;
  private padButtons: boolean[] = [];
  private padLook = { x: 0, y: 0 };
  private padZoom = 0;
  private onTogglePanel: () => void;

  constructor(private canvas: HTMLCanvasElement, onTogglePanel: () => void) {
    this.onTogglePanel = onTogglePanel;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.lastDevice = 'keyboard';
      if (e.code === 'Space') this.jumpLatched = true;
      if (e.code === 'KeyY') settings.invertY = !settings.invertY;
      if (e.code === 'Backquote') this.onTogglePanel();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('click', () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
    });
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
      this.lastDevice = 'keyboard';
    });
    window.addEventListener(
      'wheel',
      (e) => {
        this.wheel += Math.sign(e.deltaY);
      },
      { passive: true },
    );
  }

  /** Poll the gamepad and rebuild the move vector. Call once per rendered frame. */
  poll(): void {
    const pad = firstGamepad();
    let padMoveX = 0;
    let padMoveY = 0;
    this.padLook.x = 0;
    this.padLook.y = 0;
    this.padZoom = 0;

    if (pad) {
      const [lx, ly] = deadZone(pad.axes[0] ?? 0, pad.axes[1] ?? 0, settings.stickDeadZone);
      const [rx, ry] = deadZone(pad.axes[2] ?? 0, pad.axes[3] ?? 0, settings.stickDeadZone);
      padMoveX = lx;
      padMoveY = -ly;
      this.padLook.x = rx;
      this.padLook.y = ry;

      const pressed = pad.buttons.map((b) => b.pressed);
      const justPressed = (i: number) => pressed[i] === true && this.padButtons[i] !== true;
      if (justPressed(PAD_A)) this.jumpLatched = true;
      if (justPressed(PAD_VIEW)) this.onTogglePanel();
      if (pressed[PAD_DPAD_UP]) this.padZoom -= 1;
      if (pressed[PAD_DPAD_DOWN]) this.padZoom += 1;

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

  /** Camera zoom steps this frame (positive = further away). */
  consumeZoom(dt: number): number {
    const steps = this.wheel * 0.6 + this.padZoom * 6 * dt;
    this.wheel = 0;
    return steps;
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
