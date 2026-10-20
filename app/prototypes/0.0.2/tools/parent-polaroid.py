"""Parent the polaroid to its locker door in the ship's reference file, so it moves with the door.

How `Polaroid` was made a child of `Locker Door.003` (crew quarters) in The Zamboni 1.19.blend on
2026-10-13 (owner: "parent the polaroid to the locker door"): a record. It stays where it is. Run
from the project root; with ``--save`` it writes a copy of the file next to it, then saves.

    blender -b --python app/prototypes/0.0.2/tools/parent-polaroid.py -- [--save]
"""

import os
import shutil
import sys

import bpy

FILE = os.path.join(os.getcwd(), 'resources', 'models', 'The Zamboni 1.19.blend')
COPY = FILE.replace('.blend', ' (before polaroid parent, 2026-10-13).blend')
CHILD, PARENT = 'Polaroid', 'Locker Door.003'

bpy.ops.wm.open_mainfile(filepath=FILE)
child, parent = bpy.data.objects[CHILD], bpy.data.objects[PARENT]
before = child.matrix_world.copy()
changes = 0
if child.parent != parent:
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    child.matrix_world = before
    changes += 1
bpy.context.view_layer.update()
moved = max(abs(a - b) for row_a, row_b in zip(child.matrix_world, before) for a, b in zip(row_a, row_b))
print(f'POLAROID: {changes} changes; parent: {child.parent.name!r}; moved by {moved:.6f}')
if '--save' in sys.argv and changes:
    shutil.copy2(FILE, COPY)
    bpy.ops.wm.save_mainfile()
    print('POLAROID: saved; the file as it was:', os.path.basename(COPY))
