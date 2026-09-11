"""Adult hen (and chick, with --chick): continuous tail-to-beak body sweep, sculpted cross sections, head furniture,
scaled legs with toes and claws, layered feather cards, 21-bone armature with analytic weights, baked PBR maps,
three tiers (hero / mid / lod). Run: Blender -b --factory-startup -noaudio --python-exit-code 1 -P scripts/blender/hen.py -- --out build/blender/hen
"""
import sys, os, math, random, json, bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.args import parse
from lib.log import log, timer
from lib import geom, uv, rig, materials as M, bake, export
from lib.coords import load_spec, site_to_bl
from mathutils import Vector

a = parse(); CHICK = '--chick' in sys.argv
spec = load_spec(a.spec); H = spec['hen']['landmarks']; BONES = spec['hen']['bones']; SEGS = spec['hen']['segs']
K = spec['hen']['chickScale'] if CHICK else 1.0
random.seed(a.seed); os.makedirs(a.out, exist_ok=True)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)

def S(p): return (p[0] * K, p[1] * K, p[2] * K)           # site point scaled for the chick
def bump(t, a, b, power=1.0):                                 # smooth window in [a,b]
    if t <= a or t >= b: return 0.0
    u = (t - a) / (b - a); return math.sin(math.pi * u) ** power
def lerp(a_, b_, t): return a_ + (b_ - a_) * t
def sample(knots, t):
    n = len(knots) - 1; f = max(0.0, min(1.0, t)) * n; i = min(int(f), n - 1); u = f - i; u = u * u * (3 - 2 * u)
    return lerp(knots[i], knots[i + 1], u)

# ------------------------------------------------------------------ body
if not CHICK:
    SPINE = [(0, .352, -.268), (0, .333, -.240), (0, .310, -.198), (0, .290, -.142), (0, .277, -.072), (0, .268, .000), (0, .275, .060),
             (0, .296, .100), (0, .332, .121), (0, .384, .135), (0, .423, .145), (0, .451, .153), (0, .449, .184)]
    RX = [.028, .044, .052, .082, .104, .110, .098, .072, .047, .031, .026, .031, .006]
    RY = [.005, .008, .020, .066, .094, .102, .106, .088, .054, .033, .027, .033, .007]
else:   # chick: egg body, big head, short neck (adult-normalised coordinates, scaled by K below)
    SPINE = [(0, .300, -.150), (0, .292, -.128), (0, .282, -.094), (0, .272, -.040), (0, .268, .010), (0, .275, .060), (0, .296, .095),
             (0, .335, .118), (0, .395, .133), (0, .440, .142), (0, .458, .150), (0, .455, .190)]
    RX = [.010, .040, .076, .100, .104, .094, .066, .050, .052, .054, .050, .008]
    RY = [.006, .030, .070, .096, .102, .098, .078, .056, .053, .056, .052, .010]
n = len(SPINE) - 1
def body_radius(t): return (sample(RX, t) * K, sample(RY, t) * K)
def body_shape(t, ang, rx, ry):
    e_top = 2.25; e_bot = 1.7 if not CHICK else 2.0
    x, y = geom.superellipse(ang, rx, ry, e_top, e_bot)
    if not CHICK:
        keel = .014 * bump(t, .32, .64, 1.2) * K                       # breast keel below the chest
        y -= keel * math.exp(-(x / (.42 * rx)) ** 2) if y < 0 else 0
        wing = 1 + .075 * bump(t, .26, .68) * max(0.0, math.sin(ang) if ang < math.pi else 0) * (abs(math.cos(ang)) ** 0.5)
        x *= wing; y *= 1 + .03 * bump(t, .26, .68) * max(0.0, math.sin(ang))
        hackle = 1 + .10 * bump(t, .66, .80)
        x *= hackle; y *= hackle
        saddle = .006 * bump(t, .08, .34) * max(0.0, math.sin(ang)) * K; y += saddle
    return x, y
with timer('body'):
    body = geom.sweep('body_src', [S(p) for p in SPINE], body_radius, 48, 28, True, True, body_shape)
