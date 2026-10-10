#!/bin/bash

# =============================================================================
# 博客小时光系统 - 一键部署脚本
# =============================================================================
# 使用说明:
#   ./scripts/deploy.sh [选项]
#
# 选项:
#   --dev         开发环境部署
#   --prod        生产环境部署
#   --clean       清理部署
#   --help        显示帮助信息
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 显示帮助信息
show_help() {
    cat << EOF
博客小时光系统 - 一键部署脚本

使用说明:
  $0 [选项]

选项:
  --dev         开发环境部署（启动前端 + 后端 + 数据库）
  --prod        生产环境部署（Docker Compose）
  --clean       清理部署（停止服务并清理）
  --help        显示帮助信息

示例:
  $0 --dev      # 开发环境部署
  $0 --prod     # 生产环境部署
  $0 --clean    # 清理部署

EOF
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    # 检查 Node.js (开发环境需要)
    if [[ "$DEPLOY_MODE" == "dev" ]]; then
        if ! command -v node &> /dev/null; then
            log_error "Node.js 未安装，请先安装 Node.js (>=18.0.0)"
            exit 1
        fi
        
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_error "Node.js 版本过低，需要 >=18.0.0，当前版本：$(node -v)"
            exit 1
        fi
    fi
    
    log_success "系统依赖检查通过"
}

# 检查环境变量文件
check_env_file() {
    if [ ! -f ".env" ]; then
        log_warning ".env 文件不存在，从 .env.example 复制..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "请编辑 .env 文件配置环境变量"
            echo ""
            read -p "按回车键继续..."
        else
            log_error ".env.example 文件不存在"
            exit 1
        fi
    fi
}

# 开发环境部署
deploy_dev() {
    log_info "开始开发环境部署..."
    
    # 启动数据库
    log_info "启动 MariaDB 数据库..."
    docker-compose up -d mariadb
    
    # 等待数据库启动
    log_info "等待数据库启动..."
    sleep 5
    
    # 安装后端依赖
    log_info "安装后端依赖..."
    cd backend
    npm install
    cd ..
    
    # 配置后端环境
    if [ ! -f "backend/.env" ]; then
        log_warning "backend/.env 不存在，从 .env 复制..."
        cp .env backend/.env
    fi
    
    # 安装前端依赖
    log_info "安装前端依赖..."
    cd frontend
    npm install
    cd ..
    
    # 配置前端环境
    if [ ! -f "frontend/.env" ]; then
        log_warning "frontend/.env 不存在，创建默认配置..."
        echo "VITE_API_URL=http://localhost:3000/api" > frontend/.env
    fi
    
    log_success "开发环境部署完成！"
    echo ""
    log_info "启动命令:"
    echo "  后端：cd backend && npm run dev"
    echo "  前端：cd frontend && npm run dev"
    echo ""
    log_info "访问地址:"
    echo "  前端：http://localhost:5173"
    echo "  后端：http://localhost:3000"
    echo ""
    log_info "初始化配置：访问 http://localhost:5173/setup"
}

# 生产环境部署
deploy_prod() {
    log_info "开始生产环境部署..."
    
    # 检查环境变量
    check_env_file
    
    # 停止旧服务
    log_info "停止旧服务..."
    docker-compose down
    
    # 清理旧镜像
    log_info "清理旧镜像..."
    docker-compose rm -f
    
    # 构建并启动
    log_info "构建并启动服务..."
    docker-compose up -d --build
    
    # 等待服务启动 (用健康门禁替代 sleep 10 — 最多等 90s)
    log_info "等待后端就绪 (/health/ready)..."
    local max_wait=90
    local waited=0
    while [[ $waited -lt $max_wait ]]; do
        if curl -sf http://localhost:3000/health/ready -o /dev/null 2>& 1; then
            log_success "后端已就绪 (等待 ${waited}s)"
            break
        fi
        sleep 3
        waited=$((waited + 3))
    done

    if [[ $waited -ge $max_wait ]]; then
        log_error "后端 ${max_wait}s 内未就绪,请查看日志:"
        echo "  docker-compose logs --tail=100 backend" >&2
        exit 1
    fi

    # 检查服务状态
    log_info "检查服务状态..."
    docker-compose ps
    
    log_success "生产环境部署完成！"
    echo ""
    log_info "访问地址：http://localhost"
    log_info "初始化配置：访问 http://localhost/setup"
    echo ""
    log_info "查看日志：docker-compose logs -f"
    log_info "停止服务：docker-compose down"
    log_info "重启服务：docker-compose restart"
}

# 清理部署
clean_deploy() {
    log_warning "即将停止所有服务并清理数据..."
    read -p "确定要继续吗？(y/N): " confirm
    
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        log_info "已取消"
        exit 0
    fi
    
    log_info "停止服务..."
    docker-compose down
    
    log_info "清理卷数据..."
    docker volume rm personal-blog_mariadb_data 2>/dev/null || true
    
    log_info "清理镜像..."
    docker-compose rm -f
    
    log_info "清理完成！"
}

# 主函数
main() {
    DEPLOY_MODE=""
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dev)
                DEPLOY_MODE="dev"
                shift
                ;;
            --prod)
                DEPLOY_MODE="prod"
                shift
                ;;
            --clean)
                DEPLOY_MODE="clean"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项：$1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 检查是否指定了模式
    if [ -z "$DEPLOY_MODE" ]; then
        log_error "请指定部署模式：--dev 或 --prod"
        show_help
        exit 1
    fi
    
    # 切换到项目根目录
    cd "$(dirname "$0")/.."
    
    echo ""
    log_info "========================================"
    log_info "  博客小时光系统 - 部署脚本"
    log_info "  模式：$DEPLOY_MODE"
    log_info "========================================"
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 执行部署
    case $DEPLOY_MODE in
        dev)
            deploy_dev
            ;;
        prod)
            deploy_prod
            ;;
        clean)
            clean_deploy
            ;;
    esac
    
    echo ""
    log_success "部署完成！🦎"
}

# 执行主函数
main "$@"
