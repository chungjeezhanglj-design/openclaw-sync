#!/usr/bin/env python3
"""测试 MBTiles 中的 streets 数据"""

import sqlite3
import struct
import gzip

def decode_varint(data, pos):
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

def parse_tile(z, x, y, mbtiles_path):
    """解析单个瓦片"""
    conn = sqlite3.connect(mbtiles_path)
    cursor = conn.cursor()
    
    # TMS → XYZ
    tms_y = (1 << z) - 1 - y
    
    cursor.execute(
        'SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?',
        (z, x, tms_y)
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row or not row[0]:
        print(f"❌ 瓦片 ({z},{x},{y}) 不存在")
        return None
    
    data = row[0]
    print(f"✅ 瓦片大小：{len(data)} 字节")
    
    # 解压
    try:
        if data[:2] == b'\x1f\x8b':
            data = gzip.decompress(data)
            print(f"✅ 解压后大小：{len(data)} 字节")
    except Exception as e:
        print(f"⚠️ 解压失败：{e}")
    
    # 解析图层
    pos = 0
    layers_found = []
    
    while pos < len(data):
        if pos + 2 > len(data):
            break
        
        key, pos = decode_varint(data, pos)
        if pos + 1 > len(data):
            break
        length, pos = decode_varint(data, pos)
        
        if key == 3:  # Layer
            layer_data = data[pos:pos+length]
            # 查找图层名称
            lpos = 0
            while lpos < len(layer_data):
                if lpos + 2 > len(layer_data):
                    break
                lkey, lpos = decode_varint(layer_data, lpos)
                llength, lpos = decode_varint(layer_data, lpos)
                
                if lkey == 1:  # name
                    name = layer_data[lpos:lpos+llength].decode('utf-8', errors='ignore')
                    layers_found.append(name)
                    print(f"  📍 图层：{name} (长度：{llength})")
                    if name == 'streets':
                        print(f"    ✅ 找到 streets 图层！")
                
                lpos += llength
            
            pos += length
        else:
            pos += length
    
    print(f"\n找到的图层：{layers_found}")
    return layers_found

# 测试
mbtiles_path = "/Users/zhanglj/openclaw/workspace/china-shortbread-1.0.mbtiles"
print(f"测试 MBTiles: {mbtiles_path}")
print("=" * 60)

# 测试石家庄区域的瓦片
z = 12
x = 3314
y = 1598

print(f"\n查询瓦片：z={z}, x={x}, y={y}")
print("=" * 60)

parse_tile(z, x, y, mbtiles_path)
