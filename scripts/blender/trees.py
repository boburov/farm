"""Tree impostor atlas: four procedural species (round broadleaf, wide broadleaf, poplar, small orchard tree), each rendered
from two angles with Cycles on a transparent film into 448x640 cells. Node composes the cells into assets/textures/trees-atlas.webp.
Run: Blender -b --factory-startup -noaudio --python-exit-code 1 -P scripts/blender/trees.py -- --out build/blender/trees --gpu"""
import sys, os, math, random, bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.args import parse
from lib.log import log
from lib import geom, materials as M
from mathutils import Vector
a = parse(); os.makedirs(a.out, exist_ok=True); random.seed(a.seed)
def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for me in list(bpy.data.meshes): bpy.data.meshes.remove(me)
def bark_material():
    m, nt, bsdf, out = M.new_material('bark'); coord = nt.nodes.new('ShaderNodeTexCoord'); n = M.noise(nt, 12, 6, .6); nt.links.new(coord.outputs['Object'], n.inputs['Vector'])
    r = M.ramp(nt, [(0, (.16, .12, .09, 1)), (.6, (.30, .24, .18, 1)), (1, (.38, .33, .26, 1))]); nt.links.new(n.outputs['Fac'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = .9; b = M.bump(nt, .6, .02); nt.links.new(n.outputs['Fac'], b.inputs['Height']); nt.links.new(b.outputs['Normal'], bsdf.inputs['Normal']); return m
def leaf_material(hue):
    m, nt, bsdf, out = M.new_material('leaf'); coord = nt.nodes.new('ShaderNodeTexCoord')
    n = M.noise(nt, 9, 5, .7); nt.links.new(coord.outputs['UV'], n.inputs['Vector'])
    grad = nt.nodes.new('ShaderNodeTexGradient'); grad.gradient_type = 'SPHERICAL'; mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Location'].default_value = (-.5, -.5, 0); mp.inputs['Scale'].default_value = (1, 1, 1)
    nt.links.new(coord.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], grad.inputs['Vector'])
    fall = M.math(nt, 'MULTIPLY_ADD'); nt.links.new(grad.outputs['Fac'], fall.inputs[0]); fall.inputs[1].default_value = 2.2; fall.inputs[2].default_value = -.9
    alpha = M.math(nt, 'MULTIPLY'); nt.links.new(fall.outputs[0], alpha.inputs[0]); nt.links.new(n.outputs['Fac'], alpha.inputs[1])
    thr = M.math(nt, 'GREATER_THAN'); nt.links.new(alpha.outputs[0], thr.inputs[0]); thr.inputs[1].default_value = .30; nt.links.new(thr.outputs[0], bsdf.inputs['Alpha'])
    col = M.ramp(nt, [(0, hue[0] + (1,)), (.5, hue[1] + (1,)), (1, hue[2] + (1,))]); n2 = M.noise(nt, 3, 3, .5); nt.links.new(coord.outputs['Object'], n2.inputs['Vector']); nt.links.new(n2.outputs['Fac'], col.inputs['Fac'])
    nt.links.new(col.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = .75
    if 'Subsurface Weight' in bsdf.inputs: bsdf.inputs['Subsurface Weight'].default_value = 0.0
    m.use_backface_culling = False; return m
SPECIES = {
    'round': dict(h=9.0, trunk=.26, crown=(3.6, 3.2, 3.6), cz=6.4, leaves=170, leaf=1.6, branches=6, hue=((.10, .22, .07), (.22, .40, .12), (.42, .55, .20))),
    'wide': dict(h=8.0, trunk=.30, crown=(5.0, 2.6, 5.0), cz=5.6, leaves=210, leaf=1.7, branches=7, hue=((.09, .19, .06), (.19, .36, .11), (.38, .50, .18))),
    'poplar': dict(h=15.0, trunk=.24, crown=(1.7, 6.5, 1.7), cz=8.8, leaves=240, leaf=1.1, branches=9, hue=((.12, .24, .08), (.25, .42, .13), (.50, .60, .22))),
    'orchard': dict(h=4.6, trunk=.17, crown=(2.6, 1.9, 2.6), cz=3.2, leaves=120, leaf=1.1, branches=5, hue=((.10, .22, .07), (.24, .40, .13), (.45, .55, .22))),
}
def build_tree(sp):
    objs = []
    bark = bark_material(); leafm = leaf_material(sp['hue'])
    h = sp['h']; crown_x, crown_y, crown_z = sp['crown']; cz = sp['cz']
    trunk = geom.sweep('trunk', [(0, 0, 0), (random.uniform(-.15, .15), h * .45, random.uniform(-.15, .15)), (random.uniform(-.2, .2), h * .9, random.uniform(-.2, .2))],
                       lambda t: (sp['trunk'] * (1 - .75 * t) + .03, sp['trunk'] * (1 - .75 * t) + .03), 14, 8, True, True)
    trunk.data.materials.append(bark); objs.append(trunk)
    for i in range(sp['branches']):
        ang = i / sp['branches'] * 2 * math.pi + random.uniform(-.3, .3); y0 = h * random.uniform(.38, .78); L = crown_x * random.uniform(.55, .95)
        tip = (math.cos(ang) * L, y0 + random.uniform(.3, .9) * crown_y * .6, math.sin(ang) * L)
        br = geom.sweep('branch%d' % i, [(0, y0, 0), ((tip[0]) * .5, (y0 + tip[1]) * .5 + .3, tip[2] * .5), tip], lambda t: (.09 * (1 - .8 * t) + .015, .09 * (1 - .8 * t) + .015), 8, 6, True, True)
        br.data.materials.append(bark); objs.append(br)
    for i in range(sp['leaves']):
        # points inside an ellipsoid crown, denser at the surface
        u = random.random(); r = (.55 + .45 * u ** .35); th = random.uniform(0, 2 * math.pi); ph = math.acos(random.uniform(-1, 1))
        p = (math.sin(ph) * math.cos(th) * crown_x * r, cz + math.cos(ph) * crown_y * r, math.sin(ph) * math.sin(th) * crown_z * r)
        s = sp['leaf'] * random.uniform(.7, 1.3)
        bpy.ops.mesh.primitive_plane_add(size=1.0, location=(p[0], -p[2], p[1]))
        q = bpy.context.active_object; q.scale = (s, s, s); q.rotation_euler = (random.uniform(0, math.pi), random.uniform(0, math.pi), random.uniform(0, math.pi))
        q.data.materials.append(leafm); objs.append(q)
    return objs
def render_setup():
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 40; sc.cycles.use_denoising = False; sc.render.film_transparent = True
    sc.render.resolution_x = 448; sc.render.resolution_y = 640; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.cycles.transparent_max_bounces = 24
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type = 'METAL'; prefs.get_devices()
        for d in prefs.devices: d.use = d.type != 'CPU'
        sc.cycles.device = 'GPU' if a.gpu else 'CPU'
    except Exception: pass
    world = sc.world or bpy.data.worlds.new('W'); sc.world = world; world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.55, .62, .72, 1); bg.inputs['Strength'].default_value = .9
    sun = bpy.data.lights.new('sun', 'SUN'); sun.energy = 3.0; sun.angle = math.radians(6); so = bpy.data.objects.new('sun', sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(48), math.radians(12), math.radians(30))
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
    return co, cam
for name, sp in SPECIES.items():
    for angle in (0, 90):
        clear(); random.seed(a.seed + hash(name) % 1000)
        objs = build_tree(sp); co, cam = render_setup()
        h = sp['h']; w = max(sp['crown'][0], sp['crown'][2]) * 2.2; cam.ortho_scale = max(w, h * 448 / 640) * 1.02
        rad = math.radians(angle); co.location = (math.sin(rad) * 60, -math.cos(rad) * 60, h * .5); co.rotation_euler = (math.pi / 2, 0, rad)
        bpy.context.scene.render.filepath = os.path.join(a.out, f'{name}-{angle}.png'); bpy.ops.render.render(write_still=True)
        log('rendered', name, angle, 'height', h)
with open(os.path.join(a.out, 'atlas.json'), 'w') as f:
    import json; json.dump({'cells': [{'name': n, 'height': sp['h'], 'width': max(sp['crown'][0], sp['crown'][2]) * 2.2, 'orthoScale': max(max(sp['crown'][0], sp['crown'][2]) * 2.2, sp['h'] * 448 / 640) * 1.02} for n, sp in SPECIES.items()], 'angles': [0, 90], 'cell': [448, 640]}, f, indent=1)
log('TREES_OK')
