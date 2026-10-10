#!/usr/bin/env python3
"""
离线地图路径规划服务 v4
使用正确的 Web Mercator 投影转换
"""

import sqlite3
import gzip
import json
import math
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from collections import defaultdict
import heapq
import mapbox_vector_tile

class RoadGraph:
    """道路网络图"""
    
    def __init__(self):
        self.nodes = {}  # node_id -> (lng, lat)
        self.edges = defaultdict(list)  # from_node -> [(to_node, distance)]
        self.node_coords = {}  # (lng_rounded, lat_rounded) -> node_id
        self.next_node_id = 0
        self.edge_count = 0
    
    def add_edge(self, coords, properties=None):
        """添加道路边（坐标为经纬度）"""
        if len(coords) < 2:
            return 0
        
        added = 0
        for i in range(len(coords) - 1):
            p1 = (coords[i][0], coords[i][1])
            p2 = (coords[i+1][0], coords[i+1][1])
            
            node1 = self.get_or_create_node(p1)
            node2 = self.get_or_create_node(p2)
            
            dist = self.haversine(p1, p2)
            
            # 避免重复边
            existing = [e[0] for e in self.edges[node1]]
            if node2 not in existing:
                self.edges[node1].append((node2, dist))
                self.edges[node2].append((node1, dist))
                added += 1
                self.edge_count += 1
        
        return added
    
    def get_or_create_node(self, coord):
        """获取或创建节点"""
        # 简化坐标用于索引（约 10 米精度）
        key = (round(coord[0] * 1000) / 1000, round(coord[1] * 1000) / 1000)
        
        if key not in self.node_coords:
            node_id = self.next_node_id
            self.next_node_id += 1
            self.node_coords[key] = node_id
            self.nodes[node_id] = coord
        
        return self.node_coords[key]
    
    def find_nearest_node(self, lng, lat, max_dist=2000):
        """查找最近的节点"""
        min_dist = float('inf')
        nearest = None
        
        for node_id, (nlng, nlat) in self.nodes.items():
            dist = self.haversine((nlng, nlat), (lng, lat))
            if dist < min_dist:
                min_dist = dist
                nearest = node_id
        
        if min_dist <= max_dist:
            return nearest, min_dist
        return None, min_dist
    
    def dijkstra(self, start, end):
        """Dijkstra 最短路径算法"""
        if start is None or end is None:
            return None, []
        
        dist = {start: 0}
        prev = {start: None}
        pq = [(0, start)]
        visited = set()
        
        while pq:
            d, u = heapq.heappop(pq)
            
            if u in visited:
                continue
            visited.add(u)
            
            if u == end:
                break
            
            for v, edge_dist in self.edges.get(u, []):
                if v in visited:
                    continue
                
                new_dist = d + edge_dist
                if new_dist < dist.get(v, float('inf')):
                    dist[v] = new_dist
                    prev[v] = u
                    heapq.heappush(pq, (new_dist, v))
        
        if end not in prev:
            return None, []
        
        path = []
        node = end
        while node is not None:
            path.append(node)
            node = prev.get(node)
        path.reverse()
        
        return dist.get(end, float('inf')), path
    
    def get_path_coords(self, path):
        """获取路径坐标"""
        return [self.nodes[node_id] for node_id in path if node_id in self.nodes]
    
    def haversine(self, p1, p2):
        """计算两点间距离（米）"""
        R = 6371000
        lat1, lat2 = p1[1] * math.pi / 180, p2[1] * math.pi / 180
        dlat = (p2[1] - p1[1]) * math.pi / 180
        dlon = (p2[0] - p1[0]) * math.pi / 180
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

