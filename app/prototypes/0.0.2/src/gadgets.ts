// Her gadgets (2026-11-16; plan doc/plans/features/gadgets-binoculars.md): one out at a time. Its own
// button brings it out and puts it away (the binoculars: the D-pad's up, B): out, she holds it in her
// hands (the first frame of its clip, blended in over HOLD_SECONDS). R (the right mouse button) uses
// the gadget that's out, a toggle (owner, 2026-11-16): the binoculars raised to her eyes by their clip
// (model.ts), lowered back to her hands by the same clip backwards. First person once they're up comes
// with pass 2.

export type GadgetId = 'binoculars';

/** How long the gadget takes to come into her hands from her movement's pose, and to go again (s). */
const HOLD_SECONDS = 0.25;

export class Gadgets {
  /** The gadget out (in her hands, or on its way); null while none is, or it's being put away. */
  out: GadgetId | null = null;
  /** Being used (the binoculars: raised to her eyes, or on their way up). */
  using = false;
  /** How far it's come into her hands: 0 away .. 1 held (model.ts blends her upper body by it). */
  held = 0;
  /** How far it's raised from her hands by its clip: 0 in her hands .. 1 up (the clip's time). */
  raised = 0;

  /** The gadget's button: out if it wasn't (another one out is swapped for it), away if it was. */
  toggle(id: GadgetId): void {
    this.out = this.out === id ? null : id;
    if (this.out === null) this.using = false;
  }

  /** R: use the gadget that's out, or stop using it; nothing with none out. */
  use(): void {
    if (this.out !== null) this.using = !this.using;
  }

  /** Away at once, without the clip (a cutscene, a conversation, the ladder, the seat). */
  putAway(): void {
    this.out = null;
    this.using = false;
    this.held = 0;
    this.raised = 0;
  }

  /**
   * Called every rendered frame. `pressed`: the gadget whose button went down this frame; `used`: R
   * went down; `usable`: her hands are free (not climbing, seated, talking or watching); `seconds`:
   * the use clip's length. Put away from use, it's lowered to her hands first, then leaves them.
   */
  update(dt: number, pressed: GadgetId | null, used: boolean, usable: boolean, seconds: number): void {
    if (!usable) {
      if (this.out !== null || this.held > 0) this.putAway();
      return;
    }
    if (pressed) this.toggle(pressed);
    if (used) this.use();
    const t = Math.max(0, dt);
    const raiseStep = seconds > 0 ? t / seconds : 1;
    this.raised = this.using ? Math.min(1, this.raised + raiseStep) : Math.max(0, this.raised - raiseStep);
    const holdStep = t / HOLD_SECONDS;
    const holding = this.out !== null || this.raised > 0;
    this.held = holding ? Math.min(1, this.held + holdStep) : Math.max(0, this.held - holdStep);
  }

  /** Up at her eyes (the raise has finished). */
  get up(): boolean {
    return this.using && this.raised >= 1;
  }
}
