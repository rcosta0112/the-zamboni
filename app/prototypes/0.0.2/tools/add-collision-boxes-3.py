"""Collision boxes that keep her in the cockpit's corridor (item 55, pass 2): a record.

What the sweep found (doc/plans/features/collision-pass-2.md, *Pass 1, as found*; approved by the
owner on 2026-10-21): the collider has a crack and a groove across the cockpit's doorway, the
cockpit's floor dips and then rises in steps to the dashboard, and two ridges in front of the
consoles are low enough to step onto. Four ``*_col`` boxes in ``Game Collision``, all reaching
through, at scale 1 (coordinates in the file, 1.21):

- a flat floor from the crew quarters' side of the doorway to where the cockpit's floor starts
  rising (a ramp up to a platform behind the front seats), its top flush with the upper floor: it
  fills the crack, the groove and the dip;
- a wall up to the ceiling across the cockpit just behind the front seats: she walks up the ramp
  and behind them (owner, 2026-10-21), and can't get onto the seats or the dashboard (the owner:
  she stays in the corridor). Until the owner's look it stood where the ramp starts;
- one wall over each ridge in front of the consoles, from the bulkhead to the platform;
- and the two boxes beside the doorway (``Box Crew Bulkhead Galley_col``, ``Box Crew Bulkhead
  Trapdoor_col``, 2026-10-14), reshaped (``DOORWAY``): she wedged on their square corners walking
  through the doorway at an angle, and stopped against the bulkhead walking at the door from beside
  it (owner, 2026-10-21, also off the ladder's top). Each is one convex shape now, seen from above:
  the doorway's side, cut at 45° on the crew quarters' side, then (on the ladder's side only) a guide
  standing 0.15 off the bulkhead that turns her into the doorway, and on the cockpit's side a rounded turn (two facets)
  to the cockpit's side wall (the bulkhead's own edge stays inside it). One shape, as Rapier's controller treats
  overlapping shapes apart: a square corner under a wedge still stopped her. (Tried first: the
  corners cut on both sides, which let the door frame's edge through, and the guide and the turn
  as boxes of their own; ``REMOVED`` deletes those.)

Run again, it reports "0 changes". Run from the project root; ``--file <path>`` works on another
copy (a scratch copy first); with ``--save`` it writes a copy of the file next to it, then saves.

    blender -b --python app/prototypes/0.0.2/tools/add-collision-boxes-3.py -- [--file <path>] [--save]
"""

import os
import shutil
import sys

import bmesh
import bpy

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FILE = args[args.index('--file') + 1] if '--file' in args else os.path.join(os.getcwd(), 'resources', 'models', 'The Zamboni 1.21.blend')
COPY = FILE.replace('.blend', ' (before collision boxes 3, 2026-10-21).blend')
COLLECTION = 'Game Collision'
# The upper floor and the top of the upper deck's boxes (the consoles' boxes reach 5.46).
FLOOR = 3.4615
TOP = 5.46
FRONT = -1.65  # where the cockpit's floor starts rising: a ramp up to a platform 0.24 high behind the front seats
PLATFORM = -2.40  # where the ramp reaches the platform (the consoles' ridges end there)
SEATS = -2.88  # the front seats' backs (and the dashboard between them): 0.87 high and more past it
# The boxes beside the doorway, as outlines seen from above (their bottom and top as before). The
# doorway's sides at x 0.4807 / -0.4897, the bulkhead's face on the crew quarters' side at y -0.27
# (where the floor ends), the boxes' far ends as they were (x 1.1494 / -1.9103); on the cockpit's
# side the turn to the side walls (x ±0.68) is two facets of 22.5° (a 45° corner still stopped
# her), from y -0.56, where it still covers the bulkhead's own edge (its mesh collides; it ends 4 cm
# before the boxes did), inside the consoles' boxes beyond.
DOORWAY = {
    # No guide on the galley's side (owner, 2026-10-21: it stood in the way of the galley's corner).
    'Box Crew Bulkhead Galley_col': [(0.4807, -0.56), (0.4807, -0.42), (0.6307, -0.27), (1.1494, -0.27), (1.1494, -0.818), (0.68, -0.818), (0.5221, -0.66)],
    'Box Crew Bulkhead Trapdoor_col': [(-0.4897, -0.56), (-0.4897, -0.42), (-0.6397, -0.27), (-0.84, -0.12), (-1.9103, -0.27), (-1.9103, -0.809), (-0.68, -0.809), (-0.5311, -0.66)],
}
DOORWAY_Z = (3.46, 5.4602)
REMOVED = ['Box Cockpit Funnel Galley_col', 'Box Cockpit Funnel Trapdoor_col', 'Box Cockpit Entry Galley_col', 'Box Cockpit Entry Trapdoor_col']
# Name, x range, y range, bottom and top.
BOXES = [
    ('Box Cockpit Floor_col', (-0.70, 0.70), (FRONT, -0.20), (FLOOR - 0.06, FLOOR)),
    # Moved behind the front seats (owner, 2026-10-21: she walks up the ramp and behind the front
    # seats); it was across the cockpit at FRONT. Across the whole width, so she can't jump onto them.
    ('Box Cockpit Front_col', (-1.60, 1.60), (SEATS - 0.12, SEATS), (FLOOR, TOP)),
    ('Box Cockpit Aisle Left_col', (-0.85, -0.68), (PLATFORM, -0.62), (FLOOR, TOP)),
    ('Box Cockpit Aisle Right_col', (0.68, 0.85), (PLATFORM, -0.62), (FLOOR, TOP)),
]


