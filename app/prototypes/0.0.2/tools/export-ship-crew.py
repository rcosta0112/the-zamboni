"""Export the crew placed in the Zamboni: Dr. Kaufman sitting with her animation, and the other
characters in the scene as static poses.

Normally run by ``npm run export:crew`` (app/prototypes/0.0.2/tools/export.mjs), which does all of the below and
prints what changed. By hand: with Blender from the command line. The .blend is opened read-only:
nothing is saved back.

    blender -b "resources/models/The Zamboni 1.19.blend" --python app/prototypes/0.0.2/tools/export-ship-crew.py -- \
        --out <raw>/zamboni-crew.glb

then cap the textures at 512 px and compress (Meshopt) into public/test/, from app/prototypes/0.0.2/:

    npx gltf-transform resize <raw>/zamboni-crew.glb <raw>/zamboni-crew-512.glb --width 512 --height 512
    npx gltf-transform meshopt <raw>/zamboni-crew-512.glb assets/test/zamboni-crew.glb

- Placed as in the file, in the ship's space (same axes and units as export-ship.py), so the game
  puts this file under the ship.
- Dr. Kaufman (`Dr. Kaufman.002`, in the excluded `Crew` collection) is exported skinned, with
  her mug, and her action as one clip. Bones flagged as deforming but carrying no weights are left
  out (see "Before the next export" in doc/architecture/asset-pipeline.md), as in
  export-crew-character.py.
- The other characters in the scene (the visible `Crew.001` collection: both Adam bodies and
  Dr. Ogawa; not Dr. Green's copy, she's the player) have no animation: their posed meshes are
  baked to static meshes.
- Sizes: exported as placed in the file, which is the game 1:1 since 2026-10-19 (scale_check.py
  stops the export otherwise). Each character's height relative to Dr. Green is checked against
  HEIGHTS and a ``NOTE:`` printed when it's 2% off. (Until then the crew was modelled bigger in the
  ship file than in the crew file, and this script scaled each character around their hips;
  normalize-scale.py put that resize into the file.)
- Every exported object carries a ``character`` custom property (the character's name).
- A ``CREW:`` line per character (hips, facing, action): export.mjs flags a change since the last
  taken export, and stops on a lost action. Movement that makes no sense stops the export
  (``STOP:``, owner 2026-10-20): an animated character with no action, one at the world origin,
  outside the ship, below their deck's floor, or two overlapping.
- Reports every double-sided material ("PERF:"), as the pipeline requires.
- Materials made by nodes the glTF exporter can't follow are baked to images (bake_materials.py)
  and reported ("NODES:").
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bake_materials import bake_node_materials
from export_collections import show, switch_collections
from scale_check import check_scale

ANIMATED = {'Dr. Kaufman': ('Dr. Kaufman.002', ['Dr. KaufmanMesh.003', 'Mug.003'])}
STATIC = {
    'Adam (Red)': 'Adam',
    'Adam (Blue)': 'Adam Blue.001',
    'Dr. Ogawa': 'Dr. Ogawa Jumpsuit.001',
}

# Standing height relative to Dr. Green (owner, 2026-10-09: Dr. Kaufman is shorter, Dr. Ogawa about
# the same): from the crew file's parkas (Kaufman 0.650, Ogawa 0.827, Green 0.828). Checked, not
# corrected: since 2026-10-19 the file has them at these sizes (normalize-scale.py did the resize
# this script used to do), and the crew is exported as placed. None: no reference (Adam).
HEIGHTS = {'Dr. Kaufman': 0.650 / 0.828, 'Dr. Ogawa': 1.0, 'Adam (Red)': None, 'Adam (Blue)': None}

parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])


# The collections as export-collections.json says, whatever the file has: Blender doesn't evaluate
# what's switched off, and the crew came out at the origin, unposed and unmirrored, with `Cockpit`
# switched off (2026-10-19).
switch_collections()
# Hidden in the viewport, a character wouldn't be evaluated (posed, mirrored): shown in memory.
_crew = [bpy.data.objects[n] for n in [*STATIC.values(), *(a for a, _ in ANIMATED.values())] if n in bpy.data.objects]
show([o for a in _crew for o in (a, *a.children_recursive)] + [bpy.data.objects[n] for _, parts in ANIMATED.values() for n in parts if n in bpy.data.objects])
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


green_height = check_scale()


def resize(character, armature):
    """No resize (the identity): the character's height relative to Dr. Green's, checked."""
    ratio = HEIGHTS[character]
    height = standing_height(armature)
    if ratio is None:
        print(f'{character}: {height:.3f} tall')
    else:
        off = height / (green_height * ratio) - 1
        print(f'{character}: {height:.3f} tall, {height / green_height:.3f} of Dr. Green' + ('' if abs(off) < 0.02 else f' (expected {ratio:.3f})'))
        if abs(off) >= 0.02:
            print(f'NOTE: {character} is {off:+.1%} off the height relative to Dr. Green (HEIGHTS)')
    return Matrix.Identity(4)


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
    if not action:
        print(f'STOP: {character} is animated in the game but has no action in the file: exported unposed')
    for ob in [armature, *parts]:
        ob['character'] = character
        selection.append(ob)


# Where each character is (``CREW:`` lines: export.mjs flags a change since the last taken export,
# and stops if an action is lost), and movement that doesn't make sense stops the export (``STOP:``,
# owner 2026-10-20): a character at the origin, outside the ship, below its deck's floor, or two
# characters overlapping.
FLOORS = ['Floor Bottom', 'Floor Top.001']
OVERLAP = 0.3  # m between two characters' hips
BELOW = 0.05  # m below the floor's top


def world_bounds(ob):
    corners = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    return Vector([min(c[i] for c in corners) for i in range(3)]), Vector([max(c[i] for c in corners) for i in range(3)])


def lowest_point(meshes):
    """The lowest point of these meshes as posed (world z)."""
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    low = math.inf
    for ob in meshes:
        ev = ob.evaluated_get(dg)
        mesh = ev.to_mesh()
        low = min([low] + [(ob.matrix_world @ v.co).z for v in mesh.vertices])
        ev.to_mesh_clear()
    return low


hull = bpy.data.objects.get('Hull_Merged')
floor_tops = sorted(world_bounds(bpy.data.objects[n])[1].z for n in FLOORS if n in bpy.data.objects)
places = {}
for character in [*STATIC, *ANIMATED]:
    armature = bpy.data.objects[STATIC.get(character) or ANIMATED[character][0]]
    body = armature.pose.bones.get('Body')
    matrix = armature.matrix_world @ (body.matrix if body else Matrix.Identity(4))
    hips = matrix.translation.copy()
    yaw = math.degrees(matrix.to_euler().z)
    lowest = lowest_point([ob for ob in selection if ob.get('character') == character and ob.type == 'MESH'])
    action = armature.animation_data.action if armature.animation_data else None
    places[character] = hips
    print(f'CREW: {character} at ({hips.x:.2f}, {hips.y:.2f}, {hips.z:.2f}), facing {yaw:.0f}°, action {repr(action.name) if action else "none"}')
    if hips.length < 0.05 or armature.matrix_world.translation.length < 0.01:
        print(f'STOP: {character} is at the world origin (the file\'s pose lost?)')
    if hull:
        low, high = world_bounds(hull)
        if any(not (low[i] <= hips[i] <= high[i]) for i in range(3)):
            print(f'STOP: {character} is outside the ship (hips at {tuple(round(v, 2) for v in hips)})')
    deck = max((t for t in floor_tops if t <= hips.z), default=None)
    if deck is None:
        print(f'STOP: {character} is below the lower deck (hips at z {hips.z:.2f})')
    elif lowest < deck - BELOW:
        print(f'STOP: {character} reaches {deck - lowest:.2f} m below the floor of their deck (z {deck:.2f})')
names = list(places)
for i, a in enumerate(names):
    for b in names[i + 1 :]:
        if (places[a] - places[b]).length < OVERLAP:
            print(f'STOP: {a} and {b} overlap (hips {(places[a] - places[b]).length:.2f} m apart)')

materials = {s.material for ob in selection for s in ob.material_slots if s.material}
for mat in sorted(materials, key=lambda m: m.name):
    if not mat.use_backface_culling:
        print(f'PERF: material {mat.name!r} is double-sided (backface culling off in Blender)')

# Dr. Kaufman's stripes are a wave texture: baked to an image (bake_materials.py).
bake_node_materials(selection, os.path.join(os.path.dirname(os.path.abspath(args.out)), 'baked'))

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
    # Only each character's own action: with none assigned, the exporter took any action whose bones
    # matched (Dr. Kaufman got the ladder clip, 2026-10-19).
    export_animation_mode='ACTIVE_ACTIONS',
    export_def_bones=True,
    export_apply=True,
    export_yup=True,
    export_extras=True,
)
print('EXPORTED', args.out, [ob.name for ob in selection])
