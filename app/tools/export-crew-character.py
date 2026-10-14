"""Export one character (an armature and the meshes that belong to it) from a .blend to glTF.

Normally run by ``npm run export:player`` (app/tools/export.mjs): Dr. Green from the ship file's
``Player`` collection. By hand, with Blender from the command line. The .blend is opened read-only:
nothing is saved back.

    blender -b "resources/models/The Zamboni 1.19.blend" --python app/tools/export-crew-character.py -- \
        --armature "Dr. Green Parka" \
        --objects "Dr. Green Mesh.004,Gadget.004,Gadget.005,Backpack.002,Jetpack" \
        --scale 0.826 --out app/assets/test/green-parka.glb

- Exports mesh + skeleton only, no animations (characters and animations are separate files).
- Modifiers are applied (mirrored halves, subdivision), **keeping shape keys** (the hood's
  ``jetpack``): the glTF exporter drops shape keys when it applies modifiers itself, so each part's
  modifiers other than the Armature are baked here, once per shape key, and the keys are rebuilt
  on the baked mesh. Every key is exported at 0.
- ``--scale``: the armature's scale for the export (the ship file has her at 1.033; the game's
  model and the ship's size are measured from the crew file's 0.826: owner, 2026-10-14).
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
import sys

import bpy

parser = argparse.ArgumentParser()
parser.add_argument('--armature', required=True)
parser.add_argument('--objects', required=True, help='comma-separated object names to export with the armature')
parser.add_argument('--out', required=True)
parser.add_argument('--force-double-sided', action='store_true', help='temporary workaround: export every material double-sided')
parser.add_argument('--scale', type=float, help="the armature's scale for the export (default: as in the file)")
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])

armature = bpy.data.objects[args.armature]
parts = [bpy.data.objects[name.strip()] for name in args.objects.split(',')]

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

# Export in the rest pose, standing at the origin (the crew file has characters posed and placed
# in a layout). Rotation and scale are kept.
armature.data.pose_position = 'REST'
armature.location = (0.0, 0.0, 0.0)
if args.scale:
    armature.scale = (args.scale,) * 3
if armature.animation_data:
    armature.animation_data.action = None
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
    export_animations=False,
    export_def_bones=True,
    export_apply=False,  # applied above, keeping shape keys
    export_morph=True,
    export_morph_normal=True,
    export_yup=True,
)
print('EXPORTED', args.out)