FRAMES = geom.sweep_frames([S(p) for p in SPINE], 48)
def body_point(t, ang, off=0.0, outward=False):
    """Point on (or offset from) the body surface at ring t and angle ang (0 = right flank, pi/2 = back); returns site coords
    unscaled by K (callers pass through S). With outward=True also returns the surface normal."""
    i = min(48, int(round(t * 48))); c, x, y = FRAMES[i]; rx, ry = body_radius(t); px, py = body_shape(t, ang, rx, ry)
    n = (x * (px / max(1e-6, rx * rx)) + y * (py / max(1e-6, ry * ry))).normalized()
    p = c + x * px + y * py + n * off * K
    return ((p.x / K, p.y / K, p.z / K), (n.x, n.y, n.z)) if outward else (p.x / K, p.y / K, p.z / K)
    geom.uv_rect(body, (0, 0, .78, 1)); geom.set_color(body, (.94, .92, .88))

# feathered thighs
thighs = []
for side in (-1, 1):
    hw = spec['hen']['halfTrack']
    path = [S((side * (hw - .004), H['hip'] + .030, -.012)), S((side * (hw + .008), H['hip'] - .026, -.024)), S((side * (hw + .005), H['knee'], -.012)), S((side * hw, H['hock'] + .006, .004))]
    th = geom.sweep('thigh' + ('L' if side > 0 else 'R'), path, lambda t: ((.038 - .024 * t ** 1.3) * K, (.040 - .026 * t ** 1.3) * K), 14, 12, True, True)
    geom.uv_rect(th, (.78 + (0 if side > 0 else .11), 0, .89 + (0 if side > 0 else .11), .48)); geom.set_color(th, (.94, .92, .88)); thighs.append(th)

# ------------------------------------------------------------------ head furniture (keratin, slot 1)
hy, hz, hr = H['head'], .153, .031
keratin_parts, eye_parts, lid_parts = [], [], []
def col(o, rgb): geom.set_color(o, rgb)
# beak: upper mandible with a curved culmen, lower mandible shorter
if not CHICK:
    up = geom.sweep('beakU', [S((0, hy - .004, hz + hr - .004)), S((0, hy - .006, hz + hr + .014)), S((0, hy - .013, hz + hr + .030)), S((0, hy - .017, hz + hr + .036))],
                    lambda t: ((.0112 - .0105 * t ** 1.4) * K, (.0090 - .0084 * t ** 1.2) * K), 12, 10, True, True)
    lo = geom.sweep('beakL', [S((0, hy - .013, hz + hr - .004)), S((0, hy - .015, hz + hr + .012)), S((0, hy - .016, hz + hr + .026)), S((0, hy - .0165, hz + hr + .031))],
                    lambda t: ((.0088 - .0084 * t ** 1.3) * K, (.0060 - .0055 * t) * K), 10, 8, True, True)
else:
    up = geom.sweep('beakU', [S((0, hy - .006, hz + .045)), S((0, hy - .009, hz + .058)), S((0, hy - .013, hz + .066))], lambda t: ((.0070 - .0068 * t ** 1.3) * K, (.0056 - .0054 * t) * K), 8, 8, True, True)
    lo = geom.sweep('beakL', [S((0, hy - .012, hz + .045)), S((0, hy - .014, hz + .056)), S((0, hy - .0145, hz + .062))], lambda t: ((.0058 - .0056 * t ** 1.3) * K, (.0040 - .0038 * t) * K), 8, 8, True, True)
geom.uv_rect(up, (0, 0, .5, .28)); geom.uv_rect(lo, (.5, 0, 1, .28)); col(up, (.87, .66, .27)); col(lo, (.76, .55, .22)); keratin_parts += [up, lo]
for side in (-1, 1):
    nos = geom.ellipsoid('nostril' + str(side), S((side * .0065, hy - .0055, hz + hr + .011)), (.0018 * K, .0013 * K, .0028 * K), 8, 5)
    geom.uv_rect(nos, (.9, .28, 1, .33)); col(nos, (.25, .17, .10)); keratin_parts.append(nos)
