"""Export Part 1's Dr. Green (Big Moon Tiny Moon) to glTF for prototype testing.

Run with Blender from the command line (nothing is saved back to the source):

    blender -b --python app/tools/export-part1-character.py -- <input.fbx> <output.glb>

The FBX carries each animation twice (``Dr. Green|Walking`` and ``Dr. Green|Dr. Green|Walking``).
This keeps one copy of each, renamed to lowercase (standing, walking, running, jumping,
jumping_2, flying), and exports mesh + skeleton + animations as one .glb.
"""

import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1 :]
src, dst = args[0], args[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src)

armature = next(ob for ob in bpy.data.objects if ob.type == 'ARMATURE')

# One copy per animation: prefer the shorter "Dr. Green|Name" form, fall back to the doubled one.
chosen = {}
for action in bpy.data.actions:
    clip = action.name.split('|')[-1]
    key = clip.lower().replace(' ', '_')
    if key not in chosen or action.name.count('|') < chosen[key].name.count('|'):
        chosen[key] = action

for action in list(bpy.data.actions):
    if action not in chosen.values():
        bpy.data.actions.remove(action)
for key, action in chosen.items():
    action.name = key
    action.use_fake_user = True

# Keep every action exportable on the armature.
if armature.animation_data is None:
    armature.animation_data_create()
armature.animation_data.action = None
for key, action in chosen.items():
    track = armature.animation_data.nla_tracks.new()
    track.name = key
    track.strips.new(key, int(action.frame_range[0]), action)

bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format='GLB',
    export_animations=True,
    export_animation_mode='NLA_TRACKS',
    export_def_bones=True,
    export_apply=True,
    export_yup=True,
)

print('EXPORTED', dst, 'actions:', sorted(chosen))
