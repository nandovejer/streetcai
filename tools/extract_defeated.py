"""Recorta los retratos de derrota (fondo croma verde) para la pantalla de CONTINUE.
Uso: python tools/extract_defeated.py
Requiere: pillow, numpy, scipy.
"""
from PIL import Image
import numpy as np
from scipy import ndimage as ndi

SOURCES = {
    'ares': 'assets/ares-derrotado.webp',
    'chapa': 'assets/chapa-derrotado.webp',
    'alba': 'assets/alba-derrotado.webp',
    'martin': 'assets/martin-derrotado.webp',
    'selu': 'assets/selu-derrotado.webp',
    'canijo': 'assets/canijo-derrotado.webp',
    'bizcocho': 'assets/bizcocho-derrotado.webp',
    'heredero': 'assets/heredero-derrotado.webp',
}
# Personajes con verde propio (Canijo es un ogro; Bizcocho lleva un lazo verde): solo se quita el verde
# croma saturado, y lo que quede encerrado dentro de la silueta se rellena.
STRICT = {'canijo', 'bizcocho', 'heredero'}
# Con piel verde (Canijo) el borde solo pierde el verde muy saturado; al resto se le quita todo el verde del halo.
GREEN_SKIN = {'canijo'}
# Rellenar huecos de verde propio solo donde hace falta (el lazo de Bizcocho); en Canijo son huecos de la tiara.
FILL_OWN_GREEN = {'bizcocho'}
OUT_W = 420  # ancho final (px); se dibuja suavizado a ~210 px lógicos


def extract(fid, path):
    reg = np.array(Image.open(path).convert('RGB')).astype(np.int32)
    r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
    if fid in STRICT:
        fg = ~((g > 150) & (g > 2 * np.maximum(r, b) + 20))
        # huecos encerrados en la silueta: si su verde medio es el del croma (~3,219,3) son fondo entre
        # mechones; si es más apagado (~30,180,30) es verde del propio personaje (el lazo) y se queda
        holes, nh = ndi.label(ndi.binary_fill_holes(fg) & ~fg)
        if nh and fid in FILL_OWN_GREEN:
            mean_g = ndi.mean(g, holes, range(1, nh + 1))
            fg |= np.isin(holes, [i + 1 for i in range(nh) if mean_g[i] < 205])
    else:
        fg = ~((g > r + 30) & (g > b + 30))
    lab, k = ndi.label(fg)
    areas = ndi.sum(fg, lab, range(1, k + 1))
    m = lab == (int(np.argmax(areas)) + 1)
    ys, xs = np.where(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sub = reg[y0:y1, x0:x1].copy()
    mm = m[y0:y1, x0:x1]
    # quitar el halo verde del borde
    edge = mm & ~ndi.binary_erosion(mm, iterations=3)
    mx = np.maximum(sub[..., 0], sub[..., 2])
    spill = edge & (sub[..., 1] > (1.45 * mx + 25 if fid in GREEN_SKIN else mx))
    sub[spill, 1] = np.maximum(sub[..., 0], sub[..., 2])[spill]
    rgba = np.dstack([sub.astype(np.uint8), (mm * 255).astype(np.uint8)])
    rgba[~mm, :3] = 0
    im = Image.fromarray(rgba, 'RGBA')
    h = round(im.height * OUT_W / im.width)
    im = im.resize((OUT_W, h), Image.LANCZOS)
    out = f'public/assets/fighters/{fid}/defeated.webp'
    im.save(out, 'WEBP', quality=90, method=6)
    print(out, im.size)


if __name__ == '__main__':
    for fid, path in SOURCES.items():
        extract(fid, path)
