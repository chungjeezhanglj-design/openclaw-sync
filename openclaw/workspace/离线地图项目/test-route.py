#!/usr/bin/env python3
"""测试路径规划服务"""

import sqlite3, gzip, mapbox_vector_tile
import sys
sys.path.insert(0, '/Users/zhanglj/openclaw/workspace/离线地图项目')

from route_server_v3 import MBTilesRouter

mbtiles_path = "/Users/zhanglj/openclaw/workspace/china-shortbread-1.0.mbtiles"

print("🛣️ 初始化路由器...")
router = MBTilesRouter(mbtiles_path)

print("\n📍 测试路径规划：石家庄市区内两点")
result = router.find_route(114.5, 38.04, 114.52, 38.06)

print(f"\n结果：{result}")
