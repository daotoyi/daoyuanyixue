#!/usr/bin/env bash
# 真和盛 / 道元易学 — 定时备份入口
#
# 直接跑:        bash run.sh
# 定时(crontab): 0 3 * * * /bin/bash /绝对路径/backup-tool/run.sh
#                (自建 Linux/NAS 服务器推荐用 crontab -e 加这一行)
# macOS launchd: 用「脚本编辑器」或 launchctl 每日 03:00 调本脚本; 也可直接 crontab
#
# 可调环境变量:
#   BACKUP_OUT    备份落地目录(默认 backup-tool/backups); 建议指向 NAS/独立磁盘
#   BACKUP_KEEP   保留最近几份数据库快照(默认 14)
#   BACKUP_EXTRA  追加给 backup.js 的参数, 例如 "--no-files" 或 "--only=orders,users"
#
# 行为: 单实例锁(上次没跑完就跳过)、全程日志、失败写 logs/failures.log、退出码非 0。
set -uo pipefail
cd "$(dirname "$0")" || exit 1
mkdir -p logs

LOCK=".backup.lock"
if [ -f "$LOCK" ]; then
  OLD="$(cat "$LOCK" 2>/dev/null || echo '')"
  if [ -n "$OLD" ] && kill -0 "$OLD" 2>/dev/null; then
    echo "[$(date '+%F %T')] 上一次备份仍在运行 (pid=$OLD), 本次跳过"
    exit 0
  fi
  echo "[$(date '+%F %T')] 清理陈旧锁文件 (pid=$OLD)"
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

LOG="logs/$(date '+%Y%m%d-%H%M%S').log"
KEEP="${BACKUP_KEEP:-14}"
EXTRA="${BACKUP_EXTRA:-}"
ARGS=(--keep="$KEEP")
if [ -n "${BACKUP_OUT:-}" ]; then ARGS+=(--out="$BACKUP_OUT"); fi
# shellcheck disable=SC2206
if [ -n "$EXTRA" ]; then ARGS+=($EXTRA); fi

echo "[$(date '+%F %T')] 开始备份: node backup.js ${ARGS[*]}" | tee "$LOG"
node backup.js "${ARGS[@]}" 2>&1 | tee -a "$LOG"
CODE=${PIPESTATUS[0]}

if [ "$CODE" -ne 0 ]; then
  echo "[$(date '+%F %T')] ❌ 备份异常 (exit=$CODE), 详见 $LOG" | tee -a logs/failures.log
else
  echo "[$(date '+%F %T')] ✅ 备份完成, 日志 $LOG" | tee -a logs/success.log
fi
# 日志只留最近 30 份, 避免无限膨胀
ls -1t logs/????????-??????.log 2>/dev/null | tail -n +31 | while read -r f; do rm -f "$f"; done
exit "$CODE"
