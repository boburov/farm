"""Feather card atlas: 8 cells (2 rows x 4) of 512 px in a 2048x1024 sheet, drawn at 4x and downsampled.
Cells: primary, secondary, covert, sickle, hackle, saddle, down, tailmain. Root at the bottom of each cell, tip at the top.
Outputs assets/textures/hen-cards.png (RGBA) and hen-cards-normal.png; build-assets/pack converts to WebP.
Run with the system python3 (needs Pillow): python3 scripts/feather-atlas.py
"""
import math, random, os
from PIL import Image, ImageDraw, ImageFilter
random.seed(719)
SS = 4; CELL = 512; W, H = CELL * 4, CELL * 2
rgba = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0)); height = Image.new('L', (W * SS, H * SS), 0)
CELLS = ['primary', 'secondary', 'covert', 'sickle', 'hackle', 'saddle', 'down', 'tailmain']
SHAPES = {  # (outer vane width, inner vane width, tip rounding, rachis curve, barb angle deg, barb count, split chance, softness)
    'primary': (.26, .40, .35, .06, 34, 150, .06, .0), 'secondary': (.34, .42, .55, .03, 38, 140, .05, .0), 'covert': (.44, .44, .75, .0, 44, 110, .04, .1),
    'sickle': (.22, .30, .30, .14, 32, 170, .05, .0), 'hackle': (.30, .30, .25, .02, 26, 120, .03, .05), 'saddle': (.36, .36, .60, .02, 40, 120, .04, .15),
    'down': (.46, .46, .90, .0, 55, 90, .30, .6), 'tailmain': (.40, .40, .50, .05, 38, 160, .04, .0)}
def cell_origin(i): return ((i % 4) * CELL * SS, (i // 4) * CELL * SS)
for i, name in enumerate(CELLS):
    ox, oy = cell_origin(i); S = CELL * SS; wo, wi, tipr, curve, ang, nb, split, soft = SHAPES[name]
    def rachis(s):  # s: 0 root .. 1 tip -> (x, y) in cell pixels (y down)
        x = ox + S * (0.5 + curve * math.sin(math.pi * s) * 1.0); y = oy + S * (0.97 - s * 0.94); return x, y
    def width(s, side):  # half width of the vane at s
        base = wo if side > 0 else wi
        profile = math.sin(math.pi * min(1.0, s * 0.92 + 0.08)) ** (0.55 + tipr * 0.6) * (1 - 0.15 * s)
        return base * S * 0.5 * profile
    d = ImageDraw.Draw(rgba); dh = ImageDraw.Draw(height)
    # vane fill (alpha) as a polygon with slight roughness, then barbs drawn as lines to give the striations
    pts_r, pts_l = [], []
    for k in range(121):
        s = k / 120; x, y = rachis(s); wr, wl = width(s, 1), width(s, -1)
        j = (random.random() - .5) * S * 0.006 * (1 + soft * 4)
        pts_r.append((x + wr + j, y)); pts_l.append((x - wl - j, y))
    poly = pts_r + pts_l[::-1]
    if soft < .5: d.polygon(poly, fill=(238, 232, 220, int(255 * (1 - soft * .4))))
    # barbs: lines from the rachis outward toward the tip, with gaps (splits) and per-barb shade
    for side in (1, -1):
        n = nb; skip = 0
        for k in range(n):
            s = 0.06 + (k / n) * 0.92
            if random.random() < split: skip = random.randint(2, 5)
            if skip > 0: skip -= 1; continue
            x0, y0 = rachis(s); w = width(s, side)
            a = math.radians(ang + (random.random() - .5) * 6); length = w / max(0.35, math.cos(a)) * 0.98
            wav = (random.random() - .5) * S * 0.004
            x1 = x0 + side * length * math.cos(a) + wav; y1 = y0 - length * math.sin(a) * 0.55
            shade = 205 + int(random.random() * 45); alpha = 255 if soft < .5 else int(120 + random.random() * 100)
            d.line([(x0, y0), (x1, y1)], fill=(shade + 20, shade + 12, shade, alpha), width=max(1, int(S * 0.0035)))
            dh.line([(x0, y0), (x1, y1)], fill=int(90 + random.random() * 50), width=max(1, int(S * 0.003)))
    # rachis: tapered dark line + height ridge
    for k in range(60):
        s0, s1 = k / 60, (k + 1) / 60; (x0, y0), (x1, y1) = rachis(s0), rachis(s1); wdt = max(1, int(S * 0.02 * (1 - s0 * 0.85)))
        d.line([(x0, y0), (x1, y1)], fill=(214, 200, 176, 255), width=wdt); dh.line([(x0, y0), (x1, y1)], fill=230, width=wdt)
    # soft edge / tip darkening
    tip = rachis(1.0); d.ellipse([tip[0] - S * .03, tip[1] - S * .02, tip[0] + S * .03, tip[1] + S * .02], fill=(200, 196, 188, 200))
alpha = rgba.split()[3].filter(ImageFilter.GaussianBlur(SS * 0.9)); rgba.putalpha(alpha)
small = rgba.resize((W, H), Image.LANCZOS)
# bleed colour into transparent texels so mipmaps do not darken the edges
rgb = small.convert('RGB'); a = small.split()[3]
bled = rgb.copy(); mask = a.point(lambda v: 255 if v > 8 else 0)
for _ in range(6):
    blurred = bled.filter(ImageFilter.BoxBlur(2)); bled = Image.composite(bled, blurred, mask); mask = mask.filter(ImageFilter.MaxFilter(5))
out = bled.copy(); out.putalpha(a)
os.makedirs('assets/textures', exist_ok=True); out.save('assets/textures/hen-cards.png')
# normal map from the height field
hs = height.filter(ImageFilter.GaussianBlur(SS * 0.6)).resize((W, H), Image.LANCZOS)
px = hs.load(); nm = Image.new('RGB', (W, H)); npx = nm.load(); k = 3.0
for y in range(H):
    for x in range(W):
        dx = (px[(x + 1) % W, y] - px[(x - 1) % W, y]) / 255 * k; dy = (px[x, (y + 1) % H] - px[x, (y - 1) % H]) / 255 * k
        l = math.sqrt(dx * dx + dy * dy + 1); npx[x, y] = (int((-dx / l * .5 + .5) * 255), int((dy / l * .5 + .5) * 255), int((1 / l * .5 + .5) * 255))
nm.save('assets/textures/hen-cards-normal.png'); print('atlas written', out.size)
