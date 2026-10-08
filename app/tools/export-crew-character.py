"""Export one character (an armature and the meshes that belong to it) from a crew .blend to glTF.

Run with Blender from the command line. The .blend is opened read-only: nothing is saved back.

    blender -b "<crew>.blend" --python app/tools/export-crew-character.py -- \
        --armature "Dr. Green Parka" \
        --objects "Dr. Green Mesh.004,Gadget.004,Gadget.005,Backpack.002" \
        --out app/assets/test/green-parka.glb

- Exports mesh + skeleton only, no animations (characters and animations are separate files).
- Modifiers are applied, so mirrored halves are exported.
- Exported in the rest pose with the armature at the origin, whatever pose or position it has in the file.
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

# Export in the rest pose, standing at the origin (the crew file has characters posed and placed
# in a layout). Rotation and scale are kept.
armature.data.pose_position = 'REST'
armature.location = (0.0, 0.0, 0.0)
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
    export_animations=False,
    export_def_bones=True,
    export_apply=True,
    export_yup=True,
)
print('EXPORTED', args.out)
