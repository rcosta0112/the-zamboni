"""Pass 6b of the game's structure (2026-10-20): the tags that name another object (``controls``: a
keypad, a panel or the lever -> what it opens; ``opensWith``: a door -> its partner) said its Blender name;
they now say its ``id`` (doc/plans/architecture/game-architecture/game-structure.md, pass 6), so a rename in
Blender no longer breaks them. Saved into The Zamboni 1.21.blend by the agent, the file as it was kept
next to it; kept as the record (run again, it reports the tags already ids).

  blender -b <file> --python ids-in-tags-pass6.py -- [--save]    without --save: report only
"""
import os
import sys
import bpy

KEYS = ('controls', 'opensWith')
save = '--save' in sys.argv
objs = bpy.data.objects
ids = {o['id'] for o in objs if 'id' in o}

changes, problems = [], []
for o in objs:
    for k in KEYS:
        if k not in o:
            continue
        v = o[k]
        if v in ids:
            print(f'ALREADY {o.name!r} {k}: {v!r}')
            continue
        target = objs.get(v)
        if target is None or 'id' not in target:
            problems.append(f'{o.name!r} {k}: {v!r} is no object with an id')
            continue
        changes.append((o, k, v, target['id']))
        print(f'CHANGE {o.name!r} {k}: {v!r} -> {target["id"]!r}')
print('CHANGES:', len(changes), 'PROBLEMS:', problems)

if save and changes and not problems:
    path = bpy.data.filepath
    stem, ext = os.path.splitext(path)
    backup = f'{stem} (before ids in tags, 2026-10-20){ext}'
    bpy.ops.wm.save_as_mainfile(filepath=backup, copy=True)
    print('BACKUP', backup)
    for o, k, _, new in changes:
        o[k] = new
    bpy.ops.wm.save_mainfile()
    print('SAVED', path)
