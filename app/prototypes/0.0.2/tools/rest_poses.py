"""The moving parts' rest poses (robust exports, item 48; plan: doc/plans/features/robust-exports.md).

The game takes a door's pose in the exported file as closed. Posing a door in Blender for an
animation (the trapdoor turned out of the way for the ladder, 2026-10-19) used to reach the game:
it then opened the wrong way. Now ``rest-poses.json`` records each moving part's rest pose (its
local transform: location, rotation, scale, by object name), and the ship export puts every moving
part in it, in memory, whatever the file has. The moving parts are the objects tagged ``doorAxis``,
``doorSlide`` or ``moving``; what hangs on them moves with them and isn't recorded.

Imported by the exports (``POSE:`` lines for what differs):

- ``start_frame()``: the scene at its start frame, whatever frame the file was saved on (all three
  exports, through ``export_collections.switch_collections``);
- ``drop_actions(objects)``: the actions (and NLA tracks, drivers) on the moving parts dropped:
  animation can't pose a door in the export;
- ``put_at_rest(objects)``: each moving part in its recorded pose; a part with no record, and a
  record with no part left in the file, flagged.

Run on its own (``npm run rest-poses`` in app/, which runs it in Blender on the working file;
nothing is saved to the .blend):

    npm run rest-poses                        compare the file with the record (POSE: lines);
                                              with no record yet, write one from the file
    npm run rest-poses -- --accept "Hatch.002"  take the file's pose of that part as its rest pose
                                              (the owner moved the door on purpose); a new part
                                              is added, a record with no part removed. Repeatable.
"""

import argparse
import json
import math
import os
import sys

import bpy
from mathutils import Euler, Quaternion

RECORD = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rest-poses.json')
# Below these a pose counts as the same (m, radians, scale): the record is rounded to 6 decimals.
MOVED = 1e-5
TURNED = 1e-4
SCALED = 1e-5


def is_moving(ob):
    return 'doorAxis' in ob or 'doorSlide' in ob or bool(ob.get('moving'))


def pose_of(ob):
    """The object's local transform, as the record keeps it."""
    mode = ob.rotation_mode
    if mode == 'QUATERNION':
        rotation = list(ob.rotation_quaternion)
    elif mode == 'AXIS_ANGLE':
        rotation = list(ob.rotation_axis_angle)
    else:
        rotation = list(ob.rotation_euler)
    return {
        'location': [round(v, 6) for v in ob.location],
        'rotationMode': mode,
        'rotation': [round(v, 6) for v in rotation],
        'scale': [round(v, 6) for v in ob.scale],
    }


def _quaternion(pose):
    mode, r = pose['rotationMode'], pose['rotation']
    if mode == 'QUATERNION':
        return Quaternion(r).normalized()
    if mode == 'AXIS_ANGLE':
        return Quaternion(r[1:], r[0])
    return Euler(r, mode).to_quaternion()


def difference(ob, rest):
    """How the object's pose differs from its rest pose, in words; '' when it doesn't."""
    now = pose_of(ob)
    words = []
    moved = math.dist(now['location'], rest['location'])
    if moved > MOVED:
        words.append(f'moved {moved:.3f} m')
    turned = _quaternion(now).rotation_difference(_quaternion(rest)).angle
    if turned > TURNED:
        words.append(f'turned {math.degrees(turned):.1f}°')
    if max(abs(a - b) for a, b in zip(now['scale'], rest['scale'])) > SCALED:
        words.append(f'scaled {tuple(now["scale"])} (rest {tuple(rest["scale"])})')
    return ', '.join(words)


def set_pose(ob, pose):
    ob.location = pose['location']
    ob.rotation_mode = pose['rotationMode']
    if pose['rotationMode'] == 'QUATERNION':
        ob.rotation_quaternion = pose['rotation']
    elif pose['rotationMode'] == 'AXIS_ANGLE':
        ob.rotation_axis_angle = pose['rotation']
    else:
        ob.rotation_euler = pose['rotation']
    ob.scale = pose['scale']


def load():
    if not os.path.exists(RECORD):
        return None
    with open(RECORD, encoding='utf-8') as f:
        return {k: v for k, v in json.load(f).items() if not k.startswith('_')}


