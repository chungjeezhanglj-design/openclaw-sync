#!/usr/bin/env python3
"""
离线地图路径规划服务
基于 MBTiles 中的 streets 矢量数据进行路径匹配和规划
"""

import sqlite3
import struct
import gzip
import io
import json
import math
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from collections import defaultdict
import heapq

# ==================== PBF 解析 ====================

def decode_varint(data, pos):
    """解码 varint"""
    result = 0
    shift = 0
    while True:
        byte = data[pos]
        result |= (byte & 0x7F) << shift
        pos += 1
        if not (byte & 0x80):
            break
        shift += 7
    return result, pos

def decode_svarint(data, pos):
    """解码 signed varint"""
    val, pos = decode_varint(data, pos)
    return (val >> 1) ^ -(val & 1), pos

def parse_pbf(data):
    """解析 PBF 格式的矢量瓦片"""
    try:
        # 尝试解压
        if data[:2] == b'\x1f\x8b':
            data = gzip.decompress(data)
    except:
        pass
    
    layers = []
    pos = 0
    
    while pos < len(data):
        key, pos = decode_varint(data, pos)
        length, pos = decode_varint(data, pos)
        
        if key == 3:  # Layer
            layer_data = data[pos:pos+length]
            layer = parse_layer(layer_data)
            if layer:
                layers.append(layer)
            pos += length
        else:
            pos += length
    
    return layers

def parse_layer(data):
    """解析图层"""
    layer = {
        'name': '',
        'version': 1,
        'extent': 4096,
        'features': []
    }
    
    pos = 0
    while pos < len(data):
        key, pos = decode_varint(data, pos)
        length, pos = decode_varint(data, pos)
        
        if key == 1:  # name
            layer['name'] = data[pos:pos+length].decode('utf-8')
        elif key == 2:  # version
            layer['version'] = decode_varint(data[pos:pos+length], 0)[0]
        elif key == 3:  # extent
            layer['extent'] = decode_varint(data[pos:pos+length], 0)[0]
        elif key == 4:  # features
            feature = parse_feature(data[pos:pos+length], layer['extent'])
            if feature:
                layer['features'].append(feature)
        
        pos += length
    
    return layer

def parse_feature(data, extent):
    """解析要素"""
    feature = {
        'type': 'Unknown',
        'geometry': [],
        'properties': {}
    }
    
    tags = []
    pos = 0
    
    while pos < len(data):
        key, pos = decode_varint(data, pos)
        length, pos = decode_varint(data, pos)
        
        if key == 1:  # id
            pass
        elif key == 2:  # tags
            tags = list(decode_varint_array(data[pos:pos+length]))
        elif key == 3:  # type
            type_id = decode_varint(data[pos:pos+length], 0)[0]
            feature['type'] = ['Unknown', 'Point', 'LineString', 'Polygon'][type_id] if type_id <= 3 else 'Unknown'
        elif key == 4:  # geometry
            feature['geometry'] = decode_geometry(data[pos:pos+length])
        
        pos += length
    
    # 解析属性
    for i in range(0, len(tags), 2):
        if i + 1 < len(tags):
            # 简化处理，实际需要字符串表
            pass
    
    return feature

def decode_varint_array(data):
    """解码 varint 数组"""
    pos = 0
    while pos < len(data):
        val, pos = decode_varint(data, pos)
        yield val

def decode_geometry(data):
    """解析几何坐标"""
    coords = []
    pos = 0
    command = 0
    count = 0
    x, y = 0, 0
    
    while pos < len(data):
        if count == 0:
            cmd = decode_varint(data, pos)[0]
            command = cmd & 0x07
            count = cmd >> 3
            pos = decode_varint(data, pos)[1]
        
        if command == 1:  # MoveTo
            dx, pos = decode_svarint(data, pos)
            dy, pos = decode_svarint(data, pos)
            x, y = x + dx, y + dy
            coords.append([x, y])
            count -= 1
        elif command == 2:  # LineTo
            dx, pos = decode_svarint(data, pos)
            dy, pos = decode_svarint(data, pos)
            x, y = x + dx, y + dy
            coords.append([x, y])
            count -= 1
        elif command == 7:  # ClosePath
            count -= 1
    
    return coords

# ==================== 路网图构建 ====================

