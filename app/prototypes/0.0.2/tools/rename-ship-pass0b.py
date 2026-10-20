"""Pass 0b of the game's structure (2026-10-20): renamed the ship's objects (and their meshes) by the
approved table (doc/plans/architecture/game-architecture/ship-names.md), and every tag that names one of
them; deleted the leftover 'Boombox' (owner). Saved into The Zamboni 1.21.blend by the agent; kept as the
record (it can't run twice: the old names are gone). Afterwards, also deleted (owner): the boombox's 10
children left loose (Handle, the seven Key objects, Tape_Cover, Tape.003).

  blender -b <file> --python rename-ship-pass0b.py -- [--save]    without --save: report only
"""
import sys
import bpy

RENAMES = {
    'Door': 'Side Door',
    'Door Cargo': 'Cargo Ramp',
    'Door Cockpit': 'Cockpit Door Right',
    'Door Cockpit 2': 'Cockpit Door Left',
    'Door Engineering': 'Engineering Door Right',
    'Door Engineering 2': 'Engineering Door Left',
    'Lab Window': 'Engineering Window Left',
    'Lab Window.001': 'Engineering Window Right',
    'Level': 'Engineering Window Lever Handle',
    'Hatch.002': 'Floor Hatch',
    'Top Hatch': 'Top Hatch Upper',
    'Top Hatch Bottom': 'Top Hatch Lower',
    'Galley Door.001': 'Galley Door 1',
    'Galley Door': 'Galley Door 2',
    'Galley Door.002': 'Galley Door 3',
    'Locker Door': 'Cargo Locker Door',
    'Locker Door.003': 'Crew Locker Door 1',
    'Locker Door.001': 'Crew Locker Door 2',
    'Door Panel - Side door': 'Side Door Keypad',
    'Door Panel - Cargo Ramp': 'Cargo Ramp Keypad',
    'Door Panel - Cockpit': 'Cockpit Door Panel Front',
    'Door Panel - Crew Quarters': 'Cockpit Door Panel Back',
    'Door Panel - Engineering': 'Engineering Door Panel Front',
    'Door Panel - Cargo Hold': 'Engineering Door Panel Back',
    'Level Panel': 'Engineering Window Lever',
    'Ladder Cargo Bay': 'Cargo Hold Ladder',
    'Jetpack.003': 'Jetpack 1',
    'Jetpack.004': 'Jetpack 2',
    'Jetpack.001': 'Jetpack 3',
    'Jetpack.002': 'Jetpack 4',
    'Jetpack Rack': 'Jetpack Rack Upper',
    'Jetpack Rack.001': 'Jetpack Rack Lower',
    'Boombox.001': 'Boombox',
}
# A mesh shared by several of these objects takes the kind's name (owner, answer 3).
# Meshes take a ' Mesh' suffix (owner, 2026-10-20), so a mesh's name never meets an object's in the game.
SHARED_MESH = {'Cockpit Door Right': 'Bulkhead Door Right', 'Cockpit Door Left': 'Bulkhead Door Left',
               'Side Door Keypad': 'Door Keypad', 'Cockpit Door Panel Front': 'Door Panel',
               'Crew Locker Door 1': 'Crew Locker Door', 'Galley Door 1': 'Galley Door',
               'Jetpack 1': 'Jetpack', 'Jetpack Rack Upper': 'Jetpack Rack Shelf'}
SUFFIX = ' Mesh'

def same_geometry(a, b):
    def sig(m):
        return (len(m.vertices), len(m.edges), len(m.polygons), [s.name for s in m.materials],
                [tuple(round(c, 4) for c in v.co) for v in m.vertices])
    return sig(a) == sig(b)

objs = bpy.data.objects

# The leftover boombox (not exported; a different model): deleted (owner, 2026-10-20: garbage).
stray, kept = objs.get('Boombox'), objs.get('Boombox.001')
if stray and kept:
    print('BOOMBOX same geometry:', same_geometry(stray.data, kept.data), 'origin:', tuple(stray.location))

save = '--save' in sys.argv
objs = bpy.data.objects
missing = [n for n in RENAMES if n not in objs]
taken = [new for new in RENAMES.values() if new in objs and new not in RENAMES and new != 'Boombox']
print('MISSING:', missing)
print('TAKEN:', taken)

# The meshes: who uses each.
for old in RENAMES:
    o = objs.get(old)
    if not o:
        continue
    d = o.data
    users = [u.name for u in objs if u.data == d] if d else []
    print(f'OBJ {old!r} type={o.type} data={d.name if d else None!r} users={users} children={[c.name for c in o.children]}')

# Every string property on any object that equals an old name.
refs = []
for o in objs:
    for k in o.keys():
        v = o[k]
        if isinstance(v, str) and v in RENAMES:
            refs.append((o.name, k, v))
print('REFS:', refs)

if save:
    if stray and kept:
        bpy.data.objects.remove(stray)
    for name, k, v in refs:
        objs[name][k] = RENAMES[v]
    # Objects first, to temporary names (a new name may be an old one: 'Galley Door').
    pairs = [(objs[old], new) for old, new in RENAMES.items()]
    for i, (o, _) in enumerate(pairs):
        o.name = f'__rename_{i}'
    for o, new in pairs:
        o.name = new
        assert o.name == new, (o.name, new)
    # Meshes: one user → the object's name; shared → the kind's.
    meshes = {}
    for o, new in pairs:
        if o.data is not None and o.type == 'MESH':
            meshes.setdefault(o.data, []).append(new)
    for i, m in enumerate(meshes):
        m.name = f'__mesh_{i}'
    for m, names in meshes.items():
        users = [u for u in objs if u.data == m]
        if len(users) == 1:
            target = users[0].name
        else:
            kind = next((SHARED_MESH[n] for n in names if n in SHARED_MESH), None)
            assert kind, ('no kind name for', names)
            target = kind
        m.name = target + SUFFIX
        assert m.name == target + SUFFIX, ('mesh name taken', target + SUFFIX)
        print(f'MESH {[u.name for u in users]} -> {m.name!r}')
    bpy.ops.wm.save_mainfile()
    print('SAVED', bpy.data.filepath)
