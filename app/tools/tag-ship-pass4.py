"""Tags for the bulkhead doors, their panels, the engineering window and its lever (backlog pass 4).

Applied to The Zamboni 1.19.blend and saved on 2026-10-13: kept as the record of what was changed.
It changes the open scene and saves nothing itself; run again on the saved file, it reports
"0 changes". (In Blender: Scripting tab, open this file, Run Script. Or before the export, in
memory: ``--python app/tools/tag-ship-pass4.py --python app/tools/export-ship.py``.)

What it does (doc/plans/features/bulkhead-doors.md; the tags are in doc/architecture/asset-pipeline.md):

- The four bulkhead door leaves are **moved closed**: each pair meets at the middle of its doorway
  (the game takes a door's pose in the file as closed). Tagged to slide open by their own width, and
  to open when she's near.
- The four door panels control their door; the lever panel controls the window, and the lever on it
  slides 0.06 toward the window.
- The window's two halves slide apart by their own width.
- The side door's keypad controls the side door (it said "Door Cargo", copied with the duplicate).
"""

import bpy
from mathutils import Matrix, Vector

# Each bulkhead door: its two leaves, the frame of its doorway, its two panels.
DOORS = [
    (('Door Cockpit', 'Door Cockpit 2'), 'Door Frame Cockpit', ('Door Panel - Cockpit', 'Door Panel - Crew Quarters')),
    (('Door Engineering', 'Door Engineering 2'), 'Door Boolean.001', ('Door Panel - Engineering', 'Door Panel - Cargo Hold')),
]
WINDOW = ('Lab Window', 'Lab Window.001')
LEVER_PANEL = 'Level Panel'
LEVER = 'Level'
LEVER_DISTANCE = 0.06
SIDE_DOOR_PANEL = ('Door Panel - Side door', 'Door')

changes = []


def get(name):
    ob = bpy.data.objects.get(name)
    if ob is None:
        raise SystemExit(f'tag-ship-pass4: no object named "{name}" in this file')
    return ob


def tag(ob, **tags):
    for key, value in tags.items():
        if key not in ob or ob[key] != value:
            ob[key] = value
            changes.append(f'{ob.name}: {key} = {value!r}')


def bounds(ob):
    corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    return Vector([min(c[i] for c in corners) for i in range(3)]), Vector([max(c[i] for c in corners) for i in range(3)])


def centre(ob):
    lo, hi = bounds(ob)
    return (lo + hi) / 2


def slide_tags(ob, toward, distance):
    """`doorSlide` and `doorDistance`: the object's own axis nearest `toward` (world), and how far along it."""
    rotation = ob.matrix_world.to_3x3().normalized()
    dots = [(rotation @ Vector([1.0 if i == j else 0.0 for j in range(3)])).dot(toward.normalized()) for i in range(3)]
    axis = max(range(3), key=lambda i: abs(dots[i]))
    return {'doorSlide': 'XYZ'[axis], 'doorDistance': round(distance if dots[axis] > 0 else -distance, 4)}


for leaves, frame_name, panels in DOORS:
    lo, hi = bounds(get(frame_name))
    middle = (lo.x + hi.x) / 2
    pair = sorted((get(name) for name in leaves), key=lambda ob: centre(ob).x)
    for ob, side in zip(pair, (-1, 1)):
        lo, hi = bounds(ob)
        width = hi.x - lo.x
        # Closed: its inner edge at the middle of the doorway.
        move = middle - (hi.x if side < 0 else lo.x)
        # Only a leaf that isn't tagged yet: fit-bulkhead-doors.py has since closed them edge to edge
        # (their bounds overlap), and this would move them apart again.
        if abs(move) > 0.0005 and 'doorSlide' not in ob:
            ob.matrix_world = Matrix.Translation((move, 0, 0)) @ ob.matrix_world
            bpy.context.view_layer.update()
            changes.append(f'{ob.name}: moved {move:+.3f} along X, closed at the middle of its doorway ({middle:+.3f})')
        other = pair[1] if ob is pair[0] else pair[0]
        tag(ob, part=True, doorAuto=True, opensWith=other.name, **slide_tags(ob, Vector((side, 0, 0)), width))
    for name in panels:
        tag(get(name), part=True, interact='use', device='panel', controls=leaves[0])

halves = [get(name) for name in WINDOW]
for ob in halves:
    lo, hi = bounds(ob)
    other = halves[1] if ob is halves[0] else halves[0]
    side = 1 if centre(ob).x > centre(other).x else -1
    tag(ob, part=True, opensWith=other.name, **slide_tags(ob, Vector((side, 0, 0)), hi.x - lo.x))

tag(get(LEVER_PANEL), part=True, interact='use', device='lever', controls=WINDOW[0])
lever = get(LEVER)
window_centre = (centre(halves[0]) + centre(halves[1])) / 2
y_axis = lever.matrix_world.to_3x3().normalized() @ Vector((0, 1, 0))
toward_window = y_axis if y_axis.dot(window_centre - lever.matrix_world.translation) > 0 else -y_axis
tag(lever, part=True, **slide_tags(lever, toward_window, LEVER_DISTANCE))

tag(get(SIDE_DOOR_PANEL[0]), controls=SIDE_DOOR_PANEL[1])

print(f'tag-ship-pass4: {len(changes)} changes' + (' (the file already has them)' if not changes else ''))
for line in changes:
    print('  ' + line)
