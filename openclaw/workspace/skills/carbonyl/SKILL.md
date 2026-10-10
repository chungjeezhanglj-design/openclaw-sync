# Carbonyl 终端浏览器技能

## 描述
在终端中运行 Chromium 浏览器，支持完整 Web API（WebGL、WebGPU、音视频等），无需图形界面。

## 使用场景
- SSH 或无头环境中浏览网页
- 快速查看网页内容/文档
- 终端工作流中的网页预览
- 自动化测试中的无头浏览器

## 调用方式

### 直接命令行
```bash
carbonyl <URL>
```

### 示例
```bash
# 打开 GitHub
carbonyl https://github.com

# 打开 YouTube
carbonyl https://youtube.com

# 打开 Wikipedia
carbonyl https://wikipedia.org
```

## 注意事项
- **运行时会占用终端**：Carbonyl 是交互式终端应用，运行时会接管当前终端
- **退出方式**：按 `Ctrl+C` 或 `q` 退出
- **不支持全屏**：目前全屏模式尚未实现
- **资源占用**：相比完整 Chromium 更轻量，但仍需要一定内存

## 与 OpenClaw 集成
在 OpenClaw 中调用时，建议使用后台模式或子进程方式，避免阻塞主会话。

## 依赖
- Node.js (通过 npm 安装)
- macOS / Linux / Windows 11 (WSL)

## 安装位置
`/opt/homebrew/bin/carbonyl` (macOS arm64)

## 更多信息
- GitHub: https://github.com/fathyb/carbonyl
- 博客：https://fathy.fr/carbonyl
