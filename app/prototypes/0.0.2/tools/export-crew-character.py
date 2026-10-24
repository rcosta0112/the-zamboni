"""Export one character (an armature and the meshes that belong to it) from a .blend to glTF.

Normally run by ``npm run export:player`` (app/prototypes/0.0.2/tools/export.mjs): Dr. Green from the ship file's
``Player`` collection. By hand, with Blender from the command line. The .blend is opened read-only:
nothing is saved back.

    blender -b "resources/models/The Zamboni 1.21.blend" --python app/prototypes/0.0.2/tools/export-crew-character.py -- \
        --armature "Dr. Green Parka" \
        --objects "Dr. Green Mesh.004,Gadget.004,Gadget.005,Backpack.002,Jetpack" \
        --out app/prototypes/0.0.2/public/test/green-parka.glb

- Exports mesh + skeleton, and no animation but ``--clip`` (the ladder clip since 2026-10-19:
  baked with its IK solved, from the armature it was made on; ``--clip-start`` tags where it
  starts in the ship as ``climb``) and ``--loop`` (her piloting since 2026-10-24: baked the same
  way over ``--loop-frames``, each curve's end eased onto its start so it loops, a key every
  ``--loop-step`` frames kept (export.mjs's ``thin`` step drops the frames the exporter samples in
  between); ``--loop-at`` tags where it's played in the ship as ``--loop-tag``). Part 1's walk,
  run, jump and flight come from Part 1's file.
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
parser.add_argument('--loop', help='a looping action to export with the model, baked like --clip')
parser.add_argument('--loop-frames', default='0-200', help="the loop's frames: first-last, the last the same pose as the first")
parser.add_argument('--loop-step', type=int, default=4, help='a key every this many frames')
parser.add_argument('--loop-at', help='the armature posed where the loop is played in the ship (its place and facing tagged)')
parser.add_argument('--loop-tag', default='pilot', help='the tag on the armature for --loop-at')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])

switch_collections()  # as export-collections.json says, whatever the file has
check_scale()

armature = bpy.data.objects.get(args.armature)
if armature is None:
    sys.exit(f'STOP: no armature {args.armature!r} in the file: nothing exported')
# Another outfit's armature (the jumpsuit) goes onto the player's skeleton in the game: same scale.
if max(abs(s - 1) for s in armature.scale) > 1e-3:
    sys.exit(f'SCALE: {args.armature!r} has scale {tuple(round(s, 4) for s in armature.scale)}; the game needs 1: nothing exported')
# Anything listed for her that's missing stops the export (``STOP:``; export.mjs keeps the files
# waiting): the game would get her without it.
parts = []
for name in (n.strip() for n in args.objects.split(',')):
    if name in bpy.data.objects:
        parts.append(bpy.data.objects[name])
    else:
        print(f'STOP: {name!r} is listed for {args.armature!r} but not in the file (renamed or deleted?): exported without it')
for option, name in (('--clip', args.clip), ('--clip-start', args.clip_start)):
    if name and name not in (bpy.data.actions if option == '--clip' else bpy.data.objects):
        print(f'STOP: {option} {name!r} is not in the file (renamed or deleted?): exported without the clip')
        args.clip = args.clip_start = None
for option, name in (('--loop', args.loop), ('--loop-at', args.loop_at)):
    if name and name not in (bpy.data.actions if option == '--loop' else bpy.data.objects):
        print(f'STOP: {option} {name!r} is not in the file (renamed or deleted?): exported without the loop')
        args.loop = args.loop_at = None
show([armature, *parts] + [bpy.data.objects[n] for n in (args.clip_start, args.loop_at) if n], render=True)  # hidden in the file or not

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
def bake(name, first, last):
    """The action played on the armature, baked with its constraints on: a new action, named as it."""
    action = bpy.data.actions[name]
    ad = armature.animation_data or armature.animation_data_create()
    ad.action = action
    # The slot an object playing it uses (green_piloting has a second slot, its curves without the
    # noise, 2026-10-24), else the first.
    players = [ob for ob in bpy.data.objects
               if ob is not armature and ob.animation_data and ob.animation_data.action == action and ob.animation_data.action_slot]
    ad.action_slot = players[0].animation_data.action_slot if players else action.slots[0]
    # Its pose first: what the action doesn't key stays as the object playing it has it (green_piloting
    # doesn't key Body's location; the copy's pose raises her 5 cm into the seat, 2026-10-24).
    if players:
        for pb in armature.pose.bones:
            src = players[0].pose.bones.get(pb.name)
            if src:
                pb.rotation_mode = src.rotation_mode
                pb.location, pb.rotation_quaternion, pb.rotation_euler, pb.scale = src.location, src.rotation_quaternion, src.rotation_euler, src.scale
    bpy.ops.object.select_all(action='DESELECT')  # in object mode: switch_collections()
    armature.hide_set(False)
    armature.hide_viewport = False
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.nla.bake(frame_start=first, frame_end=last, only_selected=False, visual_keying=True, clear_constraints=False, use_current_action=False, bake_types={'POSE'})
    bpy.ops.object.mode_set(mode='OBJECT')
    result = ad.action
    action.name = name + ' (source)'  # or the baked one would be named `<name>.001`
    result.name = name  # the NLA track (below) is named as this, and glTF names the animation after it
    ad.action = None
    return result


def place_tag(ob, frame):
    """An armature's place and facing at a frame, in the ship's space (glTF axes)."""
    bpy.context.scene.frame_set(frame)
    m = ob.matrix_world
    at, facing = m.translation, (m.to_3x3() @ Vector((0.0, -1.0, 0.0))).normalized()
    return [at.x, at.z, -at.y], [facing.x, facing.z, -facing.y]


def fcurves_of(action):
    return [f for layer in action.layers for strip in layer.strips for bag in strip.channelbags for f in bag.fcurves]


def make_loop(action, first, last, step, ease=30):
    """Each curve's last `ease` frames bent onto its first frame's value (the seam closed, whatever
    the noise does), then a key every `step` frames kept, smooth between. Returns the seam's
    largest jump before."""
    worst = 0.0
    for f in fcurves_of(action):
        jump = f.evaluate(last) - f.evaluate(first)
        worst = max(worst, abs(jump))
        for k in f.keyframe_points:
            t = (k.co.x - (last - ease)) / ease
            if t > 0:
                s = t * t * (3 - 2 * t)
                k.co.y -= jump * s
        for k in [k for k in f.keyframe_points if round(k.co.x - first) % step][::-1]:
            f.keyframe_points.remove(k, fast=True)
        for k in f.keyframe_points:
            k.interpolation = 'BEZIER'
            k.handle_left_type = k.handle_right_type = 'AUTO_CLAMPED'
        f.update()
    return worst


baked = None
tracks = []
if args.clip:
    clip = bpy.data.actions[args.clip]
    first, last = (int(f) for f in clip.frame_range)
    baked = bake(args.clip, first, last)
    tracks.append(baked)
    if args.clip_start:
        start, facing = place_tag(bpy.data.objects[args.clip_start], first)
        armature['climb'] = {'clip': args.clip, 'start': start, 'facing': facing}
    print(f'CLIP: {args.clip!r}: frames {first}-{last} at {bpy.context.scene.render.fps} fps, baked' + (f'; starts at {tuple(round(v, 3) for v in armature["climb"]["start"])}' if args.clip_start else ''))
if args.loop:
    first, last = (int(f) for f in args.loop_frames.split('-'))
    looped = bake(args.loop, first, last)
    seam = make_loop(looped, first, last, args.loop_step)
    after = max(abs(f.evaluate(last) - f.evaluate(first)) for f in fcurves_of(looped))
    tracks.append(looped)
    baked = baked or looped
    if args.loop_at:
        at, facing = place_tag(bpy.data.objects[args.loop_at], first)
        armature[args.loop_tag] = {'clip': args.loop, 'at': at, 'facing': facing}
    keys = max(len(f.keyframe_points) for f in fcurves_of(looped))
    print(f'LOOP: {args.loop!r}: frames {first}-{last} at {bpy.context.scene.render.fps} fps, baked, {keys} keys a curve; the seam\'s largest jump {seam:.4f} -> {after:.6f}' + (f'; {args.loop_tag} at {tuple(round(v, 3) for v in at)}' if args.loop_at else ''))
# Each clip an NLA track of its own: the exporter writes one animation per track, named after it.
if tracks:
    ad = armature.animation_data
    for action in tracks:
        track = ad.nla_tracks.new()
        track.name = action.name
        strip = track.strips.new(action.name, int(action.frame_range[0]), action)
        strip.action_slot = action.slots[0]

# Export in the rest pose, standing at the origin (the crew file has characters posed and placed
# in a layout). Rotation and scale are kept. With a clip, the pose follows it (the mesh and the
# skin are written in the rest pose all the same).
armature.data.pose_position = 'POSE' if baked else 'REST'
armature.location = (0.0, 0.0, 0.0)
if armature.animation_data:
    armature.animation_data.action = None  # the clips are on NLA tracks
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
    export_animation_mode='NLA_TRACKS',  # only the clips: not every action whose bones match
    export_force_sampling=True,
    export_extras=True,  # the `climb` and loop tags
    export_def_bones=True,
    export_apply=False,  # applied above, keeping shape keys
    export_morph=True,
    export_morph_normal=True,
    export_yup=True,
)
print('EXPORTED', args.out)
