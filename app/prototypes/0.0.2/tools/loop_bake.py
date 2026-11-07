"""The loop helpers shared by the exports that bake a looping action (export-crew-character.py:
her piloting; export-ship-crew.py: the crew's idles, 2026-11-07). The owner's loops are one-frame
poses with Noise modifiers on their curves, the noise faded in and out over frames 0-200: baked,
then each curve's seam closed here."""


def fcurves_of(action):
    return [f for layer in action.layers for strip in layer.strips for bag in strip.channelbags for f in bag.fcurves]


def make_loop(action, first, last, step, ease=30):
    """Each curve's last `ease` frames bent onto its first frame's value (the seam closed, whatever
    the noise does), then a key every `step` frames kept, smooth between. Returns the seam's
    largest jump before."""
    worst = 0.0
    for f in fcurves_of(action):
        jump = f.evaluate(last) - f.evaluate(first)
        worst = max(worst, abs(jump))
        for k in f.keyframe_points:
            t = (k.co.x - (last - ease)) / ease
            if t > 0:
                s = t * t * (3 - 2 * t)
                k.co.y -= jump * s
        for k in [k for k in f.keyframe_points if round(k.co.x - first) % step][::-1]:
            f.keyframe_points.remove(k, fast=True)
        for k in f.keyframe_points:
            k.interpolation = 'BEZIER'
            k.handle_left_type = k.handle_right_type = 'AUTO_CLAMPED'
        f.update()
    return worst
