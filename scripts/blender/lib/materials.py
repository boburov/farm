"""Procedural node materials for baking. Every material has an active Image Texture node set by bake.py."""
import bpy

def new_material(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); out.location = (600, 0)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled'); bsdf.location = (300, 0)
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return m, nt, bsdf, out

def color_attribute(nt, name='Col'):
    n = nt.nodes.new('ShaderNodeVertexColor'); n.layer_name = name; return n

def noise(nt, scale=20.0, detail=6.0, roughness=0.5, distortion=0.0):
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail
    n.inputs['Roughness'].default_value = roughness; n.inputs['Distortion'].default_value = distortion; return n

def voronoi(nt, scale=80.0, feature='F1'):
    n = nt.nodes.new('ShaderNodeTexVoronoi'); n.inputs['Scale'].default_value = scale; n.feature = feature; return n

def ramp(nt, stops):
    n = nt.nodes.new('ShaderNodeValToRGB'); cr = n.color_ramp
    while len(cr.elements) > 1: cr.elements.remove(cr.elements[-1])
    cr.elements[0].position = stops[0][0]; cr.elements[0].color = stops[0][1]
    for pos, col in stops[1:]:
        e = cr.elements.new(pos); e.color = col
    return n

def math(nt, op, a=None, b=None):
    n = nt.nodes.new('ShaderNodeMath'); n.operation = op
    if a is not None: n.inputs[0].default_value = a
    if b is not None: n.inputs[1].default_value = b
    return n

def mix_rgb(nt, fac=0.5, blend='MIX'):
    n = nt.nodes.new('ShaderNodeMix'); n.data_type = 'RGBA'; n.blend_type = blend; n.inputs['Factor'].default_value = fac; return n

def bump(nt, strength=0.3, distance=0.002):
    n = nt.nodes.new('ShaderNodeBump'); n.inputs['Strength'].default_value = strength; n.inputs['Distance'].default_value = distance; return n

def route_to_emission(m, socket_link):
    """Temporarily drive the output with an Emission of the given link (for colour/roughness bakes). Returns a restore fn."""
    nt = m.node_tree; out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    prev = out.inputs['Surface'].links[0].from_socket if out.inputs['Surface'].links else None
    em = nt.nodes.new('ShaderNodeEmission'); em.name = '__bake_emit'
    nt.links.new(socket_link, em.inputs['Color']); nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    def restore():
        nt.nodes.remove(em)
        if prev is not None: nt.links.new(prev, out.inputs['Surface'])
    return restore

def bsdf_input_link(m, name):
    """The link feeding a Principled input (or a constant RGB node with its default value)."""
    nt = m.node_tree; bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); inp = bsdf.inputs[name]
    if inp.links: return inp.links[0].from_socket
    rgb = nt.nodes.new('ShaderNodeRGB'); v = inp.default_value
    rgb.outputs[0].default_value = (v, v, v, 1.0) if isinstance(v, float) else tuple(v)
    return rgb.outputs[0]