def corners(ob):
    return sorted(tuple(round(o + c * s, 4) for o, c, s in zip(ob.location, v.co, ob.scale)) for v in ob.data.vertices)


bpy.ops.wm.open_mainfile(filepath=FILE)
collection = bpy.data.collections[COLLECTION]
like = bpy.data.objects['Box Console Left_col']
changes = 0
for name, (x0, x1), (y0, y1), (z0, z1) in BOXES:
    sx, sy, sz = x1 - x0, y1 - y0, z1 - z0
    # Origin at the bottom's centre, as the other boxes.
    verts = [(x, y, z) for z in (0, sz) for y in (-sy / 2, sy / 2) for x in (-sx / 2, sx / 2)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    location = ((x0 + x1) / 2, (y0 + y1) / 2, z0)
    old = bpy.data.objects.get(name)
    if old:
        probe = bpy.data.objects.new('probe', mesh)
        probe.location = location
        same = corners(old) == corners(probe)
        bpy.data.objects.remove(probe)
        if same:
            bpy.data.meshes.remove(mesh)
            continue
        previous = old.data
        old.data = mesh
        old.location = location
        old.scale = (1, 1, 1)
        bpy.data.meshes.remove(previous)
        mesh.name = name
        changes += 1
        continue
    ob = bpy.data.objects.new(name, mesh)
    ob.location = location
    ob.display_type = like.display_type
    ob.hide_render = like.hide_render
    ob['reach'] = 'through'
    collection.objects.link(ob)
    changes += 1
for name, outline in DOORWAY.items():
    ob = bpy.data.objects[name]
    z0, z1 = DOORWAY_Z
    cx = sum(x for x, _ in outline) / len(outline)
    cy = sum(y for _, y in outline) / len(outline)
    bm = bmesh.new()
    for x, y in outline:
        bm.verts.new((x - cx, y - cy, 0))
        bm.verts.new((x - cx, y - cy, z1 - z0))
    bmesh.ops.convex_hull(bm, input=bm.verts)
    bmesh.ops.dissolve_limit(bm, angle_limit=0.001, verts=bm.verts, edges=bm.edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    if len(mesh.vertices) != 2 * len(outline):
        sys.exit(f'BOXES: {name}: the outline is not convex')
    if corners(ob) == sorted(tuple(round(o + c, 4) for o, c in zip((cx, cy, z0), v.co)) for v in mesh.vertices):
        bpy.data.meshes.remove(mesh)
        continue
    previous = ob.data
    ob.data = mesh
    ob.location = (cx, cy, z0)
    ob.scale = (1, 1, 1)
    bpy.data.meshes.remove(previous)
    mesh.name = name
    changes += 1
    print(f'BOXES: {name} reshaped')
for name in REMOVED:
    ob = bpy.data.objects.get(name)
    if ob:
        mesh = ob.data
        bpy.data.objects.remove(ob)
        bpy.data.meshes.remove(mesh)
        changes += 1
print(f'BOXES: {changes} changes; {len(BOXES)} boxes, {len(DOORWAY)} reshaped by the doorway')
if '--save' in args and changes:
    if not os.path.exists(COPY):  # the file as it was before the first save is kept
        shutil.copy2(FILE, COPY)
    bpy.ops.wm.save_mainfile()
    print('BOXES: saved; the file as it was:', os.path.basename(COPY))