class RoadGraph:
    """道路网络图"""
    
    def __init__(self):
        self.nodes = {}  # node_id -> (lng, lat)
        self.edges = defaultdict(list)  # from_node -> [(to_node, distance, road_info)]
        self.node_index = 0
        self.coord_to_node = {}  # (lng, lat) -> node_id
    
    def add_edge(self, coords, properties):
        """添加道路边"""
        if len(coords) < 2:
            return
        
        for i in range(len(coords) - 1):
            p1 = coords[i]
            p2 = coords[i + 1]
            
            # 创建或获取节点
            node1 = self.get_or_create_node(p1)
            node2 = self.get_or_create_node(p2)
            
            # 计算距离（瓦片坐标）
            dist = math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)
            
            # 双向边
            self.edges[node1].append((node2, dist, properties))
            self.edges[node2].append((node1, dist, properties))
    
    def get_or_create_node(self, coord):
        """获取或创建节点"""
        # 简化坐标用于索引
        key = (round(coord[0] / 10) * 10, round(coord[1] / 10) * 10)
        
        if key not in self.node_index:
            self.node_index[key] = self.node_index
            self.nodes[self.node_index] = (coord[0], coord[1])
            self.node_index += 1
        
        return self.node_index[key]
    
    def find_nearest_node(self, lng, lat, tile_coords):
        """查找最近的节点"""
        # 转换到瓦片坐标
        x = (lng - tile_coords[0]) / tile_coords[2] * 4096
        y = (lat - tile_coords[1]) / tile_coords[2] * 4096
        
        min_dist = float('inf')
        nearest = None
        
        for node_id, (nx, ny) in self.nodes.items():
            dist = math.sqrt((nx - x)**2 + (ny - y)**2)
            if dist < min_dist:
                min_dist = dist
                nearest = node_id
        
        return nearest, min_dist
    
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
            
            for v, edge_dist, props in self.edges.get(u, []):
                if v in visited:
                    continue
                
                new_dist = d + edge_dist
                if new_dist < dist.get(v, float('inf')):
                    dist[v] = new_dist
                    prev[v] = u
                    heapq.heappush(pq, (new_dist, v))
        
        # 重建路径
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
        coords = []
        for node_id in path:
            if node_id in self.nodes:
                coords.append(self.nodes[node_id])
        return coords

# ==================== MBTiles 查询 ====================

