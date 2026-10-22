"""Her locker's clothes get ids (the locker outfits, pass 2, 2026-10-21): a record.

Changing clothes at her locker (doc/plans/features/locker-outfit.md, pass 2) needs the five things in
the collection ``Locker Dr. Green`` as objects of their own, found by kind. Each gets an ``id``, a
``kind`` and ``outfit``, the outfit it goes with (shown in the locker unless she wears it):

- ``Parka Hanging``: ``green-parka``, kind ``outfit`` (the prompt: *Put on parka* / *Take off
  parka*), ``behind: crew-locker-door-1`` (offered only while her locker is open);
- ``Boot Left``, ``Boot Right``: ``green-boot-left``, ``green-boot-right``, kind ``clothes``, with the parka;
- ``Sneakers Left``, ``Sneakers Right``: ``green-sneakers-left``, ``green-sneakers-right``, kind
  ``clothes``, with the jumpsuit.
- ``Coat Hanger`` (2026-10-22, item 75): ``green-coat-hanger``, kind ``hanger``: an object of its own,
  so the parka (its child in the file) is exported under it and the two swing together.

Run again, it reports "0 changes". Run from the project root; ``--file <path>`` works on another
copy; with ``--save`` it writes a copy of the file next to it, then saves.

    blender -b --python app/prototypes/0.0.2/tools/add-locker-clothes-ids.py -- [--file <path>] [--save]
"""

import os
import shutil
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FILE = args[args.index('--file') + 1] if '--file' in args else os.path.join(os.getcwd(), 'resources', 'models', 'The Zamboni 1.22.blend')
COPY = FILE.replace('.blend', ' (before the hanger id, 2026-10-22).blend')
TAGS = {
    'Parka Hanging': {'id': 'green-parka', 'kind': 'outfit', 'outfit': 'parka', 'behind': 'crew-locker-door-1'},
    'Boot Left': {'id': 'green-boot-left', 'kind': 'clothes', 'outfit': 'parka'},
    'Boot Right': {'id': 'green-boot-right', 'kind': 'clothes', 'outfit': 'parka'},
    'Sneakers Left': {'id': 'green-sneakers-left', 'kind': 'clothes', 'outfit': 'jumpsuit'},
    'Sneakers Right': {'id': 'green-sneakers-right', 'kind': 'clothes', 'outfit': 'jumpsuit'},
    'Coat Hanger': {'id': 'green-coat-hanger', 'kind': 'hanger'},
}

bpy.ops.wm.open_mainfile(filepath=FILE)
taken = {o['id']: o.name for o in bpy.data.objects if 'id' in o}
changes, problems = [], []
for name, tags in TAGS.items():
    ob = bpy.data.objects.get(name)
    if ob is None:
        problems.append(f'no object {name!r}')
        continue
    print(f'LOCKER: {name!r} ({ob.type}) in {[c.name for c in ob.users_collection]}, parent {ob.parent.name if ob.parent else None!r}')
    for key, value in tags.items():
        if key == 'id' and taken.get(value, name) != name:
            problems.append(f'the id {value!r} is already {taken[value]!r}')
        elif ob.get(key) != value:
            changes.append((ob, key, value))
            print(f'LOCKER: {name!r} {key}: {ob.get(key)!r} -> {value!r}')
print(f'LOCKER: {len(changes)} changes, problems: {problems}')

if '--save' in args and changes and not problems:
    if not os.path.exists(COPY):  # the file as it was before the first save is kept
        shutil.copy2(FILE, COPY)
    for ob, key, value in changes:
        ob[key] = value
    bpy.ops.wm.save_mainfile()
    print('LOCKER: saved; the file as it was:', os.path.basename(COPY))
