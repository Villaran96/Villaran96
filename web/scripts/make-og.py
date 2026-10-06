#!/usr/bin/env python3
"""Genera assets/og.jpg (1200x630), la imagen que se ve al compartir la web en WhatsApp o redes."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT.parent / "editor/public/fonts/InterTight-var.woff2"
W, H = 1200, 630
SURFACE, SALVIA, SALVIA_SOFT, INK, INK_MUTED = "#f5f2ea", "#3b6b52", "#dbe7dd", "#18211b", "#56635a"


def font(size, weight):
    f = ImageFont.truetype(str(FONT), size)
    f.set_variation_by_name(weight)
    return f


img = Image.new("RGB", (W, H), SURFACE)
draw = ImageDraw.Draw(img)

# Escenario verde salvia a la derecha con la tarjeta.
stage = (640, 40, 1160, 590)
draw.rounded_rectangle(stage, radius=40, fill=SALVIA_SOFT)
for r in (190, 260):
    cx, cy = (stage[0] + stage[2]) // 2, (stage[1] + stage[3]) // 2
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline="#c4d6c8", width=2)

card = Image.open(ROOT / "assets/diseno.jpg").convert("RGB").resize((360, 360), Image.LANCZOS)
mask = Image.new("L", card.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, *card.size), radius=22, fill=255)
card.putalpha(mask)
card = card.rotate(-5, resample=Image.BICUBIC, expand=True)

shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sx, sy = 900 - card.width // 2, 315 - card.height // 2
shadow.paste((24, 33, 27, 90), (sx + 10, sy + 26), card.split()[3])
shadow = shadow.filter(ImageFilter.GaussianBlur(22))
img.paste(shadow, (0, 0), shadow)
img.paste(card, (sx, sy), card)

# Texto a la izquierda.
x = 64
badge = font(20, "SemiBold")
draw.rounded_rectangle((x, 88, x + 32 + badge.getlength("Venta al por mayor"), 124), radius=18, fill=SALVIA_SOFT)
draw.text((x + 16, 106), "Venta al por mayor", font=badge, fill=SALVIA, anchor="lm")
draw.text((x, 150), "Más reseñas", font=font(66, "Bold"), fill=INK)
draw.text((x, 224), "en Google.", font=font(66, "Bold"), fill=INK)
draw.text((x, 298), "Con un toque.", font=font(66, "Bold"), fill=SALVIA)
draw.text((x, 400), "Tarjetas NFC de acrílico con tu marca,", font=font(26, "Regular"), fill=INK_MUTED)
draw.text((x, 436), "programadas para cada negocio.", font=font(26, "Regular"), fill=INK_MUTED)
draw.text((x, 530), "Cierzo", font=font(34, "Bold"), fill=INK)
draw.text((x + font(34, "Bold").getlength("Cierzo "), 530), "NFC", font=font(34, "Bold"), fill=SALVIA)

img.save(ROOT / "assets/og.jpg", quality=88, optimize=True, progressive=True)
print("assets/og.jpg")