def save(record):
    out = {'_note': 'Each moving part\'s rest pose (local transform), by object name: the ship export puts them in it. '
                    'Written by tools/rest_poses.py (npm run rest-poses -- --accept <name>); see its header.'}
    out.update(sorted(record.items()))
    # One part per line: a door moved on purpose is a one-line change in git.
    lines = [f'  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}' for k, v in out.items()]
    with open(RECORD, 'w', encoding='utf-8', newline='\n') as f:
        f.write('{\n' + ',\n'.join(lines) + '\n}\n')


def start_frame():
    """The scene at its start frame: the frame the file was left on doesn't pose the export."""
    scene = bpy.context.scene
    if scene.frame_current != scene.frame_start:
        print(f'POSE: the file is on frame {scene.frame_current}: exported at the scene\'s start frame, {scene.frame_start}')
    scene.frame_set(scene.frame_start)


def drop_actions(objects):
    """The moving parts' animation dropped (in memory): the ramp's single keyframe once held it open at every frame."""
    for ob in objects:
        ad = ob.animation_data
        if ad and (ad.action or len(ad.nla_tracks) or len(ad.drivers)):
            what = f'the action {ad.action.name!r}' if ad.action else 'NLA tracks or drivers'
            print(f'POSE: {ob.name!r} has {what}: dropped for the export (moving parts are posed by the game)')
            ob.animation_data_clear()


def put_at_rest(objects, scene_objects):
    """Each moving part in its recorded rest pose, in memory. ``scene_objects``: what's in the scene,
    for flagging records with no part left."""
    record = load()
    if record is None:
        print(f'POSE: no record of the rest poses ({os.path.basename(RECORD)}): moving parts exported as in the file; write one: npm run rest-poses')
        return
    for ob in objects:
        rest = record.get(ob.name)
        if rest is None:
            print(f'POSE: {ob.name!r} moves but has no rest pose recorded (new or renamed?): exported as in the file; '
                  f'if that\'s its rest pose: npm run rest-poses -- --accept "{ob.name}"')
            continue
        moved = difference(ob, rest)
        if moved:
            print(f'POSE: {ob.name!r} {moved} from its rest pose: exported at rest')
            set_pose(ob, rest)
    names = {ob.name for ob in scene_objects if is_moving(ob)}
    for name in sorted(set(record) - names):
        print(f'POSE: rest pose recorded for {name!r}, which isn\'t a moving part in the file (renamed, deleted, untagged?); '
              f'to drop the record: npm run rest-poses -- --accept "{name}"')
    bpy.context.view_layer.update()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--accept', action='append', default=[], metavar='NAME')
    argv = sys.argv[sys.argv.index('--') + 1 :] if '--' in sys.argv else []
    args = parser.parse_args(argv)

    scene_objects = list(bpy.context.scene.objects)
    moving = {ob.name: ob for ob in scene_objects if is_moving(ob)}
    record = load()
    if record is None:
        save({name: pose_of(ob) for name, ob in moving.items()})
        print(f'REST POSES: recorded {len(moving)} moving parts from the file: {", ".join(sorted(moving))}')
        return
    for name in args.accept:
        if name in moving:
            print(f'REST POSES: {name!r}: {"new record" if name not in record else "rest pose taken from the file"}')
            record[name] = pose_of(moving[name])
        elif name in record:
            print(f'REST POSES: {name!r} isn\'t a moving part in the file: record dropped')
            del record[name]
        else:
            sys.exit(f'REST POSES: {name!r} is neither a moving part in the file nor in the record: nothing done')
    if args.accept:
        save(record)
    same = 0
    for name, ob in sorted(moving.items()):
        if name not in record:
            print(f'POSE: {name!r} moves but has no rest pose recorded: npm run rest-poses -- --accept "{name}"')
        elif difference(ob, record[name]):
            print(f'POSE: {name!r} {difference(ob, record[name])} from its rest pose (the export puts it back)')
        else:
            same += 1
    for name in sorted(set(record) - set(moving)):
        print(f'POSE: rest pose recorded for {name!r}, which isn\'t a moving part in the file: npm run rest-poses -- --accept "{name}"')
    print(f'REST POSES: {same} of {len(moving)} moving parts at their rest pose in the file')


if __name__ == '__main__':
    main()
