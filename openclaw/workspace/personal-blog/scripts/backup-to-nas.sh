#!/bin/bash
# =============================================================================
# 博客小时光系统 · 自动备份脚本 (本地 + 推送到 NAS)
# =============================================================================
# 用法:
#   ./scripts/backup-to-nas.sh [选项]
#
# 选项:
#   (无)          全量备份 + 推送 NAS
#   --local-only  仅本地备份 (不推 NAS)
#   --nas-only    仅推送已存在的本地备份到 NAS
#   --verify      验证 NAS 上的备份完整性
#   --cleanup     清理 NAS 上过期备份 (保留 30 天)
#   --help        显示帮助
#
# 配合 cron 使用 (每天凌晨 3 点):
#   0 3 * * * /path/to/personal-blog/scripts/backup-to-nas.sh >> /var/log/personal-blog-backup.log 2>&1
# =============================================================================

set -euo pipefail

# ===== 配置 =====
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_BACKUP_DIR="$PROJECT_ROOT/backup"
NAS_HOST="192.168.1.141"                    # Synology NAS
NAS_USER="backup"                           # NAS 备份专用用户
NAS_BACKUP_DIR="/volume1/backup/personal-blog"   # NAS 上的备份目录
RETENTION_DAYS=30                           # NAS 保留天数
RETENTION_LOCAL_COUNT=7                    # 本地保留份数

# ===== 颜色 =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ===== 日志 =====
log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%F %T') $*" >&2; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%F %T') $*" >&2; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%F %T') $*" >&2; }
log_err()   { echo -e "${RED}[ERROR]${NC} $(date '+%F %T') $*" >&2; }

# ===== 帮助 =====
show_help() {
    sed -n '2,30p' "$0" | sed 's/^# //;s/^#//'
    exit 0
}

# ===== 检查依赖 =====
check_deps() {
    local missing=()
    command -v rsync >/dev/null || missing+=("rsync")
    command -v ssh   >/dev/null || missing+=("ssh")

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_err "缺失依赖: ${missing[*]}"
        echo "安装: brew install rsync    # macOS" >&2
        echo "      apt install rsync ssh # Debian/Ubuntu" >&2
        exit 1
    fi
}

# ===== NAS SSH 连接检查 =====
check_nas_ssh() {
    if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "${NAS_USER}@${NAS_HOST}" "echo ok" >/dev/null 2>&1; then
        log_err "无法 SSH 到 NAS ${NAS_USER}@${NAS_HOST}"
        echo "排查:" >&2
        echo "  1. ssh ${NAS_USER}@${NAS_HOST} 手动测试" >&2
        echo "  2. 检查 ~/.ssh/config 或 NAS authorized_keys" >&2
        echo "  3. 检查 NAS 是否开启 SSH (DSM → 控制面板 → 终端机和 SNMP)" >&2
        exit 1
    fi
    log_ok "NAS SSH 连接正常"
}

# ===== 本地备份 (调用现有 backup.sh) =====
local_backup() {
    log_info "执行本地备份..."
    cd "$PROJECT_ROOT"
    ./scripts/backup.sh --all
    log_ok "本地备份完成"
}

# ===== 推送本地最新备份到 NAS =====
push_to_nas() {
    log_info "推送备份到 NAS ${NAS_HOST}:${NAS_BACKUP_DIR}"

    # 确保 NAS 目录存在
    ssh "${NAS_USER}@${NAS_HOST}" "mkdir -p '${NAS_BACKUP_DIR}'"

    # rsync — 增量推送, 断点续传
    rsync -avz --progress \
        --partial \
        --delete-after \
        -e "ssh -o ConnectTimeout=10" \
        "$LOCAL_BACKUP_DIR/" \
        "${NAS_USER}@${NAS_HOST}:${NAS_BACKUP_DIR}/"

    log_ok "备份已推送 NAS"
}

# ===== 清理本地旧备份 (保留最近 N 份) =====
cleanup_local() {
    log_info "清理本地旧备份 (保留最近 ${RETENTION_LOCAL_COUNT} 份)..."
    cd "$LOCAL_BACKUP_DIR"
    ls -t *.sql.gz *.tar.gz 2>/dev/null | tail -n +$((RETENTION_LOCAL_COUNT + 1)) | while read -r f; do
        log_info "   删除: $f"
        rm -f -- "$f"
    done
}

# ===== 清理 NAS 过期备份 =====
cleanup_nas() {
    log_info "清理 NAS 上 ${RETENTION_DAYS} 天前的备份..."

    local deleted
    deleted=$(ssh "${NAS_USER}@${NAS_HOST}" "
        find '${NAS_BACKUP_DIR}' -type f \( -name '*.sql.gz' -o -name '*.tar.gz' \) -mtime +${RETENTION_DAYS} -print -delete
    " | wc -l)

    log_ok "清理 NAS 完成,删除 ${deleted} 个文件"
}

# ===== 验证 NAS 上的备份完整性 =====
verify_nas() {
    log_info "验证 NAS 备份完整性..."

    local issues=0
    while read -r f; do
        local size
        size=$(ssh "${NAS_USER}@${NAS_HOST}" "stat -c%s '$f'" 2>/dev/null || echo "0")
        if [[ "$size" -lt 100 ]]; then
            log_warn "⚠️  $f 大小异常: ${size} bytes"
            issues=$((issues + 1))
        else
            log_ok "✓ $f (${size} bytes)"
        fi
    done < <(ssh "${NAS_USER}@${NAS_HOST}" "find '${NAS_BACKUP_DIR}' -type f \( -name '*.sql.gz' -o -name '*.tar.gz' \) -mtime -7")

    if [[ $issues -gt 0 ]]; then
        log_warn "发现 ${issues} 个异常备份文件"
        return 1
    fi
    log_ok "NAS 备份验证通过"
}

# ===== 主流程 =====
main() {
    check_deps

    local action="all"
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --local-only) action="local"; shift ;;
            --nas-only)   action="nas"; shift ;;
            --verify)     action="verify"; shift ;;
            --cleanup)    action="cleanup"; shift ;;
            -h|--help)    show_help ;;
            *) log_err "未知参数: $1"; show_help; exit 1 ;;
        esac
    done

    case "$action" in
        local)
            local_backup
            cleanup_local
            ;;
        nas)
            check_nas_ssh
            push_to_nas
            ;;
        verify)
            check_nas_ssh
            verify_nas
            ;;
        cleanup)
            check_nas_ssh
            cleanup_local
            cleanup_nas
            ;;
        all)
            local_backup
            cleanup_local
            check_nas_ssh
            push_to_nas
            cleanup_nas
            verify_nas

            echo ""
            log_ok "========================================="
            log_ok "  全流程完成 🦎"
            log_ok "  本地: ${LOCAL_BACKUP_DIR}"
            log_ok "  NAS:  ${NAS_USER}@${NAS_HOST}:${NAS_BACKUP_DIR}"
            log_ok "========================================="
            ;;
    esac
}

main "$@"