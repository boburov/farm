"""Renders turntable stills of a GLB with a neutral three-light setup. Usage: -P preview.py -- <file.glb> <outdir> [name]"""
import sys, os, math, bpy
argv = sys.argv[sys.argv.index('--') + 1:]; path, outdir = argv[0], argv[1]; name = argv[2] if len(argv) > 2 else os.path.splitext(os.path.basename(path))[0]
os.makedirs(outdir, exist_ok=True)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for me in list(bpy.data.meshes): bpy.data.meshes.remove(me)
before = set(o.name for o in bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=path)
meshes = [o for o in bpy.data.objects if o.type == 'MESH' and o.name not in before and not o.name.startswith('Icosphere')]
for o in meshes: print('PREVIEW mesh', o.name, len(o.data.vertices), [round(v,3) for v in o.matrix_world.translation], [round(s_,3) for s_ in o.matrix_world.to_scale()])
lo = [min(min((o.matrix_world @ v.co)[k] for v in o.data.vertices) for o in meshes) for k in range(3)]
hi = [max(max((o.matrix_world @ v.co)[k] for v in o.data.vertices) for o in meshes) for k in range(3)]
c = [(lo[k] + hi[k]) / 2 for k in range(3)]; size = max(hi[k] - lo[k] for k in range(3)); print('PREVIEW bounds', [round(v,3) for v in lo], [round(v,3) for v in hi], 'size', round(size,3))
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = False; sc.render.resolution_x = 900; sc.render.resolution_y = 700; sc.render.film_transparent = False
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = d.type != 'CPU'
    sc.cycles.device = 'GPU'
except Exception: pass
world = sc.world or bpy.data.worlds.new('W'); sc.world = world; world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs['Color'].default_value = (.42, .45, .48, 1); bg.inputs['Strength'].default_value = 1.0
def light(kind, loc, energy, size_=1.0, rot=None):
    l = bpy.data.lights.new(kind, kind); l.energy = energy
    if kind == 'AREA': l.size = size_
    o = bpy.data.objects.new(kind, l); sc.collection.objects.link(o); o.location = loc
    if rot: o.rotation_euler = rot
    return o
key = light('AREA', (c[0] + size * 1.6, c[1] - size * 1.8, c[2] + size * 2.2), 60 * size * size, size * 1.2)
fill = light('AREA', (c[0] - size * 2.2, c[1] - size * 1.2, c[2] + size * 1.0), 25 * size * size, size * 2.0)
rim = light('AREA', (c[0] - size * .5, c[1] + size * 2.2, c[2] + size * 1.8), 40 * size * size, size * 1.0)
for l in (key, fill, rim):
    d = [c[k] - l.location[k] for k in range(3)]; l.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]) , 0, math.atan2(d[1], d[0]) + math.pi / 2)
    tr = l.constraints.new('TRACK_TO'); tgt = bpy.data.objects.new('t', None); sc.collection.objects.link(tgt); tgt.location = c; tr.target = tgt; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'
cam = bpy.data.cameras.new('cam'); cam.lens = 60; co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co); sc.camera = co
tgt = bpy.data.objects.new('ct', None); sc.collection.objects.link(tgt); tgt.location = c
tr = co.constraints.new('TRACK_TO'); tr.target = tgt; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'
views = {'front34': (size * 1.5, -size * 1.5, c[2] + size * 0.55), 'side': (size * 2.1, 0.0, c[2] + size * 0.25), 'back34': (-size * 1.4, size * 1.4, c[2] + size * 0.6)}
for vname, (dx, dy, z) in views.items():
    co.location = (c[0] + dx, c[1] + dy, z); sc.render.filepath = os.path.join(outdir, f'{name}-{vname}.png'); bpy.ops.render.render(write_still=True)
# head close-up: top 25 % of the model
tgt.location = (c[0], c[1], lo[2] + (hi[2] - lo[2]) * .86); co.location = (c[0] + size * .55, c[1] - size * .65, lo[2] + (hi[2] - lo[2]) * .92); cam.lens = 90
sc.render.filepath = os.path.join(outdir, f'{name}-head.png'); bpy.ops.render.render(write_still=True)
print('PREVIEW_OK')
