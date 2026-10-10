#!/bin/bash
# 🗺️ 中国离线地图 - 一键启动脚本（含路径规划）

echo "🗺️ 启动中国离线地图服务（完整版）..."
echo ""

# 检查工作目录
cd /Users/zhanglj/openclaw/workspace

# 检查 MBTiles 文件
MBTILES_FILE="china-shortbread-1.0.mbtiles"
if [ ! -f "$MBTILES_FILE" ]; then
    echo "❌ 未找到 MBTiles 文件：$MBTILES_FILE"
    echo "请确保文件存在于工作目录中"
    exit 1
fi

echo "✅ 找到 MBTiles 文件：$MBTILES_FILE"
echo ""

# 停止旧进程
echo "🔄 检查并停止旧进程..."
pkill -f "mbtiles-server.py" 2>/dev/null
pkill -f "route-server.py" 2>/dev/null
pkill -f "http.server 8082" 2>/dev/null
sleep 1

# 启动 MBTiles 服务器（端口 8083）
echo "📦 启动 MBTiles 服务器（端口 8083）..."
python3 mbtiles-server.py "$MBTILES_FILE" 8083 &
MBTILES_PID=$!
echo "   ✅ MBTiles 服务器已启动 (PID: $MBTILES_PID)"

# 启动路径规划服务（端口 8084）
echo "🛣️ 启动路径规划服务（端口 8084）..."
python3 /Users/zhanglj/openclaw/workspace/离线地图项目/route-server.py "$MBTILES_FILE" 8084 &
ROUTE_PID=$!
echo "   ✅ 路径规划服务已启动 (PID: $ROUTE_PID)"

# 启动 HTTP 服务器（端口 8082）
echo "🌐 启动 HTTP 服务器（端口 8082）..."
python3 -m http.server 8082 &
HTTP_PID=$!
echo "   ✅ HTTP 服务器已启动 (PID: $HTTP_PID)"

echo ""
echo "=========================================="
echo "✅ 所有服务已启动！"
echo "=========================================="
echo ""
echo "📍 访问地址："
echo "   终极版 v2（推荐）: http://localhost:8082/离线地图项目/map-ultimate-v2.html"
echo "   专业版：http://localhost:8082/离线地图项目/map-pro.html"
echo ""
echo "🔧 服务状态："
echo "   - HTTP 服务器：http://localhost:8082"
echo "   - MBTiles 服务：http://localhost:8083/{z}/{x}/{y}.pbf"
echo "   - 路径规划服务：http://localhost:8084/route"
echo ""
echo "📊 进程信息："
echo "   - MBTiles PID: $MBTILES_PID"
echo "   - 路径规划 PID: $ROUTE_PID"
echo "   - HTTP PID: $HTTP_PID"
echo ""
echo "🛑 停止服务：按 Ctrl+C 或运行以下命令："
echo "   pkill -f 'mbtiles-server.py'"
echo "   pkill -f 'route-server.py'"
echo "   pkill -f 'http.server 8082'"
echo ""

# 等待中断信号
trap "kill $MBTILES_PID $ROUTE_PID $HTTP_PID 2>/dev/null; echo ''; echo '👋 服务已停止'; exit" INT

# 保持运行
wait
