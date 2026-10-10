/**
 * SVG/DXF 文件解析和转换工具
 * 支持将 CAD 文件转换为 GeoJSON 并在地图上显示
 */

// ==================== SVG 解析 ====================

/**
 * 解析 SVG 文件，提取路径和几何信息
 * @param {string} svgContent - SVG 文件内容
 * @returns {Array} - 几何对象数组
 */
function parseSVG(svgContent) {
    const parser = new DOMParser();
    const svg = parser.parseFromString(svgContent, 'image/svg+xml');
    const geometries = [];
    
    // 提取 SVG  viewBox
    const viewBox = svg.documentElement.getAttribute('viewBox');
    let viewBoxBounds = null;
    if (viewBox) {
        const parts = viewBox.split(/[\s,]+/);
        viewBoxBounds = {
            x: parseFloat(parts[0]),
            y: parseFloat(parts[1]),
            width: parseFloat(parts[2]),
            height: parseFloat(parts[3])
        };
    }
    
    // 解析 path 元素
    const paths = svg.querySelectorAll('path');
    paths.forEach((path, index) => {
        const d = path.getAttribute('d');
        if (d) {
            const geometry = parseSVGPath(d, viewBoxBounds);
            if (geometry) {
                geometry.properties = {
                    name: `Path_${index}`,
                    fill: path.getAttribute('fill') || 'none',
                    stroke: path.getAttribute('stroke') || '#000000',
                    'stroke-width': path.getAttribute('stroke-width') || '1'
                };
                geometries.push(geometry);
            }
        }
    });
    
    // 解析 line 元素
    const lines = svg.querySelectorAll('line');
    lines.forEach((line, index) => {
        const x1 = parseFloat(line.getAttribute('x1')) || 0;
        const y1 = parseFloat(line.getAttribute('y1')) || 0;
        const x2 = parseFloat(line.getAttribute('x2')) || 0;
        const y2 = parseFloat(line.getAttribute('y2')) || 0;
        
        geometries.push({
            type: 'Feature',
            properties: {
                name: `Line_${index}`,
                type: 'line'
            },
            geometry: {
                type: 'LineString',
                coordinates: [[x1, y1], [x2, y2]]
            }
        });
    });
    
    // 解析 circle 元素
    const circles = svg.querySelectorAll('circle');
    circles.forEach((circle, index) => {
        const cx = parseFloat(circle.getAttribute('cx')) || 0;
        const cy = parseFloat(circle.getAttribute('cy')) || 0;
        const r = parseFloat(circle.getAttribute('r')) || 0;
        
        // 将圆转换为多边形（32 边形近似）
        const points = [];
        for (let i = 0; i <= 32; i++) {
            const angle = (i / 32) * Math.PI * 2;
            points.push([
                cx + r * Math.cos(angle),
                cy + r * Math.sin(angle)
            ]);
        }
        
        geometries.push({
            type: 'Feature',
            properties: {
                name: `Circle_${index}`,
                type: 'circle',
                radius: r
            },
            geometry: {
                type: 'Polygon',
                coordinates: [points]
            }
        });
    });
    
    // 解析 rect 元素
    const rects = svg.querySelectorAll('rect');
    rects.forEach((rect, index) => {
        const x = parseFloat(rect.getAttribute('x')) || 0;
        const y = parseFloat(rect.getAttribute('y')) || 0;
        const width = parseFloat(rect.getAttribute('width')) || 0;
        const height = parseFloat(rect.getAttribute('height')) || 0;
        
        geometries.push({
            type: 'Feature',
            properties: {
                name: `Rect_${index}`,
                type: 'rect'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [x, y],
                    [x + width, y],
                    [x + width, y + height],
                    [x, y + height],
                    [x, y]
                ]]
            }
        });
    });
    
    return {
        type: 'FeatureCollection',
        features: geometries,
        viewBox: viewBoxBounds
    };
}

