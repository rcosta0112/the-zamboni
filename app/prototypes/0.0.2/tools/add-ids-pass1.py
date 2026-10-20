"""Pass 1 of the game's structure (2026-10-20): gives the ship's objects the game names an ``id`` and a
``kind`` custom property (doc/plans/architecture/game-architecture/game-structure.md, *Ids*). The id is
written once from the name pass 0 corrected (``Cockpit Door Left`` -> ``cockpit-door-left``) and kept when
the object is renamed later; the kind says what it is (the game's definitions, src/kinds.ts). Kept as the
record; running it again changes nothing (it reports ids already set).

  blender -b <file> --python add-ids-pass1.py -- [--save]    without --save: report only
"""
import sys
import bpy

KINDS = {
    'Side Door': 'drop-door',
    'Cargo Ramp': 'ramp',
    'Cockpit Door Right': 'sliding-door',
    'Cockpit Door Left': 'sliding-door',
    'Engineering Door Right': 'sliding-door',
    'Engineering Door Left': 'sliding-door',
    'Engineering Window Left': 'sliding-window',
    'Engineering Window Right': 'sliding-window',
    'Engineering Window Lever Handle': 'lever-handle',
    'Floor Hatch': 'hatch',
    'Top Hatch Upper': 'hatch',
    'Top Hatch Lower': 'hatch',
    'Galley Door 1': 'door',
    'Galley Door 2': 'door',
    'Galley Door 3': 'door',
    'Cargo Locker Door': 'door',
    'Crew Locker Door 1': 'door',
    'Crew Locker Door 2': 'door',
    'Side Door Keypad': 'keypad',
    'Cargo Ramp Keypad': 'keypad',
    'Cockpit Door Panel Front': 'door-panel',
    'Cockpit Door Panel Back': 'door-panel',
    'Engineering Door Panel Front': 'door-panel',
    'Engineering Door Panel Back': 'door-panel',
    'Engineering Window Lever': 'lever',
    'Cargo Hold Ladder': 'ladder',
    'Jetpack 1': 'jetpack',
    'Jetpack 2': 'jetpack',
    'Jetpack 3': 'jetpack',
    'Jetpack 4': 'jetpack',
    'Jetpack Rack Upper': 'jetpack-rack',
    'Jetpack Rack Lower': 'jetpack-rack',
    'Boombox': 'boombox',
}


def id_of(name):
    return '-'.join(name.lower().split())


save = '--save' in sys.argv
objs = bpy.data.objects
missing = [n for n in KINDS if n not in objs]
print('MISSING:', missing)
ids = {}
for name, kind in KINDS.items():
    ob = objs.get(name)
    if not ob:
        continue
    new = id_of(name)
    if ob.get('id') == new and ob.get('kind') == kind:
        print(f'ALREADY {name!r}')
        continue
    if ob.get('id') not in (None, new) or ob.get('kind') not in (None, kind):
        print(f'KEPT {name!r}: already id {ob.get("id")!r}, kind {ob.get("kind")!r}')
        continue
    ob['id'] = new
    ob['kind'] = kind
    print(f'SET {name!r}: id {new!r}, kind {kind!r}')
# Anything else in the file already carrying one of these ids (a duplicated object keeps its tags).
for ob in objs:
    if 'id' in ob:
        ids.setdefault(ob['id'], []).append(ob.name)
dupes = {i: n for i, n in ids.items() if len(n) > 1}
print('DUPLICATE IDS:', dupes)

if save and not missing and not dupes:
    bpy.ops.wm.save_mainfile()
    print('SAVED', bpy.data.filepath)
elif save:
    print('NOT SAVED: missing objects or duplicate ids')
