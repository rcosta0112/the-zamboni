"""Collision boxes for medium and small objects in the ship's reference file (item 42): a record.

How furniture in the cargo hold, engineering and the cockpit came to collide as simple boxes
(plan: doc/plans/features/collision-boxes.md, approved by the owner on 2026-10-15). Twelve
``*_col`` objects in ``Game Collision``, made like those of ``add-collision-boxes.py``: upright
prisms from an outline seen from above, some with a vertical corner cut at 45° (a bevel, 0.15 along
each side) where it keeps a corridor clear. All reach through but the pilot seats'. What each box
stands for, and what stands inside the crew quarters' and the sled's boxes or is flat against a
wall, is tagged ``collider: "none"`` (out of the ship's collider). Run again, it reports
"0 changes". Run from the project root; with ``--save`` it writes a copy of the file next to it,
then saves.

    blender -b --python app/prototypes/0.0.2/tools/add-collision-boxes-2.py -- [--save]
"""

import os
import shutil
import sys

import bmesh
import bpy

FILE = os.path.join(os.getcwd(), 'resources', 'models', 'The Zamboni 1.19.blend')
COPY = FILE.replace('.blend', ' (before collision boxes 2, 2026-10-15).blend')
COLLECTION = 'Game Collision'
BEVEL = 0.15
# The decks' floors and ceilings, as the first boxes.
LOWER = (0.82119, 2.22126)
UPPER = (2.32896, 3.67518)
# Name, x and y ranges, bottom and top, bevelled corners (x, y), reaches through, what it replaces.
BOXES = [
    ('Box Jetpack Rack_col', (-1.47, -1.23), (0.89, 1.38), (LOWER[0], 1.67), [(-1.23, 0.89)], True,
     ['Jetpack Rack', 'Jetpack Rack.001', 'Fire Extinguisher Clamp.001', 'Fire Extinguisher Clamp.005', 'Fire Extinguisher.001']),
    # 0.08 in front of the locker's door (its front at y 0.12; it has a collider of its own): flying
    # into the door's edge, she hung in the air.
    ('Box Cargo Locker_col', (0.31, 0.75), (-0.15, 0.20), LOWER, [(0.31, 0.20)], True, ['Locker']),
    ('Box Head_col', (0.71, 1.56), (-0.20, 0.58), LOWER, [(0.71, 0.58)], True, ['Head']),
    ('Box Bench Left_col', (-1.51, -0.77), (-2.08, -0.36), LOWER, [(-0.77, -0.36), (-0.77, -2.08)], True,
     ['Bench', 'Monitor Arm.031', 'Ceiling Light.004', 'Centrifuge', 'Cylinder.004', 'Crate.005', 'Cube.010', 'Keyboard.001',
      'Microscope', 'Osciloscope', 'Power Cell.002', 'Power Cell.004', 'Power Cell.005', 'Power Cell.006', 'Power Cell.007']),
    ('Box Bench Right_col', (0.77, 1.41), (-2.30, -0.36), LOWER, [(0.77, -0.36), (0.77, -2.30)], True,
     ['Bench.001', '3d Printer', 'Ceiling Light.003', 'Power Supply', 'Power Supply.001', 'Stand', 'Comm.001', 'Kaypro',
      'Power Cell.003', 'TRS-80', 'TRS-80.025']),
    ('Box Cabinet_col', (0.51, 1.03), (-0.44, -0.28), (1.43, 1.91), [], True, ['Cabinet']),
    ('Box Cabinet.001_col', (-1.05, -0.53), (-0.44, -0.28), (1.43, 1.91), [], True, ['Cabinet.001']),
    ('Box Extinguisher Engineering_col', (-0.68, -0.54), (-0.40, -0.28), (LOWER[0], 1.37), [], True,
     ['Fire Extinguisher', 'Fire Extinguisher Clamp']),
    # The consoles' inner edges are the console mesh's (Dashboard Body.002, both consoles): the
    # aisle stays as wide as it was.
    ('Box Console Left_col', (-1.53, -0.549), (-1.58, -0.39), UPPER, [(-0.549, -0.39), (-0.549, -1.58)], True,
     ['Dashboard Body.002', 'Monitor.001', 'Seat.002', 'Back seat', 'Fire Extinguisher.002', 'Fire Extinguisher Clamp.002']),
    ('Box Console Right_col', (0.56, 1.54), (-1.58, -0.39), UPPER, [(0.56, -0.39), (0.56, -1.58)], True,
     ['Dashboard Body.001', 'Monitor.003', 'Monitor.004', 'Seat.004', 'Back seat.002', 'Keyboard.002', 'Keyboard.003']),
    # Getting into a seat will be a button (owner): these don't reach through.
    ('Box Pilot Seat Right_col', (0.25, 0.76), (-2.76, -1.96), (UPPER[0], 3.22), [], False, ['Seat', 'Seat.003']),
    ('Box Pilot Seat Left_col', (-0.76, -0.25), (-2.76, -1.95), (UPPER[0], 3.22), [], False, ['Seat.001', 'Back seat.001', 'Seat.006']),
]
# Out of the collider with no box of their own: what stands inside the crew quarters' boxes and the
# sled's, and what's flat or flush against a wall or the ceiling.
INSIDE_BOXES = [
    'Boombox.001', 'Braun KF20', 'Cup Holder', 'Fridge Grate', 'Fridge Grate.001', 'Fridge Grate.002', 'Fridge Grate.003',
    'Mug.005', 'Stove', 'Parka.001', 'Parka.002', 'Parka.003', 'Pillow', 'Pillow.002', 'Chess Board', 'Laptop.001',
    'Laptop.002', 'TRS-80.001', 'Fire Extinguisher.003', 'Fire Extinguisher Clamp.003', 'Fire Extinguisher Clamp.004',
    'Chest Closed.001', 'Chest Closed.002', 'Chest Closed.003', 'Chest Closed.005', 'Chest Closed.006', 'Crate.001',
    'Crate.003', 'Power Cell', 'Power Cell.001',
]
FLAT = [
    'Door Panel - Cargo Hold', 'Door Panel - Cargo Ramp', 'Door Panel - Cockpit', 'Door Panel - Crew Quarters',
    'Door Panel - Engineering', 'Door Panel - Side door', 'Ceiling Light.001', 'Ceiling Light.002', 'Gojira poster',
    'Lockers.001', 'Dials.007',
]


