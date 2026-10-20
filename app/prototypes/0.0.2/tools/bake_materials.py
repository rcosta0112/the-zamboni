"""Bake what the glTF exporter can't follow in a material, for the export scripts (imported, not run).

The exporter understands an image plugged straight into the Principled BSDF (a Mapping node on its
UVs is fine). With other nodes in between (a colour ramp, a mix, a procedural texture) it writes
the image upstream untouched, or a plain value: the map table came out as white paper.

``bake_node_materials`` finds those inputs in the materials of the objects about to be exported,
renders each to an image (Cycles, an Emit bake) and plugs the image straight in. In memory only:
nothing is saved to the .blend. The images are written next to the exported file, to look at.

- Baked: Base Color, Emission Color (with Emission Strength when that's made by nodes too), Alpha
  (into the base colour image's alpha channel, as glTF wants it).
- Only reported: Roughness, Metallic, and anything that depends on the view (camera distance,
  fresnel): there's no one image for those.
- Where: if everything upstream is placed by the UVs, on a square that covers the whole UV space:
  right for every object that uses the material. If something is placed another way (a texture
  node with nothing in Vector uses Generated coordinates: the object's bounding box), on one of
  the objects that use it and reused on the others: the material's ``bakeOn`` custom property
  names it, or else the one with the largest surface in that material.
- Every case is printed as a "NODES:" line.
"""

import os

import bpy
import numpy

SIZE = 1024
BAKED = ['Base Color', 'Emission Color', 'Alpha']
REPORTED = ['Roughness', 'Metallic']
VIEW_DEPENDENT = {'CAMERA', 'LIGHT_PATH', 'FRESNEL', 'LAYER_WEIGHT'}
# Nodes that say where on the surface we are, other than by its UVs.
PLACED_OTHERWISE = {'NEW_GEOMETRY', 'OBJECT_INFO', 'PARTICLE_INFO', 'HAIR_INFO', 'ATTRIBUTE', 'VERTEX_COLOR', 'AMBIENT_OCCLUSION', 'BEVEL'}


def _upstream(socket, found=None):
    """Every link feeding this socket, however far up."""
    found = found if found is not None else []
    for link in socket.links:
        if link in found:
            continue
        found.append(link)
        for i in link.from_node.inputs:
            _upstream(i, found)
    return found


def _by_uvs(vector):
    """A Vector input fed by the UVs, through Mapping nodes or not at all."""
    if not vector.is_linked:
        return True
    link = vector.links[0]
    node = link.from_node
    if node.type == 'MAPPING':
        return _by_uvs(node.inputs['Vector'])
    return node.type == 'UVMAP' or (node.type == 'TEX_COORD' and link.from_socket.name == 'UV')


def _followable(socket):
    """What the exporter reads as it is: nothing, or an image placed by the UVs."""
    if not socket.is_linked:
        return True
    node = socket.links[0].from_node
    return node.type == 'TEX_IMAGE' and node.image is not None and _by_uvs(node.inputs['Vector'])


def _view_dependent(socket):
    return any(link.from_node.type in VIEW_DEPENDENT for link in _upstream(socket))


def _uv_only(socket):
    for link in _upstream(socket):
        node = link.from_node
        if node.type in PLACED_OTHERWISE:
            return False
        if node.type == 'TEX_COORD' and link.from_socket.name != 'UV':
            return False
        # A procedural texture with nothing in Vector uses Generated coordinates; an image, the UVs.
        if node.type.startswith('TEX_') and node.type not in ('TEX_IMAGE', 'TEX_COORD') and not node.inputs['Vector'].is_linked:
            return False
    return True


def _principled(mat):
    if not mat.node_tree:
        return None
    return next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED' and n.outputs[0].is_linked), None)


def _surface(ob, mat, depsgraph):
    """World area of the object's faces in this material."""
    evaluated = ob.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    slots = {i for i, s in enumerate(ob.material_slots) if s.material == mat}
    area = sum(p.area for p in mesh.polygons if p.material_index in slots)
    evaluated.to_mesh_clear()
    return area * abs(ob.matrix_world.to_3x3().determinant()) ** (2 / 3)


