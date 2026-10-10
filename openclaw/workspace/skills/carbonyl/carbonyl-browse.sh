#!/bin/bash
# Carbonyl 终端浏览器包装脚本
# 用法：./carbonyl-browse.sh <URL>

set -e

URL="$1"

if [ -z "$URL" ]; then
    echo "用法：$0 <URL>"
    echo "示例：$0 https://github.com"
    exit 1
fi

# 检查 carbonyl 是否已安装
if ! command -v carbonyl &> /dev/null; then
    echo "错误：carbonyl 未安装"
    echo "请运行：npm install --global carbonyl"
    exit 1
fi

echo "🦎 启动 Carbonyl 终端浏览器..."
echo "📍 目标：$URL"
echo "💡 提示：按 Ctrl+C 或 q 退出"
echo ""

# 运行 carbonyl
carbonyl "$URL"
