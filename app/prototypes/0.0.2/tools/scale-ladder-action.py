"""The ladder clip made 1.25 times as big in its moves (owner, 2026-10-19): a record script.

    blender -b --python app/prototypes/0.0.2/tools/scale-ladder-action.py -- --src "<1.21.blend>" --out "<file.blend>"

`Dr. Green - Ladder` was animated with her at the ship file's old size (1.033), 1.25 times as big
next to the ladder as the game shows her (doc/plans/features/scale-normalization.md). In 1.21 the
clip rises 1.81, and the decks are 2.26 apart. This copies the action to `Dr. Green - Ladder x1.25`
and, in the copy, moves every bone location key (and its handles) 1.25 times as far from its value
at the first frame: she starts as posed, and everything she does goes 1.25 times as far (the rise,
the reach to the ladder, the step off beside the opening). Same keys, same frames, rotations and
the object's keys untouched. The copy is assigned to `Dr. Green Jump suit`; the original keeps a
fake user. Limbs keep their length: where a target goes out of reach, the IK chain straightens.

Run again on a file that has the copy, it reports 0 changes and writes nothing.
"""

import argparse
import sys

import bpy
from bpy_extras import anim_utils

ARMATURE = 'Dr. Green Jump suit'
SOURCE = 'Dr. Green - Ladder'
COPY = 'Dr. Green - Ladder x1.25'
FACTOR = 2.26 / 1.81

parser = argparse.ArgumentParser()
parser.add_argument('--src', required=True)
parser.add_argument('--out', required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1 :])

bpy.ops.wm.open_mainfile(filepath=args.src)  # with its UI, so the owner's layout is kept

if COPY in bpy.data.actions:
    print(f'scale-ladder-action: {COPY!r} is already in the file: 0 changes, nothing written')
    sys.exit(0)

ob = bpy.data.objects[ARMATURE]
source = bpy.data.actions[SOURCE]
start = source.frame_range[0]
sc = bpy.context.scene


def sample(frames):
    """World positions of the bones' heads at these frames."""
    out = {}
    for f in frames:
        sc.frame_set(int(f))
        out[f] = {pb.name: (ob.matrix_world @ pb.head).copy() for pb in ob.pose.bones}
    return out


end = source.frame_range[1]
before = sample([start, end])

copy = source.copy()
copy.name = COPY
source.use_fake_user = True
slot = ob.animation_data.action_slot
ob.animation_data.action = copy
ob.animation_data.action_slot = copy.slots[slot.identifier] if slot and slot.identifier in copy.slots else copy.slots[0]
bag = anim_utils.action_get_channelbag_for_slot(copy, ob.animation_data.action_slot)

scaled = []
for fc in bag.fcurves:
    if not (fc.data_path.startswith('pose.bones[') and fc.data_path.endswith('.location')):
        continue
    first = fc.evaluate(start)
    for k in fc.keyframe_points:
        for point in (k.co, k.handle_left, k.handle_right):
            point.y = first + (point.y - first) * FACTOR
    fc.update()
    scaled.append(f'{fc.data_path.split(chr(34))[1]}[{fc.array_index}]')
print(f'CHANGE: {COPY!r}: {len(scaled)} bone location curves x {FACTOR:.4f} from frame {start:g}: {", ".join(scaled)}')

after = sample([start, end])
moved = max((after[start][n] - before[start][n]).length for n in before[start])
rise = after[end]['Body'].z - after[start]['Body'].z
was = before[end]['Body'].z - before[start]['Body'].z
print(f'CHECK: frame {start:g} moved by {moved:.6f}; Body rises {was:.3f} -> {rise:.3f}; ends at {tuple(round(v, 3) for v in after[end]["Body"])}')
for name in ('Hand_l.IK', 'Hand_r.IK', 'Foot_l', 'Foot_r'):
    if name in after[end]:
        print(f'CHECK: {name} at the last frame {tuple(round(v, 3) for v in before[end][name])} -> {tuple(round(v, 3) for v in after[end][name])}')
if moved > 1e-4:
    sys.exit('scale-ladder-action: the first frame moved: nothing written')

sc.frame_set(int(start))
bpy.ops.wm.save_as_mainfile(filepath=args.out)
print('SAVED', args.out)