if not CHICK:
    # comb: outline in the head's YZ plane (z along the crown, y up), five points, bevelled plate, subdivided
    comb_pts = [(.118, .470), (.135, .471), (.155, .472), (.175, .472), (.192, .470), (.194, .480), (.184, .490), (.179, .479), (.171, .506), (.162, .482), (.150, .513), (.142, .485), (.130, .506), (.125, .482), (.117, .494)]
    comb = geom.solid_polygon('comb', [(z, y) for (z, y) in comb_pts], 0.0, .0046, bevel=.0013, bevel_segments=2)
    geom.subdivide(comb, 1); geom.uv_rect(comb, (0, .33, .5, .60)); col(comb, (.78, .13, .11)); keratin_parts.append(comb)
    for side in (-1, 1):
        wat = geom.sweep('wattle' + ('L' if side > 0 else 'R'), [S((side * .008, hy - .020, hz + hr - .012)), S((side * .0095, hy - .038, hz + hr - .013)), S((side * .009, hy - .054, hz + hr - .014)), S((side * .0085, hy - .061, hz + hr - .015))],
                         lambda t: ((.0035 + .0075 * math.sin(math.pi * min(1, t * 1.15)) ** 0.8) * K, (.0030 + .0060 * math.sin(math.pi * min(1, t * 1.15)) ** 0.8) * K), 10, 10, True, True)
        geom.uv_rect(wat, (.5 + (0 if side > 0 else .25), .33, .75 + (0 if side > 0 else .25), .60)); col(wat, (.76, .14, .12)); keratin_parts.append(wat)
        lobe = geom.ellipsoid('lobe' + str(side), S((side * .0285, hy - .017, hz - .018)), (.0028 * K, .0090 * K, .0070 * K), 10, 7)
        geom.uv_rect(lobe, (.9 + (0 if side > 0 else .05), .33, .95 + (0 if side > 0 else .05), .60)); col(lobe, (.90, .86, .78)); keratin_parts.append(lobe)
# eyes: sphere with the pole facing outward (iris/pupil live near v=1)
eye_r = (.0086 if not CHICK else .0105) * K
for side in (-1, 1):
    ex, ey, ez = side * (hr * .90 if not CHICK else .046) * K, (hy + .004) * K, (hz + hr * .34) * K
    eye = geom.sweep('eye' + str(side), [(ex - side * eye_r, ey, ez), (ex, ey, ez), (ex + side * eye_r * 1.02, ey, ez)],
                     lambda t: (eye_r * math.sqrt(max(1e-4, 1 - (2 * t - 1) ** 2)), eye_r * math.sqrt(max(1e-4, 1 - (2 * t - 1) ** 2))), 14, 16, True, True, x0=(0, 0, 1))
    geom.uv_rect(eye, (0 if side > 0 else .5, 0, .5 if side > 0 else 1, 1)); col(eye, (1, 1, 1)); eye_parts.append(eye)
    # upper eyelid crescent (plumage colour, driven by the lids bone) and lower rim (keratin)
    rr = eye_r * 1.06
    arc = [(ex + side * .0018, ey + math.sin(t) * rr, ez + math.cos(t) * rr) for t in [0.05 + i / 8 * 3.04 for i in range(9)]]
    lid = geom.sweep('lidU' + str(side), arc, lambda t: (.0020 * K, .0016 * K), 12, 6, True, True); geom.uv_rect(lid, (.78, .5 + (0 if side > 0 else .06), 1, .56 + (0 if side > 0 else .06))); col(lid, (.93, .90, .86)); lid_parts.append(lid)
    arc2 = [(ex + side * .0014, ey - math.sin(t) * rr, ez + math.cos(t) * rr) for t in [0.15 + i / 8 * 2.84 for i in range(9)]]
    rim = geom.sweep('lidL' + str(side), arc2, lambda t: (.0013 * K, .0011 * K), 10, 6, True, True); geom.uv_rect(rim, (.9, .6 + (0 if side > 0 else .05), 1, .65 + (0 if side > 0 else .05))); col(rim, (.72, .55, .42)); keratin_parts.append(rim)

