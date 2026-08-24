#!/usr/bin/env python3
"""
将 tabBar 图标重新着色为中国红风格:
- 未选中 (unselected): 浅红色 (#c98a8a, 类似 #A89A85 的亮度, 但色调为中国红系)
- 已选中 (selected):   中国红 #c41e3a
保留 alpha 通道, 半透明像素按比例混合
"""
import os
from PIL import Image

# 源/目标目录
TAB_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'static', 'tabbar')

# 未选中 (原棕色 #A89A85) → 浅红/淡红 (保持亮度, 改色相)
# 中国红的浅色版: 类似 #c98a8a (rgb 201,138,138) 或 #d17575
COLOR_UNSELECTED = (201, 138, 138)  # 浅红/淡红
# 已选中 (原深棕 #854D0E) → 中国红
COLOR_SELECTED = (196, 30, 58)  # #c41e3a

# 透明度阈值: 低于此值视为完全透明, 跳过
ALPHA_THRESHOLD = 8

# 选中的图标文件
SELECTED = ['home-active.png', 'shop-active.png', 'course-active.png', 'user-active.png']
# 未选中的图标文件
UNSELECTED = ['home.png', 'shop.png', 'course.png', 'user.png']


def recolor(src_path, dst_path, target_rgb):
    """将 PNG 中非透明像素替换为目标颜色, 保留 alpha"""
    img = Image.open(src_path).convert('RGBA')
    pixels = img.load()
    w, h = img.size
    tr, tg, tb = target_rgb
    changed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < ALPHA_THRESHOLD:
                continue
            # 原像素的"亮度"作为 alpha 强度参考
            # 原图是非透明区域, 直接覆盖为目标色
            # 但保留 alpha (这样抗锯齿边缘仍然平滑)
            # 如果原像素和目标色 alpha 都为 255, 直接替换
            # 否则按原 alpha 比例
            new_r = tr
            new_g = tg
            new_b = tb
            pixels[x, y] = (new_r, new_g, new_b, a)
            changed += 1
    img.save(dst_path)
    return changed


def main():
    if not os.path.isdir(TAB_DIR):
        print(f'目录不存在: {TAB_DIR}')
        return
    for fname in UNSELECTED:
        src = os.path.join(TAB_DIR, fname)
        if not os.path.exists(src):
            print(f'跳过 (不存在): {src}')
            continue
        n = recolor(src, src, COLOR_UNSELECTED)
        print(f'[未选中] {fname}: 改色 {n} 像素 → 浅红 {COLOR_UNSELECTED}')
    for fname in SELECTED:
        src = os.path.join(TAB_DIR, fname)
        if not os.path.exists(src):
            print(f'跳过 (不存在): {src}')
            continue
        n = recolor(src, src, COLOR_SELECTED)
        print(f'[已选中] {fname}: 改色 {n} 像素 → 中国红 {COLOR_SELECTED}')


if __name__ == '__main__':
    main()
