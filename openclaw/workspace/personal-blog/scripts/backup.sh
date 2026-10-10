#!/bin/bash

# =============================================================================
# 博客小时小时光系统 - 备份脚本
# =============================================================================
# 使用说明:
#   ./scripts/backup.sh [选项]
#
# 选项:
#   --db          仅备份数据库
#   --files       仅备份上传文件
#   --all         备份数据库和文件（默认）
#   --restore     恢复备份
#   --list        列出备份文件
#   --clean       清理旧备份
#   --help        显示帮助信息
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
BACKUP_DIR="./backup"
DATE=$(date +%Y%m%d-%H%M%S)
DB_NAME="personal_blog"
DB_USER="root"
DB_HOST="localhost"
DB_PORT="3306"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助
show_help() {
    cat << EOF
博客小时光系统 - 备份脚本

使用说明:
  $0 [选项]

选项:
  --db          仅备份数据库
  --files       仅备份上传文件
  --all         备份数据库和文件（默认）
  --restore     恢复备份（需要指定备份文件）
  --list        列出备份文件
  --clean       清理旧备份（保留最近 7 个）
  --help        显示帮助信息

示例:
  $0 --db                    # 备份数据库
  $0 --files                 # 备份上传文件
  $0 --all                   # 备份全部
  $0 --restore backup-xxx    # 恢复指定备份
  $0 --clean                 # 清理旧备份

EOF
}

# 创建备份目录
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "创建备份目录：$BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# 备份数据库
backup_database() {
    log_info "开始备份数据库..."
    
    # 从 .env 读取数据库配置
    if [ -f ".env" ]; then
        source .env
        DB_HOST=${DB_HOST:-localhost}
        DB_PORT=${DB_PORT:-3306}
        DB_USERNAME=${DB_USERNAME:-root}
        DB_PASSWORD=${DB_PASSWORD:-}
        DB_DATABASE=${DB_DATABASE:-personal_blog}
    fi
    
    BACKUP_FILE="$BACKUP_DIR/db-${DB_DATABASE}-${DATE}.sql"
    
    # 使用 mysqldump 备份
    if command -v mysqldump &> /dev/null; then
        mysqldump \
            -h"$DB_HOST" \
            -P"$DB_PORT" \
            -u"$DB_USERNAME" \
            -p"$DB_PASSWORD" \
            "$DB_DATABASE" > "$BACKUP_FILE"
    else
        # 使用 Docker 备份
        log_info "使用 Docker 备份..."
        docker exec blog-mariadb mysqldump \
            -u"$DB_USERNAME" \
            -p"$DB_PASSWORD" \
            "$DB_DATABASE" > "$BACKUP_FILE"
    fi
    
    # 压缩备份
    log_info "压缩备份文件..."
    gzip "$BACKUP_FILE"
    
    log_success "数据库备份完成：${BACKUP_FILE}.gz"
}

# 备份上传文件
backup_files() {
    log_info "开始备份上传文件..."
    
    UPLOAD_DIR="./backend/uploads"
    BACKUP_FILE="$BACKUP_DIR/uploads-${DATE}.tar.gz"
    
    if [ ! -d "$UPLOAD_DIR" ]; then
        log_warning "上传目录不存在：$UPLOAD_DIR"
        return
    fi
    
    # 打包上传文件
    tar -czf "$BACKUP_FILE" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
    
    log_success "上传文件备份完成：$BACKUP_FILE"
}

# 列出备份
list_backups() {
    log_info "备份文件列表:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        log_warning "没有找到备份文件"
        return
    fi
    
    ls -lh "$BACKUP_DIR" | tail -n +2 | awk '{print $9, "(" $5 ")"}'
    
    echo ""
    log_info "备份文件数量：$(ls -1 "$BACKUP_DIR" | wc -l)"
}

