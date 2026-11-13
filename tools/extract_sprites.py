"""Extrae los frames de las láminas de documentacion/ a atlas transparentes + JSON.
Uso: python tools/extract_sprites.py [contact_sheet_dir]
Requiere: pillow, numpy, scipy.

Dos tipos de lámina:
  - 'chroma': fondo verde croma (preferida, mejor recorte).
  - 'dark':   fondo azul oscuro (láminas originales).
  - 'pure':   croma verde puro (~0,250,0) con verde derramado sobre el personaje
              (Alba, Martín): recorte estricto + despill de todo el cuerpo.
"""
import json, sys
from PIL import Image
import numpy as np
from scipy import ndimage as ndi

SOURCES = {
    'ares_chroma': ('documentacion/fighter-ares-chroma.png', 'chroma'),
    'chapa_chroma': ('documentacion/fighter-chapa-chroma.png', 'chroma'),
    'ares_dark': ('documentacion/fighter-ares.png', 'dark'),
    'alba': ('documentacion/fighter-alba.png', 'pure'),
    'martin': ('documentacion/fighter-martin.png', 'pure'),
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
    'alba': {
        'portrait': ('alba', 15, 80, 258, 276),  # (x0, y0, x1, y1)
        'rows': {
            'idle':     ('alba', 36, 190, 530, 1310, 8, 0.93),
            'walk':     ('alba', 238, 396, 530, 1325, 8, 0.93),
            'punch':    ('alba', 518, 652, 15, 645, 6, 1.04),
            'kick':     ('alba', 518, 652, 655, 1350, 6, 1.04),
            'jump':     ('alba', 660, 815, 15, 645, 6, 1.04),
            'jumpkick': ('alba', 668, 815, 655, 1375, 6, 1.04),
            'hit':      ('alba', 842, 958, 15, 645, 6, 1.04),
            'ko':       ('alba', 842, 958, 655, 1375, 5, 1.04),
        },
    },
    'martin': {
        'portrait': ('martin', 22, 92, 224, 282),  # (x0, y0, x1, y1)
        'rows': {
            'idle':     ('martin', 46, 182, 530, 1305, 8, 1.06),
            'walk':     ('martin', 246, 392, 530, 1305, 8, 1.06),
            'punch':    ('martin', 540, 662, 20, 640, 6, 1.13),
            'kick':     ('martin', 540, 662, 650, 1345, 6, 1.13),
            'jump':     ('martin', 670, 822, 20, 640, 6, 1.13),
            'jumpkick': ('martin', 690, 822, 650, 1370, 6, 1.13),
            'hit':      ('martin', 856, 962, 20, 640, 6, 1.13),
            'ko':       ('martin', 856, 962, 650, 1370, 5, 1.13),
        },
    },
}

_cache = {}
def load(src):
    if src not in _cache:
        path, mode = SOURCES[src]
        _cache[src] = (np.array(Image.open(path).convert('RGB')).astype(np.int32), mode)
    return _cache[src]

def green(reg, mode='chroma'):
    r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
    if mode == 'pure':
        # verde puro y también la sombra verde oscura que la lámina pinta bajo los pies
        return (g > 60) & (g > 1.6 * np.maximum(r, b) + 30)
    return (g > r + 30) & (g > b + 30)

def despill(sub, mask):
    """Quita el verde derramado. Los píxeles con G dominante se recolorean a un tono cálido
    con la misma luminosidad (en estos personajes la zona manchada es piel, camisa o cuero)."""
    r, g, b = sub[..., 0].astype(float), sub[..., 1].astype(float), sub[..., 2].astype(float)
    over = mask & (g > np.maximum(r, b) + 2)
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    warm = np.stack([lum * 1.14, lum * 0.96, lum * 0.8], axis=-1)
    # mezcla progresiva: cuanto más verde, más se recolorea
    k = np.clip((g - np.maximum(r, b)) / 12.0, 0, 1)[..., None]
    mixed = sub.astype(float) * (1 - k) + warm * k
    mixed[..., 1] = np.minimum(mixed[..., 1], np.maximum(mixed[..., 0], mixed[..., 2]) + 4)
    sub[over] = np.clip(mixed[over], 0, 255).astype(sub.dtype)

def cut_frames(reg, mode, n, tag):
    """Devuelve lista de (rgba, ancla_x) ordenada de izquierda a derecha."""
    r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
    if mode in ('chroma', 'pure'):
        fg = ~green(reg, mode)
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
        if mode == 'pure':
            # quedarse con el cuerpo: fuera letras de los rótulos y chispas sueltas
            l2, k2 = ndi.label(m, structure=np.ones((3, 3)))
            if k2 > 1:
                a2 = ndi.sum(m, l2, range(1, k2 + 1))
                main = int(np.argmax(a2)) + 1
                sl = ndi.find_objects(l2)[main - 1]
                keep = [main]
                for i in range(1, k2 + 1):
                    if i == main or a2[i - 1] < 8: continue
                    cy, cx = ndi.center_of_mass(l2 == i)
                    if sl[0].start + 4 <= cy <= sl[0].stop and sl[1].start - 2 <= cx <= sl[1].stop + 2: keep.append(i)
                m = np.isin(l2, keep)
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
        if mode == 'pure':
            despill(sub, mm)
        elif mode == 'chroma':
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
    alpha = np.where(green(reg, mode), 0, 255).astype(np.uint8) if mode in ('chroma', 'pure') else np.full(reg.shape[:2], 255, np.uint8)
    reg = reg.copy()
    if mode == 'pure':
        despill(reg, alpha > 0)
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
    # Escenarios. El juego dibuja la parte inferior de la imagen a 720 px de ancho, así que el
    # recorte decide qué queda a la vista: la Plaza pierde el HUD pintado en la lámina y la Caleta
    # pierde arena del primer plano para que la cúpula del balneario entre en pantalla.
    import os
    STAGES = {
        'plaza': ('documentacion/bg-plaza-flores.png', (0, 0, 1536, 872)),
        'caleta': ('documentacion/bg-caleta.png', (0, 40, 1535, 912)),
    }
    for sid, (path, box) in STAGES.items():
        os.makedirs(f'public/assets/stages/{sid}', exist_ok=True)
        bg = Image.open(path).convert('RGB').crop(box)
        bg.save(f'public/assets/stages/{sid}/bg.webp', quality=90, method=6)
        print('bg', sid, bg.size)
