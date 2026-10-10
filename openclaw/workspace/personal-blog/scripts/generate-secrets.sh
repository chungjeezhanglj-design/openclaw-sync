#!/bin/bash
# =============================================================================
# 博客小时光系统 · 生成生产密钥
# =============================================================================
# 用法:
#   ./scripts/generate-secrets.sh [env-file-path]
#
# 默认修改 backend/.env.production, 或指定目标文件
# 生成 64 字符十六进制随机串, 替换 JWT_SECRET 和 JWT_REFRESH_SECRET
# =============================================================================

set -euo pipefail

ENV_FILE="${1:-backend/.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "❌ 文件不存在: $ENV_FILE" >&2
    echo "   先 cp backend/.env.production.example $ENV_FILE" >&2
    exit 1
fi

# 检测占位符
if ! grep -q "GENERATE_WITH_scripts/generate-secrets.sh" "$ENV_FILE"; then
    echo "⚠️  文件中没有占位符 — JWT_SECRET 可能已经设置过" >&2
    read -p "继续会覆盖现有 JWT_SECRET 和 JWT_REFRESH_SECRET, 确定? [y/N] " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 0
    fi
fi

# 生成 64 字符十六进制 = 256 bit 熵
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

echo "🔑 生成的密钥 (256 bit 熵):"
echo "   JWT_SECRET         = $JWT_SECRET"
echo "   JWT_REFRESH_SECRET = $JWT_REFRESH_SECRET"
echo ""

# 备份原文件
cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d-%H%M%S)"

# 替换占位符 (macOS 和 Linux sed 语法不同, 分别处理)
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"
    sed -i '' "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" "$ENV_FILE"
else
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"
    sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" "$ENV_FILE"
fi

echo "✅ 已写入 $ENV_FILE"
echo "   原文件备份: ${ENV_FILE}.bak.$(date +%Y%m%d-%H%M%S)"
echo ""
echo "⚠️  接下来:"
echo "   1. 编辑 $ENV_FILE 填入真实 DB 密码 / AI API Key"
echo "   2. 检查 ADMIN_PASSWORD 已改成强密码"
echo "   3. 把密钥存入 1Password / Bitwarden (本地不持久保存)"