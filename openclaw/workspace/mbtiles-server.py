#!/usr/bin/env python3
"""
简易 MBTiles 地图服务器
用法：python3 mbtiles-server.py /path/to/file.mbtiles [port]
"""

import sqlite3
import http.server
import socketserver
import sys
import os
from urllib.parse import urlparse, parse_qs

class MBTilesHandler(http.server.SimpleHTTPRequestHandler):
    db = None
    
    def do_GET(self):
        parsed = urlparse(self.path)
        
        # 健康检查
        if parsed.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')
            return
        
        # 主页
        if parsed.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            html = '''<!DOCTYPE html>
<html>
<head><title>MBTiles 地图服务</title>
<style>body{font-family:system-ui;padding:40px;max-width:800px;margin:0 auto}</style>
</head>
<body>
<h1>🗺️ MBTiles 地图服务运行中</h1>
<p>文件：''' + os.path.basename(MBTILES_FILE) + '''</p>
<p>大小：''' + str(round(os.path.getsize(MBTILES_FILE)/1024/1024/1024, 2)) + ''' GB</p>
<h2>访问方式：</h2>
<ul>
<li><strong>矢量瓦片 (PBF):</strong> <code>http://localhost:''' + str(PORT) + '''/{z}/{x}/{y}.pbf</code></li>
<li><strong>健康检查:</strong> <a href="/health">/health</a></li>
</ul>
<h2>示例（MapLibre GL JS）:</h2>
<pre><code>map.addSource('china-shortbread', {
  type: 'vector',
  tiles: ['http://localhost:''' + str(PORT) + '''/{z}/{x}/{y}.pbf'],
  minzoom: 0,
  maxzoom: 14
});
map.addLayer({
  id: 'land',
  type: 'fill',
  source: 'china-shortbread',
  'source-layer': 'land',
  paint: { 'fill-color': '#d4cfc2' }
});</code></pre>
</body>
</html>'''
            self.wfile.write(html.encode())
            return
        
        # 瓦片请求：/z/x/y.png 或 /z/x/y.pbf
        parts = parsed.path.strip('/').split('/')
        if len(parts) >= 3:
            try:
                z = int(parts[0])
                x = int(parts[1])
                # 处理 /z/x/y 或 /z/x/y.png 或 /z/x/y.pbf
                y_part = parts[2].split('.')[0]
                ext = parts[2].split('.')[-1] if '.' in parts[2] else 'pbf'
                y = int(y_part)
            except:
                self.send_error(404)
                return
            
            # Shortbread 使用 XYZ 坐标，直接使用 y 值（无需 TMS 翻转）
            cursor = self.db.cursor()
            cursor.execute(
                "SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?",
                (z, x, y)
            )
            row = cursor.fetchone()
            
            if row and row[0]:
                tile_data = row[0]
                # 矢量瓦片 (PBF)
                if ext.lower() == 'pbf' or ext.lower() == 'mvt':
                    # 检查是否是 gzip 压缩（MBTiles 通常存储 gzip 压缩的 PBF）
                    if tile_data[:2] == b'\x1f\x8b':  # gzip magic number
                        self.send_response(200)
                        self.send_header('Content-type', 'application/x-protobuf')
                        self.send_header('Content-Encoding', 'gzip')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(tile_data)
                    else:
                        # 未压缩的 PBF
                        self.send_response(200)
                        self.send_header('Content-type', 'application/x-protobuf')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(tile_data)
                else:
                    # 图片瓦片 (PNG/JPEG)
                    content_type = 'image/png' if ext.lower() == 'png' else 'image/jpeg'
                    self.send_response(200)
                    self.send_header('Content-type', content_type)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(row[0])
            else:
                # 返回空响应
                self.send_response(204)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
            return
        
        self.send_error(404)
    
    def log_message(self, format, *args):
        # 简化日志
        print(f"[{self.address_string()}] {args[0]}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法：python3 mbtiles-server.py <file.mbtiles> [port]")
        sys.exit(1)
    
    MBTILES_FILE = sys.argv[1]
    PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8081
    
    if not os.path.exists(MBTILES_FILE):
        print(f"错误：文件不存在：{MBTILES_FILE}")
        sys.exit(1)
    
    print(f"🗺️  启动 MBTiles 服务器...")
    print(f"   文件：{MBTILES_FILE}")
    print(f"   大小：{round(os.path.getsize(MBTILES_FILE)/1024/1024/1024, 2)} GB")
    print(f"   端口：http://localhost:{PORT}")
    
    # 连接数据库
    MBTilesHandler.db = sqlite3.connect(MBTILES_FILE)
    MBTilesHandler.db.row_factory = sqlite3.Row
    
    # 验证表结构
    cursor = MBTilesHandler.db.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tiles'")
    if not cursor.fetchone():
        print("错误：MBTiles 文件中没有找到 'tiles' 表")
        sys.exit(1)
    
    print("✅ 服务器就绪！按 Ctrl+C 停止")
    
    with socketserver.TCPServer(("", PORT), MBTilesHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 服务器已停止")
            MBTilesHandler.db.close()
