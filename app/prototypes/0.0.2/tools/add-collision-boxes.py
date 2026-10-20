"""Add the collision boxes to the ship's reference file, as ``*_col`` objects.

How the ten boxes that stood in prototype 01's code (``colliders.ts``, world coordinates) became
objects in the ``Game Collision`` collection of The Zamboni 1.19.blend on 2026-10-14 (owner: the
boxes are approved, "do it"): a record. Each is an upright prism (an outline seen from above, a
bottom and a top; one has a corner cut off), tagged ``reach: "through"``: it stops her, but the
reach test passes through it (the galley's doors and the boombox stand behind them). The
coordinates are the code's, converted in the running game (``ship.object.worldToLocal``, then
Blender's axes). Run again, it reports "0 changes". Run from the project root; with ``--save`` it
writes a copy of the file next to it, then saves.

    blender -b --python app/tools/add-collision-boxes.py -- [--save]
"""

import os
import shutil
import sys

import bmesh
import bpy

FILE = os.path.join(os.getcwd(), 'resources', 'models', 'The Zamboni 1.19.blend')
COPY = FILE.replace('.blend', ' (before collision boxes, 2026-10-14).blend')
COLLECTION = 'Game Collision'
# Name, outline (Blender x, y), bottom and top (Blender z).
BOXES = [
    ('Box Sledge_col', [(1.54815, 0.88177), (0.17501, 0.88177), (0.17501, 1.85778), (1.54815, 1.85778)], 0.82119, 2.22126),
    ('Box Chests_col', [(0.17501, 0.88177), (-0.61253, 0.88177), (-0.61253, 1.85778), (0.17501, 1.85778)], 0.82119, 1.15775),
    ('Box Lamp_col', [(-0.04039, 1.59527), (-0.14135, 1.59527), (-0.14135, 1.70297), (-0.04039, 1.70297)], 1.15775, 1.35968),
    ('Box Window Slope_col', [(1.07698, -3.23093), (-1.07698, -3.23093), (-1.07698, -2.32223), (1.07698, -2.32223)], 0.82119, 2.22126),
    ('Box Crew Galley_col', [(1.48084, -0.3029), (0.77408, -0.3029), (0.77408, 2.49051), (1.48084, 2.49051)], 2.32896, 3.67518),
    ('Box Crew Lockers_col', [(0.77408, 2.28184), (0.01346, 2.28184), (0.01346, 2.75975), (0.77408, 2.75975)], 2.32896, 3.67518),
    # The corner toward the galley cut off: the benches and the table step back there.
    ('Box Crew Table_col', [(0.01346, 1.44045), (-0.48464, 0.94235), (-1.61546, 0.94235), (-1.61546, 2.75975), (0.01346, 2.75975)], 2.32896, 3.67518),
    ('Box Crew Trapdoor Wall_col', [(-1.28564, -0.3029), (-1.61546, -0.3029), (-1.61546, 0.94235), (-1.28564, 0.94235)], 2.32896, 3.67518),
    ('Box Crew Bulkhead Galley_col', [(0.77408, -0.40387), (0.32309, -0.40387), (0.32309, -0.18174), (0.77408, -0.18174)], 2.32896, 3.67518),
    ('Box Crew Bulkhead Trapdoor_col', [(-0.32982, -0.40387), (-1.28564, -0.40387), (-1.28564, -0.18174), (-0.32982, -0.18174)], 2.32896, 3.67518),
]

bpy.ops.wm.open_mainfile(filepath=FILE)
collection = bpy.data.collections[COLLECTION]
# Drawn as the other collision pieces are.
like = next(ob for ob in collection.objects if ob.name.endswith('_col'))
changes = 0
for name, outline, bottom, top in BOXES:
    if name in bpy.data.objects:
        continue
    # The origin at the middle of the bottom; the prism is the convex hull of its corners.
    cx = sum(x for x, _ in outline) / len(outline)
    cy = sum(y for _, y in outline) / len(outline)
    bm = bmesh.new()
    for x, y in outline:
        bm.verts.new((x - cx, y - cy, 0))
        bm.verts.new((x - cx, y - cy, top - bottom))
    bmesh.ops.convex_hull(bm, input=bm.verts)
    bmesh.ops.dissolve_limit(bm, angle_limit=0.001, verts=bm.verts, edges=bm.edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    ob = bpy.data.objects.new(name, mesh)
    ob.location = (cx, cy, bottom)
    ob.display_type = like.display_type
    ob.hide_render = like.hide_render
    ob['reach'] = 'through'
    collection.objects.link(ob)
    changes += 1
print(f'BOXES: {changes} changes; {len(BOXES)} boxes in {COLLECTION!r}')
if '--save' in sys.argv and changes:
    shutil.copy2(FILE, COPY)
    bpy.ops.wm.save_mainfile()
    print('BOXES: saved; the file as it was:', os.path.basename(COPY))