# ------------------------------------------------------------------ legs (keratin) : shanks, toes, claws
shanks, feet = {}, {}
hw = spec['hen']['halfTrack']
for side, nm in ((1, 'L'), (-1, 'R')):
    sh = geom.sweep('shank' + nm + '_src', [S((side * hw, H['hock'] + .004, .004)), S((side * hw, (H['hock'] + .012) / 2, .008)), S((side * hw, .012, .012))],
                    lambda t: ((.0112 - .0034 * t) * K, (.0098 - .0026 * t) * K), 16, 12, True, True)
    geom.uv_rect(sh, (0 if side > 0 else .25, .62, .25 if side > 0 else .5, 1)); col(sh, (.84, .64, .30)); shanks[nm] = sh
    toes, i = [], 0
    for (yaw, length) in ((-.44, .036), (0.0, .052), (.44, .037), (math.pi, .030)):
        base = S((side * hw, .0085, .012)); dx = math.sin(yaw) * length * side; dz = math.cos(yaw) * length
        tip = S((side * hw + dx / K, .0045, .012 + dz / K)); mid = ((base[0] + tip[0]) / 2, .0075 * K, (base[2] + tip[2]) / 2)
        toe = geom.sweep('toe' + nm + str(i), [base, mid, tip], lambda t: ((.0052 - .0022 * t) * K, (.0042 - .0016 * t) * K), 8, 8, True, True)
        geom.uv_rect(toe, (.5 + i * .125 + (0 if side > 0 else .0625), .62, .5 + i * .125 + .0625 + (0 if side > 0 else .0625), 1)); col(toe, (.84, .64, .30)); toes.append(toe)
        ctip = (tip[0] + dx * .25, .0005 * K, tip[2] + dz * .25)
        claw = geom.sweep('claw' + nm + str(i), [tip, ((tip[0] + ctip[0]) / 2, .0035 * K, (tip[2] + ctip[2]) / 2), ctip], lambda t: ((.0026 - .0024 * t) * K, (.0022 - .0020 * t) * K), 6, 6, True, True)
        geom.uv_rect(claw, (.5 + i * .125 + (0 if side > 0 else .0625), .95, .5 + i * .125 + .0625 + (0 if side > 0 else .0625), 1)); col(claw, (.32, .26, .18)); toes.append(claw); i += 1
    feet[nm] = toes

