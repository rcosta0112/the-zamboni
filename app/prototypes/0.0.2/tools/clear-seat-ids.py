"""The pilot's seat's id off its copies (2026-10-26): a record.

The owner rebuilt the cockpit's seats in 1.22 (four sets: base, seat, back, foot rest; two in the new
`Signal Station` collection) by copying the pilot's, so the copies kept its tags: eleven objects carried
``id: cockpit-seat-pilot`` and ``kind: seat``, and the ship export stops on a duplicated id. Only
``Seat.001`` keeps them (the pilot's seat, x -0.73, as since 2026-10-21; ``Seat base right`` is its new
parent); ``id`` and ``kind`` come off every other object that has that id. Nothing else changes.

Run again, it reports "0 changes". Run from the project root; ``--file <path>`` works on another copy
(a scratch copy first); with ``--save`` it writes a copy of the file next to it, then saves (with its UI).

    blender -b --python app/prototypes/0.0.2/tools/clear-seat-ids.py -- [--file <path>] [--save]
"""

import os
import shutil
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FILE = args[args.index('--file') + 1] if '--file' in args else os.path.join(os.getcwd(), 'resources', 'models', 'The Zamboni 1.22.blend')
COPY = FILE.replace('.blend', ' (before clearing the seat ids, 2026-10-26).blend')
ID, KEEP = 'cockpit-seat-pilot', 'Seat.001'

bpy.ops.wm.open_mainfile(filepath=FILE)
problems = [] if bpy.data.objects.get(KEEP, {}).get('id') == ID else [f'{KEEP!r} has no id {ID!r}']
changes = [o for o in bpy.data.objects if o.get('id') == ID and o.name != KEEP]
for o in changes:
    print(f'SEAT: {o.name!r}: id and kind off')
print(f'SEAT: {len(changes)} changes, problems: {problems}')

if '--save' in args and changes and not problems:
    if not os.path.exists(COPY):  # the file as it was before the first save is kept
        shutil.copy2(FILE, COPY)
    for o in changes:
        for key in ('id', 'kind'):
            if key in o:
                del o[key]
    bpy.ops.wm.save_mainfile()
    print('SEAT: saved; the file as it was:', os.path.basename(COPY))
