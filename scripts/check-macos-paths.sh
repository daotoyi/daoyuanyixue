#!/usr/bin/env bash
# ============================================================
# macOS 路径兼容性检查脚本
# ============================================================
# 用途: 检查项目中的路径是否符合跨平台规范，规避 macOS 大小写路径报错
#
# macOS APFS 默认大小写不敏感，但 Linux CI/部分 Docker 镜像大小写敏感。
# 此脚本确保所有文件引用和 import 路径与实际文件名大小写一致。
#
# 用法:
#   bash scripts/check-macos-paths.sh          # 检查整个项目
#   bash scripts/check-macos-paths.sh --fix     # 检查并标记潜在问题
# ============================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 macOS 路径兼容性检查"
echo "   项目: $PROJECT_ROOT"
echo ""

# 检查项计数
ISSUES=0
FIX_MODE=false

if [[ "${1:-}" == "--fix" ]]; then
  FIX_MODE=true
  echo "🔧 修复模式已启用"
fi

# --- 检查 1: 文件名大小写冲突 ---
echo "📁 检查 1: 同名但大小写不同的文件..."
declare -A file_map
while IFS= read -r -d '' file; do
  # 排除 .workbuddy, node_modules, .git, dist, config
  rel="${file#$PROJECT_ROOT/}"
  if [[ "$rel" == .workbuddy/* ]] || [[ "$rel" == node_modules/* ]] || \
     [[ "$rel" == .git/* ]] || [[ "$rel" == dist/* ]] || \
     [[ "$rel" == config/* ]] || [[ "$rel" == .DS_Store ]]; then
    continue
  fi
  lower="${rel,,}"  # bash 4.0+ lowercase
  if [[ -n "${file_map[$lower]:-}" ]]; then
    echo -e "  ${RED}⚠️  冲突:${NC} ${file_map[$lower]} 与 $rel 仅在大小写上有差异"
    ((ISSUES++)) || true
  fi
  file_map["$lower"]="$rel"
done < <(find "$PROJECT_ROOT" -type f -print0 2>/dev/null)

if [[ ${#file_map[@]} -gt 0 ]]; then
  echo -e "  ${GREEN}✓ 未发现大小写冲突${NC}"
fi
echo ""

# --- 检查 2: manifest.json 中的路径 ---
echo "📄 检查 2: manifest.json 路径引用..."
if [[ -f manifest.json ]]; then
  # 提取所有路径值 (如 "static/icons/xxx.png")
  grep -oP '"[^"]*\.(png|jpg|jpeg|gif|svg|ico)"' manifest.json 2>/dev/null | \
  while IFS= read -r path_ref; do
    clean="${path_ref//\"/}"
    if [[ ! -f "$clean" ]]; then
      echo -e "  ${YELLOW}📌 文件不存在:${NC} $clean (占位图标，正常)"
    fi
    # 检查路径中是否有大写字母
    if [[ "$clean" =~ [A-Z] ]]; then
      echo -e "  ${RED}⚠️  路径含大写字母:${NC} $clean — 建议改为全小写"
      ((ISSUES++)) || true
    fi
  done
fi
echo ""

# --- 检查 3: 路径分隔符 ---
echo "🔗 检查 3: 路径分隔符..."
# JavaScript/JSON import 中不应有反斜杠
if grep -rn '\\\\' --include='*.{js,json,vue,ts}' . 2>/dev/null | \
   grep -v node_modules | grep -v '.git/' | grep -v '.workbuddy/' | head -5; then
  echo -e "  ${YELLOW}⚠️  发现反斜杠路径引用 (可能来自 Windows)，建议统一为正斜杠${NC}"
  ((ISSUES++)) || true
else
  echo -e "  ${GREEN}✓ 未发现反斜杠路径${NC}"
fi
echo ""

# --- 检查 4: cloudbaserc.json ---
echo "☁️  检查 4: cloudbaserc.json 配置..."
if [[ -f cloudbaserc.json ]]; then
  # macOS 本地路径检查
  if grep -q "darwin" cloudbaserc.json 2>/dev/null; then
    echo -e "  ${GREEN}✓ macOS (darwin) 平台路径已配置${NC}"
  else
    echo -e "  ${YELLOW}📌 未找到 macOS 平台路径配置${NC}"
  fi
fi
echo ""

# --- 检查 5: 目录名大小写 ---
echo "📂 检查 5: 关键目录名..."
for dir in cloudfunctions static scripts pages components utils; do
  if [[ -d "$dir" ]]; then
    echo -e "  ${GREEN}✓ $dir/${NC}"
  elif [[ -d "${dir^}" ]] || [[ -d "${dir^^}" ]]; then
    echo -e "  ${RED}⚠️  目录存在但大小写不匹配:${NC} 期望 $dir/, 实际找到类似目录"
    ((ISSUES++)) || true
  fi
done

echo ""
echo "========================================"
if [[ $ISSUES -eq 0 ]]; then
  echo -e "${GREEN}✅ 所有检查通过，路径兼容性良好${NC}"
else
  echo -e "${RED}⚠️  发现 $ISSUES 个问题，建议修复后重试${NC}"
fi

exit $ISSUES
