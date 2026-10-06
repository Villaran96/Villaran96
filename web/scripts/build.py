#!/usr/bin/env python3
"""Genera index.html (la web lista para subir a tu dominio) a partir de page.html.

page.html es la misma página que se publica como vista previa: sin <head> propio.
Este script le pone la cabecera completa (SEO, imagen para compartir, favicon)
y carga config.js, donde se configuran el formulario y los enlaces de pago.

Uso:
    python3 scripts/build.py                          # enlaces relativos
    python3 scripts/build.py --site https://cierzonfc.es
"""
import argparse
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TITLE = "Tarjetas NFC de reseñas al por mayor | Cierzo NFC"
DESCRIPTION = (
    "Tarjetas NFC de acrílico personalizadas con tu marca y programadas con el enlace "
    "de reseñas de cada negocio. Venta al por mayor desde 25 unidades."
)
# Debe coincidir con los tramos de precios de page.html (sin IVA).
PRICES = {"low": 4, "high": 9}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", default="", help="URL pública de la web, p. ej. https://cierzonfc.es")
    args = parser.parse_args()
    site = args.site.rstrip("/")

    page = (ROOT / "page.html").read_text(encoding="utf-8")
    # El <title> de la vista previa se sustituye por el de la web publicada.
    page = re.sub(r"<title>.*?</title>\s*", "", page, count=1, flags=re.S)
    # Fuentes y estilos van a la cabecera para que no haya parpadeo.
    head_assets = re.findall(r"<link [^>]*>\s*", page[: page.index("</style>")])
    for tag in head_assets:
        page = page.replace(tag, "", 1)
    style_end = page.index("</style>") + len("</style>")
    style = page[page.index("<style>") : style_end]
    body = page[:page.index("<style>")] + page[style_end:]

    def url(path: str) -> str:
        return f"{site}/{path}" if site else path

    product = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Tarjeta NFC de reseñas personalizada",
        "description": DESCRIPTION,
        "image": url("assets/diseno.jpg"),
        "brand": {"@type": "Brand", "name": "Cierzo NFC"},
        "material": "Acrílico de 3 mm con adhesivo",
        "offers": {
            "@type": "AggregateOffer",
            "priceCurrency": "EUR",
            "lowPrice": PRICES["low"],
            "highPrice": PRICES["high"],
            "eligibleQuantity": {"@type": "QuantitativeValue", "minValue": 25},
        },
    }

    meta = [
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
        f"<title>{html.escape(TITLE)}</title>",
        f'<meta name="description" content="{html.escape(DESCRIPTION)}">',
        '<meta name="theme-color" content="#f5f2ea" media="(prefers-color-scheme: light)">',
        '<meta name="theme-color" content="#121815" media="(prefers-color-scheme: dark)">',
        '<link rel="icon" type="image/png" href="assets/logo-cierzo.png">',
        '<link rel="apple-touch-icon" href="assets/logo-cierzo.png">',
        '<meta property="og:type" content="website">',
        '<meta property="og:locale" content="es_ES">',
        '<meta property="og:site_name" content="Cierzo NFC">',
        f'<meta property="og:title" content="{html.escape(TITLE)}">',
        f'<meta property="og:description" content="{html.escape(DESCRIPTION)}">',
        f'<meta property="og:image" content="{url("assets/og.jpg")}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
    ]
    if site:
        meta += [f'<link rel="canonical" href="{site}/">', f'<meta property="og:url" content="{site}/">']
    meta += [tag.strip() for tag in head_assets]
    meta.append(f'<script type="application/ld+json">{json.dumps(product, ensure_ascii=False)}</script>')
    # config.js se carga antes que la página para que su configuración tenga prioridad.
    meta.append('<script src="config.js"></script>')

    doc = "\n".join(
        [
            "<!doctype html>",
            '<html lang="es">',
            "<head>",
            *meta,
            style,
            "</head>",
            "<body>",
            body.strip(),
            "</body>",
            "</html>",
            "",
        ]
    )
    (ROOT / "index.html").write_text(doc, encoding="utf-8")
    print(f"index.html ({len(doc.encode()) // 1024} KB){' para ' + site if site else ''}")


if __name__ == "__main__":
    main()
