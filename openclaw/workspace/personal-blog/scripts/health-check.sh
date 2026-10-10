#!/bin/bash
# =============================================================================
# 博客小时光系统 · 外部健康检查 (供 cron / 监控用)
# =============================================================================
# 用法:
#   ./scripts/health-check.sh [URL]
#
# 检查 /health/live 和 /health/ready, 任一异常返回非 0 退出码
# 配合监控: cron 失败时触发告警 (邮件 / webhook)
#
# 推荐每 5 分钟跑一次:
#   */5 * * * * /path/to/health-check.sh https://chungjee.familyds.org || /path/to/alert.sh
# =============================================================================

set -uo pipefail

URL="${1:-https://chungjee.familyds.org}"
TIMEOUT=10
LOG_FILE="/var/log/personal-blog/health-check.log"
ALERT_WEBHOOK="${HEALTH_ALERT_WEBHOOK:-}"     # 可选: Slack / 飞书 / Discord webhook URL

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    local msg="$(date '+%F %T') $*"
    echo "$msg" | tee -a "$LOG_FILE"
    if [[ -n "$ALERT_WEBHOOK" ]] && [[ "$*" == *"FAIL"* ]]; then
        curl -sX POST "$ALERT_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🚨 personal-blog 健康检查失败: $*\"}" \
            >/dev/null 2>&1 || true
    fi
}

# ===== Liveness =====
LIVE_HTTP=$(curl -s -o /tmp/live_body -w "%{http_code}" --max-time $TIMEOUT "${URL}/health/live" || echo "000")
LIVE_STATUS=$(cat /tmp/live_body 2>/dev/null | grep -oE '"status":"[a-z]+"' | head -1 || echo "unknown")

if [[ "$LIVE_HTTP" == "200" ]]; then
    log "✅ liveness  200 ($LIVE_STATUS)"
    LIVE_OK=1
else
    log "❌ liveness  FAIL (HTTP $LIVE_HTTP)"
    LIVE_OK=0
fi

# ===== Readiness =====
READY_HTTP=$(curl -s -o /tmp/ready_body -w "%{http_code}" --max-time $TIMEOUT "${URL}/health/ready" || echo "000")

if [[ "$READY_HTTP" == "200" ]]; then
    log "✅ readiness 200 (ready)"
    READY_OK=1
elif [[ "$READY_HTTP" == "503" ]]; then
    # 503 也是合法响应 — 表示 "暂不可服务", 不一定是故障
    REASON=$(cat /tmp/ready_body 2>/dev/null | grep -oE '"error":"[^"]+"' | head -1 || echo "unknown")
    log "⚠️  readiness 503 (not ready: $REASON)"
    READY_OK=1
else
    log "❌ readiness FAIL (HTTP $READY_HTTP)"
    READY_OK=0
fi

# ===== 汇总 =====
if [[ $LIVE_OK -eq 1 ]] && [[ $READY_OK -eq 1 ]]; then
    exit 0
else
    exit 1
fi