class MBTilesRouter:
    """MBTiles 路径规划器"""
    
    def __init__(self, mbtiles_path):
        self.mbtiles_path = mbtiles_path
        self.graph = RoadGraph()
        self.loaded_tiles = set()
    
    def load_tile(self, z, x, y):
        """加载瓦片并构建路网"""
        tile_key = (z, x, y)
        if tile_key in self.loaded_tiles:
            return
        
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
        
        if row and row[0]:
            layers = parse_pbf(row[0])
            
            # 获取瓦片边界
            n = 1 << z
            lon_min = x / n * 360 - 180
            lon_max = (x + 1) / n * 360 - 180
            lat_max = 85.0511  # Mercator 最大值
            lat_min = -85.0511
            
            tile_bounds = (lon_min, lat_min, lon_max, lat_max, 4096)
            
            for layer in layers:
                if layer['name'] == 'streets':
                    for feature in layer['features']:
                        if feature['type'] == 'LineString':
                            # 转换坐标到经纬度
                            coords = self.tile_to_lonlat(feature['geometry'], tile_bounds)
                            self.graph.add_edge(coords, feature['properties'])
        
        self.loaded_tiles.add(tile_key)
    
    def tile_to_lonlat(self, coords, bounds):
        """转换瓦片坐标到经纬度"""
        lon_min, lat_min, lon_max, lat_max, extent = bounds
        result = []
        
        for x, y in coords:
            lon = lon_min + (x / extent) * (lon_max - lon_min)
            lat = lat_min + (y / extent) * (lat_max - lat_min)
            result.append([lon, lat])
        
        return result
    
    def find_route(self, start_lng, start_lat, end_lng, end_lat, zoom=None):
        """查找路径"""
        # 使用 zoom 9（MBTiles 中的最高级别）
        if zoom is None or zoom > 9:
            zoom = 9
        
        # 计算瓦片坐标
        n = 1 << zoom
        start_x = int((start_lng + 180) / 360 * n)
        start_y = int((1 - math.log(math.tan(start_lat * math.pi / 180) + 
                       1 / math.cos(start_lat * math.pi / 180)) / math.pi) / 2 * n)
        
        end_x = int((end_lng + 180) / 360 * n)
        end_y = int((1 - math.log(math.tan(end_lat * math.pi / 180) + 
                     1 / math.cos(end_lat * math.pi / 180)) / math.pi) / 2 * n)
        
        print(f"📍 路径规划：zoom={zoom}, 起点瓦片=({start_x},{start_y}), 终点瓦片=({end_x},{end_y})")
        
        # 加载相关瓦片
        loaded_count = 0
        for x in range(min(start_x, end_x) - 1, max(start_x, end_x) + 2):
            for y in range(min(start_y, end_y) - 1, max(start_y, end_y) + 2):
                if 0 <= x < n and 0 <= y < n:
                    try:
                        self.load_tile(zoom, x, y)
                        loaded_count += 1
                    except Exception as e:
                        print(f"加载瓦片失败 ({zoom},{x},{y}): {e}")
        
        print(f"✅ 加载了 {loaded_count} 个瓦片，当前路网节点数：{len(self.graph.nodes)}")
        
        # 查找最近的节点
        tile_bounds = (
            start_x / n * 360 - 180,
            -85.0511,
            (start_x + 1) / n * 360 - 180,
            85.0511,
            4096
        )
        
        start_node, _ = self.graph.find_nearest_node(start_lng, start_lat, tile_bounds)
        end_node, _ = self.graph.find_nearest_node(end_lng, end_lat, tile_bounds)
        
        # 计算路径
        distance, path = self.graph.dijkstra(start_node, end_node)
        
        if path:
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
        
        steps = []
        steps.append({
            'instruction': '从起点出发',
            'distance': 0,
            'type': 'start'
        })
        
        cumulative = 0
        for i in range(1, len(coords)):
            dist = self.haversine(coords[i-1], coords[i])
            cumulative += dist
            
            if i < len(coords) - 1:
                # 计算方向变化
                bearing1 = self.get_bearing(coords[i-1], coords[i])
                bearing2 = self.get_bearing(coords[i], coords[i+1])
                angle = bearing2 - bearing1
                
                turn_type = 'straight'
                instruction = '继续前行'
                
                if angle > 45:
                    turn_type = 'right'
                    instruction = '右转'
                elif angle > 120:
                    turn_type = 'sharp-right'
                    instruction = '向右急转'
                elif angle < -45:
                    turn_type = 'left'
                    instruction = '左转'
                elif angle < -120:
                    turn_type = 'sharp-left'
                    instruction = '向左急转'
                
                if turn_type != 'straight':
                    steps.append({
                        'instruction': instruction,
                        'distance': cumulative,
                        'type': turn_type,
                        'location': coords[i]
                    })
        
        steps.append({
            'instruction': '到达目的地',
            'distance': cumulative,
            'type': 'arrive'
        })
        
        return steps
    
    def haversine(self, p1, p2):
        """计算两点间距离（米）"""
        R = 6371000
        lat1, lat2 = p1[1] * math.pi / 180, p2[1] * math.pi / 180
        dlat = (p2[1] - p1[1]) * math.pi / 180
        dlon = (p2[0] - p1[0]) * math.pi / 180
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
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
                zoom = int(params.get('zoom', [12])[0])
                
                result = router.find_route(start_lng, start_lat, end_lng, end_lat, zoom)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode())
                
            except Exception as e:
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
        print("用法：python3 route-server.py <mbtiles 文件> [端口]")
        sys.exit(1)
    
    mbtiles_path = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8084
    
    print(f"🛣️ 正在加载 MBTiles: {mbtiles_path}")
    router = MBTilesRouter(mbtiles_path)
    
    print(f"🚀 路径规划服务启动在端口 {port}")
    print(f"📍 访问：http://localhost:{port}/route?start_lng=116.4&start_lat=39.9&end_lng=116.5&end_lat=39.95")
    
    server = HTTPServer(('localhost', port), RouteHandler)
    server.serve_forever()

if __name__ == '__main__':
    main()
