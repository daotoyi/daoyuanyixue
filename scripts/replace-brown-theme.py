#!/usr/bin/env python3
"""批量替换 H5 棕色主题 → 中国红主题 (zhenhesheng.cn 风格)"""
import os, re, glob

REPLACEMENTS = [
    # 背景色: 米白 -> 浅红米
    ('#f8f3ea', '#f8f5f0'),  # page background
    ('#fefbf6', '#fffafa'),  # card/paper
    ('#faf3e9', '#fbe9ec'),  # soft bg
    # 主文字 / 金色
    ('#42372c', '#2a2a2a'),   # primary text
    ('#8c5a2b', '#c41e3a'),   # text-primary / brand buttons
    ('#c4a484', '#b8860b'),   # gold accent
    # 渐变深棕
    ('#4e3420', '#9c1630'),   # deep red gradient
    ('#6e4a26', '#6b1022'),   # mid brown
    # 红色标签 (旧暗红→更深的中国红)
    ('#b04a45', '#9c1630'),
    ('#ba7517', '#c41e3a'),   # warn/badge
    # 灰色系统
    ('#857563', '#55524c'),   # secondary text
    ('#b3a595', '#8a857c'),   # faint text
    ('#efe7d8', '#e8e2da'),   # line/border
]

def replace_colors(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new in REPLACEMENTS:
        content = content.replace(old, new)
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

src_dir = '/Users/wenhua/WorkBuddy/zhs-deploy/src'
count = 0
for root, dirs, files in os.walk(src_dir):
    for fn in files:
        if fn.endswith('.vue'):
            fp = os.path.join(root, fn)
            if replace_colors(fp):
                count += 1
                print(f'OK: {fp}')
print(f'\nDone. Replaced in {count} files.')
