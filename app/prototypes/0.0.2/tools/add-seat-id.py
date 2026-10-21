"""The pilot's seat gets an id (the dialogue system, pass 1, part B, 2026-10-21): a record.

Her remark on the pilot's seat (doc/plans/features/dialogue.md, pass 1) needs the seat named by id, as
Ink names it (``use_cockpit_seat_pilot``). The pilot's seat is the empty seat at the front (owner):
``Seat.001`` (x -0.80; Adam Blue sits in ``Seat``, x 0.80), its back ``Back seat.001`` parented to it.
It gets ``id: cockpit-seat-pilot`` and ``kind: seat``; nothing else changes.

Run again, it reports "0 changes". Run from the project root; ``--file <path>`` works on another
copy (a scratch copy first); with ``--save`` it writes a copy of the file next to it, then saves.

    blender -b --python app/prototypes/0.0.2/tools/add-seat-id.py -- [--file <path>] [--save]
"""

import os
import shutil
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FILE = args[args.index('--file') + 1] if '--file' in args else os.path.join(os.getcwd(), 'resources', 'models', 'The Zamboni 1.21.blend')
COPY = FILE.replace('.blend', ' (before the seat id, 2026-10-21).blend')
TAGS = {'Seat.001': {'id': 'cockpit-seat-pilot', 'kind': 'seat'}}

bpy.ops.wm.open_mainfile(filepath=FILE)
taken = {o['id']: o.name for o in bpy.data.objects if 'id' in o}
changes, problems = [], []
for name, tags in TAGS.items():
    ob = bpy.data.objects.get(name)
    if ob is None:
        problems.append(f'no object {name!r}')
        continue
    for key, value in tags.items():
        if key == 'id' and taken.get(value, name) != name:
            problems.append(f'the id {value!r} is already {taken[value]!r}')
        elif ob.get(key) != value:
            changes.append((ob, key, value))
            print(f'SEAT: {name!r} {key}: {ob.get(key)!r} -> {value!r}')
print(f'SEAT: {len(changes)} changes, problems: {problems}')

if '--save' in args and changes and not problems:
    if not os.path.exists(COPY):  # the file as it was before the first save is kept
        shutil.copy2(FILE, COPY)
    for ob, key, value in changes:
        ob[key] = value
    bpy.ops.wm.save_mainfile()
    print('SEAT: saved; the file as it was:', os.path.basename(COPY))
