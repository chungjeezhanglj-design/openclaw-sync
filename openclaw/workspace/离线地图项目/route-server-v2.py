#!/usr/bin/env python3
"""
离线地图路径规划服务 v2
基于 MBTiles 中的 streets 矢量数据进行路径匹配和规划
简化版 PBF 解析
"""

import sqlite3
import gzip
import json
import math
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from collections import defaultdict
import heapq
import struct

# ==================== 简化的 PBF 解析 ====================

def decode_varint(data, pos):
    """解码 varint"""
    result = 0
    shift = 0
    while pos < len(data):
        if pos >= len(data):
            break
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

def parse_vector_tile(data):
    """解析矢量瓦片，返回图层字典"""
    try:
        if data[:2] == b'\x1f\x8b':
            data = gzip.decompress(data)
    except:
        pass
    
    layers = {}
    pos = 0
    
    while pos < len(data) - 2:
        try:
            key, pos = decode_varint(data, pos)
            length, pos = decode_varint(data, pos)
            
            if pos + length > len(data):
                break
            
            if key == 3:  # Layer
                layer_data = data[pos:pos+length]
                layer_info = parse_layer(layer_data)
                if layer_info and layer_info['name']:
                    layers[layer_info['name']] = layer_info
            
            pos += length
        except Exception as e:
            break
    
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
    string_table = []
    
    while pos < len(data) - 2:
        try:
            key, pos = decode_varint(data, pos)
            length, pos = decode_varint(data, pos)
            
            if pos + length > len(data):
                break
            
            if key == 1:  # name
                layer['name'] = data[pos:pos+length].decode('utf-8', errors='ignore')
            elif key == 2:  # version
                layer['version'] = decode_varint(data[pos:pos+length], 0)[0]
            elif key == 3:  # extent
                layer['extent'] = decode_varint(data[pos:pos+length], 0)[0]
            elif key == 4:  # features
                feature = parse_feature(data[pos:pos+length], layer['extent'], string_table)
                if feature:
                    layer['features'].append(feature)
            elif key == 15:  # keys (字符串表)
                # 简化处理
                pass
            
            pos += length
        except Exception as e:
            break
    
    return layer

def parse_feature(data, extent, string_table):
    """解析要素"""
    feature = {
        'type': 'Unknown',
        'geometry': [],
        'properties': {}
    }
    
    pos = 0
    tags = []
    
    while pos < len(data) - 2:
        try:
            key, pos = decode_varint(data, pos)
            length, pos = decode_varint(data, pos)
            
            if pos + length > len(data):
                break
            
            if key == 2:  # tags
                tags = []
                tpos = 0
                while tpos < length:
                    val, tpos = decode_varint(data[pos+tpos:pos+length], 0)
                    tags.append(val)
                pos += length
            elif key == 3:  # type
                type_id = decode_varint(data[pos:pos+length], 0)[0]
                feature['type'] = ['Unknown', 'Point', 'LineString', 'Polygon'][type_id] if type_id <= 3 else 'Unknown'
            elif key == 4:  # geometry
                feature['geometry'] = decode_geometry(data[pos:pos+length], extent)
            
            pos += length
        except Exception as e:
            break
    
    return feature

def decode_geometry(data, extent=4096):
    """解析几何坐标"""
    coords = []
    pos = 0
    command = 0
    count = 0
    x, y = 0, 0
    
    while pos < len(data):
        if count == 0:
            if pos >= len(data):
                break
            cmd = data[pos]
            command = cmd & 0x07
            count = cmd >> 3
            pos += 1
        
        if command == 1:  # MoveTo
            if pos + 4 > len(data):
                break
            dx = struct.unpack('<i', data[pos:pos+4])[0] >> 1
            dy = struct.unpack('<i', data[pos+4:pos+8])[0] >> 1
            pos += 8
            x, y = x + dx, y + dy
            coords.append([x, y])
            count -= 1
        elif command == 2:  # LineTo
            if pos + 4 > len(data):
                break
            dx = struct.unpack('<i', data[pos:pos+4])[0] >> 1
            dy = struct.unpack('<i', data[pos+4:pos+8])[0] >> 1
            pos += 8
            x, y = x + dx, y + dy
            coords.append([x, y])
            count -= 1
        elif command == 7:  # ClosePath
            count -= 1
        else:
            break
    
    return coords

