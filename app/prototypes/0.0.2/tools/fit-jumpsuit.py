"""The jumpsuit on the parka's skeleton (item 72, owner 2026-10-21; plan: doc/plans/features/locker-outfit.md).

In The Zamboni 1.22.blend the jumpsuit's `Leg_l` and `Leg_r` sit 1.4 cm from the parka's. The game
drives both outfits with one skeleton, so this moves the two bones' rest positions (and roll) onto the parka's.
The mesh doesn't move at rest (the armature modifier binds at the rest pose). It also drops the rack's
tags from the jumpsuit's jetpack (a copy of `Jetpack 1`, with its `id`). Run again, it reports 0 changes.

    blender -b "<file>.blend" --python app/prototypes/0.0.2/tools/fit-jumpsuit.py [-- --save]
"""

import sys

import bpy

PARKA = 'Dr. Green Parka'
JUMPSUIT = 'Dr. Green Jump suit'
BONES = ('Leg_l', 'Leg_r')
RACK_TAGS = ('interact', 'device', 'id', 'kind')
EPS = 1e-5


def rest_vertices(armature):
    armature.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    out = []
    for o in bpy.data.objects:
        if o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == armature for m in o.modifiers):
            ev = o.evaluated_get(dg)
            mesh = ev.to_mesh()
            out += [(o.matrix_world @ v.co).copy() for v in mesh.vertices]
            ev.to_mesh_clear()
    armature.data.pose_position = 'POSE'
    return out


parka = bpy.data.objects[PARKA]
suit = bpy.data.objects[JUMPSUIT]
changes = 0
before = rest_vertices(suit)

target = {b: (parka.data.bones[b].head_local.copy(), parka.data.bones[b].tail_local.copy()) for b in BONES}
moving = [b for b in BONES if max(abs(x - y) for r1, r2 in zip(suit.data.bones[b].matrix_local, parka.data.bones[b].matrix_local)
                                  for x, y in zip(r1, r2)) > EPS or (suit.data.bones[b].tail_local - target[b][1]).length > EPS]
if moving:
    others = {b.name: (b.head_local.copy(), b.tail_local.copy()) for b in suit.data.bones if b.name not in BONES}
    bpy.context.view_layer.objects.active = suit
    bpy.ops.object.mode_set(mode='EDIT')
    for b in moving:
        e = suit.data.edit_bones[b]
        e.use_connect = False
        e.matrix = parka.data.bones[b].matrix_local  # head, direction and roll: one skeleton, the same rest matrices
        e.length = parka.data.bones[b].length
        print(f'FIT: {b} moved onto the parka\'s')
        changes += 1
    bpy.ops.object.mode_set(mode='OBJECT')
    for name, (h, t) in others.items():
        b = suit.data.bones[name]
        if max((b.head_local - h).length, (b.tail_local - t).length) > EPS:
            print(f'FIT: WARNING {name} moved too')

after = rest_vertices(suit)
worst = max((a - b).length for a, b in zip(before, after)) if before else 0
print(f'FIT: the mesh at rest moved by {worst:.6f} at most ({len(after)} vertices)')

for o in suit.children_recursive:
    dropped = [k for k in RACK_TAGS if k in o.keys()]
    for k in dropped:
        del o[k]
    if dropped:
        print(f'FIT: {o.name}: the rack\'s tags dropped ({", ".join(dropped)})')
        changes += 1

print(f'FIT: {changes} changes')
if '--save' in sys.argv and changes:
    bpy.ops.wm.save_mainfile()
    print('FIT: saved')