class MBTilesRouter:
    """MBTiles 路径规划器"""
    
    def __init__(self, mbtiles_path):
        self.mbtiles_path = mbtiles_path
        self.graph = RoadGraph()
        self.loaded_tiles = set()
        self.max_zoom = 9
    
    def tile_to_lonlat(self, coords, z, x, y, extent=4096):
        """转换瓦片坐标到经纬度（Web Mercator 投影）"""
        n = 1 << z
        result = []
        
        for vx, vy in coords:
            # 经度：线性转换
            lon = (x + vx / extent) / n * 360 - 180
            
            # 纬度：Mercator 反投影
            lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * (y + vy / extent) / n)))
            lat = math.degrees(lat_rad)
            
            result.append([lon, lat])
        
        return result
    
    def load_tile(self, z, x, y):
        """加载瓦片并构建路网"""
        tile_key = (z, x, y)
        if tile_key in self.loaded_tiles:
            return 0
        
        conn = sqlite3.connect(self.mbtiles_path)
        cursor = conn.cursor()
        
        # TMS → XYZ 转换
        tms_y = (1 << z) - 1 - y
        
        cursor.execute(
            'SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?',
            (z, x, tms_y)
        )
        row = cursor.fetchone()
        conn.close()
        
        edge_count = 0
        
        if row and row[0]:
            try:
                data = row[0]
                if data[:2] == b'\x1f\x8b':
                    data = gzip.decompress(data)
                
                tile_data = mapbox_vector_tile.decode(data)
                
                if 'streets' in tile_data:
                    streets_layer = tile_data['streets']
                    if isinstance(streets_layer, dict):
                        streets_features = streets_layer.get('features', [])
                    else:
                        streets_features = streets_layer
                    
                    # 转换坐标
                    for feature in streets_features:
                        if isinstance(feature, dict):
                            geom = feature.get('geometry')
                            if geom:
                                if geom['type'] == 'LineString':
                                    coords = self.tile_to_lonlat(geom['coordinates'], z, x, y)
                                    added = self.graph.add_edge(coords)
                                    edge_count += added
                                elif geom['type'] == 'MultiLineString':
                                    for line in geom['coordinates']:
                                        coords = self.tile_to_lonlat(line, z, x, y)
                                        added = self.graph.add_edge(coords)
                                        edge_count += added
            except Exception as e:
                print(f"解析瓦片失败 ({z},{x},{y}): {e}")
        
        self.loaded_tiles.add(tile_key)
        return edge_count
    
    def find_route(self, start_lng, start_lat, end_lng, end_lat):
        """查找路径"""
        zoom = self.max_zoom
        n = 1 << zoom
        
        # 计算瓦片坐标（使用标准 Web Mercator 公式）
        start_x = int((start_lng + 180) / 360 * n)
        start_y = int((1 - math.log(math.tan(start_lat * math.pi / 180) + 1 / math.cos(start_lat * math.pi / 180)) / math.pi) / 2 * n)
        
        end_x = int((end_lng + 180) / 360 * n)
        end_y = int((1 - math.log(math.tan(end_lat * math.pi / 180) + 1 / math.cos(end_lat * math.pi / 180)) / math.pi) / 2 * n)
        
        print(f"📍 路径规划：起点=({start_lng},{start_lat}), 终点=({end_lng},{end_lat})")
        print(f"   瓦片范围：x={min(start_x,end_x)-1}-{max(start_x,end_x)+1}, y={min(start_y,end_y)-1}-{max(start_y,end_y)+1}")
        
        # 加载相关瓦片
        total_edges = 0
        load_count = 0
        for x in range(min(start_x, end_x) - 1, max(start_x, end_x) + 2):
            for y in range(min(start_y, end_y) - 1, max(start_y, end_y) + 2):
                if 0 <= x < n and 0 <= y < n:
                    try:
                        edges = self.load_tile(zoom, x, y)
                        if edges > 0:
                            load_count += 1
                        total_edges += edges
                    except Exception as e:
                        print(f"加载瓦片失败 ({zoom},{x},{y}): {e}")
        
        print(f"✅ 加载了 {load_count} 个瓦片，路网节点数：{len(self.graph.nodes)}, 边数：{total_edges}")
        
        if len(self.graph.nodes) == 0:
            return {'success': False, 'error': '未加载到道路数据'}
        
        # 查找最近的节点
        start_node, start_dist = self.graph.find_nearest_node(start_lng, start_lat)
        end_node, end_dist = self.graph.find_nearest_node(end_lng, end_lat)
        
        print(f"   起点节点：{start_node} (距离：{start_dist:.1f}米)")
        print(f"   终点节点：{end_node} (距离：{end_dist:.1f}米)")
        
        if start_node is None or end_node is None:
            return {'success': False, 'error': '未找到附近的道路'}
        
        # 计算路径
        distance, path = self.graph.dijkstra(start_node, end_node)
        
        if path and len(path) > 1 and distance:
            path_coords = self.graph.get_path_coords(path)
            
            return {
                'success': True,
                'distance': distance,
                'coordinates': path_coords,
                'steps': self.generate_steps(path_coords)
            }
        
        return {'success': False, 'error': '未找到路径'}
    
    def generate_steps(self, coords):
        """生成导航步骤"""
        if len(coords) < 2:
            return []
        
        steps = [{'instruction': '从起点出发', 'distance': 0, 'type': 'start'}]
        cumulative = 0
        
        for i in range(1, len(coords)):
            dist = self.graph.haversine(coords[i-1], coords[i])
            cumulative += dist
            
            if i < len(coords) - 1:
                bearing1 = self.get_bearing(coords[i-1], coords[i])
                bearing2 = self.get_bearing(coords[i], coords[i+1])
                angle = bearing2 - bearing1
                
                while angle > 180: angle -= 360
                while angle < -180: angle += 360
                
                if abs(angle) > 30:
                    if angle > 120:
                        turn = 'sharp-right'
                        instruction = '向右急转'
                    elif angle > 30:
                        turn = 'right'
                        instruction = '右转'
                    elif angle < -120:
                        turn = 'sharp-left'
                        instruction = '向左急转'
                    elif angle < -30:
                        turn = 'left'
                        instruction = '左转'
                    else:
                        turn = 'straight'
                        instruction = '继续前行'
                    
                    steps.append({
                        'instruction': instruction,
                        'distance': cumulative,
                        'type': turn,
                        'location': coords[i]
                    })
        
        steps.append({'instruction': '到达目的地', 'distance': cumulative, 'type': 'arrive'})
        return steps
    
    def get_bearing(self, p1, p2):
        """计算方位角"""
        lat1, lat2 = p1[1] * math.pi / 180, p2[1] * math.pi / 180
        dlon = (p2[0] - p1[0]) * math.pi / 180
        y = math.sin(dlon) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        return math.degrees(math.atan2(y, x))

