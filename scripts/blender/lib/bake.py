"""Cycles baking into images: tangent normals, ambient occlusion, base colour and roughness via emission routing."""
import bpy, os
from .log import log, timer
from . import materials as M

def setup(samples=64, gpu=False):
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = False; sc.cycles.use_denoising = False
    sc.render.bake.margin = 16; sc.render.bake.margin_type = 'EXTEND'; sc.render.bake.use_clear = True; sc.render.bake.target = 'IMAGE_TEXTURES'
    sc.cycles.device = 'CPU'
    if gpu:
        try:
            prefs = bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type = 'METAL'; prefs.get_devices()
            for d in prefs.devices: d.use = d.type != 'CPU'
            sc.cycles.device = 'GPU'
        except Exception as e: log('GPU unavailable, CPU bake:', e)
    world = sc.world or bpy.data.worlds.new('World'); sc.world = world; world.use_nodes = True
    bg = next((n for n in world.node_tree.nodes if n.type == 'BACKGROUND'), None)
    if bg: bg.inputs['Color'].default_value = (1, 1, 1, 1); bg.inputs['Strength'].default_value = 1.0
    world.light_settings.distance = 0.06

def image(name, size, color=True):
    img = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'sRGB' if color else 'Non-Color'
    return img

def _target(m, img):
    nt = m.node_tree
    node = nt.nodes.get('__bake_target') or nt.nodes.new('ShaderNodeTexImage'); node.name = '__bake_target'; node.image = img
    node.select = True; nt.nodes.active = node
    return node

def _select(obj):
    objs = obj if isinstance(obj, (list, tuple)) else [obj]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

def bake_pass(obj, m, img, kind, samples=None):
    sc = bpy.context.scene
    if samples: sc.cycles.samples = samples
    _target(m, img); _select(obj)
    if kind == 'NORMAL': bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT', normal_r='POS_X', normal_g='POS_Y', normal_b='POS_Z', margin=sc.render.bake.margin, use_clear=True)
    elif kind == 'AO': bpy.ops.object.bake(type='AO', margin=sc.render.bake.margin, use_clear=True)
    elif kind in ('COLOR', 'ROUGH'):
        restore = M.route_to_emission(m, M.bsdf_input_link(m, 'Base Color' if kind == 'COLOR' else 'Roughness'))
        try: bpy.ops.object.bake(type='EMIT', margin=sc.render.bake.margin, use_clear=True)
        finally: restore()
    else: raise ValueError(kind)

def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.filepath_raw = path; img.file_format = 'PNG'; img.save()

def bake_material(obj, m, size, out_dir, prefix, passes=('COLOR', 'NORMAL', 'AO', 'ROUGH'), ao_samples=128, quick=False):
    """Bakes the given passes for one object (or a list sharing the material) into PNGs named prefix-color/normal/ao/rough.png."""
    out = {}
    for kind in passes:
        img = image(f'{prefix}-{kind.lower()}', size, color=(kind == 'COLOR'))
        with timer(f'bake {prefix} {kind}'):
            bake_pass(obj, m, img, kind, samples=(4 if kind in ('NORMAL', 'COLOR', 'ROUGH') else (16 if quick else ao_samples)))
        path = os.path.join(out_dir, 'tex', f'{prefix}-{kind.lower()}.png'); save(img, path); out[kind] = path
        bpy.data.images.remove(img)
    return out
