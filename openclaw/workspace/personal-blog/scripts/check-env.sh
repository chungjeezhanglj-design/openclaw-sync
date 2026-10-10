#!/bin/bash

# =============================================================================
# 博客小时光系统 - 环境检查脚本
# =============================================================================
# 使用说明:
#   ./scripts/check-env.sh
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 计数
PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

# 日志函数
log_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS_COUNT++))
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN_COUNT++))
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL_COUNT++))
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# 检查命令是否存在
check_command() {
    local cmd=$1
    local name=$2
    
    if command -v "$cmd" &> /dev/null; then
        VERSION=$("$cmd" --version 2>&1 | head -n 1)
        log_pass "$name 已安装：$VERSION"
        return 0
    else
        log_fail "$name 未安装"
        return 1
    fi
}

# 检查 Docker 容器
check_docker_container() {
    local container=$1
    
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        STATUS=$(docker inspect -f '{{.State.Status}}' "$container" 2>/dev/null)
        if [ "$STATUS" == "running" ]; then
            log_pass "Docker 容器 $container 运行中"
            return 0
        else
            log_warn "Docker 容器 $container 状态：$STATUS"
            return 1
        fi
    else
        log_warn "Docker 容器 $container 不存在"
        return 1
    fi
}

# 检查端口
check_port() {
    local port=$1
    local service=$2
    
    if lsof -i :"$port" &> /dev/null; then
        log_pass "端口 $port 已监听 ($service)"
        return 0
    else
        log_warn "端口 $port 未监听 ($service)"
        return 1
    fi
}

# 检查文件
check_file() {
    local file=$1
    local name=$2
    
    if [ -f "$file" ]; then
        log_pass "文件存在：$name"
        return 0
    else
        log_warn "文件不存在：$name"
        return 1
    fi
}

# 检查目录
check_dir() {
    local dir=$1
    local name=$2
    
    if [ -d "$dir" ]; then
        log_pass "目录存在：$name"
        return 0
    else
        log_fail "目录不存在：$name"
        return 1
    fi
}

# 检查 Node.js 版本
check_node_version() {
    if ! command -v node &> /dev/null; then
        log_fail "Node.js 未安装"
        return 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        log_pass "Node.js 版本：$(node -v)"
        return 0
    else
        log_fail "Node.js 版本过低：$(node -v)，需要 >=18.0.0"
        return 1
    fi
}

# 检查 npm 依赖
check_npm_deps() {
    local dir=$1
    local name=$2
    
    if [ -d "$dir/node_modules" ]; then
        log_pass "NPM 依赖已安装：$name"
        return 0
    else
        log_warn "NPM 依赖未安装：$name"
        return 1
    fi
}

# 主函数
main() {
    echo ""
    log_info "========================================"
    log_info "  博客小时光系统 - 环境检查"
    log_info "========================================"
    echo ""
    
    # 切换到项目根目录
    cd "$(dirname "$0")/.."
    
    # 系统依赖
    echo -e "${BLUE}=== 系统依赖 ===${NC}"
    check_command "docker" "Docker"
    check_command "docker-compose" "Docker Compose" || check_command "docker compose" "Docker Compose"
    check_command "git" "Git"
    check_command "curl" "curl"
    echo ""
    
    # Node.js
    echo -e "${BLUE}=== Node.js 环境 ===${NC}"
    check_node_version
    check_command "npm" "npm"
    echo ""
    
    # 项目结构
    echo -e "${BLUE}=== 项目结构 ===${NC}"
    check_dir "backend" "后端目录"
    check_dir "frontend" "前端目录"
    check_dir "backend/src" "后端源码"
    check_dir "frontend/src" "前端源码"
    check_dir "backend/uploads" "上传目录"
    echo ""
    
    # 配置文件
    echo -e "${BLUE}=== 配置文件 ===${NC}"
    check_file ".env.example" ".env.example"
    if [ -f ".env" ]; then
        log_pass ".env 文件存在"
        # 检查关键配置
        if grep -q "DB_DATABASE=" .env; then
            log_pass "数据库配置存在"
        else
            log_warn "数据库配置缺失"
        fi
        if grep -q "JWT_SECRET=" .env; then
            log_pass "JWT 配置存在"
        else
            log_warn "JWT 配置缺失"
        fi
    else
        log_warn ".env 文件不存在，请从 .env.example 复制"
    fi
    echo ""
    
    # 后端配置
    echo -e "${BLUE}=== 后端配置 ===${NC}"
    check_file "backend/package.json" "backend/package.json"
    check_npm_deps "backend" "后端"
    check_file "backend/tsconfig.json" "backend/tsconfig.json"
    echo ""
    
    # 前端配置
    echo -e "${BLUE}=== 前端配置 ===${NC}"
    check_file "frontend/package.json" "frontend/package.json"
    check_npm_deps "frontend" "前端"
    check_file "frontend/vite.config.ts" "frontend/vite.config.ts"
    echo ""
    
    # Docker 容器
    echo -e "${BLUE}=== Docker 容器 ===${NC}"
    check_docker_container "blog-mariadb"
    check_docker_container "blog-backend"
    check_docker_container "blog-frontend"
    echo ""
    
    # 端口
    echo -e "${BLUE}=== 端口监听 ===${NC}"
    check_port "3306" "MariaDB"
    check_port "3000" "后端 API"
    check_port "80" "前端 Nginx"
    check_port "5173" "前端 Vite (开发)"
    echo ""
    
    # 文档
    echo -e "${BLUE}=== 文档 ===${NC}"
    check_file "README.md" "README.md"
    check_file "requirements.md" "需求说明书"
    check_file "api-docs/openapi.yaml" "API 文档"
    check_file "docs/architecture.md" "架构文档"
    check_file "docs/user-manual.md" "用户手册"
    echo ""
    
    # 脚本
    echo -e "${BLUE}=== 部署脚本 ===${NC}"
    check_file "scripts/deploy.sh" "部署脚本"
    check_file "scripts/backup.sh" "备份脚本"
    check_file "scripts/check-env.sh" "环境检查脚本"
    echo ""
    
    # 总结
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  检查结果总结${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "  ${GREEN}通过${NC}: $PASS_COUNT"
    echo -e "  ${YELLOW}警告${NC}: $WARN_COUNT"
    echo -e "  ${RED}失败${NC}: $FAIL_COUNT"
    echo ""
    
    if [ "$FAIL_COUNT" -gt 0 ]; then
        log_fail "存在 $FAIL_COUNT 项失败，请修复后重试"
        exit 1
    elif [ "$WARN_COUNT" -gt 0 ]; {
        log_warn "存在 $WARN_COUNT 项警告，但不影响运行"
        exit 0
    } else
        log_success "所有检查通过！🦎"
        exit 0
    fi
}

# 执行主函数
main "$@"
