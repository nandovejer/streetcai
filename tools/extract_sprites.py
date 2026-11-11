"""Extrae los frames de las láminas de documentacion/ a atlas transparentes + JSON.
Uso: python tools/extract_sprites.py [contact_sheet_dir]
Requiere: pillow, numpy, scipy.
"""
import json, sys
from PIL import Image
import numpy as np
from scipy import ndimage as ndi

# regiones (y0, y1, x0, x1, nframes, escala, quitar_chispas) por animación
SHEETS = {
    'ares': {
        'src': 'documentacion/fighter-ares.png',
        'portrait': (20, 84, 234, 294),
        'scale_low': 1.16,
        'rows': {
            'idle':     (28, 180, 555, 1295, 8, 1.0, False),
            'walk':     (232, 390, 555, 1300, 8, 1.0, False),
            'punch':    (535, 668, 20, 640, 6, None, False),
            'kick':     (535, 668, 670, 1340, 6, None, False),
            'jump':     (672, 830, 20, 610, 6, None, False),
            'jumpkick': (700, 830, 670, 1370, 6, None, False),
            'hit':      (859, 965, 20, 630, 6, None, True),
            'ko':       (862, 965, 670, 1370, 5, None, True),
        },
    },
    'chapa': {
        'src': 'documentacion/fighter-chapa.png',
        'portrait': (28, 95, 236, 251),
        'scale_low': 1.2,
        'rows': {
            'idle':     (45, 192, 555, 1300, 8, 1.0, False),
            'walk':     (248, 392, 555, 1315, 8, 1.0, False),
            'punch':    (508, 634, 20, 645, 6, None, False),
            'kick':     (505, 634, 670, 1340, 6, None, False),
            'jump':     (650, 800, 20, 610, 6, None, False),
            'jumpkick': (672, 800, 670, 1370, 6, None, False),
            'hit':      (848, 958, 20, 630, 6, None, True),
            'ko':       (850, 958, 670, 1370, 5, None, True),
        },
    },
}

def extract(name, cfg, contact_dir=None):
    im = np.array(Image.open(cfg['src']).convert('RGB')).astype(np.int32)
    frames_out = []
    meta = {'frames': {}, 'anims': {}}
    for anim, (y0, y1, x0, x1, n, scale, despark) in cfg['rows'].items():
        if scale is None: scale = cfg['scale_low']
        reg = im[y0:y1, x0:x1]
        r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
        mx = reg.max(axis=2)
        fg = (mx > 44) | (b > 37)
        # líneas de panel / texto fuera: se filtran por tamaño después
        if despark:
            spark = (r > 228) & (g > 150) & (b < 105)
            spark |= (r > 228) & (g > 95) & (b < 60)
            spark |= (r > 240) & (g > 232) & (b > 150) & (b < 235)
            fg &= ~spark
        fg = ndi.binary_opening(fg, iterations=1) | fg  # mantener
        grow = ndi.binary_dilation(fg, iterations=2)
        lab, k = ndi.label(grow)
        areas = ndi.sum(fg, lab, range(1, k + 1))
        objs = ndi.find_objects(lab)
        order = np.argsort(areas)[::-1]
        bodies = sorted([i for i in order[:n]], key=lambda i: objs[i][1].start)
        if len(bodies) != n or areas[order[n - 1]] < 500:
            print(f'WARN {name}/{anim}: cuerpos={len(bodies)} areas={sorted(areas)[-n-2:]}')
        names = []
        for fi, bi in enumerate(bodies):
            m = (lab == bi + 1) & fg
            m = ndi.binary_fill_holes(m)
            # contorno oscuro de 1px
            outline = ndi.binary_dilation(m, iterations=1) & ~m
            full = m | outline
            ys, xs = np.where(full)
            by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            sub = reg[by0:by1, bx0:bx1].astype(np.uint8)
            a = np.zeros(sub.shape[:2], np.uint8)
            a[full[by0:by1, bx0:bx1]] = 255
            sub[a == 0] = 0
            rgba = np.dstack([sub, a])
            ol = outline[by0:by1, bx0:bx1]
            rgba[ol, :3] = (12, 12, 22)
            mm = m[by0:by1, bx0:bx1]
            dark = mm & (sub.max(axis=2) < 40)
            rgba[dark, :3] = (14, 14, 24)
            # ancla: mediana x de la masa, base = pies
            mxs = np.where(mm)[1]
            ax = float(np.median(mxs))
            frames_out.append((f'{anim}_{fi}', rgba, ax, scale))
            names.append(f'{anim}_{fi}')
        meta['anims'][anim] = names
    # empaquetar atlas en filas
    W = 1024; x = y = rowh = 0; pos = {}
    for fname, rgba, ax, scale in frames_out:
        h, w = rgba.shape[:2]
        if x + w + 2 > W: x = 0; y += rowh + 2; rowh = 0
        pos[fname] = (x, y); x += w + 2; rowh = max(rowh, h)
    H = y + rowh
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for fname, rgba, ax, scale in frames_out:
        px, py = pos[fname]; h, w = rgba.shape[:2]
        atlas.paste(Image.fromarray(rgba, 'RGBA'), (px, py))
        meta['frames'][fname] = {'x': px, 'y': py, 'w': w, 'h': h, 'ax': round(ax, 1), 's': scale}
    out = f'public/assets/fighters/{name}'
    atlas.save(f'{out}/atlas.png', optimize=True)
    json.dump(meta, open(f'{out}/atlas.json', 'w'))
    px0, py0, px1, py1 = cfg['portrait']
    Image.open(cfg['src']).convert('RGB').crop((px0, py0, px1, py1)).save(f'{out}/portrait.png')
    if contact_dir:
        # hoja de contacto sobre magenta para validar transparencia y anclas
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
    for n, c in SHEETS.items():
        extract(n, c, cd)
    bg = Image.open('documentacion/bg-plaza-flores.png').convert('RGB').crop((0, 0, 1536, 872))
    bg.save('public/assets/stages/plaza/bg.webp', quality=90, method=6)
    print('bg ok', bg.size)
