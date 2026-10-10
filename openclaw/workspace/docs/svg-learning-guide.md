# SVG 完全学习指南

> Scalable Vector Graphics - 可缩放矢量图形

---

## 📚 目录

1. [SVG 基础概念](#1-svg-基础概念)
2. [基本语法与结构](#2-基本语法与结构)
3. [常用形状元素](#3-常用形状元素)
4. [路径 Path 详解](#4-路径-path-详解)
5. [样式与属性](#5-样式与属性)
6. [变换 Transform](#6-变换-transform)
7. [文本与字体](#7-文本与字体)
8. [渐变与图案](#8-渐变与图案)
9. [滤镜效果](#9-滤镜效果)
10. [动画与交互](#10-动画与交互)
11. [实战示例](#11-实战示例)
12. [学习资源](#12-学习资源)

---

## 1. SVG 基础概念

### 什么是 SVG？

SVG (Scalable Vector Graphics) 是一种基于 **XML** 的矢量图形格式，由 W3C 制定标准。

### 核心特点

| 特点 | 说明 |
|------|------|
| **矢量** | 无限缩放不失真，适合图标、logo、图表 |
| **基于文本** | 可用代码编辑、压缩、版本控制 |
| **可交互** | 支持 CSS 样式、JavaScript 操作、DOM 事件 |
| **可访问性** | 支持标题、描述，利于 SEO 和无障碍访问 |
| **广泛支持** | 所有现代浏览器原生支持 |

### SVG vs 位图

```
SVG (矢量)                    位图 (PNG/JPG)
├── 数学公式描述              ├── 像素点阵描述
├── 放大不失真                ├── 放大有锯齿
├── 文件小 (简单图形)         ├── 文件大 (高分辨率)
├── 适合图标/图表/logo        ├── 适合照片/复杂图像
└── 可代码编辑                └── 需图像软件编辑
```

---

## 2. 基本语法与结构

### 最小 SVG 文件

```xml
<svg width="200" height="200" viewBox="0 0 200 200" 
     xmlns="http://www.w3.org/2000/svg">
  <!-- 图形内容 -->
  <circle cx="100" cy="100" r="50" fill="red" />
</svg>
```

### 核心属性

| 属性 | 说明 | 示例 |
|------|------|------|
| `width` / `height` | 显示尺寸 | `width="200"` |
| `viewBox` | 视口坐标系 | `viewBox="0 0 100 100"` |
| `xmlns` | XML 命名空间 | `xmlns="http://www.w3.org/2000/svg"` |
| `preserveAspectRatio` | 缩放保持比例 | `preserveAspectRatio="xMidYMid meet"` |

### viewBox 详解

```xml
<!-- viewBox="min-x min-y width height" -->
<svg viewBox="0 0 100 100" width="200" height="200">
  <!-- 内部坐标系 0-100，外部显示 200x200 -->
  <circle cx="50" cy="50" r="40" />
</svg>
```

### 完整 HTML 嵌入

```html
<!DOCTYPE html>
<html>
<head>
  <title>SVG 示例</title>
</head>
<body>
  <!-- 方式1: 内联 SVG -->
  <svg width="100" height="100">
    <circle cx="50" cy="50" r="40" fill="blue" />
  </svg>
  
  <!-- 方式2: img 标签 -->
  <img src="image.svg" alt="描述">
  
  <!-- 方式3: background-image -->
  <div style="background-image: url(image.svg)"></div>
  
  <!-- 方式4: object/embed -->
  <object data="image.svg" type="image/svg+xml"></object>
</body>
</html>
```

---

## 3. 常用形状元素

### 基础形状

```xml
<svg viewBox="0 0 200 200">
  <!-- 圆形 -->
  <circle cx="50" cy="50" r="40" 
          fill="red" stroke="black" stroke-width="2" />
  
  <!-- 椭圆 -->
  <ellipse cx="150" cy="50" rx="40" ry="25" 
           fill="green" />
  
  <!-- 矩形 -->
  <rect x="10" y="100" width="80" height="60" 
        fill="blue" rx="10" ry="10" />
  
  <!-- 圆角矩形 (rx, ry 控制圆角) -->
  <rect x="110" y="100" width="80" height="60" 
        fill="purple" rx="20" />
  
  <!-- 直线 -->
  <line x1="10" y1="180" x2="90" y2="180" 
        stroke="black" stroke-width="3" />
  
  <!-- 折线 -->
  <polyline points="110,180 130,150 150,180 170,150 190,180" 
            fill="none" stroke="orange" stroke-width="2" />
  
  <!-- 多边形 (自动闭合) -->
  <polygon points="100,10 120,60 60,60" 
           fill="yellow" stroke="black" />
</svg>
```

### 形状属性速查

| 元素 | 必需属性 | 可选属性 |
|------|---------|---------|
| `<circle>` | `cx, cy, r` | - |
| `<ellipse>` | `cx, cy, rx, ry` | - |
| `<rect>` | `x, y, width, height` | `rx, ry` |
| `<line>` | `x1, y1, x2, y2` | - |
| `<polyline>` | `points` | - |
| `<polygon>` | `points` | - |

---

## 4. 路径 Path 详解

### Path 基础

`<path>` 是 SVG 最强大的元素，可以绘制任意形状。

```xml
<path d="M 10 10 L 50 50 L 90 10 Z" 
      fill="none" stroke="black" stroke-width="2" />
```

### 路径命令

| 命令 | 名称 | 参数 | 说明 |
|------|------|------|------|
| `M` / `m` | MoveTo | (x, y) | 移动到某点 (大写=绝对，小写=相对) |
| `L` / `l` | LineTo | (x, y) | 画直线 |
| `H` / `h` | Horizontal | x | 画水平线 |
| `V` / `v` | Vertical | y | 画垂直线 |
| `C` / `c` | Cubic Bezier | (x1,y1 x2,y2 x,y) | 三次贝塞尔曲线 |
| `S` / `s` | Smooth Cubic | (x2,y2 x,y) | 平滑三次贝塞尔 |
| `Q` / `q` | Quadratic | (x1,y1 x,y) | 二次贝塞尔曲线 |
| `T` / `t` | Smooth Quad | (x,y) | 平滑二次贝塞尔 |
| `A` / `a` | Arc | (rx,ry rot large-arc,sweep x,y) | 椭圆弧 |
| `Z` / `z` | ClosePath | - | 闭合路径 |

### 路径示例

```xml
<svg viewBox="0 0 300 200">
  <!-- 直线 -->
  <path d="M 10 50 L 90 50" stroke="red" stroke-width="2" />
  
  <!-- 折线 -->
  <path d="M 10 80 L 50 80 L 50 120 L 90 120" 
        stroke="blue" fill="none" />
  
  <!-- 闭合图形 -->
  <path d="M 110 50 L 150 120 L 70 120 Z" 
        fill="green" />
  
  <!-- 二次贝塞尔曲线 -->
  <path d="M 10 150 Q 50 100 90 150" 
        stroke="purple" fill="none" stroke-width="2" />
  
  <!-- 三次贝塞尔曲线 -->
  <path d="M 110 150 C 130 100 170 100 190 150" 
        stroke="orange" fill="none" stroke-width="2" />
  
  <!-- 椭圆弧 -->
  <path d="M 210 150 A 40 20 0 0 1 290 150" 
        stroke="pink" fill="none" stroke-width="2" />
  
  <!-- 复杂图形：心形 -->
  <path d="M 150 30 
           C 100 0 40 40 40 100 
           C 40 150 150 190 150 190 
           C 150 190 260 150 260 100 
           C 260 40 200 0 150 30 Z" 
        fill="red" />
</svg>
```

### 路径工具推荐

- **可视化编辑器**: [SVG Path Editor](https://yqnn.github.io/svg-path-editor/)
- **在线生成**: [Bezier Curve Generator](https://cubic-bezier.com/)
- **图标转换**: [SVGator](https://www.svgator.com/)

---

## 5. 样式与属性

### 填充与描边

```xml
<svg viewBox="0 0 200 200">
  <!-- 基本填充 -->
  <circle cx="50" cy="50" r="40" 
          fill="red" />
  
  <!-- 描边 -->
  <circle cx="150" cy="50" r="40" 
          fill="none" stroke="blue" stroke-width="3" />
  
  <!-- 虚线描边 -->
  <circle cx="50" cy="150" r="40" 
          fill="none" stroke="green" stroke-width="3"
          stroke-dasharray="5,5" />
  
  <!-- 渐变虚线 -->
  <circle cx="150" cy="150" r="40" 
          fill="none" stroke="purple" stroke-width="3"
          stroke-dasharray="10,5,2,5" />
  
  <!-- 线端样式 -->
  <line x1="10" y1="190" x2="90" y2="190" 
        stroke="black" stroke-width="5"
        stroke-linecap="round" />
  
  <!-- 转角样式 -->
  <polyline points="110,170 150,190 190,170" 
            fill="none" stroke="black" stroke-width="5"
            stroke-linejoin="round" />
</svg>
```

### 样式属性速查

| 属性 | 说明 | 常用值 |
|------|------|--------|
| `fill` | 填充色 | 颜色名/十六进制/rgb/none |
| `fill-opacity` | 填充透明度 | 0-1 |
| `stroke` | 描边色 | 同 fill |
| `stroke-width` | 描边宽度 | 数字 |
| `stroke-opacity` | 描边透明度 | 0-1 |
| `stroke-dasharray` | 虚线模式 | `5,5` 或 `10,5,2,5` |
| `stroke-linecap` | 线端样式 | `butt/round/square` |
| `stroke-linejoin` | 转角样式 | `miter/round/bevel` |
| `opacity` | 整体透明度 | 0-1 |

### CSS 样式

```xml
<svg viewBox="0 0 200 200">
  <style>
    .red-circle {
      fill: red;
      stroke: black;
      stroke-width: 2;
    }
    .blue-circle {
      fill: blue;
      opacity: 0.5;
    }
    circle:hover {
      stroke-width: 5;
      cursor: pointer;
    }
  </style>
  
  <circle class="red-circle" cx="50" cy="100" r="40" />
  <circle class="blue-circle" cx="150" cy="100" r="40" />
</svg>
```

---

## 6. 变换 Transform

### 基本变换

```xml
<svg viewBox="0 0 300 200">
  <!-- 原始矩形 -->
  <rect x="10" y="10" width="40" height="40" 
        fill="gray" opacity="0.3" />
  
  <!-- 平移 -->
  <rect x="10" y="10" width="40" height="40" 
        fill="red" transform="translate(50, 0)" />
  
  <!-- 旋转 (绕原点) -->
  <rect x="10" y="10" width="40" height="40" 
        fill="blue" transform="translate(120,0) rotate(45)" />
  
  <!-- 旋转 (绕指定点) -->
  <rect x="10" y="10" width="40" height="40" 
        fill="green" transform="rotate(45, 200, 30)" />
  
  <!-- 缩放 -->
  <rect x="10" y="10" width="40" height="40" 
        fill="orange" transform="translate(250,0) scale(1.5)" />
  
  <!-- 倾斜 -->
  <rect x="10" y="10" width="40" height="40" 
        fill="purple" transform="translate(0,60) skewX(20)" />
  
  <!-- 组合变换 -->
  <rect x="10" y="10" width="40" height="40" 
        fill="pink" transform="translate(100,60) rotate(30) scale(1.2)" />
</svg>
```

### 变换类型

| 变换 | 语法 | 说明 |
|------|------|------|
| 平移 | `translate(x, y)` | 移动位置 |
| 旋转 | `rotate(angle)` 或 `rotate(angle, cx, cy)` | 绕点旋转 |
| 缩放 | `scale(sx, sy)` | 缩放 (可不等比) |
| 倾斜 | `skewX(angle)` / `skewY(angle)` | 沿轴倾斜 |
| 矩阵 | `matrix(a,b,c,d,e,f)` | 自定义变换矩阵 |

---

## 7. 文本与字体

### 基础文本

```xml
<svg viewBox="0 0 400 200">
  <!-- 基本文本 -->
  <text x="10" y="30" font-family="Arial" font-size="20" fill="black">
    Hello SVG!
  </text>
  
  <!-- 多行文本 (tspan) -->
  <text x="10" y="60" font-size="16" fill="blue">
    <tspan x="10" dy="0">第一行</tspan>
    <tspan x="10" dy="20">第二行</tspan>
    <tspan x="10" dy="20" fill="red">第三行 (红色)</tspan>
  </text>
  
  <!-- 文本路径 -->
  <path id="curve" d="M 50 120 Q 150 80 250 120" 
        fill="none" stroke="gray" />
  <text font-size="14" fill="green">
    <textPath href="#curve">
      沿着路径排列的文本 ～～
    </textPath>
  </text>
  
  <!-- 文本对齐 -->
  <text x="200" y="160" text-anchor="middle" font-size="14">
    居中对齐
  </text>
  <text x="300" y="160" text-anchor="end" font-size="14">
    右对齐
  </text>
</svg>
```

### 文本属性

| 属性 | 说明 | 常用值 |
|------|------|--------|
| `font-family` | 字体 | `Arial, sans-serif` |
| `font-size` | 字号 | `16px` / `1.2em` |
| `font-weight` | 字重 | `normal/bold/100-900` |
| `text-anchor` | 水平对齐 | `start/middle/end` |
| `dominant-baseline` | 垂直对齐 | `middle/hanging/ideographic` |
| `letter-spacing` | 字间距 | `2px` |
| `word-spacing` | 词间距 | `5px` |
| `text-decoration` | 文本装饰 | `underline/line-through` |

---

## 8. 渐变与图案

### 线性渐变

```xml
<svg viewBox="0 0 300 150">
  <defs>
    <!-- 线性渐变 -->
    <linearGradient id="linearGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:rgb(255,0,0);stop-opacity:1" />
      <stop offset="50%" style="stop-color:rgb(0,255,0);stop-opacity:1" />
      <stop offset="100%" style="stop-color:rgb(0,0,255);stop-opacity:1" />
    </linearGradient>
    
    <!-- 径向渐变 -->
    <radialGradient id="radialGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:yellow;stop-opacity:1" />
      <stop offset="100%" style="stop-color:red;stop-opacity:1" />
    </radialGradient>
  </defs>
  
  <!-- 使用渐变 -->
  <rect x="10" y="10" width="130" height="130" fill="url(#linearGrad)" />
  <circle cx="220" cy="80" r="60" fill="url(#radialGrad)" />
</svg>
```

### 图案填充

```xml
<svg viewBox="0 0 200 100">
  <defs>
    <!-- 图案 -->
    <pattern id="pattern1" x="0" y="0" width="20" height="20" 
             patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="5" fill="blue" />
    </pattern>
    
    <!-- 棋盘格图案 -->
    <pattern id="checkerboard" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="10" height="10" fill="black" />
      <rect x="10" y="10" width="10" height="10" fill="black" />
    </pattern>
  </defs>
  
  <rect x="10" y="10" width="80" height="80" fill="url(#pattern1)" />
  <rect x="110" y="10" width="80" height="80" fill="url(#checkerboard)" />
</svg>
```

---

## 9. 滤镜效果

### 常用滤镜

```xml
<svg viewBox="0 0 400 200">
  <defs>
    <!-- 高斯模糊 -->
    <filter id="blur">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
    </filter>
    
    <!-- 阴影 -->
    <filter id="shadow">
      <feDropShadow dx="3" dy="3" stdDeviation="2" flood-opacity="0.5" />
    </filter>
    
    <!-- 灰度 -->
    <filter id="grayscale">
      <feColorMatrix type="saturate" values="0" />
    </filter>
    
    <!-- 发光效果 -->
    <filter id="glow">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    
    <!-- 浮雕效果 -->
    <filter id="emboss">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
      <feSpecularLighting in="blur" surfaceScale="5" specularConstant="1" 
                          specularExponent="20" lighting-color="white" result="spec">
        <feDistantLight azimuth="45" elevation="60" />
      </feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="specOut" />
      <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" 
                   k1="0" k2="1" k3="1" k4="0" />
    </filter>
  </defs>
  
  <circle cx="50" cy="100" r="40" fill="red" filter="url(#blur)" />
  <rect x="110" y="60" width="80" height="80" fill="blue" filter="url(#shadow)" />
  <circle cx="250" cy="100" r="40" fill="green" filter="url(#grayscale)" />
  <text x="20" y="180" font-size="24" fill="purple" filter="url(#glow)">Glow</text>
  <circle cx="350" cy="100" r="40" fill="orange" filter="url(#emboss)" />
</svg>
```

### 滤镜元素速查

| 滤镜 | 说明 |
|------|------|
| `feGaussianBlur` | 高斯模糊 |
| `feDropShadow` | 投影 |
| `feColorMatrix` | 颜色矩阵变换 |
| `feMerge` | 合并多个输入 |
| `feComposite` | 合成操作 |
| `feSpecularLighting` | 镜面光照 |
| `feTurbulence` | 噪点/纹理 |
| `feDisplacementMap` | 位移贴图 |

---

## 10. 动画与交互

### CSS 动画

```xml
<svg viewBox="0 0 200 100">
  <style>
    .bounce {
      animation: bounce 1s infinite alternate;
    }
    @keyframes bounce {
      from { transform: translateY(0); }
      to { transform: translateY(-30px); }
    }
    .spin {
      animation: spin 2s linear infinite;
      transform-origin: center;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .pulse {
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  </style>
  
  <circle class="bounce" cx="50" cy="80" r="30" fill="red" />
  <rect class="spin" x="100" y="35" width="30" height="30" fill="blue" />
  <circle class="pulse" cx="170" cy="50" r="25" fill="green" />
</svg>
```

### SMIL 动画 (原生 SVG 动画)

```xml
<svg viewBox="0 0 300 100">
  <!-- 移动动画 -->
  <circle cx="30" cy="50" r="20" fill="red">
    <animate attributeName="cx" from="30" to="270" dur="2s" 
             repeatCount="indefinite" />
  </circle>
  
  <!-- 颜色动画 -->
  <rect x="100" y="30" width="40" height="40">
    <animate attributeName="fill" from="blue" to="green" dur="1s" 
             repeatCount="indefinite" additive="sum" />
  </rect>
  
  <!-- 路径动画 -->
  <circle r="15" fill="purple">
    <animateMotion dur="3s" repeatCount="indefinite" 
                   path="M 20 80 Q 70 20 120 80 T 220 80" />
  </circle>
  
  <!-- 缩放动画 -->
  <ellipse cx="250" cy="50" rx="20" ry="20" fill="orange">
    <animate attributeName="rx" from="20" to="40" dur="0.5s" 
             repeatCount="indefinite" values="20;40;20" />
    <animate attributeName="ry" from="20" to="10" dur="0.5s" 
             repeatCount="indefinite" values="20;10;20" />
  </ellipse>
</svg>
```

### JavaScript 交互

```xml
<svg viewBox="0 0 200 200" id="mySvg">
  <circle id="myCircle" cx="100" cy="100" r="50" fill="blue" />
  <text x="100" y="180" text-anchor="middle" id="status">点击圆形</text>
  
  <script>
    const circle = document.getElementById('myCircle');
    const status = document.getElementById('status');
    let count = 0;
    
    circle.addEventListener('click', () => {
      count++;
      circle.setAttribute('fill', count % 2 === 0 ? 'blue' : 'red');
      status.textContent = `点击了 ${count} 次`;
    });
    
    circle.addEventListener('mouseenter', () => {
      circle.setAttribute('r', '60');
    });
    
    circle.addEventListener('mouseleave', () => {
      circle.setAttribute('r', '50');
    });
  </script>
</svg>
```

---

## 11. 实战示例

### 示例 1: 简单图标

```xml
<!-- 心形图标 -->
<svg viewBox="0 0 24 24" width="48" height="48">
  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
        fill="#e91e63" />
</svg>
```

### 示例 2: 加载动画

```xml
<svg viewBox="0 0 50 50" width="50" height="50">
  <circle cx="25" cy="25" r="20" fill="none" stroke="#ddd" stroke-width="4" />
  <circle cx="25" cy="25" r="20" fill="none" stroke="#3498db" stroke-width="4" 
          stroke-dasharray="80" stroke-linecap="round">
    <animateTransform attributeName="transform" type="rotate" 
                      from="0 25 25" to="360 25 25" dur="1s" 
                      repeatCount="indefinite" />
  </circle>
</svg>
```

### 示例 3: 数据图表

```xml
<svg viewBox="0 0 300 200">
  <!-- 坐标轴 -->
  <line x1="40" y1="20" x2="40" y2="180" stroke="#333" stroke-width="2" />
  <line x1="40" y1="180" x2="280" y2="180" stroke="#333" stroke-width="2" />
  
  <!-- 柱状图 -->
  <rect x="60" y="100" width="30" height="80" fill="#3498db" />
  <rect x="110" y="60" width="30" height="120" fill="#e74c3c" />
  <rect x="160" y="140" width="30" height="40" fill="#2ecc71" />
  <rect x="210" y="80" width="30" height="100" fill="#f39c12" />
  
  <!-- 标签 -->
  <text x="75" y="195" text-anchor="middle" font-size="12">Q1</text>
  <text x="125" y="195" text-anchor="middle" font-size="12">Q2</text>
  <text x="175" y="195" text-anchor="middle" font-size="12">Q3</text>
  <text x="225" y="195" text-anchor="middle" font-size="12">Q4</text>
  
  <!-- 标题 -->
  <text x="160" y="20" text-anchor="middle" font-size="16" font-weight="bold">
    年度销售数据
  </text>
</svg>
```

### 示例 4: 响应式 SVG

```xml
<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
  <!-- 使用百分比或 viewBox 实现响应式 -->
  <circle cx="50" cy="50" r="40" fill="teal" />
  <text x="50" y="55" text-anchor="middle" fill="white" font-size="20">
    Hi
  </text>
</svg>
```

---

## 12. 学习资源

### 官方文档

| 资源 | 链接 |
|------|------|
| W3C SVG 规范 | https://www.w3.org/Graphics/SVG/ |
| MDN SVG 教程 | https://developer.mozilla.org/zh-CN/docs/Web/SVG |

### 在线工具

| 工具 | 用途 |
|------|------|
| [SVG Viewer](https://www.svgviewer.dev/) | 在线预览/编辑 |
| [SVG Path Editor](https://yqnn.github.io/svg-path-editor/) | 路径可视化编辑 |
| [SVG Optimizer](https://jakearchibald.github.io/svgomg/) | SVG 压缩优化 |
| [Heroicons](https://heroicons.com/) | 免费 SVG 图标 |
| [Undraw](https://undraw.co/) | 免费 SVG 插图 |

### 学习网站

- **MDN Web Docs** - 最权威的 Web 技术文档
- **W3Schools SVG Tutorial** - 入门友好
- **CSS-Tricks SVG** - 实用技巧
- **Smashing Magazine** - 深度文章

### 推荐书籍

- 《SVG Essentials》- J. David Eisenberg
- 《SVG Pocket Guide》- 快速参考

### 实践建议

1. **从简单开始**: 先画基本形状，再学 path
2. **多用 viewBox**: 养成响应式思维
3. **善用工具**: 复杂图形用编辑器辅助
4. **优化文件**: 上线前用 SVGO 压缩
5. **注意兼容性**: 老旧浏览器可能需要 fallback

---

## 附录：常用命令速查卡

```
┌─────────────────────────────────────────────────────────┐
│                    SVG Path 命令                        │
├─────────────────────────────────────────────────────────┤
│ M/m (x y)      移动到某点                               │
│ L/l (x y)      画直线                                   │
│ H/h (x)        画水平线                                  │
│ V/v (y)        画垂直线                                  │
│ C/c (x1 y1 x2 y2 x y)  三次贝塞尔曲线                   │
│ S/s (x2 y2 x y)        平滑三次贝塞尔                    │
│ Q/q (x1 y1 x y)        二次贝塞尔曲线                    │
│ T/t (x y)              平滑二次贝塞尔                    │
│ A/a (rx ry rot large-arc sweep x y)  椭圆弧             │
│ Z/z            闭合路径                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    常用属性速查                          │
├─────────────────────────────────────────────────────────┤
│ fill             填充颜色                                │
│ stroke           描边颜色                                │
│ stroke-width     描边宽度                                │
│ stroke-dasharray 虚线模式                               │
│ opacity          透明度 (0-1)                            │
│ transform        变换 (translate/rotate/scale/skew)      │
│ viewBox          视口坐标系                              │
│ preserveAspectRatio  保持比例                            │
└─────────────────────────────────────────────────────────┘
```

---

_祝你 SVG 学习愉快！🎨_
