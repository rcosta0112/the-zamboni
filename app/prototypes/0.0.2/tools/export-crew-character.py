"""Export one character (an armature and the meshes that belong to it) from a .blend to glTF.

Normally run by ``npm run export:player`` (app/tools/export.mjs): Dr. Green from the ship file's
``Player`` collection. By hand, with Blender from the command line. The .blend is opened read-only:
nothing is saved back.

    blender -b "resources/models/The Zamboni 1.21.blend" --python app/tools/export-crew-character.py -- \
        --armature "Dr. Green Parka" \
        --objects "Dr. Green Mesh.004,Gadget.004,Gadget.005,Backpack.002,Jetpack" \
        --out app/assets/test/green-parka.glb

- Exports mesh + skeleton, and no animation but ``--clip`` (the ladder clip since 2026-10-19:
  baked with its IK solved, from the armature it was made on; ``--clip-start`` tags where it
  starts in the ship as ``climb``). Part 1's walk, run, jump and flight come from Part 1's file.
- Modifiers are applied (mirrored halves, subdivision), **keeping shape keys** (the hood's
  ``jetpack``): the glTF exporter drops shape keys when it applies modifiers itself, so each part's
  modifiers other than the Armature are baked here, once per shape key, and the keys are rebuilt
  on the baked mesh. Every key is exported at 0.
- At the file's scale: the file is the game 1:1 since 2026-10-19 (scale_check.py). The player's
  armature must be at scale 1 and 1.23 tall, or nothing is exported. (Until then ``--scale 0.826``
  shrank her from the ship file's 1.033 to the crew file's size.)
- Only the active scene is exported (the ship file's ``Boombox`` scene has a stray ``Tape.003``).
- Exported in the rest pose with the armature at the origin, whatever pose or position it has in the file.
- Backface culling follows Blender. Every double-sided material is reported as a performance cost
  ("PERF:"), to be fixed in Blender. ``--force-double-sided`` is a temporary workaround for thin
  single surfaces that need their backs (the parka's hood, until it's fixed in Blender).
- Bones flagged as deforming but carrying no weights are left out of the exported skeleton
  (e.g. ``Elbow_r``, an IK pointer flagged as deforming: see "Before the next export" in
  doc/architecture/asset-pipeline.md). Each one is reported.
"""

import argparse
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from export_collections import show, switch_collections
from scale_check import check_scale

parser = argparse.ArgumentParser()
parser.add_argument('--armature', required=True)
parser.add_argument('--objects', required=True, help='comma-separated object names to export with the armature')
parser.add_argument('--out', required=True)
parser.add_argument('--force-double-sided', action='store_true', help='temporary workaround: export every material double-sided')
parser.add_argument('--clip', help='an action to export with the model, baked (IK solved into the bones)')
parser.add_argument('--clip-start', help='the armature posed where the clip starts in the ship (its place and facing go into the `climb` tag)')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])

switch_collections()  # as export-collections.json says, whatever the file has
check_scale()

armature = bpy.data.objects[args.armature]
parts = [bpy.data.objects[name.strip()] for name in args.objects.split(',')]
show([armature, *parts] + ([bpy.data.objects[args.clip_start]] if args.clip_start else []), render=True)  # hidden in the file or not

# Which bones actually carry weights, after modifiers (mirror) are applied?
depsgraph = bpy.context.evaluated_depsgraph_get()
weighted = set()
for ob in parts:
    if ob.type != 'MESH':
        continue
    evaluated = ob.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    names = {g.index: g.name for g in evaluated.vertex_groups}
    for v in mesh.vertices:
        for g in v.groups:
            if g.weight > 0 and g.group in names:
                weighted.add(names[g.group])
    evaluated.to_mesh_clear()

for bone in armature.data.bones:
    if bone.use_deform and bone.name not in weighted:
        bone.use_deform = False
        print(f'NOTE: bone {bone.name!r} is flagged as deforming but has no weights: left out of the export')

# Double-sided materials: glTF's doubleSided follows Blender's backface culling setting.
# Double-sided costs performance, so the fix belongs in Blender (geometry with real backs, culling
# on); by default this script keeps Blender's setting and reports every double-sided material.
# --force-double-sided is a temporary workaround for thin single surfaces (e.g. the hood).
materials = {slot.material for ob in parts for slot in ob.material_slots if slot.material}
for mat in sorted(materials, key=lambda m: m.name):
    if args.force_double_sided and mat.use_backface_culling:
        mat.use_backface_culling = False
        print(f'NOTE: material {mat.name!r}: backface culling turned off for this export (--force-double-sided)')
    elif not mat.use_backface_culling:
        print(f'PERF: material {mat.name!r} is double-sided (backface culling off in Blender)')

