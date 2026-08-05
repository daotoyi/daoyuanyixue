#!/usr/bin/env python3
"""生成道元易学新中式 tabbar 图标 (81x81 PNG)

图标设计:
- home:   山形 (周易·山水意境)
- shop:   铜钱 (圆孔方钱, 商业)
- course: 书卷 (知识典籍)
- user:   人形 (简笔)

配色:
- 未选中: 檀褐灰 #A89A85
- 选中:   古铜金 #854D0E
"""
from PIL import Image, ImageDraw
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "static" / "tabbar"
OUT.mkdir(parents=True, exist_ok=True)

SIZE = 81
PAD = 14  # 内边距, 图形实际区域 [PAD, SIZE-PAD]

GRAY = (168, 154, 133, 255)    # #A89A85 檀褐灰
GOLD = (133, 77, 14, 255)      # #854D0E 古铜金
PAPER = (255, 252, 245, 255)   # #FFFCF5 古书纸 (tabbar 背景)


def draw_home(draw, color):
    x0, x1 = PAD + 4, SIZE - PAD - 4
    yb = SIZE - PAD - 2
    mid = (x0 + x1) // 2
    # 主峰 + 左右侧峰
    draw.polygon([(x0, yb), (mid, PAD + 4), (x1, yb)], fill=color)
    draw.polygon([(x0 + 10, yb), (x0 + 28, PAD + 22), (x0 + 44, yb)], fill=color)
    # 地平线
    draw.rectangle([(x0, yb - 2), (x1, yb)], fill=color)


def draw_shop(draw, color):
    # 圆形方孔钱
    c = SIZE // 2
    r = (SIZE - 2 * PAD) // 2
    draw.ellipse([(c - r, c - r), (c + r, c + r)], fill=color)
    # 方孔 (用背景色覆盖)
    half = (c - r) // 2
    draw.rectangle([(c - half, c - half), (c + half, c + half)], fill=PAPER)
    # 方孔描边加深
    draw.rectangle([(c - half, c - half), (c + half, c + half)], outline=color, width=3)


def draw_course(draw, color):
    x0, x1 = PAD, SIZE - PAD
    y0, y1 = PAD + 2, SIZE - PAD - 2
    # 摊开的书: 左右两页
    draw.polygon([(x0, y0), ((x0 + x1) // 2, y0 + 6), ((x0 + x1) // 2, y1 - 8), (x0, y1)], fill=color)
    draw.polygon([(x1, y0), ((x0 + x1) // 2, y0 + 6), ((x0 + x1) // 2, y1 - 8), (x1, y1)], fill=color)
    # 书脊
    draw.line([((x0 + x1) // 2, y0 + 6), ((x0 + x1) // 2, y1 - 8)], fill=PAPER, width=3)


def draw_user(draw, color):
    c = SIZE // 2
    # 头
    draw.ellipse([(c - 12, PAD + 2), (c + 12, PAD + 26)], fill=color)
    # 身 (半圆弧)
    draw.pieslice([(c - 22, PAD + 30), (c + 22, SIZE - PAD - 4)], 180, 360, fill=color)


ICONS = {
    "home.png": draw_home,
    "home-active.png": draw_home,
    "shop.png": draw_shop,
    "shop-active.png": draw_shop,
    "course.png": draw_course,
    "course-active.png": draw_course,
    "user.png": draw_user,
    "user-active.png": draw_user,
}

for name, fn in ICONS.items():
    active = "-active" in name
    color = GOLD if active else GRAY
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    fn(draw, color)
    p = OUT / name
    img.save(p, "PNG")
    print(f"  OK {name}")