/**
 * 解析 SVG path 数据
 */
function parseSVGPath(d, viewBoxBounds) {
    // 简化解析，支持基本的 M, L, C, Q, Z 命令
    const commands = d.match(/[MLCQZHV][^MLCQZHV]*/gi);
    if (!commands) return null;
    
    const points = [];
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;
    
    commands.forEach(cmd => {
        const type = cmd[0].toUpperCase();
        const args = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat);
        
        switch (type) {
            case 'M': // Move to
                currentX = args[0];
                currentY = args[1];
                startX = currentX;
                startY = currentY;
                points.push([currentX, currentY]);
                break;
            case 'L': // Line to
                currentX = args[0];
                currentY = args[1];
                points.push([currentX, currentY]);
                break;
            case 'H': // Horizontal line
                currentX = args[0];
                points.push([currentX, currentY]);
                break;
            case 'V': // Vertical line
                currentY = args[0];
                points.push([currentX, currentY]);
                break;
            case 'C': // Cubic Bezier
                // 取终点
                currentX = args[4];
                currentY = args[5];
                points.push([currentX, currentY]);
                break;
            case 'Q': // Quadratic Bezier
                currentX = args[2];
                currentY = args[3];
                points.push([currentX, currentY]);
                break;
            case 'Z': // Close path
                if (startX !== undefined) {
                    points.push([startX, startY]);
                }
                break;
        }
    });
    
    if (points.length < 2) return null;
    
    // 判断是 LineString 还是 Polygon
    const isClosed = points.length >= 3 && 
                     Math.abs(points[0][0] - points[points.length-1][0]) < 0.01 &&
                     Math.abs(points[0][1] - points[points.length-1][1]) < 0.01;
    
    return {
        type: 'Feature',
        geometry: {
            type: isClosed ? 'Polygon' : 'LineString',
            coordinates: isClosed ? [points] : points
        }
    };
}

// ==================== DXF 解析 ====================

/**
 * 解析 DXF 文件（简化版，支持 LINE, POLYLINE, CIRCLE, ARC）
 * @param {string} dxfContent - DXF 文件内容
 * @returns {Object} - GeoJSON FeatureCollection
 */
function parseDXF(dxfContent) {
    const lines = dxfContent.split('\n');
    const geometries = [];
    let i = 0;
    
    const entities = {
        LINE: [],
        POLYLINE: [],
        LWPOLYLINE: [],
        CIRCLE: [],
        ARC: [],
        SPLINE: [],
        POINT: []
    };
    
    // 解析 ENTITIES 段
    while (i < lines.length) {
        const line = lines[i].trim();
        
        if (line === 'ENTITIES') {
            i++;
            while (i < lines.length && lines[i].trim() !== 'ENDSEC') {
                const entity = parseDXFEntity(lines, i);
                if (entity && entities[entity.type]) {
                    entities[entity.type].push(entity);
                }
                i = entity.nextIndex || i + 1;
            }
        }
        i++;
    }
    
    // 转换为 GeoJSON
    entities.LINE.forEach((entity, idx) => {
        geometries.push({
            type: 'Feature',
            properties: {
                name: `Line_${idx}`,
                type: 'line',
                layer: entity.layer || '0'
            },
            geometry: {
                type: 'LineString',
                coordinates: [
                    [entity.x1, entity.y1],
                    [entity.x2, entity.y2]
                ]
            }
        });
    });
    
    entities.CIRCLE.forEach((entity, idx) => {
        const points = [];
        for (let i = 0; i <= 64; i++) {
            const angle = (i / 64) * Math.PI * 2;
            points.push([
                entity.cx + entity.r * Math.cos(angle),
                entity.cy + entity.r * Math.sin(angle)
            ]);
        }
        
        geometries.push({
            type: 'Feature',
            properties: {
                name: `Circle_${idx}`,
                type: 'circle',
                layer: entity.layer || '0',
                radius: entity.r
            },
            geometry: {
                type: 'Polygon',
                coordinates: [points]
            }
        });
    });
    
    entities.POLYLINE.forEach((entity, idx) => {
        if (entity.vertices && entity.vertices.length > 0) {
            geometries.push({
                type: 'Feature',
                properties: {
                    name: `Polyline_${idx}`,
                    type: 'polyline',
                    layer: entity.layer || '0'
                },
                geometry: {
                    type: entity.closed ? 'Polygon' : 'LineString',
                    coordinates: entity.closed ? [entity.vertices] : entity.vertices
                }
            });
        }
    });
    
    return {
        type: 'FeatureCollection',
        features: geometries
    };
}

