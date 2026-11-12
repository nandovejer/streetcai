"""Recorta los retratos de derrota (fondo croma verde) para la pantalla de CONTINUE.
Uso: python tools/extract_defeated.py
Requiere: pillow, numpy, scipy.
"""
from PIL import Image
import numpy as np
from scipy import ndimage as ndi

SOURCES = {
    'ares': 'documentacion/ares-derrotado.png',
    'chapa': 'documentacion/chapa-derrotado.png',
}
OUT_W = 420  # ancho final (px); se dibuja suavizado a ~210 px lógicos


def extract(fid, path):
    reg = np.array(Image.open(path).convert('RGB')).astype(np.int32)
    r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
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
    spill = edge & (sub[..., 1] > np.maximum(sub[..., 0], sub[..., 2]))
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