# ==================== 路网图构建 ====================

class RoadGraph:
    """道路网络图"""
    
    def __init__(self):
        self.nodes = {}  # node_id -> (x, y)
        self.edges = defaultdict(list)  # from_node -> [(to_node, distance)]
        self.node_coords = {}  # (x_rounded, y_rounded) -> node_id
        self.next_node_id = 0
    
    def add_edge(self, coords):
        """添加道路边"""
        if len(coords) < 2:
            return 0
        
        edge_count = 0
        for i in range(len(coords) - 1):
            p1 = tuple(coords[i])
            p2 = tuple(coords[i + 1])
            
            # 创建或获取节点
            node1 = self.get_or_create_node(p1)
            node2 = self.get_or_create_node(p2)
            
            # 计算距离
            dist = math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)
            
            # 双向边
            if node2 not in [e[0] for e in self.edges[node1]]:
                self.edges[node1].append((node2, dist))
                self.edges[node2].append((node1, dist))
                edge_count += 1
        
        return edge_count
    
    def get_or_create_node(self, coord):
        """获取或创建节点"""
        # 四舍五入用于索引
        key = (round(coord[0] / 10) * 10, round(coord[1] / 10) * 10)
        
        if key not in self.node_coords:
            node_id = self.next_node_id
            self.next_node_id += 1
            self.node_coords[key] = node_id
            self.nodes[node_id] = coord
        
        return self.node_coords[key]
    
    def find_nearest_node(self, x, y, max_dist=500):
        """查找最近的节点"""
        min_dist = float('inf')
        nearest = None
        
        for node_id, (nx, ny) in self.nodes.items():
            dist = math.sqrt((nx - x)**2 + (ny - y)**2)
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
        
        # 重建路径
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
        self.max_zoom = 9  # MBTiles 中的最高级别
    
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
            layers = parse_vector_tile(row[0])
            
            # 获取瓦片边界
            n = 1 << z
            lon_min = x / n * 360 - 180
            lon_max = (x + 1) / n * 360 - 180
            lat_max = 85.0511
            lat_min = -85.0511
            
            if 'streets' in layers:
                street_layer = layers['streets']
                for feature in street_layer['features']:
                    if feature['type'] == 'LineString' and len(feature['geometry']) >= 2:
                        edge_count += self.graph.add_edge(feature['geometry'])
        
        self.loaded_tiles.add(tile_key)
        return edge_count
    
    def find_route(self, start_lng, start_lat, end_lng, end_lat):
        """查找路径"""
        # 使用 zoom 9
        zoom = self.max_zoom
        n = 1 << zoom
        
        # 计算瓦片坐标
        start_x = int((start_lng + 180) / 360 * n)
        start_y = int((1 - math.log(math.tan(start_lat * math.pi / 180) + 
                       1 / math.cos(start_lat * math.pi / 180)) / math.pi) / 2 * n)
        
        end_x = int((end_lng + 180) / 360 * n)
        end_y = int((1 - math.log(math.tan(end_lat * math.pi / 180) + 
                     1 / math.cos(end_lat * math.pi / 180)) / math.pi) / 2 * n)
        
        print(f"📍 路径规划：起点=({start_lng},{start_lat}), 终点=({end_lng},{end_lat})")
        print(f"   瓦片范围：x={min(start_x,end_x)-1}-{max(start_x,end_x)+1}, y={min(start_y,end_y)-1}-{max(start_y,end_y)+1}")
        
        # 加载相关瓦片
        total_edges = 0
        for x in range(min(start_x, end_x) - 1, max(start_x, end_x) + 2):
            for y in range(min(start_y, end_y) - 1, max(start_y, end_y) + 2):
                if 0 <= x < n and 0 <= y < n:
                    try:
                        edges = self.load_tile(zoom, x, y)
                        total_edges += edges
                    except Exception as e:
                        print(f"加载瓦片失败 ({zoom},{x},{y}): {e}")
        
        print(f"✅ 加载完成，路网节点数：{len(self.graph.nodes)}, 边数：{total_edges}")
        
        # 转换起点终点到瓦片坐标
        extent = 4096
        start_x_tile = (start_lng - (start_x / n * 360 - 180)) / ((start_x + 1) / n * 360 - 180 - (start_x / n * 360 - 180)) * extent
        start_y_tile = (start_lat - (-85.0511)) / (85.0511 - (-85.0511)) * extent
        end_x_tile = (end_lng - (end_x / n * 360 - 180)) / ((end_x + 1) / n * 360 - 180 - (end_x / n * 360 - 180)) * extent
        end_y_tile = (end_lat - (-85.0511)) / (85.0511 - (-85.0511)) * extent
        
        # 查找最近的节点
        start_node, start_dist = self.graph.find_nearest_node(start_x_tile * 10, start_y_tile * 10)
        end_node, end_dist = self.graph.find_nearest_node(end_x_tile * 10, end_y_tile * 10)
        
        print(f"   起点节点：{start_node} (距离：{start_dist:.1f})")
        print(f"   终点节点：{end_node} (距离：{end_dist:.1f})")
        
        if start_node is None or end_node is None:
            return {'success': False, 'error': '未找到附近的道路'}
        
        # 计算路径
        distance, path = self.graph.dijkstra(start_node, end_node)
        
        if path and len(path) > 1:
            path_coords = self.graph.get_path_coords(path)
            # 转换回经纬度
            lonlat_coords = self.tile_to_lonlat(path_coords, zoom, start_x, start_y, n)
            
            return {
                'success': True,
                'distance': distance,
                'coordinates': lonlat_coords,
                'steps': self.generate_steps(lonlat_coords)
            }
        
        return {'success': False, 'error': '未找到路径'}
    
    def tile_to_lonlat(self, coords, zoom, tile_x, tile_y, n):
        """转换瓦片坐标到经纬度"""
        result = []
        extent = 4096
        
        lon_min = tile_x / n * 360 - 180
        lon_max = (tile_x + 1) / n * 360 - 180
        lat_max = 85.0511
        lat_min = -85.0511
        
        for x, y in coords:
            lon = lon_min + (x / extent) * (lon_max - lon_min)
            lat = lat_min + (y / extent) * (lat_max - lat_min)
            result.append([lon, lat])
        
        return result
    
    def generate_steps(self, coords):
        """生成导航步骤"""
        if len(coords) < 2:
            return []
        
        steps = [{'instruction': '从起点出发', 'distance': 0, 'type': 'start'}]
        cumulative = 0
        
        for i in range(1, len(coords)):
            dist = self.haversine(coords[i-1], coords[i])
            cumulative += dist
            
            if i < len(coords) - 1:
                bearing1 = self.get_bearing(coords[i-1], coords[i])
                bearing2 = self.get_bearing(coords[i], coords[i+1])
                angle = bearing2 - bearing1
                
                if abs(angle) > 45:
                    turn = 'right' if angle > 0 else 'left'
                    instruction = '右转' if angle > 0 else '左转'
                    steps.append({
                        'instruction': instruction,
                        'distance': cumulative,
                        'type': turn,
                        'location': coords[i]
                    })
        
        steps.append({'instruction': '到达目的地', 'distance': cumulative, 'type': 'arrive'})
        return steps
    
    def haversine(self, p1, p2):
        R = 6371000
        lat1, lat2 = p1[1] * math.pi / 180, p2[1] * math.pi / 180
        dlat = (p2[1] - p1[1]) * math.pi / 180
        dlon = (p2[0] - p1[0]) * math.pi / 180
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    def get_bearing(self, p1, p2):
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
    print(f"📍 测试：http://localhost:{port}/route?start_lng=114.5&start_lat=38.04&end_lng=114.52&end_lat=38.06")
    
    server = HTTPServer(('localhost', port), RouteHandler)
    server.serve_forever()

if __name__ == '__main__':
    main()