/**
 * 解析单个 DXF 实体
 */
function parseDXFEntity(lines, startIndex) {
    const entity = {};
    let i = startIndex;
    
    // 获取实体类型
    while (i < lines.length) {
        const groupCode = lines[i].trim();
        i++;
        
        if (groupCode === '0') {
            entity.type = lines[i].trim();
            i++;
            break;
        }
    }
    
    if (!entity.type) return null;
    
    // 解析实体属性
    while (i < lines.length) {
        const groupCode = lines[i].trim();
        i++;
        
        if (groupCode === '0') {
            // 下一个实体开始
            break;
        }
        
        const value = lines[i].trim();
        i++;
        
        switch (groupCode) {
            case '8': // Layer
                entity.layer = value;
                break;
            case '10': // X coordinate
                if (entity.type === 'LINE') entity.x1 = parseFloat(value);
                else if (entity.type === 'CIRCLE') entity.cx = parseFloat(value);
                else if (entity.type === 'ARC') entity.cx = parseFloat(value);
                else {
                    if (!entity.vertices) entity.vertices = [];
                    entity.currentX = parseFloat(value);
                }
                break;
            case '20': // Y coordinate
                if (entity.type === 'LINE') entity.y1 = parseFloat(value);
                else if (entity.type === 'CIRCLE') entity.cy = parseFloat(value);
                else if (entity.type === 'ARC') entity.cy = parseFloat(value);
                else {
                    if (entity.currentX !== undefined) {
                        entity.vertices.push([entity.currentX, parseFloat(value)]);
                        entity.currentX = undefined;
                    }
                }
                break;
            case '11': // X2 coordinate (LINE)
                entity.x2 = parseFloat(value);
                break;
            case '21': // Y2 coordinate (LINE)
                entity.y2 = parseFloat(value);
                break;
            case '40': // Radius
                entity.r = parseFloat(value);
                break;
            case '70': // Flags
                entity.flags = parseInt(value);
                if (entity.type === 'POLYLINE' || entity.type === 'LWPOLYLINE') {
                    entity.closed = (value & 1) === 1;
                }
                break;
        }
    }
    
    entity.nextIndex = i;
    return entity;
}

// ==================== 坐标转换 ====================

/**
 * 将 CAD 坐标转换为地理坐标
 * @param {Array} coordinates - CAD 坐标 [x, y]
 * @param {Object} options - 转换选项
 * @returns {Array} - 地理坐标 [lng, lat]
 */
function transformCoordinates(coordinates, options = {}) {
    const {
        centerX = 0,
        centerY = 0,
        scale = 1,
        rotation = 0,
        flipY = false
    } = options;
    
    return coordinates.map(coord => {
        let [x, y] = coord;
        
        // 缩放
        x *= scale;
        y *= scale;
        
        // 旋转
        if (rotation !== 0) {
            const rad = rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const newX = x * cos - y * sin;
            const newY = x * sin + y * cos;
            x = newX;
            y = newY;
        }
        
        // Y 轴翻转
        if (flipY) {
            y = -y;
        }
        
        // 平移到中心点
        x += centerX;
        y += centerY;
        
        return [x, y];
    });
}