# ==================== HTTP 服务 ====================

router = None

class RouteHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global router
        
        parsed = urlparse(self.path)
        
        if parsed.path == '/route':
            params = parse_qs(parsed.query)
            
            try:
                start_lng = float(params.get('start_lng', [0])[0])
                start_lat = float(params.get('start_lat', [0])[0])
                end_lng = float(params.get('end_lng', [0])[0])
                end_lat = float(params.get('end_lat', [0])[0])
                
                result = router.find_route(start_lng, start_lat, end_lng, end_lat)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode())
                
            except Exception as e:
                print(f"❌ 错误：{e}")
                import traceback
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        
        elif parsed.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

def main():
    global router
    
    import sys
    if len(sys.argv) < 2:
        print("用法：python3 route-server-v4.py <mbtiles 文件> [端口]")
        sys.exit(1)
    
    mbtiles_path = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8084
    
    print(f"🛣️ 正在初始化 MBTiles: {mbtiles_path}")
    router = MBTilesRouter(mbtiles_path)
    
    print(f"🚀 路径规划服务启动在端口 {port}")
    print(f"📍 测试：http://localhost:{port}/route?start_lng=114.5&start_lat=38.04&end_lng=114.52&end_lat=38.06")
    
    server = HTTPServer(('localhost', port), RouteHandler)
    server.serve_forever()

if __name__ == '__main__':
    main()