# The clip (the ladder: owner, 2026-10-19), made on another armature with the same bones: played
# on this one and baked with its constraints on, so the IK the game doesn't have is solved into the
# bones. Only the bones are keyed (her place in the ship comes from --clip-start). Where it starts:
# that armature's place and facing at the first frame, in the ship's space (glTF axes), tagged
# `climb` on the armature.
baked = None
if args.clip:
    clip = bpy.data.actions[args.clip]
    first, last = (int(f) for f in clip.frame_range)
    ad = armature.animation_data or armature.animation_data_create()
    ad.action = clip
    ad.action_slot = clip.slots[0]
    bpy.ops.object.select_all(action='DESELECT')  # in object mode: switch_collections()
    armature.hide_set(False)
    armature.hide_viewport = False
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.nla.bake(frame_start=first, frame_end=last, only_selected=False, visual_keying=True, clear_constraints=False, use_current_action=False, bake_types={'POSE'})
    bpy.ops.object.mode_set(mode='OBJECT')
    baked = ad.action
    baked.name = args.clip + ' (baked)'
    baked.name = args.clip  # glTF names the animation after its action
    if args.clip_start:
        start = bpy.data.objects[args.clip_start]
        bpy.context.scene.frame_set(first)
        m = start.matrix_world
        at, facing = m.translation, (m.to_3x3() @ Vector((0.0, -1.0, 0.0))).normalized()
        armature['climb'] = {
            'clip': args.clip,
            'start': [at.x, at.z, -at.y],
            'facing': [facing.x, facing.z, -facing.y],
        }
    print(f'CLIP: {args.clip!r}: frames {first}-{last} at {bpy.context.scene.render.fps} fps, baked' + (f'; starts at {tuple(round(v, 3) for v in armature["climb"]["start"])}' if args.clip_start else ''))

# Export in the rest pose, standing at the origin (the crew file has characters posed and placed
# in a layout). Rotation and scale are kept. With a clip, the pose follows it (the mesh and the
# skin are written in the rest pose all the same).
armature.data.pose_position = 'POSE' if baked else 'REST'
armature.location = (0.0, 0.0, 0.0)
if armature.animation_data:
    armature.animation_data.action = baked
    if baked:
        armature.animation_data.action_slot = baked.slots[0]
for pb in armature.pose.bones:
    pb.location = (0.0, 0.0, 0.0)
    pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
    pb.rotation_euler = (0.0, 0.0, 0.0)
    pb.scale = (1.0, 1.0, 1.0)
    for c in pb.constraints:  # IK etc. would pull bones out of the rest pose
        c.mute = True
bpy.context.view_layer.update()


def bake_modifiers(ob):
    """Apply every modifier but the Armature, keeping shape keys (in memory only)."""
    others = [m for m in ob.modifiers if m.type != 'ARMATURE']
    if not others:
        return
    armature_mods = [m for m in ob.modifiers if m.type == 'ARMATURE']
    for m in armature_mods:
        m.show_viewport = False  # rest pose anyway: bake the others only

    def evaluated(collect):
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get()
        if collect:
            ev = ob.evaluated_get(dg)
            mesh = ev.to_mesh()
            co = [v.co.copy() for v in mesh.vertices]
            ev.to_mesh_clear()
            return co
        return bpy.data.meshes.new_from_object(ob.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)

    shapes = {}
    keys = ob.data.shape_keys
    if keys:
        for k in keys.key_blocks:
            k.value = 0.0
        for k in keys.key_blocks:
            if k == keys.reference_key:
                continue
            k.value = 1.0
            shapes[k.name] = evaluated(True)
            k.value = 0.0
    baked = evaluated(False)
    if keys:
        ob.shape_key_clear()
    ob.data = baked
    for m in others:
        ob.modifiers.remove(m)
    for m in armature_mods:
        m.show_viewport = True
    if shapes:
        ob.shape_key_add(name='Basis', from_mix=False)
        for name, co in shapes.items():
            if len(co) != len(baked.vertices):
                sys.exit(f'ERROR: {ob.name}: shape key {name!r} changes the vertex count after modifiers ({len(co)} vs {len(baked.vertices)})')
            key = ob.shape_key_add(name=name, from_mix=False)
            for v, c in zip(key.data, co):
                v.co = c
            key.value = 0.0
            print(f'SHAPE KEY: {ob.name}: {name!r}')


for ob in parts:
    if ob.type == 'MESH':
        bake_modifiers(ob)
bpy.context.view_layer.update()

# Export only the armature and its parts.
bpy.ops.object.select_all(action='DESELECT')
for ob in [armature, *parts]:
    ob.hide_set(False)
    ob.hide_viewport = False
    ob.select_set(True)
bpy.context.view_layer.objects.active = armature

bpy.ops.export_scene.gltf(
    filepath=args.out,
    export_format='GLB',
    use_selection=True,
    use_active_scene=True,
    export_animations=baked is not None,
    export_animation_mode='ACTIVE_ACTIONS',  # only the clip: not every action whose bones match
    export_force_sampling=True,
    export_extras=True,  # the `climb` tag
    export_def_bones=True,
    export_apply=False,  # applied above, keeping shape keys
    export_morph=True,
    export_morph_normal=True,
    export_yup=True,
)
print('EXPORTED', args.out)
