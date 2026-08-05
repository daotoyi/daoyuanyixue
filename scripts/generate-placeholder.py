#!/usr/bin/env python3
"""生成道元易学占位图 (太极/六爻符号风格)

- product-NN.png  商品图 400x400 (太极)
- course-NN.png   课程封面 600x400 (六爻)
- live-NN.png     直播封面 600x400 (六爻 + 渐变底)

配色: 古铜金 / 深檀褐 / 淡金 / 朱砂 / 黛青 / 绿玉
"""
from PIL import Image, ImageDraw
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "static" / "placeholder"
OUT.mkdir(parents=True, exist_ok=True)

PAPER = (255, 252, 245, 255)
CREAM = (247, 240, 227, 255)
GOLD = (133, 77, 14, 255)
DARK = (69, 26, 3, 255)
LIGHTGOLD = (201, 169, 106, 255)
CINNABAR = (163, 45, 45, 255)
GREEN = (91, 107, 58, 255)
INK = (61, 50, 38, 255)

TAIJI_COMBOS = [
    (GOLD, PAPER), (DARK, CREAM), (CINNABAR, PAPER),
    (LIGHTGOLD, CREAM), (GREEN, CREAM), (INK, CREAM),
]
LIVE_COMBOS = [
    (GOLD, CREAM), (DARK, CREAM), (CINNABAR, CREAM),
]


def draw_taiji(draw, cx, cy, r, a, b):
    """阴阳太极图"""
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=a)
    draw.pieslice([cx - r, cy - r, cx + r, cy + r], 90, 270, fill=b)
    draw.ellipse([cx - r / 2, cy - r, cx + r / 2, cy + r], fill=a)
    draw.ellipse([cx - r / 2, cy, cx + r / 2, cy + r], fill=b)
    # 鱼眼
    er = r // 6
    draw.ellipse([cx - er, cy - r // 2 - er, cx + er, cy - r // 2 + er], fill=b)
    draw.ellipse([cx - er, cy + r // 2 - er, cx + er, cy + r // 2 + er], fill=a)


def draw_liuyao(draw, x0, x1, cy, color, broken=(2, 4, 6)):
    """六爻符号: 自下而上六条爻, 阳=连续, 阴=断开"""
    seg = (x1 - x0) / 6
    gap = 14
    for i in range(6):
        y = cy + (3 - i) * (gap + 6)  # 中间对称
        yy = cy + (i - 2.5) * (gap + 6)
        if (i + 1) in broken:
            m = (x0 + x1) / 2
            draw.line([(x0, yy), (m - 12, yy)], fill=color, width=7)
            draw.line([(m + 12, yy), (x1, yy)], fill=color, width=7)
        else:
            draw.line([(x0, yy), (x1, yy)], fill=color, width=7)


def product(name, idx):
    w = h = 400
    img = Image.new("RGBA", (w, h), PAPER)
    draw = ImageDraw.Draw(img)
    # 底纹: 四角淡色
    draw.rectangle([10, 10, w - 10, h - 10], outline=GOLD, width=3)
    a, b = TAIJI_COMBOS[idx % len(TAIJI_COMBOS)]
    draw_taiji(draw, w // 2, h // 2, 120, a, b)
    img.save(OUT / name, "PNG")
    print(f"  OK {name}")


def banner(name, idx, size, live=False):
    w, h = size
    img = Image.new("RGBA", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, w - 10, h - 10], outline=GOLD, width=3)
    a, b = LIVE_COMBOS[idx % len(LIVE_COMBOS)]
    draw_liuyao(draw, w // 2 - 150, w // 2 + 150, h // 2 + 40, a)
    # 中央竖排小太极
    draw_taiji(draw, w // 2, h // 2 - 30, 40, a, b)
    img.save(OUT / name, "PNG")
    print(f"  OK {name}")


for i in range(1, 13):
    product(f"product-{i:02d}.png", i - 1)

for i in range(1, 7):
    banner(f"course-{i:02d}.png", i - 1, (600, 400))

for i in range(1, 4):
    banner(f"live-{i:02d}.png", i - 1, (600, 400))

print("done")
