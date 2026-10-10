#!/usr/bin/env python3
"""
MBTiles HTTP 服务器 - XYZ 坐标版本
用法：python3 mbtiles-xyz-server.py /path/to/file.mbtiles [port]
"""

import sqlite3
import http.server
import socketserver
import sys
import os
from urllib.parse import urlparse

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
        
        # TileJSON
        if parsed.path == '/china-shortbread-1.0.json':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            tilejson = {
                "tilejson": "2.2.0",
                "name": "China Shortbread",
                "description": "China offline map",
                "version": "1.0.0",
                "tiles": [f"http://{self.headers['Host']}/{{z}}/{{x}}/{{y}}.pbf"],
                "minzoom": 0,
                "maxzoom": 14,
                "bounds": [73.41788, 14.27437, 134.8036, 53.65559],
                "center": [104.11074, 33.96498, 7],
                "format": "pbf",
                "vector_layers": [
                    {"id": "land", "minzoom": 7, "maxzoom": 14},
                    {"id": "water_polygons", "minzoom": 4, "maxzoom": 14},
                    {"id": "boundaries", "minzoom": 0, "maxzoom": 14},
                    {"id": "place_labels", "minzoom": 3, "maxzoom": 14}
                ]
            }
            import json
            self.wfile.write(json.dumps(tilejson).encode())
            return
        
        # 瓦片请求：/z/x/y 或 /z/x/y.pbf
        parts = parsed.path.strip('/').split('/')
        if len(parts) >= 3 and parts[0].isdigit():
            try:
                z = int(parts[0])
                x = int(parts[1])
                y_part = parts[2].split('.')[0]
                y = int(y_part)
            except:
                self.send_error(404)
                return
            
            # XYZ 坐标直接查询（不翻转）
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
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(row[0])
            else:
                # 返回空瓦片
                self.send_response(204)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
            return
        
        self.send_error(404)
    
    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {args[0]}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法：python3 mbtiles-xyz-server.py <file.mbtiles> [port]")
        sys.exit(1)
    
    MBTILES_FILE = sys.argv[1]
    PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8080
    
    if not os.path.exists(MBTILES_FILE):
        print(f"错误：文件不存在：{MBTILES_FILE}")
        sys.exit(1)
    
    print(f"🗺️  启动 MBTiles 服务器 (XYZ 坐标)...")
    print(f"   文件：{MBTILES_FILE}")
    print(f"   大小：{round(os.path.getsize(MBTILES_FILE)/1024/1024/1024, 2)} GB")
    print(f"   端口：http://localhost:{PORT}")
    
    MBTilesHandler.db = sqlite3.connect(MBTILES_FILE)
    
    cursor = MBTilesHandler.db.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tiles'")
    if not cursor.fetchone():
        print("错误：MBTiles 文件中没有找到 'tiles' 表")
        sys.exit(1)
    
    print("✅ 服务器就绪！按 Ctrl+C 停止")
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), MBTilesHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 服务器已停止")
            MBTilesHandler.db.close()
