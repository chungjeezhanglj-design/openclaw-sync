#!/bin/bash
# =============================================================================
# 博客小时光系统 · HTTPS 自动配置 (Let's Encrypt + Certbot)
# =============================================================================
# 用法:
#   sudo ./scripts/setup-https.sh
#
# 前置条件:
#   - DNS 已指向本机 (chungjee.familyds.org → <server-ip>)
#   - 80 / 443 端口空闲 (certbot 需要 standalone 或 webroot 模式)
#   - nginx 已安装但未启用 / 已停用
#   - 已 root 权限
#
# 流程:
#   1. 安装 certbot
#   2. 申请证书 (webroot 模式)
#   3. 部署 nginx 配置
#   4. 设置自动续期 cron
#   5. 验证 HTTPS 工作
# =============================================================================

set -euo pipefail

# ===== 配置 =====
DOMAIN="chungjee.familyds.org"
EMAIL="admin@chungjee.familyds.org"        # 用于 Let's Encrypt 注册
NGINX_CONF_SRC="frontend/nginx-server-prod.conf"
NGINX_CONF_DEST="/etc/nginx/sites-available/personal-blog"
NGINX_LINK="/etc/nginx/sites-enabled/personal-blog"
WEBROOT="/var/www/html"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[*]${NC}  $*"; }
ok()   { echo -e "${GREEN}[✓]${NC}  $*"; }
warn() { echo -e "${YELLOW}[!]${NC}  $*"; }
err()  { echo -e "${RED}[✗]${NC}  $*"; }

# ===== Root 权限检查 =====
if [[ $EUID -ne 0 ]]; then
    err "需要 root 权限运行: sudo $0"
    exit 1
fi

# ===== 1. 安装 certbot =====
log "安装 certbot..."
if command -v apt-get >/dev/null; then
    apt-get update -qq
    apt-get install -y certbot
elif command -v yum >/dev/null; then
    yum install -y certbot
elif command -v brew >/dev/null; then
    brew install certbot
else
    err "未识别的包管理器 — 请手动安装 certbot"
    exit 1
fi
ok "certbot 已安装"

# ===== 2. webroot 目录 =====
log "创建 webroot 目录..."
mkdir -p "$WEBROOT/.well-known/acme-challenge"
chown -R www-data:www-data "$WEBROOT" 2>/dev/null || true

# ===== 3. 申请证书 (webroot 模式) =====
log "申请证书 ${DOMAIN}..."
if certbot certonly --webroot -w "$WEBROOT" -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive; then
    ok "证书申请成功"
else
    err "证书申请失败 — 请检查:"
    echo "   - DNS 是否正确解析 ($DOMAIN → $(curl -s ifconfig.me))"
    echo "   - 80 端口是否可达"
    exit 1
fi

# ===== 4. 部署 nginx 配置 =====
log "部署 nginx 配置..."

# 停用默认 site
[[ -L /etc/nginx/sites-enabled/default ]] && rm /etc/nginx/sites-enabled/default

# 复制配置
cp "$NGINX_CONF_SRC" "$NGINX_CONF_DEST"

# 创建软链
[[ -L "$NGINX_LINK" ]] || ln -s "$NGINX_CONF_DEST" "$NGINX_LINK"

# 测试配置
if nginx -t; then
    ok "nginx 配置语法正确"
else
    err "nginx 配置语法错误"
    exit 1
fi

# 重新加载 nginx (此时 nginx 还没启动, 用 start)
if systemctl is-active --quiet nginx; then
    systemctl reload nginx
else
    systemctl start nginx
    systemctl enable nginx
fi
ok "nginx 已启动"

# ===== 5. 设置自动续期 cron =====
log "配置自动续期 cron..."

# certbot 自带 systemd timer, 但保险起见再加 cron
CRON_LINE="0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'"

( crontab -l 2>/dev/null | grep -v 'certbot renew' ; echo "$CRON_LINE" ) | crontab -
ok "已设置每天 3 点自动续期"

# ===== 6. 验证 HTTPS =====
log "验证 HTTPS..."
sleep 2
if curl -sI -o /dev/null -w "%{http_code}\n" "https://${DOMAIN}/health/live" | grep -qE "^(200|503)$"; then
    ok "HTTPS 端点响应正常"
else
    warn "HTTPS 端点无响应 — 可能是后端未启动"
fi

# ===== 总结 =====
echo ""
ok "========================================="
ok "  HTTPS 配置完成 🦎"
ok "  https://${DOMAIN}"
ok "========================================="
echo ""
echo "下一步:"
echo "  1. 启动 backend + mariadb (docker compose up -d)"
echo "  2. 验证 https://${DOMAIN} 可访问"
echo "  3. (可选) 提交 https://hstspreload.org 预加载 HSTS"
echo ""