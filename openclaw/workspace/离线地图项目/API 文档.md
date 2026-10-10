# 🗺️ 中国离线地图路径规划系统 - API 文档

**版本**: v4.0  
**日期**: 2026-03-17  
**状态**: ✅ 生产就绪

---

## 📋 目录

1. [系统概述](#系统概述)
2. [服务架构](#服务架构)
3. [API 接口](#api-接口)
4. [数据格式](#数据格式)
5. [使用示例](#使用示例)
6. [错误处理](#错误处理)
7. [性能指标](#性能指标)

---

## 系统概述

### 功能特性

- ✅ **真实路网路径规划** - 基于 MBTiles 矢量数据
- ✅ **Dijkstra 最短路径算法** - 确保最优路径
- ✅ **详细导航步骤** - 8 种转向指示
- ✅ **Web Mercator 投影** - 正确的坐标转换
- ✅ **智能回退机制** - 路径失败时自动切换
- ✅ **完全离线运行** - 无需网络连接

### 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 地图渲染 | MapLibre GL JS v4.7.1 | WebGL 地图库 |
| 数据格式 | MBTiles (SQLite) | 矢量瓦片容器 |
| 瓦片格式 | PBF (Protocol Buffers) | 压缩矢量数据 |
| 路径算法 | Dijkstra | 最短路径搜索 |
| 投影系统 | Web Mercator (EPSG:3857) | 标准网络地图投影 |
| HTTP 服务 | Python 3 http.server | 轻量级服务器 |

---

## 服务架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                    用户浏览器                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  map-route.html                                  │   │
│  │  - 路径规划 UI                                    │   │
│  │  - 路径渲染 (MapLibre GL)                        │   │
│  │  - 导航步骤显示                                   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓ HTTP 请求
┌─────────────────────────────────────────────────────────┐
│              路径规划服务 (端口 8084)                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  MBTilesRouter                                   │   │
│  │  - 加载瓦片数据                                   │   │
│  │  - 构建路网图 (RoadGraph)                        │   │
│  │  - Dijkstra 最短路径                              │   │
│  │  - 生成导航步骤                                   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓ 瓦片查询
┌─────────────────────────────────────────────────────────┐
│              MBTiles 服务器 (端口 8083)                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  china-complete.mbtiles                          │   │
│  │  - streets 图层 (完整道路等级)                     │   │
│  │  - 道路几何数据                                   │   │
│  │  - 道路属性（名称、等级等）                        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓ 静态文件
┌─────────────────────────────────────────────────────────┐
│              HTTP 服务器 (端口 8082)                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  map-route.html                                  │   │
│  │  其他静态资源                                     │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 服务端口

| 服务 | 端口 | 协议 | 说明 |
|------|------|------|------|
| HTTP 服务器 | 8082 | HTTP | 提供 Web 界面 |
| MBTiles 服务 | 8083 | HTTP | 提供矢量瓦片 |
| 路径规划服务 | 8084 | HTTP | 提供路径计算 |

---

## API 接口

### 1. 路径规划接口

**端点**: `GET /route`

**描述**: 计算两点之间的最短路径，返回路径坐标和导航步骤。

**请求参数**:

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `start_lng` | float | ✅ | 起点经度 | `114.47` |
| `start_lat` | float | ✅ | 起点纬度 | `38.045` |
| `end_lng` | float | ✅ | 终点经度 | `114.48` |
| `end_lat` | float | ✅ | 终点纬度 | `38.048` |

**请求示例**:
```http
GET /route?start_lng=114.47&start_lat=38.045&end_lng=114.48&end_lat=38.048
Host: localhost:8084
```

**成功响应 (200 OK)**:

```json
{
  "success": true,
  "distance": 1234.56,
  "coordinates": [
    [114.470844, 38.040520],
    [114.477882, 38.038898],
    [114.480286, 38.038087],
    ...
    [114.482002, 38.047280]
  ],
  "steps": [
    {
      "instruction": "从起点出发",
      "distance": 0,
      "type": "start"
    },
    {
      "instruction": "右转进入建设大街",
      "distance": 500.5,
      "type": "right",
      "location": [114.477882, 38.038898]
    },
    {
      "instruction": "左转进入人民路",
      "distance": 1200.3,
      "type": "left",
      "location": [114.480286, 38.038087]
    },
    {
      "instruction": "到达目的地",
      "distance": 1234.56,
      "type": "arrive"
    }
  ]
}
```

**响应字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功找到路径 |
| `distance` | number | 路径总距离（米） |
| `coordinates` | array | 路径坐标数组 [经度，纬度] |
| `steps` | array | 导航步骤列表 |

**步骤对象字段**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `instruction` | string | 导航指令文本 |
| `distance` | number | 累计距离（米） |
| `type` | string | 转向类型（见下表） |
| `location` | array | 转向点坐标 [经度，纬度] |

**转向类型**:

| type | 说明 | 图标 |
|------|------|------|
| `start` | 起点 | 🚗 |
| `straight` | 直行 | ⬆️ |
| `slight-right` | 右前方 | ↗️ |
| `right` | 右转 | ➡️ |
| `sharp-right` | 向右急转 | ↘️ |
| `slight-left` | 左前方 | ↖️ |
| `left` | 左转 | ⬅️ |
| `sharp-left` | 向左急转 | ↙️ |
| `uturn` | 掉头 | 🔄 |
| `arrive` | 到达 | 🏁 |

**失败响应**:

```json
{
  "success": false,
  "error": "未找到附近的道路"
}
```

**错误类型**:

| error | 说明 | 解决方案 |
|-------|------|----------|
| `未加载到道路数据` | MBTiles 中没有道路数据 | 检查数据文件 |
| `未找到附近的道路` | 起点/终点附近无道路 | 增加搜索半径或检查坐标 |
| `未找到路径` | 路网不连通 | 检查路网完整性 |

---

### 2. 健康检查接口

**端点**: `GET /health`

**描述**: 检查服务是否正常运行。

**请求示例**:
```http
GET /health
Host: localhost:8084
```

**响应 (200 OK)**:
```json
{"status":"ok"}
```

---

### 3. MBTiles 瓦片接口

**端点**: `GET /{z}/{x}/{y}.pbf`

**描述**: 获取指定 zoom 级别的矢量瓦片。

**请求参数**:

| 参数 | 类型 | 说明 | 范围 |
|------|------|------|------|
| `z` | int | Zoom 级别 | 0-14 |
| `x` | int | 瓦片 X 坐标 | 0-2^z-1 |
| `y` | int | 瓦片 Y 坐标 | 0-2^z-1 |

**请求示例**:
```http
GET /12/3314/1598.pbf
Host: localhost:8083
```

**响应**:
- **成功**: 二进制 PBF 数据 (gzip 压缩)
- **Content-Type**: `application/x-protobuf`
- **Content-Encoding**: `gzip` (如果压缩)

---

## 数据格式

### MBTiles 数据结构

**文件扩展名**: `.mbtiles`

**内部结构**: SQLite 数据库

**表结构**:

```sql
-- tiles 表：存储瓦片数据
CREATE TABLE tiles (
  zoom_level INTEGER,
  tile_column INTEGER,
  tile_row INTEGER,
  tile_data BLOB,
  PRIMARY KEY (zoom_level, tile_column, tile_row)
);

-- metadata 表：存储元数据
CREATE TABLE metadata (
  name TEXT,
  value TEXT,
  PRIMARY KEY (name)
);
```

### 矢量瓦片格式 (PBF)

**图层结构**:

```
Tile
├── layers[]
│   ├── version (uint32)
│   ├── name (string)
│   ├── extent (uint32, default: 4096)
│   ├── features[]
│   │   ├── id (uint64)
│   │   ├── tags (uint32[])
│   │   ├── type (enum: Point/LineString/Polygon)
│   │   └── geometry (uint32[])
│   └── keys (string[])
└── values (any[])
```

### 道路数据类型

**完整的道路等级**:

| 类型 | 说明 | Zoom 范围 |
|------|------|----------|
| `motorway` | 高速公路 | 5-14 |
| `trunk` | 国道 | 6-14 |
| `primary` | 省道/主要道路 | 7-14 |
| `secondary` | 县道 | 8-14 |
| `tertiary` | 乡道 | 9-14 |
| `residential` | 居民区道路 | 10-14 |
| `service` | 服务道路 | 11-14 |
| `living_street` | 生活街道 | 12-14 |
| `rail` | 铁路 | 6-14 |

---

## 使用示例

### 1. 命令行调用

```bash
# 基本路径规划
curl "http://localhost:8084/route?start_lng=114.47&start_lat=38.045&end_lng=114.48&end_lat=38.048"

# 格式化输出
curl -s "http://localhost:8084/route?start_lng=114.47&start_lat=38.045&end_lng=114.48&end_lat=38.048" | python3 -m json.tool

# 检查服务状态
curl http://localhost:8084/health
```

### 2. JavaScript 调用

```javascript
// 路径规划
async function calculateRoute(start, end) {
  const url = `http://localhost:8084/route?start_lng=${start[0]}&start_lat=${start[1]}&end_lng=${end[0]}&end_lat=${end[1]}`;
  
  try {
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success) {
      console.log(`路径距离：${(result.distance/1000).toFixed(2)} 公里`);
      console.log(`路径点数：${result.coordinates.length}`);
      console.log(`导航步骤：${result.steps.length} 个`);
      
      // 在地图上绘制路径
      drawPathOnMap(result.coordinates);
      
      // 显示导航步骤
      renderSteps(result.steps);
    } else {
      console.error('路径规划失败:', result.error);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
}

// 使用示例
calculateRoute([114.47, 38.045], [114.48, 38.048]);
```

### 3. Python 调用

```python
import requests
import json

def calculate_route(start, end):
    """计算路径"""
    url = "http://localhost:8084/route"
    params = {
        'start_lng': start[0],
        'start_lat': start[1],
        'end_lng': end[0],
        'end_lat': end[1]
    }
    
    response = requests.get(url, params=params)
    result = response.json()
    
    if result['success']:
        print(f"✅ 路径规划成功")
        print(f"   距离：{result['distance']/1000:.2f} 公里")
        print(f"   路径点数：{len(result['coordinates'])}")
        print(f"   导航步骤：{len(result['steps'])} 个")
        
        for i, step in enumerate(result['steps']):
            print(f"   {i+1}. {step['instruction']} - {step['distance']/1000:.2f}km")
    else:
        print(f"❌ 路径规划失败：{result['error']}")
    
    return result

# 使用示例
route = calculate_route([114.47, 38.045], [114.48, 38.048])
```

### 4. 在 MapLibre GL 中显示路径

```javascript
function drawPathOnMap(coordinates) {
  // 添加数据源
  map.addSource('route-path-source', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      }
    }
  });
  
  // 添加路径外框（白色）
  map.addLayer({
    id: 'route-path-outline',
    type: 'line',
    source: 'route-path-source',
    paint: {
      'line-color': '#ffffff',
      'line-width': 8,
      'line-opacity': 0.8
    }
  });
  
  // 添加路径主体（蓝色）
  map.addLayer({
    id: 'route-path',
    type: 'line',
    source: 'route-path-source',
    paint: {
      'line-color': '#2196f3',
      'line-width': 5,
      'line-opacity': 0.9
    }
  });
  
  // 调整视野
  const bounds = coordinates.reduce((bounds, coord) => {
    return bounds.extend(coord);
  }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
  
  map.fitBounds(bounds, { padding: 50 });
}
```

---

## 错误处理

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 接口不存在 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "error": "错误描述信息",
  "code": "错误代码（可选）"
}
```

### 常见错误及解决方案

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `未找到附近的道路` | 起点/终点远离道路 | 增加搜索半径或检查坐标 |
| `未加载到道路数据` | MBTiles 文件损坏 | 重新下载或检查文件路径 |
| `未找到路径` | 路网不连通 | 检查路网完整性或缩短距离 |
| `Connection refused` | 服务未启动 | 启动路径规划服务 |

---

## 性能指标

### 响应时间

| 操作 | 平均时间 | 说明 |
|------|----------|------|
| 健康检查 | < 10ms | 简单请求 |
| 短距离路径 (<5km) | 100-500ms | 少量节点 |
| 中距离路径 (5-20km) | 500-2000ms | 中等规模路网 |
| 长距离路径 (>20km) | 2000-5000ms | 大规模路网 |

### 资源占用

| 指标 | 典型值 | 说明 |
|------|--------|------|
| 内存占用 | 200-500MB | 取决于加载的瓦片数 |
| CPU 使用 | < 30% | 路径计算时短暂升高 |
| 磁盘空间 | 6.67GB | MBTiles 文件大小 |

### 优化建议

1. **瓦片缓存**: 已加载的瓦片会缓存在内存中
2. **搜索半径**: 默认 2000 米，可根据需要调整
3. **Zoom 级别**: 使用 zoom 9-12 平衡精度和性能
4. **并发限制**: 建议单用户模式，不支持高并发

---

## 部署指南

### 启动服务

```bash
# 1. 启动 MBTiles 服务器
python3 mbtiles-server.py china-complete.mbtiles 8083 &

# 2. 启动路径规划服务
python3 route-server-v4.py china-complete.mbtiles 8084 &

# 3. 启动 HTTP 服务器
python3 -m http.server 8082 &
```

### 一键启动脚本

```bash
#!/bin/bash
# start.sh

cd /Users/zhanglj/openclaw/workspace

# 停止旧进程
pkill -f "mbtiles-server"
pkill -f "route-server"
pkill -f "http.server 8082"
sleep 1

# 启动服务
python3 mbtiles-server.py china-complete.mbtiles 8083 &
echo "✅ MBTiles 服务器已启动 (端口 8083)"

python3 route-server-v4.py china-complete.mbtiles 8084 &
echo "✅ 路径规划服务已启动 (端口 8084)"

python3 -m http.server 8082 &
echo "✅ HTTP 服务器已启动 (端口 8082)"

echo ""
echo "=========================================="
echo "✅ 所有服务已启动！"
echo "=========================================="
echo ""
echo "📍 访问地址："
echo "   http://localhost:8082/离线地图项目/map-route.html"
echo ""
```

### 停止服务

```bash
pkill -f "mbtiles-server"
pkill -f "route-server"
pkill -f "http.server 8082"
```

---

## 参考资料

- [MapLibre GL JS 文档](https://maplibre.org/maplibre-gl-js/docs/)
- [MBTiles 规范](https://github.com/mapbox/mbtiles-spec)
- [Protocol Buffers 格式](https://github.com/mapbox/vector-tile-spec)
- [Web Mercator 投影](https://en.wikipedia.org/wiki/Web_Mercator_projection)
- [Dijkstra 算法](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm)

---

**文档版本**: v1.0  
**最后更新**: 2026-03-17  
**维护者**: Ady 🦎
