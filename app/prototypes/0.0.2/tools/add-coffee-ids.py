"""The coffee's two things in the galley get ids (the coffee, pass 1, 2026-11-18): a record.

The coffee (doc/plans/features/coffee.md) needs two of the galley's things as objects of their own,
found by kind:

- ``Coffee Pot``: ``coffee-pot``, kind ``coffee-pot`` (the prompt: *Pour coffee*);
- ``Mug Empty``: ``sink-cup``, kind ``sink-cup`` (hidden until she puts her cup in the sink; the
  sink's prompt is at its place).

Run again, it reports "0 changes". Run from the project root; ``--file <path>`` works on another
copy; with ``--save`` it writes a copy of the file next to it, then saves.

    blender -b --python app/prototypes/0.0.2/tools/add-coffee-ids.py -- [--file <path>] [--save]
"""

import os
import shutil
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FILE = args[args.index('--file') + 1] if '--file' in args else os.path.join(os.getcwd(), 'resources', 'models', 'The Zamboni 1.22.blend')
COPY = FILE.replace('.blend', ' (before the coffee ids, 2026-11-18).blend')
TAGS = {
    'Coffee Pot': {'id': 'coffee-pot', 'kind': 'coffee-pot'},
    'Mug Empty': {'id': 'sink-cup', 'kind': 'sink-cup'},
}

bpy.ops.wm.open_mainfile(filepath=FILE)
taken = {o['id']: o.name for o in bpy.data.objects if 'id' in o}
changes, problems = [], []
for name, tags in TAGS.items():
    ob = bpy.data.objects.get(name)
    if ob is None:
        problems.append(f'no object {name!r}')
        continue
    print(f'COFFEE: {name!r} ({ob.type}) in {[c.name for c in ob.users_collection]}, parent {ob.parent.name if ob.parent else None!r}')
    for key, value in tags.items():
        if key == 'id' and taken.get(value, name) != name:
            problems.append(f'the id {value!r} is already {taken[value]!r}')
        elif ob.get(key) != value:
            changes.append((ob, key, value))
            print(f'COFFEE: {name!r} {key}: {ob.get(key)!r} -> {value!r}')
print(f'COFFEE: {len(changes)} changes, problems: {problems}')

if '--save' in args and changes and not problems:
    if not os.path.exists(COPY):  # the file as it was before the first save is kept
        shutil.copy2(FILE, COPY)
    for ob, key, value in changes:
        ob[key] = value
    bpy.ops.wm.save_mainfile()
    print('COFFEE: saved; the file as it was:', os.path.basename(COPY))
