"""Extrae los frames de las láminas de documentacion/ a atlas transparentes + JSON.
Uso: python tools/extract_sprites.py [contact_sheet_dir]
Requiere: pillow, numpy, scipy.

Dos tipos de lámina:
  - 'chroma': fondo verde croma (preferida, mejor recorte).
  - 'dark':   fondo azul oscuro (láminas originales).
"""
import json, sys
from PIL import Image
import numpy as np
from scipy import ndimage as ndi

SOURCES = {
    'ares_chroma': ('documentacion/fighter-ares-chroma.png', 'chroma'),
    'chapa_chroma': ('documentacion/fighter-chapa-chroma.png', 'chroma'),
    'ares_dark': ('documentacion/fighter-ares.png', 'dark'),
}

# fila: (fuente, y0, y1, x0, x1, nframes, escala)
FIGHTERS = {
    'ares': {
        'portrait': ('ares_chroma', 18, 82, 232, 284),
        'rows': {
            'idle':     ('ares_chroma', 36, 182, 550, 1300, 8, 1.0),
            'walk':     ('ares_chroma', 232, 385, 550, 1300, 8, 1.0),
            # En la lámina croma de Ares solo idle y walk respetan el diseño: en puño/patada aparecen
            # capucha, manga azul y zapatillas, y en salto/hit/KO lleva la chaqueta azul de Chapa.
            # Esas filas se mantienen de la lámina original para que no cambie de ropa al pelear.
            'punch':    ('ares_dark', 535, 668, 20, 640, 6, 1.135),
            'kick':     ('ares_dark', 535, 668, 670, 1340, 6, 1.135),
            'jump':     ('ares_dark', 677, 830, 20, 610, 6, 1.135),
            'jumpkick': ('ares_dark', 700, 830, 670, 1370, 6, 1.135),
            'hit':      ('ares_dark', 859, 965, 20, 630, 6, 1.135),
            'ko':       ('ares_dark', 862, 965, 670, 1370, 5, 1.135),
        },
    },
    'chapa': {
        'portrait': ('chapa_chroma', 18, 88, 246, 262),
        'rows': {
            'idle':     ('chapa_chroma', 38, 188, 535, 1305, 8, 1.0),
            'walk':     ('chapa_chroma', 242, 392, 535, 1315, 8, 1.0),
            'punch':    ('chapa_chroma', 530, 658, 20, 640, 6, 1.12),
            'kick':     ('chapa_chroma', 530, 658, 650, 1345, 6, 1.12),
            'jump':     ('chapa_chroma', 660, 818, 20, 640, 6, 1.12),
            'jumpkick': ('chapa_chroma', 668, 818, 650, 1370, 6, 1.12),
            'hit':      ('chapa_chroma', 850, 960, 20, 640, 6, 1.12),
            'ko':       ('chapa_chroma', 850, 960, 650, 1370, 5, 1.12),
        },
    },
}

_cache = {}
def load(src):
    if src not in _cache:
        path, mode = SOURCES[src]
        _cache[src] = (np.array(Image.open(path).convert('RGB')).astype(np.int32), mode)
    return _cache[src]

def green(reg):
    r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
    return (g > r + 30) & (g > b + 30)

