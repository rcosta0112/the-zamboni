"""Closes the bulkhead doors properly, and makes their leaves reach into the doorway's frame.

Applied to The Zamboni 1.19.blend and saved on 2026-10-13: kept as the record of what was changed.
It changes the open scene and saves nothing itself; run again on the saved file, it reports
"0 changes". (In Blender: Scripting tab, open this file, Run Script.)

Why (owner, 2026-10-13, after tag-ship-pass4.py): the leaves' meeting edges are S-shaped, and the two
fit into each other. Closed "where their bounds meet" left a gap of 0.11 between them. And each leaf
is exactly as wide as its half of the frame's opening and 0.002 shorter at top and bottom, so a line
of light showed between door and frame.

What it does to the four leaves:

- **Scale 1.02 across and up** (not in thickness), about the leaf's origin: about 0.01 more at the
  top and the bottom, 0.007 at the outer edge once closed. They now reach into the frame.
- **Moved closed**: the meeting edges touch (they intersect by OVERLAP, so no line shows), the pair
  centred on its doorway's frame.
- ``doorDistance`` set to the leaf's new width: open, it's clear of the doorway.
"""

import bpy
from mathutils import Matrix, Vector

# Each bulkhead door: its two leaves, the frame of its doorway.
DOORS = [
    (('Door Cockpit', 'Door Cockpit 2'), 'Door Frame Cockpit'),
    (('Door Engineering', 'Door Engineering 2'), 'Door Boolean.001'),
]
SCALE = 1.02
OVERLAP = 0.002
BANDS = 24

changes = []


def get(name):
    ob = bpy.data.objects.get(name)
    if ob is None:
        raise SystemExit(f'fit-bulkhead-doors: no object named "{name}" in this file')
    return ob


def world_vertices(ob):
    bpy.context.view_layer.update()
    return [ob.matrix_world @ v.co for v in ob.data.vertices]


def own_axis(ob, world):
    """The object's own axis nearest this world direction, and which way round it is."""
    rotation = ob.matrix_world.to_3x3().normalized()
    dots = [(rotation @ Vector([1.0 if i == j else 0.0 for j in range(3)])).dot(world) for i in range(3)]
    axis = max(range(3), key=lambda i: abs(dots[i]))
    return axis, (1 if dots[axis] > 0 else -1)


def meeting_gap(left, right):
    """The smallest gap between the two leaves' meeting edges, height by height (negative: they intersect)."""
    lv, rv = world_vertices(left), world_vertices(right)
    z0, z1 = min(v.z for v in lv), max(v.z for v in lv)
    gaps = []
    for band in range(BANDS):
        lo, hi = z0 + (z1 - z0) * band / BANDS, z0 + (z1 - z0) * (band + 1) / BANDS
        lx = [v.x for v in lv if lo - 0.01 <= v.z <= hi + 0.01]
        rx = [v.x for v in rv if lo - 0.01 <= v.z <= hi + 0.01]
        if lx and rx:
            gaps.append(min(rx) - max(lx))
    return min(gaps)


for leaves, frame_name in DOORS:
    frame = world_vertices(get(frame_name))
    middle = (min(v.x for v in frame) + max(v.x for v in frame)) / 2
    pair = sorted((get(name) for name in leaves), key=lambda ob: sum((v.x for v in world_vertices(ob)), 0.0) / len(ob.data.vertices))
    for ob in pair:
        across, _ = own_axis(ob, Vector((1, 0, 0)))
        up, _ = own_axis(ob, Vector((0, 0, 1)))
        scale = [1.0, 1.0, 1.0]
        scale[across] = scale[up] = SCALE
        if any(abs(ob.scale[i] - scale[i]) > 1e-4 for i in range(3)):
            if any(abs(s - 1.0) > 1e-4 for s in ob.scale):
                raise SystemExit(f'fit-bulkhead-doors: "{ob.name}" has a scale of its own ({tuple(ob.scale)}): not touched')
            ob.scale = scale
            changes.append(f'{ob.name}: scale {SCALE} on its {"XYZ"[across]} (across) and {"XYZ"[up]} (up) axes')
    left, right = pair
    # Together until the meeting edges intersect by OVERLAP, the pair centred on the frame.
    gap = meeting_gap(left, right)
    lx = max(v.x for v in world_vertices(left))
    rx = min(v.x for v in world_vertices(right))
    close = gap + OVERLAP  # how much nearer each other they must come
    target_left = middle + ((lx - rx) + close) / 2  # the left leaf's rightmost x, once closed
    moves = {left: target_left - lx, right: (target_left - ((lx - rx) + close)) - rx}
    for ob, move in moves.items():
        if abs(move) > 0.0003:
            ob.matrix_world = Matrix.Translation((move, 0, 0)) @ ob.matrix_world
            changes.append(f'{ob.name}: moved {move:+.4f} along X (the meeting edges were {gap:+.4f} apart)')
    for ob, side in zip(pair, (-1, 1)):
        xs = [v.x for v in world_vertices(ob)]
        axis, sign = own_axis(ob, Vector((side, 0, 0)))
        distance = round(sign * (max(xs) - min(xs)), 4)
        if ob.get('doorSlide') != 'XYZ'[axis] or abs(ob.get('doorDistance', 0.0) - distance) > 0.0005:
            ob['doorSlide'] = 'XYZ'[axis]
            ob['doorDistance'] = distance
            changes.append(f'{ob.name}: doorSlide = {"XYZ"[axis]!r}, doorDistance = {distance}')

print(f'fit-bulkhead-doors: {len(changes)} changes' + (' (the file already has them)' if not changes else ''))
for line in changes:
    print('  ' + line)
