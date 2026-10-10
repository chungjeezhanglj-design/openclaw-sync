#!/usr/bin/env python3
"""
离线地图 API 服务器
提供标准的 XYZ 瓦片服务和 TileJSON 接口
"""

import sqlite3
import http.server
import socketserver
import json
import os
import sys
from urllib.parse import urlparse

MBTILES_FILE = '/Users/zhanglj/openclaw/workspace/china-shortbread-1.0.mbtiles'
PORT = 8088

class MapHandler(http.server.SimpleHTTPRequestHandler):
    db = None
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip('/')
        
        # CORS headers for all responses
        cors_headers = [
            ('Access-Control-Allow-Origin', '*'),
            ('Access-Control-Allow-Methods', 'GET, OPTIONS'),
            ('Access-Control-Allow-Headers', 'Content-Type'),
        ]
        
        # 健康检查
        if path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            for h in cors_headers:
                self.send_header(*h)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "service": "offline-map-api"}).encode())
            return
        
        # 首页
        if path == '/' or path == '':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            for h in cors_headers:
                self.send_header(*h)
            self.end_headers()
            html = '''<!DOCTYPE html>
<html>
<head><title>离线地图 API</title>
<style>body{font-family:system-ui;padding:40px;max-width:800px;margin:0 auto;line-height:1.6}
code{background:#f0f0f0;padding:2px 6px;border-radius:3px}
.endpoint{background:#f8f9fa;padding:15px;margin:10px 0;border-radius:8px;border-left:4px solid #667eea}</style>
</head>
<body>
<h1>🗺️ 离线地图 API 服务</h1>
<p><strong>数据源：</strong>china-shortbread-1.0.mbtiles (6.67 GB)</p>
<p><strong>格式：</strong>矢量瓦片 (PBF)</p>
<p><strong>坐标：</strong>XYZ 系统</p>

<h2>API 端点</h2>
<div class="endpoint">
  <h3>📍 瓦片服务</h3>
  <code>GET /tiles/{z}/{x}/{y}.pbf</code><br>
  <code>GET /tiles/{z}/{x}/{y}</code>
</div>

<div class="endpoint">
  <h3>📄 TileJSON</h3>
  <code>GET /tilejson.json</code>
</div>

<div class="endpoint">
  <h3>💊 健康检查</h3>
  <code>GET /health</code>
</div>

<h2>使用示例</h2>
<pre><code>// MapLibre GL JS
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      'china': {
        type: 'vector',
        url: 'http://localhost:8088/tilejson.json'
      }
    },
    layers: [...]
  }
});</code></pre>

<h2>Leaflet 示例</h2>
<pre><code>L.map('map').setView([35, 104], 4);
L.tileLayer('http://localhost:8088/tiles/{z}/{x}/{y}.pbf', {
  minZoom: 0,
  maxZoom: 14
}).addTo(map);</code></pre>
</body>
</html>'''
            self.wfile.write(html.encode())
            return
        
        # TileJSON
        if path == '/tilejson.json':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            for h in cors_headers:
                self.send_header(*h)
            self.end_headers()
            tilejson = {
                "tilejson": "2.2.0",
                "name": "China Offline Map",
                "description": "中国离线地图 - Shortbread 矢量瓦片",
                "version": "1.0.0",
                "tiles": [f"http://{self.headers['Host']}/tiles/{{z}}/{{x}}/{{y}}.pbf"],
                "minzoom": 0,
                "maxzoom": 14,
                "bounds": [73.41788, 14.27437, 134.8036, 53.65559],
                "center": [104.11074, 33.96498, 4],
                "format": "pbf",
                "vector_layers": [
                    {"id": "land", "minzoom": 7, "maxzoom": 14, "fields": {"kind": "String", "name": "String"}},
                    {"id": "water_polygons", "minzoom": 4, "maxzoom": 14, "fields": {"kind": "String"}},
                    {"id": "boundaries", "minzoom": 0, "maxzoom": 14, "fields": {"admin_level": "Number"}},
                    {"id": "place_labels", "minzoom": 3, "maxzoom": 14, "fields": {"name": "String", "population": "Number"}}
                ]
            }
            self.wfile.write(json.dumps(tilejson).encode())
            return
        
        # 瓦片请求：/tiles/z/x/y.pbf 或 /tiles/z/x/y
        if path.startswith('/tiles/'):
            parts = path.split('/')
            if len(parts) >= 5:
                try:
                    z = int(parts[2])
                    x = int(parts[3])
                    y_part = parts[4].replace('.pbf', '').replace('.mvt', '')
                    y = int(y_part)
                except:
                    self.send_error(404)
                    return
                
                # XYZ 坐标直接查询
                cursor = self.db.cursor()
                cursor.execute(
                    "SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?",
                    (z, x, y)
                )
                row = cursor.fetchone()
                
                if row and row[0]:
                    self.send_response(200)
                    self.send_header('Content-type', 'application/x-protobuf')
                    self.send_header('Content-Encoding', 'gzip')
                    for h in cors_headers:
                        self.send_header(*h)
                    self.send_header('Cache-Control', 'public, max-age=86400')
                    self.end_headers()
                    self.wfile.write(row[0])
                else:
                    # 返回 204 No Content（空瓦片）
                    self.send_response(204)
                    for h in cors_headers:
                        self.send_header(*h)
                    self.end_headers()
                return
        
        self.send_error(404)
    
    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {args[0]}")

def main():
    if not os.path.exists(MBTILES_FILE):
        print(f"❌ 错误：文件不存在 {MBTILES_FILE}")
        sys.exit(1)
    
    print(f"🗺️  离线地图 API 服务器")
    print(f"   数据源：{MBTILES_FILE}")
    print(f"   大小：{round(os.path.getsize(MBTILES_FILE)/1024/1024/1024, 2)} GB")
    print(f"   端口：http://localhost:{PORT}")
    print()
    
    MapHandler.db = sqlite3.connect(MBTILES_FILE)
    
    # 验证表结构
    cursor = MapHandler.db.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tiles'")
    if not cursor.fetchone():
        print("❌ 错误：MBTiles 文件中没有找到 'tiles' 表")
        sys.exit(1)
    
    cursor.execute("SELECT COUNT(*) FROM tiles")
    count = cursor.fetchone()[0]
    print(f"   瓦片数：{count:,}")
    print()
    print(f"✅ 服务器就绪！")
    print(f"   访问：http://localhost:{PORT}/")
    print(f"   TileJSON: http://localhost:{PORT}/tilejson.json")
    print(f"   按 Ctrl+C 停止")
    print()
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), MapHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 服务器已停止")
            MapHandler.db.close()

if __name__ == '__main__':
    main()