# 恢复备份
restore_backup() {
    BACKUP_NAME="$1"
    
    if [ -z "$BACKUP_NAME" ]; then
        log_error "请指定备份文件名"
        exit 1
    fi
    
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "备份文件不存在：$BACKUP_FILE"
        exit 1
    fi
    
    log_warning "即将恢复备份：$BACKUP_NAME"
    log_warning "此操作将覆盖现有数据！"
    read -p "确定要继续吗？(y/N): " confirm
    
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        log_info "已取消"
        exit 0
    fi
    
    # 从 .env 读取数据库配置
    if [ -f ".env" ]; then
        source .env
        DB_HOST=${DB_HOST:-localhost}
        DB_PORT=${DB_PORT:-3306}
        DB_USERNAME=${DB_USERNAME:-root}
        DB_PASSWORD=${DB_PASSWORD:-}
        DB_DATABASE=${DB_DATABASE:-personal_blog}
    fi
    
    # 判断备份类型
    if [[ "$BACKUP_NAME" == db-*.sql.gz ]]; then
        log_info "恢复数据库..."
        
        # 解压并恢复
        gunzip -c "$BACKUP_FILE" | mysql \
            -h"$DB_HOST" \
            -P"$DB_PORT" \
            -u"$DB_USERNAME" \
            -p"$DB_PASSWORD" \
            "$DB_DATABASE"
        
        log_success "数据库恢复完成"
        
    elif [[ "$BACKUP_NAME" == uploads-*.tar.gz ]]; then
        log_info "恢复上传文件..."
        
        # 解压到上传目录
        tar -xzf "$BACKUP_FILE" -C ./backend/
        
        log_success "上传文件恢复完成"
    else
        log_error "未知的备份文件类型"
        exit 1
    fi
}

# 清理旧备份
clean_backups() {
    log_info "清理旧备份（保留最近 7 个）..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_warning "备份目录不存在"
        return
    fi
    
    # 获取备份文件数量
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR" | wc -l)
    
    if [ "$BACKUP_COUNT" -le 7 ]; then
        log_info "备份文件数量：$BACKUP_COUNT，无需清理"
        return
    fi
    
    # 删除旧备份（保留最近 7 个）
    ls -t "$BACKUP_DIR" | tail -n +8 | while read file; do
        log_info "删除旧备份：$file"
        rm "$BACKUP_DIR/$file"
    done
    
    log_success "清理完成，保留最近 7 个备份"
}

# 主函数
main() {
    ACTION=""
    BACKUP_NAME=""
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --db)
                ACTION="db"
                shift
                ;;
            --files)
                ACTION="files"
                shift
                ;;
            --all)
                ACTION="all"
                shift
                ;;
            --restore)
                ACTION="restore"
                shift
                BACKUP_NAME="$1"
                shift
                ;;
            --list)
                ACTION="list"
                shift
                ;;
            --clean)
                ACTION="clean"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                if [ -z "$BACKUP_NAME" ]; then
                    BACKUP_NAME="$1"
                fi
                shift
                ;;
        esac
    done
    
    # 默认动作
    if [ -z "$ACTION" ]; then
        ACTION="all"
    fi
    
    # 切换到项目根目录
    cd "$(dirname "$0")/.."
    
    echo ""
    log_info "========================================"
    log_info "  博客小时光系统 - 备份脚本"
    log_info "  操作：$ACTION"
    log_info "========================================"
    echo ""
    
    # 创建备份目录
    create_backup_dir
    
    # 执行操作
    case $ACTION in
        db)
            backup_database
            ;;
        files)
            backup_files
            ;;
        all)
            backup_database
            backup_files
            ;;
        list)
            list_backups
            ;;
        restore)
            restore_backup "$BACKUP_NAME"
            ;;
        clean)
            clean_backups
            ;;
        *)
            log_error "未知操作：$ACTION"
            show_help
            exit 1
            ;;
    esac
    
    echo ""
    log_success "操作完成！🦎"
}

# 执行主函数
main "$@"
