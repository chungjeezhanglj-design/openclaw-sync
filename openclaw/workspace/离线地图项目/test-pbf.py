#!/usr/bin/env python3
"""简化的 PBF 解析器 - 用于测试"""

import sqlite3
import gzip

def decode_varint(data, pos):
    """解码 varint"""
    result = 0
    shift = 0
    while pos < len(data):
        byte = data[pos]
        result |= (byte & 0x7F) << shift
        pos += 1
        if not (byte & 0x80):
            break
        shift += 7
    return result, pos

def parse_layer_simple(data):
    """简化版图层解析"""
    layer = {'name': '', 'features': 0}
    pos = 0
    
    while pos < len(data) - 2:
        key, pos = decode_varint(data, pos)
        length, pos = decode_varint(data, pos)
        
        if pos + length > len(data):
            break
        
        if key == 1:  # name
            layer['name'] = data[pos:pos+length].decode('utf-8', errors='ignore')
        elif key == 4:  # features
            layer['features'] += 1
        
        pos += length
    
    return layer

def parse_pbf_simple(data):
    """简化版 PBF 解析"""
    layers = []
    pos = 0
    
    while pos < len(data) - 2:
        key, pos = decode_varint(data, pos)
        length, pos = decode_varint(data, pos)
        
        if pos + length > len(data):
            break
        
        if key == 3:  # Layer
            layer = parse_layer_simple(data[pos:pos+length])
            if layer['name']:
                layers.append(layer)
        
        pos += length
    
    return layers

# 测试
mbtiles_path = "/Users/zhanglj/openclaw/workspace/china-shortbread-1.0.mbtiles"
conn = sqlite3.connect(mbtiles_path)
cursor = conn.cursor()

z, x, y = 9, 418, 197
tms_y = (1 << z) - 1 - y

cursor.execute(
    'SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?',
    (z, x, tms_y)
)
row = cursor.fetchone()
conn.close()

if row and row[0]:
    data = row[0]
    if data[:2] == b'\x1f\x8b':
        data = gzip.decompress(data)
    
    print(f"解析瓦片 (z={z}, x={x}, y={y})")
    print("=" * 50)
    
    layers = parse_pbf_simple(data)
    
    print(f"\n找到的图层:")
    for layer in layers:
        print(f"  📍 {layer['name']}: {layer['features']} 个要素")
    
    streets_layer = next((l for l in layers if l['name'] == 'streets'), None)
    if streets_layer:
        print(f"\n✅ streets 图层有 {streets_layer['features']} 个道路要素！")
    else:
        print("\n❌ 未找到 streets 图层")
else:
    print("❌ 瓦片不存在")
