#!/bin/bash
# Remotion 视频渲染脚本
# 用法：render-video.sh <composition> <output.mp4> [props]

set -e

COMPOSITION="${1:-MyComposition}"
OUTPUT="${2:-out/video.mp4}"
PROPS="${3:-}"

echo "🎬 Remotion 渲染开始"
echo "   合成：$COMPOSITION"
echo "   输出：$OUTPUT"

# 检查 Remotion 项目
if [ ! -f "package.json" ]; then
    echo "❌ 错误：当前目录不是 Remotion 项目（缺少 package.json）"
    exit 1
fi

# 渲染视频
if [ -n "$PROPS" ]; then
    npx remotion render "$COMPOSITION" "$OUTPUT" --props "$PROPS"
else
    npx remotion render "$COMPOSITION" "$OUTPUT"
fi

echo "✅ 渲染完成：$OUTPUT"
