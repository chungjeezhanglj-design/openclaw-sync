#!/bin/bash
# 搜索并下载 Pexels 素材
# 用法：find-footage.sh <search-query> <output-dir>

set -e

QUERY="${1:-nature}"
OUTPUT_DIR="${2:-./footage}"

echo "📸 搜索 Pexels 素材：$QUERY"
echo "   保存目录：$OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"

# 使用 tavily 搜索（或直接用 Pexels API）
echo "🔍 搜索中..."

# 这里可以调用 Pexels API 或使用 web_search
# 示例：使用 mcporter 调用 tavily
mcporter call tavily.tavily_search query:"$QUERY site:pexels.com videos" max_results:10

echo "✅ 搜索完成"
echo ""
echo "提示：手动下载或使用 Pexels API"
echo "API: https://www.pexels.com/api/"
