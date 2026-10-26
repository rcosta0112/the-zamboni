"""One material per colour (owner, 2026-10-21: the game's look is a limited palette; materials of the
same colour that differ get names like Black Metal, Black Plastic). Merges into the version the game
uses: Blender's copies (`Black.001` -> `Black`, the player's and the boots' materials), same-colour
pairs under two names (`Dark Teal` -> `Teal Dark`, `Darkest Teal` -> `Teal Darkest` with the lighter
colour, `Dark Brown` -> `Brown Dark`; the skins: `Skin White`, `Skin Asian`), and the *Flat* materials (no principled shader: they don't look
right here) into their closest base. Every kept material ends single-sided. Run again: 0 changes.

Run again 2026-10-26 on 1.22 (owner: "merge the materials"): Dr. Ogawa's new mesh and headphones had
their own copies (`Black.002`, `Gray.002`… and `Skin 2 - Asian.001`, the colour of `Skin Asian`).
`Dark Gray.001` (0.025) is a colour of its own, between `Black` and `Gray Dark`: made single-sided,
its name left to the owner. The copy of the file is named with the day it's made.

    blender -b --python app/prototypes/0.0.2/tools/merge-materials.py -- --file "<file>.blend" [--save]
"""

import datetime
import os
import re
import shutil
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FILE = args[args.index('--file') + 1]
SAVE = '--save' in args
bpy.ops.wm.open_mainfile(filepath=FILE)  # with its UI: the owner's layout is kept

# Merged by name, beyond Blender's .001 copies (the owner's answers, 2026-10-21).
RENAMED = {'Dark Teal': 'Teal Dark', 'Darkest Teal': 'Teal Darkest', 'Dark Brown': 'Brown Dark', 'Blue Flat': 'Blue',
           'Skin 3 - Asian': 'Skin 2 - Asian', 'Skin 2 - Asian.001': 'Skin Asian'}
# Then renamed (owner, 2026-10-21): one skin material per skin colour.
NAMES = {'Skin 2 - Asian': 'Skin Asian', 'Skin 2 - White': 'Skin White'}
FLAT_TO = {'Black Flat': 'Black'}  # checked below: merged only if the flat colour is close to the base's
CLOSE = 0.03
SINGLE_SIDED = ['Dark Gray.001']  # kept as it is, culling on (2026-10-26)


def users(m):
    return sorted({o.name for o in bpy.data.objects for s in o.material_slots if s.material == m})


def flat_colour(m):
    """The colour a flat material sends straight to the output (an RGB node), or None."""
    out = next((n for n in m.node_tree.nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output), None)
    if not out or not out.inputs['Surface'].is_linked:
        return None
    src = out.inputs['Surface'].links[0].from_node
    if src.type == 'RGB':
        return tuple(src.outputs[0].default_value)[:3]
    i = src.inputs.get('Color')
    return tuple(i.default_value)[:3] if i is not None and not i.is_linked else None


def base_colour(m):
    p = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    return tuple(p.inputs['Base Color'].default_value)[:3] if p and not p.inputs['Base Color'].is_linked else None


merges = []
for m in bpy.data.materials:
    base = re.sub(r'\.\d{3}$', '', m.name)
    if base != m.name and base in bpy.data.materials:
        merges.append((m, bpy.data.materials[base]))
for old, new in RENAMED.items():
    if old in bpy.data.materials and new in bpy.data.materials:
        merges.append((bpy.data.materials[old], bpy.data.materials[new]))
for old, new in FLAT_TO.items():
    if old in bpy.data.materials and new in bpy.data.materials:
        a, b = flat_colour(bpy.data.materials[old]), base_colour(bpy.data.materials[new])
        if a and b and max(abs(x - y) for x, y in zip(a, b)) <= CLOSE:
            merges.append((bpy.data.materials[old], bpy.data.materials[new]))
        else:
            print(f'MERGE: FLAG {old} (colour {a and tuple(round(x, 3) for x in a)}) is not close to {new} ({b and tuple(round(x, 3) for x in b)}): left alone, users {users(bpy.data.materials[old])}')

# Teal Darkest keeps its own (lighter) colour, single-sided (owner).
changes = 0
for old, new in merges:
    print(f'MERGE: {old.name} -> {new.name} ({len(users(old))} objects)')
    old.user_remap(new)
    bpy.data.materials.remove(old)
    changes += 1
for m in {new for _, new in merges}:
    if not m.use_backface_culling:
        m.use_backface_culling = True
        print(f'MERGE: {m.name} made single-sided')
        changes += 1

for name in SINGLE_SIDED:
    m = bpy.data.materials.get(name)
    if m and not m.use_backface_culling:
        m.use_backface_culling = True
        print(f'MERGE: {name} made single-sided')
        changes += 1

for old, new in NAMES.items():
    if old in bpy.data.materials and new not in bpy.data.materials:
        bpy.data.materials[old].name = new
        print(f'MERGE: {old} renamed {new}')
        changes += 1

# A mesh with the same material in two slots gets one slot.
for me in bpy.data.meshes:
    names = [m.name if m else None for m in me.materials]
    if len(set(names)) == len(names):
        continue
    first = {}
    index = []
    for i, n in enumerate(names):
        first.setdefault(n, len(first))
        index.append(first[n])
    mats = list(dict.fromkeys(me.materials))
    old = [p.material_index for p in me.polygons]
    me.materials.clear()
    for m in mats:
        me.materials.append(m)
    for p, i in zip(me.polygons, old):
        p.material_index = index[i]
    print(f'MERGE: {me.name}: {len(names)} slots -> {len(mats)}')
    changes += 1

skins = [m for m in bpy.data.materials if m.name.lower().startswith('skin')]
for m in skins:
    owners = sorted({(o.parent.name if o.parent else o.name) for o in bpy.data.objects for s in o.material_slots if s.material == m})
    print(f'MERGE: skin {m.name}: colour {tuple(round(x, 3) for x in base_colour(m) or ())}, on {owners}')

print(f'MERGE: {changes} changes')
if SAVE and changes:
    copy = FILE.replace('.blend', f' (before merging materials, {datetime.date.today()}).blend')
    if not os.path.exists(copy):
        shutil.copy2(FILE, copy)
    bpy.ops.wm.save_mainfile()
    print('MERGE: saved; the file as it was:', os.path.basename(copy))