def _uv_bounds(mesh, slots):
    if not mesh.uv_layers:
        return None
    uvs = mesh.uv_layers.active.data
    points = [uvs[i].uv for p in mesh.polygons if p.material_index in slots for i in p.loop_indices]
    if not points:
        return None
    return (min(p.x for p in points), min(p.y for p in points), max(p.x for p in points), max(p.y for p in points))


def _square(mat):
    """A square whose UVs are the whole UV space."""
    mesh = bpy.data.meshes.new('bake square')
    mesh.from_pydata([(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)], [], [(0, 1, 2, 3)])
    layer = mesh.uv_layers.new(name='UVMap')
    for loop in mesh.loops:
        layer.data[loop.index].uv = mesh.vertices[loop.vertex_index].co.xy
    mesh.materials.append(mat)
    return bpy.data.objects.new('bake square', mesh)


def _copy_of(ob, mat, depsgraph):
    """The object as it renders, with only this material left to bake."""
    mesh = bpy.data.meshes.new_from_object(ob.evaluated_get(depsgraph), preserve_all_data_layers=True, depsgraph=depsgraph)
    render_uvs = next((layer for layer in mesh.uv_layers if layer.active_render), None)
    if render_uvs:
        mesh.uv_layers.active = render_uvs
    other = bpy.data.materials.new('bake (not this one)')
    slots = {i for i, m in enumerate(mesh.materials) if m == mat}
    for i in range(len(mesh.materials)):
        if i not in slots:
            mesh.materials[i] = other
    # The other faces: off the image, so they don't bake over it.
    if render_uvs:
        for p in mesh.polygons:
            if p.material_index not in slots:
                for i in p.loop_indices:
                    render_uvs.data[i].uv = (-10, -10)
    copy = bpy.data.objects.new('bake copy', mesh)
    copy.matrix_world = ob.matrix_world
    return copy


def _bake(scene, target, mat, color, strength, name, alpha=False, data=False):
    """Render what feeds ``color`` (a socket: its link, or its value) to a new image."""
    tree = mat.node_tree
    output = next(n for n in tree.nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output)
    before = output.inputs['Surface'].links[0].from_socket
    emission = tree.nodes.new('ShaderNodeEmission')
    for socket, source in ((emission.inputs['Color'], color), (emission.inputs['Strength'], strength)):
        if source is None:
            continue
        if source.is_linked:
            tree.links.new(source.links[0].from_socket, socket)
        elif socket.name == 'Strength':
            socket.default_value = source.default_value
        else:
            value = source.default_value
            socket.default_value = (value, value, value, 1) if isinstance(value, float) else tuple(value)
    tree.links.new(emission.outputs[0], output.inputs['Surface'])
    image = bpy.data.images.new(name, SIZE, SIZE, alpha=alpha)
    if data:
        image.colorspace_settings.name = 'Non-Color'
    node = tree.nodes.new('ShaderNodeTexImage')
    node.image = image
    for n in tree.nodes:
        n.select = False
    node.select = True
    tree.nodes.active = node
    with bpy.context.temp_override(scene=scene, view_layer=scene.view_layers[0], active_object=target, object=target, selected_objects=[target]):
        bpy.ops.object.bake(type='EMIT')
    tree.links.new(before, output.inputs['Surface'])
    tree.nodes.remove(emission)
    return node


