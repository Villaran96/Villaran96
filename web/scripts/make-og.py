#!/usr/bin/env python3
"""Genera assets/og.jpg (1200x630), la imagen que se ve al compartir la web en WhatsApp o redes.

Usa scripts/og-card.png, un fotograma de la tarjeta 3D de la propia web sobre el escenario negro.
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT.parent / "editor/public/fonts/InterTight-var.woff2"
W, H = 1200, 630
NIGHT, FG, FG2 = (0, 0, 0), (245, 245, 247), (134, 134, 139)
BRAND_A, BRAND_B = (26, 140, 203), (31, 158, 95)


def font(size, weight):
    f = ImageFont.truetype(str(FONT), size)
    f.set_variation_by_name(weight)
    return f


def gradient_text(img, xy, text, fnt):
    """Texto con el degradado de la marca (de azul a verde, de izquierda a derecha)."""
    x, y = xy
    left, top, right, bottom = fnt.getbbox(text)
    w, h = right, bottom
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).text((0, 0), text, font=fnt, fill=255)
    grad = Image.new("RGB", (w, h))
    gd = ImageDraw.Draw(grad)
    for i in range(w):
        t = i / max(1, w - 1)
        gd.line([(i, 0), (i, h)], fill=tuple(round(a + (b - a) * t) for a, b in zip(BRAND_A, BRAND_B)))
    img.paste(grad, (x, y), mask)


img = Image.new("RGB", (W, H), NIGHT)
card = Image.open(ROOT / "scripts/og-card.png").convert("RGB").resize((660, 660), Image.LANCZOS)
# Funde los bordes del fotograma con el negro del fondo: el mínimo de tres rampas (izquierda, arriba y abajo).
def ramp(size, length, axis, reverse=False):
    m = Image.new("L", size, 255)
    d = ImageDraw.Draw(m)
    for i in range(length):
        v = round(255 * i / length)
        j = (size[axis] - 1 - i) if reverse else i
        d.line([(j, 0), (j, size[1])] if axis == 0 else [(0, j), (size[0], j)], fill=v)
    return m


fade = ImageChops.darker(ramp(card.size, 180, 0), ImageChops.darker(ramp(card.size, 90, 1), ramp(card.size, 90, 1, True)))
img.paste(card, (W - 660 + 40, (H - 660) // 2), fade)

draw = ImageDraw.Draw(img)
x = 72
draw.text((x, 150), "Tarjeta NFC de reseñas", font=font(26, "SemiBold"), fill=FG)
draw.text((x, 196), "Un toque.", font=font(84, "Bold"), fill=FG)
gradient_text(img, (x, 290), "Una reseña.", font(84, "Bold"))
draw.text((x, 410), "Personalizadas con tu marca.", font=font(26, "Medium"), fill=FG2)
draw.text((x, 446), "Venta al por mayor desde 25 unidades.", font=font(26, "Medium"), fill=FG2)

mark = Image.open(ROOT / "assets/logo-mark.png").convert("RGBA")
mark.thumbnail((44, 44), Image.LANCZOS)
img.paste(mark, (x, 532), mark)
draw.text((x + mark.width + 12, 554), "Cierzo NFC", font=font(26, "SemiBold"), fill=FG, anchor="lm")

img.save(ROOT / "assets/og.jpg", quality=88, optimize=True, progressive=True)
print("assets/og.jpg")