# ------------------------------------------------------------------ feather cards (slot 3, alpha atlas)
CELLS = {'primary': 0, 'secondary': 1, 'covert': 2, 'sickle': 3, 'hackle': 4, 'saddle': 5, 'down': 6, 'tailmain': 7}
def cell(name): i = CELLS[name]; return ((i % 4) / 4, (i // 4) / 2, (i % 4 + 1) / 4, (i // 4 + 1) / 2)
cards = []
def add_card(nm, root, tip, width, bow, outward, kind, n_len=3, n_wid=2, curl=0.0, mirror=False):
    c = cell(kind); c = (c[2], c[1], c[0], c[3]) if mirror else c
    o = geom.card(nm, S(root), S(tip), width * K, bow * K, outward, n_len, n_wid, curl * K, c); col(o, (.94, .92, .88)); cards.append(o)
if not CHICK:
    def surf_card(nm, side, t0, a0, t1, a1, off0, off1, width, bow, kind, n_len=3, extra_drop=0.0):
        ang0 = a0 if side > 0 else math.pi - a0; ang1 = a1 if side > 0 else math.pi - a1
        root, nrm = body_point(t0, ang0, off0, True); tip = body_point(t1, ang1, off1)
        tip = (tip[0], tip[1] - extra_drop, tip[2])
        add_card(nm, root, tip, width, bow, nrm, kind, n_len, 2, 0, side < 0)
    for side, nm in ((1, 'L'), (-1, 'R')):
        for j in range(9):     # coverts: short, high on the flank, pointing back and down
            q = j / 8; surf_card(f'cov{nm}{j}', side, .60 - q * .22, 1.05 - q * .10, .52 - q * .22, .80 - q * .12, .002, .005, .015, .0008, 'covert', 2)
        for j in range(9):     # secondaries: a second overlapping row, lower
            q = j / 8; surf_card(f'sec{nm}{j}', side, .56 - q * .22, .62 - q * .06, .45 - q * .22, .40 - q * .08, .003, .007, .017, .001, 'secondary', 3)
        for j in range(8):     # primaries: long, folded along the lower flank, tips over the rump
            q = j / 7; surf_card(f'prim{nm}{j}', side, .44 - q * .10, .34 - q * .06, .22 - q * .09, .28 + q * .04, .004, .010, .019, .0015, 'primary', 4)
        for j in range(6):     # thigh fluff below the wing
            q = j / 5; surf_card(f'fluff{nm}{j}', side, .46 - q * .12, -.55 - q * .12, .40 - q * .12, -.95 - q * .10, .002, .006, .013, .001, 'down', 2, .004)
    for i in range(-5, 6):     # tail: main feathers in a fan, the two centre pairs longer (sickles)
        ab = abs(i); long = 1.0 if ab <= 1 else (.86 if ab <= 3 else .72)
        add_card(f'tail{i+5}', (i * .0065, .322 - ab * .003, -.192), (i * .017, (.372 - ab * .014) * long + .300 * (1 - long), -.20 - .085 * long + ab * .006), .018, .004, (0, 1, 0), 'sickle' if ab <= 1 else 'tailmain', 4, 2, .003)
    for j in range(22):        # hackle cape hugging the neck base, tips toward the shoulders
        ang = j / 22 * 2 * math.pi
        root, nrm = body_point(.79, ang, .0015, True); tip = body_point(.70, ang, .004); tip = (tip[0], tip[1] - .006, tip[2])
        add_card(f'hackle{j}', root, tip, .011, .0006, nrm, 'hackle', 2, 2)
    for j in range(14):        # saddle feathers over the rump, pointing to the tail
        ang = .35 + (j / 13) * (math.pi - .70)
        root, nrm = body_point(.27, ang, .0015, True); tip = body_point(.16, ang, .004)
        add_card(f'saddle{j}', root, tip, .013, .0012, nrm, 'saddle', 2, 2)
else:
    for side, nm in ((1, 'L'), (-1, 'R')):
        for j in range(7): add_card(f'wing{nm}{j}', (side * .090, .296 - j * .007, .026 - j * .010), (side * .100, .258 - j * .003, -.030 - j * .008), .016, .002, (side, .2, 0), 'down', 2, 2, 0, side < 0)
    for i in range(-1, 2): add_card(f'tail{i+1}', (i * .012, .292, -.100), (i * .015, .322, -.134), .012, .004, (0, 1, 0), 'down', 2, 2)
    for j in range(40):
        ang = j / 40 * 2 * math.pi; t = .25 + (j % 5) * .12; c = SPINE[int(t * n)]; rx, ry = body_radius(t)
        add_card(f'down{j}', (math.cos(ang) * rx / K * .95, c[1] + math.sin(ang) * ry / K * .95, c[2]), (math.cos(ang) * (rx / K + .010), c[1] + math.sin(ang) * (ry / K + .010) - .004, c[2] - .008), .011, .002, (math.cos(ang), math.sin(ang), 0), 'down', 2, 2)

# ------------------------------------------------------------------ materials
def plumage_material():
    m, nt, bsdf, out = M.new_material('hen_plumage'); vc = M.color_attribute(nt)
    coord = nt.nodes.new('ShaderNodeTexCoord'); mapping = nt.nodes.new('ShaderNodeMapping'); mapping.inputs['Scale'].default_value = (1, 1, 1)
    nt.links.new(coord.outputs['UV'], mapping.inputs['Vector'])
    # feather rows: scalloped arcs along the body (v) shifted every other row (u)
    wave = nt.nodes.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS'; wave.bands_direction = 'Y'; wave.wave_profile = 'SAW'
    wave.inputs['Scale'].default_value = 26; wave.inputs['Distortion'].default_value = 6; wave.inputs['Detail'].default_value = 3; wave.inputs['Detail Scale'].default_value = 3
    nt.links.new(mapping.outputs['Vector'], wave.inputs['Vector'])
    barbs = M.noise(nt, 420, 2, .6); nt.links.new(mapping.outputs['Vector'], barbs.inputs['Vector'])
    fine = M.noise(nt, 90, 5, .55); nt.links.new(mapping.outputs['Vector'], fine.inputs['Vector'])
    tone = M.ramp(nt, [(0, (.78, .76, .72, 1)), (.45, (.95, .94, .91, 1)), (1, (1, 1, .99, 1))]); nt.links.new(wave.outputs['Fac'], tone.inputs['Fac'])
    mixc = M.mix_rgb(nt, 1.0, 'MULTIPLY'); nt.links.new(vc.outputs['Color'], mixc.inputs[6]); nt.links.new(tone.outputs['Color'], mixc.inputs[7])
    mixf = M.mix_rgb(nt, .12, 'MULTIPLY'); nt.links.new(mixc.outputs[2], mixf.inputs[6]); nt.links.new(fine.outputs['Color'], mixf.inputs[7])
    nt.links.new(mixf.outputs[2], bsdf.inputs['Base Color'])
    rough = M.math(nt, 'MULTIPLY_ADD'); nt.links.new(fine.outputs['Fac'], rough.inputs[0]); rough.inputs[1].default_value = .12; rough.inputs[2].default_value = .80
    nt.links.new(rough.outputs[0], bsdf.inputs['Roughness'])
    h1 = M.math(nt, 'MULTIPLY_ADD'); nt.links.new(wave.outputs['Fac'], h1.inputs[0]); h1.inputs[1].default_value = 1.0; h1.inputs[2].default_value = 0
    h2 = M.math(nt, 'MULTIPLY_ADD'); nt.links.new(barbs.outputs['Fac'], h2.inputs[0]); h2.inputs[1].default_value = .25; nt.links.new(h1.outputs[0], h2.inputs[2])
    b = M.bump(nt, .55, .0030); nt.links.new(h2.outputs[0], b.inputs['Height']); nt.links.new(b.outputs['Normal'], bsdf.inputs['Normal'])
    bsdf.inputs['Specular IOR Level'].default_value = .3 if 'Specular IOR Level' in bsdf.inputs else None
    return m
def keratin_material():
    m, nt, bsdf, out = M.new_material('hen_keratin'); vc = M.color_attribute(nt)
    coord = nt.nodes.new('ShaderNodeTexCoord')
    scutes = M.voronoi(nt, 70, 'DISTANCE_TO_EDGE'); nt.links.new(coord.outputs['UV'], scutes.inputs['Vector'])
    fine = M.noise(nt, 160, 4, .5); nt.links.new(coord.outputs['UV'], fine.inputs['Vector'])
    mixc = M.mix_rgb(nt, .18, 'MULTIPLY'); nt.links.new(vc.outputs['Color'], mixc.inputs[6]); nt.links.new(fine.outputs['Color'], mixc.inputs[7]); nt.links.new(mixc.outputs[2], bsdf.inputs['Base Color'])
    rough = M.math(nt, 'MULTIPLY_ADD'); nt.links.new(fine.outputs['Fac'], rough.inputs[0]); rough.inputs[1].default_value = .2; rough.inputs[2].default_value = .45; nt.links.new(rough.outputs[0], bsdf.inputs['Roughness'])
    h = M.math(nt, 'MULTIPLY_ADD'); nt.links.new(scutes.outputs['Distance'], h.inputs[0]); h.inputs[1].default_value = .8; nt.links.new(fine.outputs['Fac'], h.inputs[2])
    b = M.bump(nt, .4, .0015); nt.links.new(h.outputs[0], b.inputs['Height']); nt.links.new(b.outputs['Normal'], bsdf.inputs['Normal'])
    return m
def eye_material():
    m, nt, bsdf, out = M.new_material('hen_eye'); coord = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(coord.outputs['UV'], sep.inputs['Vector'])
    # v runs from the inner pole (0) to the outer pole (1) inside each eye's half of the map: iris .80–.96, pupil > .96
    r = M.ramp(nt, [(0, (.93, .90, .86, 1)), (.78, (.90, .84, .78, 1)), (.80, (.55, .30, .08, 1)), (.88, (.72, .42, .12, 1)), (.955, (.35, .16, .04, 1)), (.965, (.02, .015, .01, 1)), (1, (.02, .015, .01, 1))])
    nt.links.new(sep.outputs['Y'], r.inputs['Fac']); nt.links.new(r.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = .15
    return m
def card_material():
    m, nt, bsdf, out = M.new_material('hen_cards'); vc = M.color_attribute(nt); bsdf.inputs['Roughness'].default_value = .9; m.use_backface_culling = False
    atlas = os.path.abspath('assets/textures/hen-cards.png')
    if os.path.exists(atlas):
        img = bpy.data.images.load(atlas); tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.name = 'cards_atlas'
        mix = M.mix_rgb(nt, 1.0, 'MULTIPLY'); nt.links.new(vc.outputs['Color'], mix.inputs[6]); nt.links.new(tex.outputs['Color'], mix.inputs[7])
        nt.links.new(mix.outputs[2], bsdf.inputs['Base Color']); nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
        nrm = os.path.abspath('assets/textures/hen-cards-normal.png')
        if os.path.exists(nrm):
            ni = bpy.data.images.load(nrm); ni.colorspace_settings.name = 'Non-Color'; nt2 = nt.nodes.new('ShaderNodeTexImage'); nt2.image = ni
            nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(nt2.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    else:
        nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
    return m
mat_p, mat_k, mat_e, mat_c = plumage_material(), keratin_material(), eye_material(), card_material()
for o in [body] + thighs + lid_parts: o.data.materials.append(mat_p)
for o in keratin_parts + list(shanks.values()) + [t for f in feet.values() for t in f]: o.data.materials.append(mat_k)
for o in eye_parts: o.data.materials.append(mat_e)
for o in cards: o.data.materials.append(mat_c)

# ------------------------------------------------------------------ assemble per tier
def make_tier(tier):
    objs = {}
    def dup(o, name):
        me = geom.evaluated_copy(o); geom.activate_color(me); nobj = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(nobj); nobj.data.materials.clear()
        for mm in o.data.materials: nobj.data.materials.append(mm)
        return nobj
    plum = geom.join([body] + thighs, 'plumage_' + tier); plum.data.materials.append(mat_p)
    if tier == 'hero': geom.subdivide(plum, 1)
    if tier == 'lod': geom.decimate(plum, .13)
    objs['plumage'] = plum
    RATIO = {'hero': {}, 'mid': {'keratin': .45, 'toes': .5, 'shank': .6, 'eyes': .5}, 'lod': {'keratin': .16, 'toes': .18, 'shank': .25, 'eyes': .22}}[tier]
    if tier != 'lod':
        lids = geom.join(lid_parts, 'eyelids_' + tier); lids.data.materials.append(mat_p); objs['eyelids'] = lids
    ker = geom.join(keratin_parts, 'keratin_' + tier); ker.data.materials.append(mat_k)
    if 'keratin' in RATIO: geom.decimate(ker, RATIO['keratin'])
    objs['keratin'] = ker
    for nm in ('L', 'R'):
        sh = dup(shanks[nm], 'shank' + nm + '_' + tier)
        if 'shank' in RATIO: geom.decimate(sh, RATIO['shank'], symmetry=False)
        objs['shank' + nm] = sh
        ft = geom.join(feet[nm], 'toes' + nm + '_' + tier); ft.data.materials.append(mat_k)
        if 'toes' in RATIO: geom.decimate(ft, RATIO['toes'], symmetry=False)
        objs['toes' + nm] = ft
    eyes = geom.join(eye_parts, 'eyes_' + tier); eyes.data.materials.append(mat_e)
    if 'eyes' in RATIO: geom.decimate(eyes, RATIO['eyes'])
    objs['eyes'] = eyes
    if tier != 'lod' and cards:
        subset = cards if tier == 'hero' else [c for i, c in enumerate(cards) if i % 2 == 0]
        cc = geom.join(subset, 'cards_' + tier); cc.data.materials.append(mat_c); objs['cards'] = cc
    return objs

def weight_tier(objs, arm):
    bone_of = {'eyelids': 'lids', 'keratin': 'head', 'eyes': 'head', 'shankL': 'hockL', 'shankR': 'hockR', 'toesL': 'footL', 'toesR': 'footR'}
    for key, o in objs.items():
        if key in bone_of: rig.assign_all(o, bone_of[key])
        else: rig.weights_from_segments(o, BONES, SEGS, K)
        rig.bind(o, arm)
    return objs

SLOT = {'plumage': 0, 'eyelids': 0, 'keratin': 1, 'shankL': 1, 'shankR': 1, 'toesL': 1, 'toesR': 1, 'eyes': 2, 'cards': 3}
prefix = 'chick' if CHICK else 'hen'
report = {'tiers': {}}
arm = rig.armature_from_table('rig', BONES, K)

hero = make_tier('hero') if 'hero' in a.tiers else None
if hero and not a.quick or hero and a.quick:
    # ----- bakes on the hero tier (all tiers share UV layout and maps)
    bake.setup(samples=a.samples, gpu=a.gpu); bpy.context.scene.world.light_settings.distance = .06 * K
    for c in cards: c.hide_render = True
    for key in ('cards',):
        if key in hero: hero[key].hide_render = True
    size = a.size; ksize = max(512, size // 2); esize = 256
    with timer('bake plumage'):
        bake.bake_material([hero['plumage']] + ([hero['eyelids']] if 'eyelids' in hero else []), mat_p, size, a.out, prefix + '-plumage', ('COLOR', 'NORMAL', 'AO', 'ROUGH'), ao_samples=a.samples, quick=a.quick)
    with timer('bake keratin'):
        bake.bake_material([hero['keratin'], hero['shankL'], hero['shankR'], hero['toesL'], hero['toesR']], mat_k, ksize, a.out, prefix + '-keratin', ('COLOR', 'NORMAL', 'AO', 'ROUGH'), ao_samples=a.samples, quick=a.quick)
    with timer('bake eyes'):
        bake.bake_material([hero['eyes']], mat_e, esize, a.out, prefix + '-eye', ('COLOR',), quick=True)
    for key in hero: hero[key].hide_render = False
    # swap procedural trees for the baked images (so the exported materials reference files)
    def use_baked(m, base, kinds):
        nt = m.node_tree; bsdf = next(n_ for n_ in nt.nodes if n_.type == 'BSDF_PRINCIPLED')
        for link in list(bsdf.inputs['Base Color'].links + bsdf.inputs['Roughness'].links + bsdf.inputs['Normal'].links): nt.links.remove(link)
        for kind in kinds:
            img = bpy.data.images.load(os.path.join(a.out, 'tex', f'{base}-{kind}.png')); tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img
            if kind == 'color':
                vc = M.color_attribute(nt); mix = M.mix_rgb(nt, 1.0, 'MULTIPLY'); nt.links.new(vc.outputs['Color'], mix.inputs[6]); nt.links.new(tex.outputs['Color'], mix.inputs[7]); nt.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
            elif kind == 'rough': img.colorspace_settings.name = 'Non-Color'; nt.links.new(tex.outputs['Color'], bsdf.inputs['Roughness'])
            elif kind == 'normal': img.colorspace_settings.name = 'Non-Color'; nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tex.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    use_baked(mat_p, prefix + '-plumage', ('color', 'normal', 'rough')); use_baked(mat_k, prefix + '-keratin', ('color', 'normal', 'rough')); use_baked(mat_e, prefix + '-eye', ('color',))

for tier in a.tiers:
    objs = hero if (tier == 'hero' and hero) else make_tier(tier)
    weight_tier(objs, arm)
    final = []
    for key, o in objs.items():
        o.name = key; o.data.name = key; o['slot'] = SLOT[key]; o['tier'] = tier; final.append(o)
    tris = {k: geom.tri_count(o) for k, o in objs.items()}; total = sum(tris.values())
    lo, hi = geom.bounds_site(objs['plumage'])
    rep = export.export(final, os.path.join(a.out, f'{prefix}-{tier}.gltf'), armature=arm, extras={'triangles': total, 'parts': tris, 'plumageBounds': [lo, hi]})
    report['tiers'][tier] = {'triangles': total, 'parts': tris, 'bounds': [lo, hi]}
    log(f'{prefix}-{tier}: {total} tris', tris)
    for o in final: o.name = o.name + '_' + tier + '_done'   # free the names for the next tier
with open(os.path.join(a.out, 'report.json'), 'w') as f: json.dump(report, f, indent=1)
log('HEN_OK')
