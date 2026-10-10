#!/bin/bash
# 启动 MBTiles 地图服务器

MBTILES_FILE="${1:-/Users/zhanglj/openclaw/workspace/china-shortbread-1.0.mbtiles}"
PORT="${2:-8081}"

echo "🗺️  启动 MBTiles 地图服务器..."
echo "   文件：$MBTILES_FILE"
echo "   端口：http://localhost:$PORT"
echo ""

if [ ! -f "$MBTILES_FILE" ]; then
    echo "❌ 错误：文件不存在"
    echo "   请指定正确的 mbtiles 文件路径"
    echo "   用法：$0 <文件路径> [端口]"
    exit 1
fi

echo "✅ 文件存在，启动服务器..."
echo "   按 Ctrl+C 停止服务"
echo ""

python3 /Users/zhanglj/openclaw/workspace/mbtiles-server.py "$MBTILES_FILE" "$PORT"
