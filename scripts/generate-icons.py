#!/usr/bin/env python3
"""
APP 图标生成脚本

从 static/icons/app-icon.svg 生成各平台所需尺寸的 PNG 图标。
如果 SVG 不可用，则生成纯色占位图标。

macOS 兼容:
  - 使用正斜杠路径
  - 文件名全小写
  - 输出到 static/icons/ 目录

依赖:
  pip install Pillow cairosvg
"""

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICONS_DIR = ROOT / "static" / "icons"
SVG_PATH = ICONS_DIR / "app-icon.svg"

# 确保输出目录存在
ICONS_DIR.mkdir(parents=True, exist_ok=True)

# 各平台所需图标尺寸 (宽 x 高)
ICON_SIZES = {
    # iPhone
    "iphone_app@2x.png": (120, 120),
    "iphone_app@3x.png": (180, 180),
    "iphone_spotlight@2x.png": (80, 80),
    "iphone_spotlight@3x.png": (120, 120),
    "iphone_settings@2x.png": (58, 58),
    "iphone_settings@3x.png": (87, 87),
    "iphone_notification@2x.png": (40, 40),
    "iphone_notification@3x.png": (60, 60),
    # iPad
    "ipad_app.png": (76, 76),
    "ipad_app@2x.png": (152, 152),
    "ipad_proapp@2x.png": (167, 167),
    "ipad_spotlight.png": (40, 40),
    "ipad_spotlight@2x.png": (80, 80),
    "ipad_settings.png": (29, 29),
    "ipad_settings@2x.png": (58, 58),
    "ipad_notification.png": (20, 20),
    "ipad_notification@2x.png": (40, 40),
    # Android
    "android_ldpi.png": (36, 36),
    "android_mdpi.png": (48, 48),
    "android_hdpi.png": (72, 72),
    "android_xhdpi.png": (96, 96),
    "android_xxhdpi.png": (144, 144),
    "android_xxxhdpi.png": (192, 192),
}


def generate_solid_icons():
    """使用 Pillow 生成纯色占位图标"""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("❌ 需要安装 Pillow: pip install Pillow")
        return False

    colors = [
        (102, 126, 234),   # 蓝紫
        (118, 75, 162),    # 紫色
    ]

    for filename, size in ICON_SIZES.items():
        output_path = ICONS_DIR / filename
        if output_path.exists():
            print(f"  ⏭  跳过 {filename} (已存在)")
            continue

        img = Image.new("RGBA", size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # 圆角矩形背景
        radius = max(4, size[0] // 5)
        color_idx = 0 if size[0] >= 80 else 1
        draw.rounded_rectangle(
            [(0, 0), (size[0] - 1, size[1] - 1)],
            radius=radius,
            fill=colors[color_idx],
        )

        # 文字 "W"
        if size[0] >= 48:
            try:
                font_size = size[0] // 2
                font = ImageFont.truetype(
                    "/System/Library/Fonts/Helvetica.ttc", font_size
                )
            except (IOError, OSError):
                font = ImageFont.load_default()

            text = "W"
            bbox = draw.textbbox((0, 0), text, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            tx = (size[0] - tw) // 2
            ty = (size[1] - th) // 2 - 2
            draw.text((tx, ty), text, fill=(255, 255, 255, 255), font=font)

        img.save(output_path, "PNG")
        print(f"  ✅ {filename} ({size[0]}x{size[1]})")

    return True


def generate_from_svg():
    """尝试从 SVG 生成精确图标"""
    if not SVG_PATH.exists():
        print(f"⚠️  SVG 源文件不存在: {SVG_PATH}")
        return False

    try:
        import cairosvg
    except ImportError:
        print("⚠️  cairosvg 未安装，使用纯色占位模式")
        return False

    for filename, size in ICON_SIZES.items():
        output_path = ICONS_DIR / filename
        if output_path.exists():
            print(f"  ⏭  跳过 {filename} (已存在)")
            continue

        output_width = size[0]
        cairosvg.svg2png(
            url=str(SVG_PATH),
            write_to=str(output_path),
            output_width=output_width,
            output_height=output_width,
        )
        print(f"  ✅ {filename} ({size[0]}x{size[1]})")

    return True


def main():
    print("🎨 APP 图标生成器")
    print(f"   源文件: {SVG_PATH}")
    print(f"   输出目录: {ICONS_DIR}")
    print()

    # 尝试从 SVG 生成
    success = generate_from_svg()

    # SVG 不可用时，使用纯色占位
    if not success:
        success = generate_solid_icons()

    if success:
        print(f"\n✅ 图标生成完成，共 {len(ICON_SIZES)} 个文件")
    else:
        print("\n❌ 图标生成失败")
        sys.exit(1)


if __name__ == "__main__":
    main()