def bake_node_materials(objects, folder, candidates=None):
    """Bake the node-made inputs of the materials of ``objects``. ``candidates``: the objects to
    bake on when a material isn't placed by its UVs (by default, ``objects``)."""
    candidates = [ob for ob in (candidates or objects) if ob.type == 'MESH']
    os.makedirs(folder, exist_ok=True)
    depsgraph = bpy.context.evaluated_depsgraph_get()

    # A scene of its own: a bake prepares the whole scene it's in, and the ship is big.
    scene = bpy.data.scenes.new('bake')
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 16  # spread inside each texel: smooths the steps of a constant ramp
    scene.cycles.use_denoising = False
    scene.render.bake.margin = 16
    scene.render.bake.use_clear = True

    count = 0
    for mat in sorted({s.material for ob in objects for s in ob.material_slots if s.material}, key=lambda m: m.name):
        shader = _principled(mat)
        if not shader:
            continue
        inputs = shader.inputs
        for name in REPORTED:
            if not _followable(inputs[name]):
                print(f'NODES: material {mat.name!r}: {name} is made by nodes: not baked, exported as a plain value')
        fold_strength = inputs['Emission Strength'].is_linked
        wanted = [name for name in BAKED if not _followable(inputs[name])]
        if fold_strength and 'Emission Color' not in wanted:
            wanted.append('Emission Color')
        if not wanted:
            continue
        sources = [inputs[name] for name in wanted] + ([inputs['Emission Strength']] if fold_strength else [])
        if any(_view_dependent(s) for s in sources):
            print(f'NODES: material {mat.name!r}: {", ".join(wanted)} depend on the view: not baked')
            continue
        # glTF keeps alpha in the base colour's image: bake that one too.
        if 'Alpha' in wanted and 'Base Color' not in wanted:
            wanted.insert(0, 'Base Color')

        if all(_uv_only(s) for s in sources):
            target, where = _square(mat), 'on the whole UV space'
        else:
            users = [ob for ob in candidates if any(s.material == mat for s in ob.material_slots) and ob.data.uv_layers]
            if not users:
                print(f'NODES: material {mat.name!r}: {", ".join(wanted)} made by nodes, and no object with UVs to bake on: not baked')
                continue
            chosen = bpy.data.objects.get(mat.get('bakeOn', ''))
            reference = chosen if chosen in users else max(users, key=lambda ob: _surface(ob, mat, depsgraph))
            target, where = _copy_of(reference, mat, depsgraph), f'on {reference.name!r}'
            if len(users) > 1:
                where += f', reused on {len(users) - 1} more'
            # The others must use the same part of the image.
            slots = {i for i, m in enumerate(target.data.materials) if m == mat}
            baked_area = _uv_bounds(target.data, slots)
            for ob in users:
                area = _uv_bounds(ob.data, {i for i, s in enumerate(ob.material_slots) if s.material == mat})
                if area and baked_area and (area[0] < baked_area[0] - 0.02 or area[1] < baked_area[1] - 0.02 or area[2] > baked_area[2] + 0.02 or area[3] > baked_area[3] + 0.02):
                    print(f'NODES: material {mat.name!r}: {ob.name!r} uses UVs outside what was baked on {reference.name!r}: check it in the game')
        scene.collection.objects.link(target)

        tree = mat.node_tree
        baked = {}
        for name in wanted:
            strength = inputs['Emission Strength'] if name == 'Emission Color' and fold_strength else None
            baked[name] = _bake(scene, target, mat, inputs[name], strength, f'{mat.name} ({name.lower()})', alpha=name == 'Base Color' and 'Alpha' in wanted, data=name == 'Alpha')
        if 'Alpha' in baked:
            colour, alpha = baked['Base Color'].image, baked.pop('Alpha').image
            pixels, values = numpy.empty(SIZE * SIZE * 4, dtype=numpy.float32), numpy.empty(SIZE * SIZE * 4, dtype=numpy.float32)
            colour.pixels.foreach_get(pixels)
            alpha.pixels.foreach_get(values)
            pixels[3::4] = values[0::4]
            colour.pixels.foreach_set(pixels)
            colour.alpha_mode = 'STRAIGHT'
            tree.links.new(baked['Base Color'].outputs['Alpha'], inputs['Alpha'])
        for name, node in baked.items():
            tree.links.new(node.outputs['Color'], inputs[name])
            node.image.filepath_raw = os.path.join(folder, bpy.path.clean_name(node.image.name) + '.png')
            node.image.file_format = 'PNG'
            node.image.save()
        if fold_strength:
            tree.links.remove(inputs['Emission Strength'].links[0])
            inputs['Emission Strength'].default_value = 1
        bpy.data.objects.remove(target)
        count += 1
        print(f'NODES: material {mat.name!r}: {", ".join(wanted)}{" (with its strength)" if fold_strength else ""} made by nodes: baked {where}')
    bpy.data.scenes.remove(scene)
    return count