def outline(xs, ys, bevels):
    corners = [(xs[0], ys[0]), (xs[1], ys[0]), (xs[1], ys[1]), (xs[0], ys[1])]
    points = []
    for i, (cx, cy) in enumerate(corners):
        if (cx, cy) not in bevels:
            points.append((cx, cy))
            continue
        # A bevel: the corner replaced by a point along each of its two sides.
        for nx, ny in (corners[i - 1], corners[(i + 1) % 4]):
            points.append((cx + BEVEL * ((nx > cx) - (nx < cx)), cy + BEVEL * ((ny > cy) - (ny < cy))))
    return points


bpy.ops.wm.open_mainfile(filepath=FILE)
collection = bpy.data.collections[COLLECTION]
like = next(ob for ob in collection.objects if ob.name.endswith('_col'))
missing = [n for *_, replaced in BOXES for n in replaced if n not in bpy.data.objects]
missing += [n for n in INSIDE_BOXES + FLAT if n not in bpy.data.objects]
if missing:
    sys.exit(f'BOXES: not in the file: {missing}')
# Dashboard Body.002 leaves the collider: it must be the two consoles only (nothing in the aisle).
dash = bpy.data.objects['Dashboard Body.002']
aisle = [v for v in dash.data.vertices if abs((dash.matrix_world @ v.co).x) < 0.54]
if aisle:
    sys.exit(f'BOXES: Dashboard Body.002 has {len(aisle)} vertices in the aisle')

def corners(location, mesh):
    """A box's corners in the file (its origin has no rotation or scale), to compare two shapes."""
    return sorted(tuple(round(o + c, 4) for o, c in zip(location, v.co)) for v in mesh.vertices)


changes = reshaped = 0
for name, xs, ys, (bottom, top), bevels, through, _ in BOXES:
    points = outline(xs, ys, bevels)
    cx = sum(x for x, _ in points) / len(points)
    cy = sum(y for _, y in points) / len(points)
    bm = bmesh.new()
    for x, y in points:
        bm.verts.new((x - cx, y - cy, 0))
        bm.verts.new((x - cx, y - cy, top - bottom))
    bmesh.ops.convex_hull(bm, input=bm.verts)
    bmesh.ops.dissolve_limit(bm, angle_limit=0.001, verts=bm.verts, edges=bm.edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    old = bpy.data.objects.get(name)
    if old:
        # Already there: its shape replaced if the box above has changed (the cargo locker's,
        # brought forward after the first save).
        if corners(old.location, old.data) != corners((cx, cy, bottom), mesh):
            previous = old.data
            old.data = mesh
            old.location = (cx, cy, bottom)
            bpy.data.meshes.remove(previous)
            mesh.name = name
            reshaped += 1
        else:
            bpy.data.meshes.remove(mesh)
        continue
    ob = bpy.data.objects.new(name, mesh)
    ob.location = (cx, cy, bottom)
    ob.display_type = like.display_type
    ob.hide_render = like.hide_render
    if through:
        ob['reach'] = 'through'
    collection.objects.link(ob)
    changes += 1
tagged = 0
for name in [n for *_, replaced in BOXES for n in replaced] + INSIDE_BOXES + FLAT:
    ob = bpy.data.objects[name]
    if ob.get('collider') != 'none':
        ob['collider'] = 'none'
        tagged += 1
print(f'BOXES: {changes + reshaped + tagged} changes ({changes} boxes made, {reshaped} reshaped, {tagged} objects tagged collider: "none"); {len(BOXES)} boxes')
if '--save' in sys.argv and changes + reshaped + tagged:
    if not os.path.exists(COPY):  # the file as it was before the first save is kept
        shutil.copy2(FILE, COPY)
    bpy.ops.wm.save_mainfile()
    print('BOXES: saved; the file as it was:', os.path.basename(COPY))
