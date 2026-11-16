// Her gadgets (2026-11-16; plan doc/plans/features/gadgets-binoculars.md): one out at a time. Its own
// button brings it out and puts it away (the binoculars: the D-pad's up, B): out, she holds it in her
// hands (the first frame of its clip, blended in over HOLD_SECONDS). R1 (the right mouse button) uses
// the gadget that's out, a toggle (owner, 2026-11-16): the binoculars raised to her eyes by their clip
// (model.ts), lowered back to her hands by the same clip backwards; once they're up, first person
// through them (`firstPerson`: main.ts, camera.ts, binocular-view.ts).
// The scanner (2026-11-16; plan doc/plans/features/gadgets-scanner.md): the D-pad's left, 2; out, she
// holds it (its clip's one frame); **on while R1 is held** (owner: not a toggle), her body and head
// turning as she scans (`scan`, model.ts). Choosing another gadget puts the one out away at once.

export type GadgetId = 'binoculars' | 'scanner';

/** How long the gadget takes to come into her hands from her movement's pose, and to go again (s). */
const HOLD_SECONDS = 0.25;
/** How long the scan takes to start and stop (s): `scan` from 0 to 1 and back. */
const SCAN_SECONDS = 0.3;

export class Gadgets {
  /** The gadget out (in her hands, or on its way); null while none is, or it's being put away. */
  out: GadgetId | null = null;
  /** Being used (the binoculars: raised to her eyes, or on their way up). */
  using = false;
  /** How far it's come into her hands: 0 away .. 1 held (model.ts blends her upper body by it). */
  held = 0;
  /** How far it's raised from her hands by its clip: 0 in her hands .. 1 up (the clip's time). */
  raised = 0;
  /** The scanner on: 0 off .. 1 on, eased in model.ts (its turn) and scanner.ts (the ray). */
  scan = 0;
  /** The gadget in her hands, or the last one while it leaves them (which clip and object to show). */
  shown: GadgetId | null = null;

  /** The gadget's button: out if it wasn't, away if it was; another one out is put away at once first. */
  toggle(id: GadgetId): void {
    if (this.out !== null && this.out !== id) this.putAway();
    else if (this.out === null && this.shown !== null && this.shown !== id) this.putAway(); // still leaving her hands
    this.out = this.out === id ? null : id;
    if (this.out === null) this.using = false;
  }

  /** R1 for the binoculars: use them, or stop using them; nothing with none out. */
  use(): void {
    if (this.out === 'binoculars') this.using = !this.using;
  }

  /** Away at once, without the clip (a cutscene, a conversation, the ladder, the seat). */
  putAway(): void {
    this.out = null;
    this.using = false;
    this.held = 0;
    this.raised = 0;
    this.scan = 0;
    this.shown = null;
  }

  /**
   * Called every rendered frame. `pressed`: the gadget whose button went down this frame; `used`: R1
   * went down; `useHeld`: R1 is down (the scanner); `usable`: her hands are free (not climbing,
   * seated, talking or watching); `seconds`: the binoculars' clip length. Put away from use, they're
   * lowered to her hands first, then leave them.
   */
  update(dt: number, pressed: GadgetId | null, used: boolean, useHeld: boolean, usable: boolean, seconds: number): void {
    if (!usable) {
      if (this.out !== null || this.held > 0) this.putAway();
      return;
    }
    if (pressed) this.toggle(pressed);
    if (used) this.use();
    if (this.out === 'scanner') this.using = useHeld;
    const t = Math.max(0, dt);
    const scanning = this.out === 'scanner' && this.using;
    this.scan = scanning ? Math.min(1, this.scan + t / SCAN_SECONDS) : Math.max(0, this.scan - t / SCAN_SECONDS);
    if (this.out !== null) this.shown = this.out;
    const raiseStep = seconds > 0 ? t / seconds : 1;
    this.raised = this.using && this.out === 'binoculars' ? Math.min(1, this.raised + raiseStep) : Math.max(0, this.raised - raiseStep);
    const holdStep = t / HOLD_SECONDS;
    const holding = this.out !== null || this.raised > 0;
    this.held = holding ? Math.min(1, this.held + holdStep) : Math.max(0, this.held - holdStep);
    if (this.held === 0 && this.out === null) this.shown = null;
  }

  /** Up at her eyes (the raise has finished). */
  get up(): boolean {
    return this.out === 'binoculars' && this.using && this.raised >= 1;
  }

  /** Looking through the binoculars: first person, once they're up (lowering them cuts back at once). */
  get firstPerson(): boolean {
    return this.out === 'binoculars' && this.up;
  }
}
