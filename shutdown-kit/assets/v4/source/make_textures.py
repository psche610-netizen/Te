"""Build the two runtime textures of the V4 kit. Needs Python 3 + Pillow + numpy.
Run from anywhere: python source/make_textures.py

1. textures/v4-atlas.png (2048x2048, 4x4 cells of 512): the ONE shared paint atlas.
   Rows 0-1 are the original painted enamel + workwear quadrants, rows 2-3 are tints of
   them (concrete, teal, indigo, danger, frost, rust, soot, concrete-dark).
   Layout -> textures/atlas-layout.json (read by complete_library.py and the runtime).
2. textures/decals-atlas.png (2048x2048 RGBA): stencil words/codes as white alpha masks
   (tint in the material) + full-color hazard stripes/chevrons.
   Layout -> textures/decals-layout.json (pixel rects + UVs, top-left origin = glTF UVs).
"""
from pathlib import Path
import json, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
TEX = ROOT / 'textures'
FONT = ROOT / 'ui/fonts/BebasNeue-Regular.ttf'
MONO = ROOT / 'ui/fonts/ShareTechMono-Regular.ttf'
TOKENS = json.loads((ROOT / 'ui/tokens.json').read_text())['colors']
CELL, SIZE = 512, 2048
rng = np.random.default_rng(7)


