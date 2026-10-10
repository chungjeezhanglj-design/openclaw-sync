# Chrome DevTools MCP - 浏览器控制指南

## 🎯 用途

通过 MCP (Model Context Protocol) 控制 Chrome 浏览器，实现：
- 网页导航
- 页面截图
- 元素操作（点击、填充表单等）
- 获取页面快照

---

## 🛠️ 可用工具

| 工具 | 功能 | 参数 |
|------|------|------|
| `navigate_page` | 导航到指定 URL | `type`, `url`, `ignoreCache`, `handleBeforeUnload` |
| `take_screenshot` | 截取页面截图 | `format`, `quality`, `uid`, `fullPage`, `filePath` |
| `take_snapshot` | 获取页面文本快照 | `verbose`, `filePath` |
| `click` | 点击元素 | `uid`, `dblClick`, `includeSnapshot` |
| `fill` | 填充表单字段 | `uid`, `value`, `includeSnapshot` |
| `list_pages` | 列出所有打开的页面 | - |
| `close_page` | 关闭指定页面 | `pageId` |
| `new_page` | 打开新页面 | `url`, `background`, `isolatedContext`, `timeout` |

---

## 📋 使用示例

### 1. 导航到页面

```bash
mcporter call chrome-devtools.navigate_page type:"url" url:"http://example.com"
```

**响应**:
```
Successfully navigated to http://example.com.
## Pages
1: about:blank
3: http://example.com/ [selected]
```

---

### 2. 截取页面截图

```bash
mcporter call chrome-devtools.take_screenshot format:"png" quality:100 fullPage:false filePath:"/absolute/path/to/screenshot.png"
```

**参数说明**:
- `format`: `png`（推荐）| `jpeg` | `webp`
- `quality`: 1-100（仅 jpeg/webp 需要）
- `fullPage`: `true`（完整页面）| `false`（当前视口）
- `filePath`: **必须是绝对路径**
- `uid`: （可选）截取指定元素

**响应**:
```
Took a screenshot of the current page's viewport.
Saved screenshot to /absolute/path/to/screenshot.png.
```

---

### 3. 获取页面文本快照

```bash
mcporter call chrome-devtools.take_snapshot verbose:false
```

**用途**: 获取页面可访问性树（a11y tree），用于查找元素 uid

**响应**:
```
## Latest page snapshot
uid=1_0 RootWebArea "Page Title" url="http://example.com"
  uid=1_1 banner
    uid=1_2 link "Home" url="http://example.com/"
  uid=1_3 main
    ...
```

---

### 4. 连续操作（导航 + 截图）

```bash
mcporter call chrome-devtools.navigate_page type:"url" url:"http://example.com/page" && \
mcporter call chrome-devtools.take_screenshot format:"png" quality:100 filePath:"/path/to/output.png"
```

---

### 5. 批量截图工作流

```bash
# 定义截图目录
SCREENSHOT_DIR="/Users/zhanglj/openclaw/workspace/project/assets/screenshots"

# 首页
mcporter call chrome-devtools.navigate_page type:"url" url:"http://example.com" && \
mcporter call chrome-devtools.take_screenshot format:"png" filePath:"$SCREENSHOT_DIR/SC-01-home.png"

# 列表页
mcporter call chrome-devtools.navigate_page type:"url" url:"http://example.com/list" && \
mcporter call chrome-devtools.take_screenshot format:"png" filePath:"$SCREENSHOT_DIR/SC-02-list.png"

# 详情页
mcporter call chrome-devtools.navigate_page type:"url" url:"http://example.com/detail/123" && \
mcporter call chrome-devtools.take_screenshot format:"png" filePath:"$SCREENSHOT_DIR/SC-03-detail.png"
```

---

## 🎬 博客小时光截图实战

### 场景 1：首页截图

```bash
mcporter call chrome-devtools.navigate_page type:"url" url:"http://chungjee.cc.cd:1177" && \
mcporter call chrome-devtools.take_screenshot format:"png" quality:100 filePath:"/Users/zhanglj/openclaw/workspace/blog-promo-video/assets/screenshots/SC-02.png"
```

### 场景 2：时间线布局

```bash
mcporter call chrome-devtools.navigate_page type:"url" url:"http://chungjee.cc.cd:1177/timeline" && \
mcporter call chrome-devtools.take_screenshot format:"png" quality:100 filePath:"/Users/zhanglj/openclaw/workspace/blog-promo-video/assets/screenshots/SC-04.png"
```

### 场景 3：网格布局

```bash
mcporter call chrome-devtools.navigate_page type:"url" url:"http://chungjee.cc.cd:1177/grid" && \
mcporter call chrome-devtools.take_screenshot format:"png" quality:100 filePath:"/Users/zhanglj/openclaw/workspace/blog-promo-video/assets/screenshots/SC-05.png"
```

### 场景 4：瀑布流布局

```bash
mcporter call chrome-devtools.navigate_page type:"url" url:"http://chungjee.cc.cd:1177/waterfall" && \
mcporter call chrome-devtools.take_screenshot format:"png" quality:100 filePath:"/Users/zhanglj/openclaw/workspace/blog-promo-video/assets/screenshots/SC-06.png"
```

### 场景 5：地图布局

```bash
mcporter call chrome-devtools.navigate_page type:"url" url:"http://chungjee.cc.cd:1177/map" && \
mcporter call chrome-devtools.take_screenshot format:"png" quality:100 filePath:"/Users/zhanglj/openclaw/workspace/blog-promo-video/assets/screenshots/SC-07.png"
```

### 场景 6：搜索页面

```bash
mcporter call chrome-devtools.navigate_page type:"url" url:"http://chungjee.cc.cd:1177/search" && \
mcporter call chrome-devtools.take_screenshot format:"png" quality:100 filePath:"/Users/zhanglj/openclaw/workspace/blog-promo-video/assets/screenshots/SC-10.png"
```

---

## ⚠️ 注意事项

1. **路径必须是绝对路径**
   - ✅ `/Users/zhanglj/workspace/screenshot.png`
   - ❌ `./screenshot.png`

2. **截图前确保页面加载完成**
   - 可等待 1-2 秒后再截图
   - 或使用 `take_snapshot` 检查页面状态

3. **分辨率设置**
   - 视频截图建议：1920x1080（16:9）
   - 可通过浏览器开发者工具设置视口大小

4. **文件格式**
   - 推荐 PNG（无损，适合后期处理）
   - JPEG 文件更小但有损

5. **错误处理**
   - 如果导航失败，检查 URL 是否正确
   - 如果截图失败，检查文件路径是否可写

---

## 🔧 故障排查

### 问题 1：浏览器未连接

```
MCP error -32602: Not connected
```

**解决**: 确保 chrome-devtools MCP 服务已启动

```bash
mcporter list  # 检查服务状态
```

### 问题 2：截图保存失败

```
Error: Cannot save screenshot to path
```

**解决**: 确保目录存在且可写

```bash
mkdir -p /path/to/screenshots
```

### 问题 3：页面加载超时

**解决**: 增加超时时间或检查网络连接

```bash
mcporter call chrome-devtools.new_page url:"http://example.com" timeout:30000
```

---

## 📚 相关文档

- TOOLS.md - 本地工具配置
- AGENTS.md - Agent 行为规范
- 项目截图指南：`/Users/zhanglj/openclaw/workspace/blog-promo-video/SCREENSHOT_GUIDE.md`

---

**最后更新**: 2026-03-06
