---
name: apple-intelligence
description: macOS 原生 Apple Intelligence 调用 - 图像生成/文本处理/可用性检查
metadata:
  emoji: 🧠
  requires:
    - macOS 15.1+ (Tahoe)
    - Apple Silicon
    - Swift 5.10+
  credentials: []
---

# Apple Intelligence CLI Skill

使用 macOS 原生 Apple Intelligence 能力。

## 文件说明

- `ai.swift` / `ai` - 基础 CLI 工具（检查可用性）
- `ai-app.swift` / `ai-app` - 前台应用（图像生成，需要 GUI）

## 使用方法

### 1. 检查 AI 可用性
```bash
./ai check
```

输出示例：
```json
{"success":true,"data":{"aiAvailable":true,"macOSVersion":"Version 26.4.1"},"error":""}
```

### 2. 图像生成

⚠️ **重要限制**：ImagePlayground 需要前台应用和可见窗口，不能在后台/SSH 运行。

**方法 A：前台应用（推荐）**
```bash
# 编译
swiftc -o ai-app ai-app.swift

# 运行（会打开一个可见窗口）
./ai-app "一只戴墨镜的猫" illustration
```

**方法 B：AppleScript 触发**
```bash
# 打开 Image Playground 应用
open -a "Image Playground"
```

### 3. 支持的图像风格

- `animation` - 动画风格
- `illustration` - 插画风格（默认）
- `sketch` - 素描风格

## 依赖

- macOS 15.1+ (Tahoe)
- Apple Silicon 芯片
- Swift 5.10+
- Apple Intelligence 已在系统设置中启用

## 限制

1. **ImagePlayground 需要前台应用** - 不能在后台/SSH 运行
2. **需要可见窗口** - 必须显示 UI
3. **需要联网** - 复杂请求通过 Private Cloud Compute 处理
4. **WritingTools 是私有 API** - 仅限本地脚本，不能用于 App Store

## 编译

```bash
# 编译基础工具（后台可用）
swiftc -o ai ai.swift

# 编译前台应用（需要 GUI）
swiftc -o ai-app ai-app.swift
```

## 故障排除

### 错误：Image creation is not available when the application is hidden
**原因**：ImagePlayground 需要前台应用和可见窗口
**解决**：使用 `./ai-app` 或 `open -a "Image Playground"`

### 错误：module 'ImagePlayground' has no member named 'Creator'
**原因**：API 已更改为 `ImageCreator`
**解决**：使用最新代码

## OpenClaw 集成

在 OpenClaw 中使用 Apple Intelligence：

```javascript
// 检查可用性
const { exec } = require('child_process');
exec('./ai check', (err, stdout) => {
    const result = JSON.parse(stdout);
    if (result.data.aiAvailable) {
        console.log('AI 可用');
    }
});

// 图像生成（需要 GUI）
// 注意：这需要在有显示器的环境下运行
exec('./ai-app "一只戴墨镜的猫" illustration', (err, stdout) => {
    const result = JSON.parse(stdout);
    if (result.success) {
        console.log('生成成功:', result.data.paths);
    }
});
```
