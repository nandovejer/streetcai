"""Prepara el mapa de Cádiz de la pantalla de selección.
Uso: python tools/extract_map.py
Requiere: pillow, numpy, scipy, opencv-python-headless.

El mapa original trae pintado un cursor "1P" en La Viña. Se borra (inpainting) porque el juego
dibuja sus propios cursores, que se mueven entre los luchadores.
"""
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi

SRC = 'documentacion/mapa-cadiz-interactivo.png'
OUT = 'public/assets/ui/map-cadiz.webp'
MARKER_BOX = (480, 600, 530, 640)  # y0, y1, x0, x1 del cursor pintado

a = np.array(Image.open(SRC).convert('RGB'))
y0, y1, x0, x1 = MARKER_BOX
reg = a[y0:y1, x0:x1].astype(int)
r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
blue = (b > r + 60) & (b > g + 30)
m = ndi.binary_fill_holes(ndi.binary_dilation(blue, iterations=3))
mask = np.zeros(a.shape[:2], np.uint8)
mask[y0:y1, x0:x1] = m * 255
out = cv2.inpaint(cv2.cvtColor(a, cv2.COLOR_RGB2BGR), mask, 6, cv2.INPAINT_TELEA)
out = Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))
# a la escala del juego (~0,26) basta con la mitad de resolución
out = out.resize((out.width // 2, out.height // 2), Image.LANCZOS)
out.save(OUT, 'WEBP', quality=90, method=6)
print(OUT, out.size)