/**
 * 转换 GeoJSON 坐标
 */
function transformGeoJSON(geojson, options) {
    const transformed = JSON.parse(JSON.stringify(geojson));
    
    transformed.features.forEach(feature => {
        const geom = feature.geometry;
        if (geom.type === 'Point') {
            geom.coordinates = transformCoordinates([geom.coordinates], options)[0];
        } else if (geom.type === 'LineString') {
            geom.coordinates = transformCoordinates(geom.coordinates, options);
        } else if (geom.type === 'Polygon') {
            geom.coordinates = geom.coordinates.map(ring => 
                transformCoordinates(ring, options)
            );
        } else if (geom.type === 'MultiPoint' || geom.type === 'MultiLineString' || geom.type === 'MultiPolygon') {
            // 递归处理多重几何
            transformMultiGeometry(geom, options);
        }
    });
    
    return transformed;
}

function transformMultiGeometry(geom, options) {
    if (geom.type === 'MultiPoint') {
        geom.coordinates = geom.coordinates.map(coord => 
            transformCoordinates([coord], options)[0]
        );
    } else if (geom.type === 'MultiLineString') {
        geom.coordinates = geom.coordinates.map(line =>
            transformCoordinates(line, options)
        );
    } else if (geom.type === 'MultiPolygon') {
        geom.coordinates = geom.coordinates.map(polygon =>
            polygon.map(ring => transformCoordinates(ring, options))
        );
    }
}

// ==================== 导出功能 ====================

/**
 * 将 GeoJSON 导出为 SVG
 */
function exportToSVG(geojson, options = {}) {
    const { width = 800, height = 600 } = options;
    
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    
    geojson.features.forEach(feature => {
        const geom = feature.geometry;
        const props = feature.properties || {};
        const style = `fill="${props.fill || 'none'}" stroke="${props.stroke || '#000'}" stroke-width="${props['stroke-width'] || 1}"`;
        
        if (geom.type === 'LineString') {
            const points = geom.coordinates.map(c => c.join(',')).join(' ');
            svgContent += `<polyline points="${points}" ${style}/>`;
        } else if (geom.type === 'Polygon') {
            const rings = geom.coordinates.map(ring => 
                ring.map(c => c.join(',')).join(' ')
            );
            rings.forEach((points, i) => {
                if (i === 0) {
                    svgContent += `<polygon points="${points}" ${style}/>`;
                } else {
                    svgContent += `<polygon points="${points}" fill="#fff"/>`;
                }
            });
        }
    });
    
    svgContent += '</svg>';
    return svgContent;
}

// ==================== 工具函数 ====================

/**
 * 计算 GeoJSON 的边界框
 */
function getBounds(geojson) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    geojson.features.forEach(feature => {
        const coords = feature.geometry.coordinates;
        
        function processCoord(coord) {
            if (typeof coord[0] === 'number') {
                minX = Math.min(minX, coord[0]);
                minY = Math.min(minY, coord[1]);
                maxX = Math.max(maxX, coord[0]);
                maxY = Math.max(maxY, coord[1]);
            } else {
                coord.forEach(c => processCoord(c));
            }
        }
        
        processCoord(coords);
    });
    
    return { minX, minY, maxX, maxY };
}

/**
 * 自动计算适合地图显示的转换参数
 */
function autoFitToMap(geojson, mapCenter, mapZoom) {
    const bounds = getBounds(geojson);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    
    // 计算合适的缩放比例
    const scale = Math.pow(2, mapZoom) * 0.0001;
    
    return {
        centerX: mapCenter[0],
        centerY: mapCenter[1],
        scale: scale,
        flipY: true  // CAD 坐标系 Y 轴向上，地理坐标系 Y 轴向下
    };
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseSVG,
        parseDXF,
        transformCoordinates,
        transformGeoJSON,
        exportToSVG,
        getBounds,
        autoFitToMap
    };
}
