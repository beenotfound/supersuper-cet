# -*- coding: utf-8 -*-
"""Generate PWA icons in the bright collage style."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "icons"
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"

PAPER = (255, 248, 231, 255)
INK = (30, 30, 30, 255)
YELLOW = (255, 201, 60, 255)
RED = (255, 77, 77, 255)
BLUE = (46, 155, 255, 255)
TAPE = (255, 214, 120, 205)


def design(size: int, pad: float = 0.0) -> Image.Image:
    S = 1024
    img = Image.new("RGBA", (S, S), PAPER)
    d = ImageDraw.Draw(img)

    # paper dot grid
    step = 40
    for y in range(0, S, step):
        for x in range(0, S, step):
            d.ellipse((x, y, x + 5, y + 5), fill=(30, 30, 30, 24))

    # rotated sticker card
    card = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    m = int(S * (0.12 + pad))
    cd.rounded_rectangle(
        (m, m, S - m, S - m),
        radius=int(S * 0.13),
        fill=YELLOW,
        outline=INK,
        width=max(6, int(S * 0.016)),
    )
    # taped corner
    cd.polygon(
        [(int(S * 0.28), int(S * 0.09)), (int(S * 0.72), int(S * 0.05)),
         (int(S * 0.74), int(S * 0.17)), (int(S * 0.30), int(S * 0.21))],
        fill=TAPE,
    )
    card = card.rotate(-5, resample=Image.BICUBIC, center=(S // 2, S // 2))
    img.alpha_composite(card)
    d = ImageDraw.Draw(img)

    # CET lettering
    font = ImageFont.truetype(FONT_BOLD, int(S * 0.30))
    text = "CET"
    box = d.textbbox((0, 0), text, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    tx, ty = (S - tw) / 2 - box[0], (S - th) / 2 - box[1] - int(S * 0.02)
    d.text((tx + 6, ty + 6), text, font=font, fill=(0, 0, 0, 60))
    d.text((tx, ty), text, font=font, fill=INK)

    # red circle sticker with "6"
    r = int(S * 0.10)
    cx, cy = int(S * 0.79), int(S * 0.77)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=RED, outline=INK, width=max(4, int(S * 0.012)))
    small = ImageFont.truetype(FONT_BOLD, int(S * 0.11))
    b2 = d.textbbox((0, 0), "6", font=small)
    d.text((cx - (b2[2] - b2[0]) / 2 - b2[0], cy - (b2[3] - b2[1]) / 2 - b2[1] - int(S * 0.005)), "6", font=small, fill=(255, 255, 255, 255))

    # blue square accent
    q = int(S * 0.10)
    qx, qy = int(S * 0.11), int(S * 0.72)
    d.rounded_rectangle((qx, qy, qx + q, qy + q), radius=int(q * 0.25), fill=BLUE, outline=INK, width=max(4, int(S * 0.012)))

    return img.resize((size, size), Image.LANCZOS)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (512, 192, 180):
        design(size).save(OUT / f"icon-{size}.png")
    design(512, pad=0.08).save(OUT / "icon-maskable-512.png")
    print("icons written:", ", ".join(sorted(p.name for p in OUT.glob("*.png"))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
