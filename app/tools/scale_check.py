"""The ship file and the game share one scale (owner, 2026-10-19; plan:
doc/plans/features/scale-normalization.md): 1 Blender unit = 1 m, and the player's Dr. Green is
1.23 tall at armature scale 1. The exports apply no correction factor, so each one checks this
first and stops if it doesn't hold (an animation made on a wrong size wouldn't fit the game).
"""

import sys

import bpy

PLAYER = 'Dr. Green Parka'
HEIGHT = 1.23
TOLERANCE = 0.01


def rest_height(armature):
    """Height of the meshes the armature deforms, in the rest pose (world)."""
    pose = armature.data.pose_position
    armature.data.pose_position = 'REST'
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    zs = []
    for o in bpy.data.objects:
        if o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == armature for m in o.modifiers):
            ev = o.evaluated_get(dg)
            mesh = ev.to_mesh()
            zs += [(o.matrix_world @ v.co).z for v in mesh.vertices]
            ev.to_mesh_clear()
    armature.data.pose_position = pose
    bpy.context.view_layer.update()
    return max(zs) - min(zs) if zs else 0.0


def check_scale():
    """Stops the export (exit 1, a ``SCALE:`` line) unless the player is at scale 1 and 1.23 tall."""
    armature = bpy.data.objects.get(PLAYER)
    if armature is None:
        sys.exit(f'SCALE: no {PLAYER!r} in the file')
    scale = max(abs(s - 1) for s in armature.scale)
    height = rest_height(armature)
    if scale > 1e-3 or abs(height - HEIGHT) > TOLERANCE:
        print(f'SCALE: {PLAYER} has scale {tuple(round(s, 4) for s in armature.scale)} and stands {height:.4f} tall; '
              f'the game needs scale 1 and {HEIGHT} (1 unit = 1 m): fix the file (app/tools/normalize-scale.py), nothing exported')
        sys.exit(1)
    print(f'SCALE: {PLAYER} at scale 1, {height:.3f} tall: ok')
    return height
