"""Export the crew placed in the Zamboni: Dr. Kaufman sitting with her animation, and the other
characters in the scene as static poses.

Run with Blender from the command line. The .blend is opened read-only: nothing is saved back.

    blender -b "resources/models/The Zamboni 1.18.blend" --python app/tools/export-ship-crew.py -- \
        --out <raw>/zamboni-crew.glb

then compress (Meshopt) into app/assets, from app/:

    npx gltf-transform meshopt <raw>/zamboni-crew.glb assets/test/zamboni-crew.glb

- Placed as in the file, in the ship's space (same axes and units as export-ship.py), so the game
  puts this file under the ship.
- Dr. Kaufman (`Dr. Kaufman.002`, in the excluded `Crew` collection) is exported skinned, with
  her mug, and her action as one clip. Bones flagged as deforming but carrying no weights are left
  out (see "Before the next export" in doc/architecture/asset-pipeline.md), as in
  export-crew-character.py.
- The other characters in the scene (the visible `Crew.001` collection: both Adam bodies and
  Dr. Ogawa; not Dr. Green's copy, she's the player) have no animation: their posed meshes are
  baked to static meshes.
- Sizes: the crew in the ship file is modelled bigger than in the crew file (Dr. Green's jumpsuit
  copy here stands 1.045 units, her parka in the crew file, the player, 0.828). Each character is
  scaled around their hips (they're seated) to HEIGHTS: their standing height relative to
  Dr. Green, as in the crew file. Adam isn't in the crew file at another size: the same correction
  as Dr. Green's copy.
- Every exported object carries a ``character`` custom property (the character's name).
- Reports every double-sided material ("PERF:"), as the pipeline requires.
"""

import argparse
import sys

import bpy

ANIMATED = {'Dr. Kaufman': ('Dr. Kaufman.002', ['Dr. KaufmanMesh.003', 'Mug.003'])}
STATIC = {
    'Adam (Red)': 'Adam',
    'Adam (Blue)': 'Adam Blue.001',
    'Dr. Ogawa': 'Dr. Ogawa Jumpsuit.001',
}
INCLUDE_COLLECTIONS = ['Crew']

# Dr. Green's standing height in the crew file (the player's model) and her jumpsuit copy's in this
# file (Blender units).
GREEN_CREW_FILE = 0.828
GREEN_SHIP_FILE = 'Dr. Green Jump suit Baked.001'
# Standing height relative to Dr. Green (owner, 2026-10-09: Dr. Kaufman is shorter, Dr. Ogawa about
# the same): from the crew file's parkas (Kaufman 0.650, Ogawa 0.827, Green 0.828). None: the same
# correction as Dr. Green's copy here.
HEIGHTS = {'Dr. Kaufman': 0.650 / 0.828, 'Dr. Ogawa': 1.0, 'Adam (Red)': None, 'Adam (Blue)': None}

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])


def find_layer(layer, name):
    if layer.collection.name == name:
        return layer
    for child in layer.children:
        found = find_layer(child, name)
        if found:
            return found
    return None


for name in INCLUDE_COLLECTIONS:
    layer = find_layer(bpy.context.view_layer.layer_collection, name)
    if layer:
        layer.exclude = False
bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()

from mathutils import Matrix


def standing_height(armature):
    """Height of the armature's skinned meshes in the rest pose (Blender units, world)."""
    armature.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    zs = []
    for part in armature.children:
        if part.type == 'MESH' and any(m.type == 'ARMATURE' for m in part.modifiers):
            ev = part.evaluated_get(dg)
            mesh = ev.to_mesh()
            zs += [(part.matrix_world @ v.co).z for v in mesh.vertices]
            ev.to_mesh_clear()
    armature.data.pose_position = 'POSE'
    bpy.context.view_layer.update()
    return max(zs) - min(zs)


green_correction = GREEN_CREW_FILE / standing_height(bpy.data.objects[GREEN_SHIP_FILE])


def resize(character, armature):
    """The scale for this character, and the matrix that applies it around their hips."""
    ratio = HEIGHTS[character]
    factor = green_correction if ratio is None else GREEN_CREW_FILE * ratio / standing_height(armature)
    hips = armature.matrix_world @ armature.pose.bones['Body'].head
    print(f'{character}: scaled by {factor:.3f} around the hips')
    return Matrix.Translation(hips) @ Matrix.Scale(factor, 4) @ Matrix.Translation(-hips)


selection = []

# Static characters: posed meshes baked in place.
for character, armature_name in STATIC.items():
    armature = bpy.data.objects[armature_name]
    scale = resize(character, armature)
    for part in armature.children_recursive:
        if part.type != 'MESH' or part.hide_render:
            continue
        mesh = bpy.data.meshes.new_from_object(part.evaluated_get(depsgraph), preserve_all_data_layers=True, depsgraph=depsgraph)
        mesh.transform(scale @ part.matrix_world)
        if part.matrix_world.is_negative:
            mesh.flip_normals()
        baked = bpy.data.objects.new(f'{character} - {part.name}', mesh)
        baked['character'] = character
        bpy.context.scene.collection.objects.link(baked)
        selection.append(baked)

# Animated characters: skinned, with their action.
for character, (armature_name, part_names) in ANIMATED.items():
    armature = bpy.data.objects[armature_name]
    parts = [bpy.data.objects[n] for n in part_names]
    weighted = set()
    for ob in parts:
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
            print(f'NOTE: {character}: bone {bone.name!r} is flagged as deforming but has no weights: left out')
    armature.matrix_world = resize(character, armature) @ armature.matrix_world
    bpy.context.view_layer.update()
    action = armature.animation_data.action if armature.animation_data else None
    print(f'{character}: action {action.name if action else None}, frames {tuple(action.frame_range) if action else None}')
    for ob in [armature, *parts]:
        ob['character'] = character
        selection.append(ob)

materials = {s.material for ob in selection for s in ob.material_slots if s.material}
for mat in sorted(materials, key=lambda m: m.name):
    if not mat.use_backface_culling:
        print(f'PERF: material {mat.name!r} is double-sided (backface culling off in Blender)')

bpy.ops.object.select_all(action='DESELECT')
for ob in selection:
    ob.hide_set(False)
    ob.hide_viewport = False
    ob.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=args.out,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_def_bones=True,
    export_apply=True,
    export_yup=True,
    export_extras=True,
)
print('EXPORTED', args.out, [ob.name for ob in selection])