def hex_rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def quadrant(img, qx, qy):
    w, h = img.size
    box = (qx * w // 2, qy * h // 2, (qx + 1) * w // 2, (qy + 1) * h // 2)
    return img.crop(box).resize((CELL, CELL), Image.LANCZOS).convert('RGB')


def tint(cell, target_hex):
    a = np.asarray(cell, dtype=np.float32)
    lum = a @ np.array([.299, .587, .114], dtype=np.float32)
    ratio = lum / max(lum.mean(), 1)
    out = hex_rgb(target_hex)[None, None, :] * ratio[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def build_atlas():
    enamel = Image.open(TEX / 'painted-enamel-atlas.png')
    cloth = Image.open(TEX / 'painted-workwear-atlas.png')
    e = {'petrol': quadrant(enamel, 0, 0), 'ivory': quadrant(enamel, 1, 0),
         'amber': quadrant(enamel, 0, 1), 'steel': quadrant(enamel, 1, 1)}
    c = {'cloth-amber': quadrant(cloth, 0, 0), 'cloth-teal': quadrant(cloth, 1, 0),
         'cloth-ivory': quadrant(cloth, 0, 1), 'cloth-black': quadrant(cloth, 1, 1)}
    derived = {
        'concrete': tint(e['ivory'], '#8c8b83'),
        'teal': tint(e['petrol'], TOKENS['teal']),
        'indigo': tint(e['steel'], TOKENS['indigo']),
        'danger': tint(e['amber'], TOKENS['danger']),
        'frost': tint(e['ivory'], '#a9c2c1'),
        'rust': tint(e['amber'], '#6e3b22'),
        'soot': tint(e['steel'], '#2b2926'),
        'concrete-dark': tint(e['ivory'], '#4b4f4d'),
    }
    order = [['petrol', 'ivory', 'amber', 'steel'],
             ['cloth-amber', 'cloth-teal', 'cloth-ivory', 'cloth-black'],
             ['concrete', 'teal', 'indigo', 'danger'],
             ['frost', 'rust', 'soot', 'concrete-dark']]
    cells = {**e, **c, **derived}
    atlas = Image.new('RGB', (SIZE, SIZE))
    layout = {'file': 'textures/v4-atlas.png', 'size': SIZE, 'cell': CELL, 'grid': 4,
              'origin': 'top-left (glTF UV); Blender UV v = 1 - v', 'pad_uv': 0.006, 'cells': {}}
    for row, names in enumerate(order):
        for col, name in enumerate(names):
            atlas.paste(cells[name], (col * CELL, row * CELL))
            layout['cells'][name] = {'col': col, 'row': row,
                                     'uv': [col / 4, row / 4, (col + 1) / 4, (row + 1) / 4]}
    atlas.save(TEX / 'v4-atlas.png', optimize=True)
    (TEX / 'atlas-layout.json').write_text(json.dumps(layout, indent=2) + '\n')
    return layout


def wear_mask(w, h, density=.10, seed=0):
    """1 = paint kept, 0 = chipped. Low-frequency noise thresholded into chips."""
    r = np.random.default_rng(seed)
    small = Image.fromarray((r.random((max(h // 6, 2), max(w // 6, 2))) * 255).astype(np.uint8))
    n = np.asarray(small.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(2)), dtype=np.float32) / 255
    fine = r.random((h, w))
    return ((n > density * 1.1) & (fine > density * .35)).astype(np.float32)


def fit_text(draw, text, box_w, box_h, font_path, pad=.12):
    size = int(box_h)
    while size > 8:
        f = ImageFont.truetype(str(font_path), size)
        l, t, r, b = draw.textbbox((0, 0), text, font=f)
        if r - l <= box_w * (1 - pad) and b - t <= box_h * (1 - pad):
            return f, (l, t, r, b)
        size -= 2
    return ImageFont.truetype(str(font_path), 8), (0, 0, 8, 8)


def stencil(text, w, h, font_path=FONT, seed=0):
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    f, (l, t, r, b) = fit_text(d, text, w, h, font_path)
    d.text(((w - (r - l)) / 2 - l, (h - (b - t)) / 2 - t), text, font=f, fill=255)
    a = np.asarray(mask, dtype=np.float32) / 255 * wear_mask(w, h, .10, seed)
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(rgba)


def hazard(w, h, period=64, seed=0):
    yy, xx = np.mgrid[0:h, 0:w]
    band = ((xx + yy) // (period // 2)) % 2 == 0
    amber, dark = hex_rgb(TOKENS['amber']), hex_rgb(TOKENS['indigo'])
    rgb = np.where(band[..., None], amber, dark)
    worn = wear_mask(w, h, .08, seed)[..., None]
    rgb = rgb * (.72 + .28 * worn)
    rgba = np.concatenate([rgb, np.full((h, w, 1), 255)], axis=2)
    return Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8))


def chevron(s, seed=0):
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    amber = tuple(int(v) for v in hex_rgb(TOKENS['amber'])) + (255,)
    m = s * .18
    d.polygon([(m, m), (s * .55, s / 2), (m, s - m), (s * .38, s - m), (s - m, s / 2), (s * .38, m)], fill=amber)
    a = np.asarray(img, dtype=np.float32)
    a[..., 3] *= wear_mask(s, s, .08, seed)
    return Image.fromarray(a.astype(np.uint8))


WORDS = [('sector', 'SECTOR'), ('turbine', 'TURBINE'), ('hall', 'HALL'), ('cold-storage', 'COLD STORAGE'),
         ('foundry', 'FOUNDRY'), ('the-core', 'THE CORE'), ('keep-clear', 'KEEP CLEAR'),
         ('authorized-only', 'AUTHORIZED ONLY')]
SLOGANS = [('slogan-shift', 'YOUR SHIFT IS NOT OVER'), ('slogan-listening', 'OVERSEER IS LISTENING')]
CODES = ['A', 'B', 'C', 'D'] + [f'{i:02}' for i in range(1, 8)] + \
        ['A1', 'B-1', 'B-2', 'C1', 'C-1', 'E1', 'E2', 'F-03', 'W-01'] + [f'G-{i:02}' for i in range(1, 9)] + \
        ['S1', 'S2', 'S3', 'CORE', 'KILL', 'EXIT', 'LOCK', 'RING 01', 'RING 02', 'RING 03']
MONO_CODES = {'LOCK', 'EXIT', 'KILL'}


def build_decals():
    atlas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    layout = {'file': 'textures/decals-atlas.png', 'size': SIZE,
              'origin': 'top-left (glTF UV)', 'kinds': {'mask': 'white alpha mask; tint with material color',
                                                        'color': 'full color, do not tint'}, 'items': {}}

    def place(key, img, x, y, kind):
        atlas.paste(img, (x, y))
        w, h = img.size
        layout['items'][key] = {'rect': [x, y, w, h], 'uv': [x / SIZE, y / SIZE, (x + w) / SIZE, (y + h) / SIZE],
                                'aspect': round(w / h, 3), 'kind': kind}

    seed = 1
    for i, (key, text) in enumerate(WORDS):  # rows 0-3: 2 words per row, 1024x256
        place(key, stencil(text, 1024, 256, seed=seed), (i % 2) * 1024, (i // 2) * 256, 'mask'); seed += 1
    for i, (key, text) in enumerate(SLOGANS):  # rows 4-5: full width
        place(key, stencil(text, 2048, 256, seed=seed), 0, 1024 + i * 256, 'mask'); seed += 1
    x, y = 0, 1536  # 128-high code tiles, three rows above the hazard row
    for text in CODES:
        w = 256 if len(text) > 4 else 128
        if x + w > SIZE:
            x, y = 0, y + 128
        assert y < 1920, 'code tiles overflow into the hazard row'
        font = MONO if text in MONO_CODES else FONT
        place('code-' + text.lower().replace(' ', '-'), stencil(text, w, 128, font, seed), x, y, 'mask'); seed += 1
        x += w
    place('hazard-strip', hazard(1792, 128, seed=seed), 0, 1920, 'color')
    place('chevron', chevron(128, seed + 1), 1792, 1920, 'color')
    place('hazard-tile', hazard(128, 128, seed=seed + 2), 1920, 1920, 'color')
    atlas.save(TEX / 'decals-atlas.png', optimize=True)
    (TEX / 'decals-layout.json').write_text(json.dumps(layout, indent=2) + '\n')
    return layout


if __name__ == '__main__':
    a = build_atlas()
    d = build_decals()
    print('atlas cells', len(a['cells']), '| decal items', len(d['items']))