def cut_frames(reg, mode, n, tag):
    """Devuelve lista de (rgba, ancla_x) ordenada de izquierda a derecha."""
    r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
    if mode == 'chroma':
        fg = ~green(reg)
    else:
        fg = (reg.max(axis=2) > 44) | (b > 37)
    lab, k = ndi.label(ndi.binary_dilation(fg, iterations=2))
    areas = ndi.sum(fg, lab, range(1, k + 1))
    objs = ndi.find_objects(lab)
    order = np.argsort(areas)[::-1]
    bodies = sorted(order[:n], key=lambda i: objs[i][1].start)
    if len(bodies) != n or areas[order[n - 1]] < 500:
        print(f'WARN {tag}: cuerpos={len(bodies)} areas={sorted(areas)[-n-2:]}')
    out = []
    for bi in bodies:
        m = (lab == bi + 1) & fg
        if mode == 'dark':
            m = ndi.binary_fill_holes(m)
            outline = ndi.binary_dilation(m, iterations=1) & ~m
            full = m | outline
        else:
            # quitar motas sueltas y el halo verde del borde
            l2, k2 = ndi.label(m)
            if k2 > 1:
                a2 = ndi.sum(m, l2, range(1, k2 + 1))
                m = np.isin(l2, [i + 1 for i in range(k2) if a2[i] >= 12])
            outline = np.zeros_like(m)
            full = m
        ys, xs = np.where(full)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        sub = reg[y0:y1, x0:x1].copy()
        mm = m[y0:y1, x0:x1]
        if mode == 'chroma':
            edge = mm & ~ndi.binary_erosion(mm, iterations=2)
            spill = edge & (sub[..., 1] > np.maximum(sub[..., 0], sub[..., 2]))
            sub[spill, 1] = np.maximum(sub[..., 0], sub[..., 2])[spill]
        sub = sub.astype(np.uint8)
        a = np.zeros(sub.shape[:2], np.uint8)
        a[full[y0:y1, x0:x1]] = 255
        sub[a == 0] = 0
        rgba = np.dstack([sub, a])
        if mode == 'dark':
            rgba[outline[y0:y1, x0:x1], :3] = (12, 12, 22)
            rgba[mm & (sub.max(axis=2) < 40), :3] = (14, 14, 24)
        out.append((rgba, float(np.median(np.where(mm)[1]))))
    return out

def extract(name, cfg, contact_dir=None):
    frames_out = []
    meta = {'frames': {}, 'anims': {}}
    for anim, (src, y0, y1, x0, x1, n, scale) in cfg['rows'].items():
        im, mode = load(src)
        names = []
        for fi, (rgba, ax) in enumerate(cut_frames(im[y0:y1, x0:x1], mode, n, f'{name}/{anim}')):
            frames_out.append((f'{anim}_{fi}', rgba, ax, scale))
            names.append(f'{anim}_{fi}')
        meta['anims'][anim] = names
    W = 1024; x = y = rowh = 0; pos = {}
    for fname, rgba, ax, scale in frames_out:
        h, w = rgba.shape[:2]
        if x + w + 2 > W: x = 0; y += rowh + 2; rowh = 0
        pos[fname] = (x, y); x += w + 2; rowh = max(rowh, h)
    atlas = Image.new('RGBA', (W, y + rowh), (0, 0, 0, 0))
    for fname, rgba, ax, scale in frames_out:
        px, py = pos[fname]; h, w = rgba.shape[:2]
        atlas.paste(Image.fromarray(rgba, 'RGBA'), (px, py))
        meta['frames'][fname] = {'x': px, 'y': py, 'w': w, 'h': h, 'ax': round(ax, 1), 's': scale}
    out = f'public/assets/fighters/{name}'
    atlas.save(f'{out}/atlas.png', optimize=True)
    json.dump(meta, open(f'{out}/atlas.json', 'w'))
    # retrato con fondo transparente
    src, px0, py0, px1, py1 = cfg['portrait']
    im, mode = load(src)
    reg = im[py0:py1, px0:px1]
    alpha = np.where(green(reg), 0, 255).astype(np.uint8) if mode == 'chroma' else np.full(reg.shape[:2], 255, np.uint8)
    rgb = reg.astype(np.uint8); rgb[alpha == 0] = 0
    Image.fromarray(np.dstack([rgb, alpha]), 'RGBA').save(f'{out}/portrait.png')
    if contact_dir:
        cs = Image.new('RGB', (1300, 8 * 190), (150, 40, 150))
        for ri, (anim, names) in enumerate(meta['anims'].items()):
            for ci, fname in enumerate(names):
                f = meta['frames'][fname]
                spr = atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
                s = f['s']
                spr = spr.resize((round(f['w'] * s), round(f['h'] * s)), Image.NEAREST)
                cx = 90 + ci * 155; gy = ri * 190 + 180
                cs.paste(spr, (round(cx - f['ax'] * s), gy - spr.size[1]), spr)
        cs.save(f'{contact_dir}/contact_{name}.png')
    print(name, 'atlas', atlas.size, len(frames_out), 'frames')

if __name__ == '__main__':
    cd = sys.argv[1] if len(sys.argv) > 1 else None
    for n, c in FIGHTERS.items():
        extract(n, c, cd)
    bg = Image.open('documentacion/bg-plaza-flores.png').convert('RGB').crop((0, 0, 1536, 872))
    bg.save('public/assets/stages/plaza/bg.webp', quality=90, method=6)
    print('bg ok', bg.size)
