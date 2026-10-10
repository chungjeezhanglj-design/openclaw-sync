# 🗺️ 中国离线地图

## 数据源
- **文件**: `china-shortbread-1.0.mbtiles`
- **大小**: 6.67 GB
- **格式**: 矢量瓦片 (PBF)
- **覆盖范围**: 中国全境
- **Zoom 级别**: 0-14

## 已导出瓦片
- **目录**: `china-tiles/`
- **Zoom 范围**: 0-7
- **瓦片数**: 553
- **大小**: 30 MB

## 使用方法

### 方法 1：HTTP 服务器（推荐）

```bash
# 进入瓦片目录
cd /Users/zhanglj/openclaw/workspace/china-tiles

# 启动 HTTP 服务器
python3 -m http.server 8080

# 浏览器访问
http://localhost:8080/
```

### 方法 2：直接打开 HTML

双击打开 `offline-viewer.html`，但由于浏览器安全限制，需要运行 HTTP 服务器才能加载瓦片。

## 导出更多瓦片

```bash
# 导出 zoom 0-10（约 5000 个瓦片，100MB）
python3 /Users/zhanglj/openclaw/workspace/export-tiles.py 0 10

# 导出全部 zoom 0-14（约 670 万个瓦片，需要数小时）
python3 /Users/zhanglj/openclaw/workspace/export-tiles.py 0 14
```

## 文件结构

```
china-tiles/
├── 0/          # zoom 0
│   └── 0/
│       └── 0.pbf
├── 1/          # zoom 1
│   ├── 0/
│   │   └── 0.pbf
│   └── 1/
│       └── 1.pbf
├── ...
├── 7/          # zoom 7
├── index.html
└── vector-map.html
```

## 完全离线使用

1. 复制整个 `china-tiles/` 目录到目标设备
2. 在目标设备上运行 `python3 -m http.server 8080`
3. 访问 `http://localhost:8080/`

无需任何网络连接！

## 技术说明

- **瓦片格式**: PBF (Protocol Buffers)，gzip 压缩
- **坐标系统**: XYZ（与 OSM/Google 一致）
- **渲染引擎**: MapLibre GL JS
- **图层**: land, water, boundaries, place_labels

---
_创建时间：2026-03-15_
