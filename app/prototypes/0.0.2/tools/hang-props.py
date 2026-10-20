"""Hang props on what holds them in the ship's reference file, so the export keeps them together.

How these were set in The Zamboni 1.19.blend on 2026-10-15 (owner: the clamps and the cabinets'
contents should be cut with what holds them): a record. Nothing moves. Run from the project root;
with ``--save`` it writes a copy of the file next to it, then saves.

    blender -b --python app/prototypes/0.0.2/tools/hang-props.py -- [--save]

- The fire extinguishers' clamps are tagged ``part`` (each extinguisher is already a child of a
  clamp); where two clamps hold one extinguisher, the second becomes a child of the first.
- Every prop inside an engineering cabinet's bounds (by its centre) that has no parent becomes a
  child of the cabinet (some racks already were).

export-ship.py then writes a prop hanging on a part as that part's child.
"""

import os
import shutil
import sys

import bpy
from mathutils import Vector

FILE = os.path.join(os.getcwd(), 'resources', 'models', 'The Zamboni 1.19.blend')
COPY = FILE.replace('.blend', ' (before hanging props, 2026-10-15).blend')
CLAMPS = ['Fire Extinguisher Clamp', 'Fire Extinguisher Clamp.001', 'Fire Extinguisher Clamp.002', 'Fire Extinguisher Clamp.003', 'Fire Extinguisher Clamp.004', 'Fire Extinguisher Clamp.005']
SECOND_CLAMPS = {'Fire Extinguisher Clamp.005': 'Fire Extinguisher Clamp.001', 'Fire Extinguisher Clamp.004': 'Fire Extinguisher Clamp.003'}
CABINETS = ['Cabinet', 'Cabinet.001']

bpy.ops.wm.open_mainfile(filepath=FILE)
changes = []


def parent_to(child, parent):
    if child.parent == parent:
        return
    before = child.matrix_world.copy()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    child.matrix_world = before
    changes.append(f'{child.name} -> child of {parent.name}')


for name in CLAMPS:
    ob = bpy.data.objects[name]
    if not ob.get('part'):
        ob['part'] = True
        changes.append(f'{name}: part')
for child, parent in SECOND_CLAMPS.items():
    parent_to(bpy.data.objects[child], bpy.data.objects[parent])


def bounds(ob):
    cs = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    return Vector([min(c[i] for c in cs) for i in range(3)]), Vector([max(c[i] for c in cs) for i in range(3)])


for name in CABINETS:
    cabinet = bpy.data.objects[name]
    lo, hi = bounds(cabinet)
    for ob in list(cabinet.users_collection[0].objects):
        if ob is cabinet or ob.parent or ob.get('part') or ob.type not in ('MESH', 'CURVE', 'FONT') or ob.hide_render:
            continue
        a, b = bounds(ob)
        c = (a + b) / 2
        if all(lo[i] - 0.02 <= c[i] <= hi[i] + 0.02 for i in range(3)):
            parent_to(ob, cabinet)

bpy.context.view_layer.update()
print('HANG:', len(changes), 'changes')
for line in changes:
    print('HANG:  ', line)
if '--save' in sys.argv and changes:
    shutil.copy2(FILE, COPY)
    bpy.ops.wm.save_mainfile()
    print('HANG: saved; the file as it was:', os.path.basename(COPY))
