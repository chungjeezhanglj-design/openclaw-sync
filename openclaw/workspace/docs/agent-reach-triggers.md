# Agent Reach 触发词速查表 🌐

**最后更新**: 2026-03-14  
**技能位置**: `~/.openclaw/skills/agent-reach/SKILL.md`

---

## 🎯 触发词列表

| # | 触发词 | 语言 | 用途 | 示例 |
|---|--------|------|------|------|
| 1 | `帮我配` | 🇨🇳 中文 | 配置特定平台 | "帮我配 Twitter" |
| 2 | `帮我添加` | 🇨🇳 中文 | 添加新平台支持 | "帮我添加 B 站" |
| 3 | `帮我安装` | 🇨🇳 中文 | 安装 agent-reach 或工具 | "帮我安装 agent-reach" |
| 4 | `agent reach` | 🇺🇸 英文 | 直接调用技能 | "agent reach 怎么用" |
| 5 | `install channels` | 🇺🇸 英文 | 批量安装频道 | "install all channels" |
| 6 | `configure twitter` | 🇺🇸 英文 | 配置 Twitter | "configure twitter cookies" |
| 7 | `enable reddit` | 🇺🇸 英文 | 启用 Reddit | "enable reddit access" |

---

## 📋 按场景分类

### 🔧 安装场景

| 触发词 | 完整示例 | AI 执行命令 |
|--------|---------|-------------|
| 帮我安装 | "帮我安装 agent-reach" | `pip install agent-reach` + `agent-reach install --env=auto` |
| install channels | "install all channels" | `agent-reach install --env=auto` |

### ⚙️ 配置场景

| 触发词 | 完整示例 | AI 执行命令 |
|--------|---------|-------------|
| 帮我配 | "帮我配小红书" | `agent-reach doctor` → 引导配置 Cookie |
| 帮我添加 | "帮我添加 YouTube" | `agent-reach doctor` → 检查依赖 |
| configure twitter | "configure twitter" | `agent-reach configure twitter-cookies "xxx"` |
| enable reddit | "enable reddit" | `agent-reach doctor` → 测试 Reddit API |

### ❓ 查询场景

| 触发词 | 完整示例 | AI 响应 |
|--------|---------|---------|
| agent reach | "agent reach 支持哪些平台" | 列出 12+ 平台列表 |
| 帮我配 | "帮我配哪些平台" | 列出可配置平台 |

---

## 🌐 平台配置速查

### 需要 Cookie 的平台 ⚠️

| 平台 | 触发词示例 | 配置命令 | 风险提示 |
|------|-----------|---------|---------|
| 🐦 Twitter/X | "帮我配 Twitter" | `agent-reach configure twitter-cookies "auth_token=xxx; ct0=yyy"` | ⚠️ 封号风险，用小号 |
| 📕 小红书 | "帮我配小红书" | `agent-reach configure --from-browser chrome` | ⚠️ 封号风险，用小号 |
| 💼 LinkedIn | "帮我配 LinkedIn" | `agent-reach configure linkedin-cookies "xxx"` | ⚠️ 封号风险，用小号 |

### 无需登录的平台 ✅

| 平台 | 触发词示例 | 测试命令 |
|------|-----------|---------|
| 📺 YouTube | "帮我添加 YouTube" | `yt-dlp --dump-json "URL"` |
| 📱 Bilibili | "帮我添加 B 站" | `yt-dlp --dump-json "https://bilibili.com/video/BVxxx"` |
| 🤖 Reddit | "enable reddit" | `curl -s "https://reddit.com/r/python/hot.json"` |
| 🎵 抖音 | "帮我添加抖音" | `mcporter call 'douyin.parse_douyin_video_info(...)'` |
| 🐙 GitHub | "帮我添加 GitHub" | `gh search repos "query"` |
| 🌍 任意网页 | "帮我添加网页读取" | `curl -s "https://r.jina.ai/URL"` |
| 🔍 Exa Search | "帮我添加 Exa" | `mcporter call 'exa.web_search_exa(...)'` |
| 📱 Boss 直聘 | "帮我添加 Boss 直聘" | `mcporter call 'bosszhipin.search_jobs_tool(...)'` |
| 📰 RSS | "帮我添加 RSS" | `python3 -c "import feedparser"` |

---

## 🚀 标准工作流程

### 用户说触发词后，AI 应执行：

```
1. 运行 agent-reach doctor
   ↓
2. 查看目标频道状态（✅/⚠️/⬜）
   ↓
3. 自动执行可完成的步骤
   - 安装包
   - 启动服务
   ↓
4. 对需人工干预的步骤告知用户
   - 粘贴 Cookie
   - 配置代理
   ↓
5. 再次运行 agent-reach doctor 验证
```

---

## 💡 Cookie 配置指南

### 方法 1: 从浏览器自动提取（推荐）

```bash
agent-reach configure --from-browser chrome
```

**适用**: 本地电脑有 Chrome 浏览器

---

### 方法 2: Cookie-Editor 手动导入

**步骤**:
1. 用户在自己的浏览器登录对应平台
2. 安装 [Cookie-Editor](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm)
3. 点击插件 → Export → Header String
4. 把导出的字符串发给 AI
5. AI 执行：`agent-reach configure [platform]-cookies "导出的字符串"`

**适用**: 所有平台，最可靠

---

### 方法 3: 扫码登录（备选）

**适用**: 仅限本地有浏览器的情况

---

## ⚠️ 重要提醒

### 封号风险
> ⚠️ **使用 Cookie 登录的平台存在封号风险，请务必使用专用小号！**

涉及平台：Twitter、小红书、LinkedIn、Boss 直聘

---

### 代理需求
> 🌐 **服务器用户可能需要配置代理才能访问某些平台**

```bash
# 配置代理
agent-reach configure proxy http://user:pass@ip:port

# 测试代理
curl -x http://user:pass@ip:port https://twitter.com
```

**可能需要代理的平台**:
- Twitter/X（中国大陆）
- Reddit（服务器 IP 可能被封）
- Bilibili（服务器 IP 可能 412 错误）
- YouTube（中国大陆）

---

## 🔍 常用诊断命令

| 命令 | 用途 |
|------|------|
| `agent-reach doctor` | 查看所有频道状态 |
| `agent-reach watch` | 快速健康检查 |
| `agent-reach check-update` | 检查更新 |
| `agent-reach configure --list` | 列出已配置的频道 |

---

## 📖 平台工具速查

### Twitter/X (xreach CLI)
```bash
xreach search "query" --json -n 10
xreach tweet https://x.com/user/status/123 --json
xreach tweets @username --json -n 20
```

### YouTube (yt-dlp)
```bash
yt-dlp --dump-json "URL"
yt-dlp --write-sub --sub-lang "zh-Hans,en" --skip-download "URL"
yt-dlp --dump-json "ytsearch5:query"
```

### Bilibili (yt-dlp)
```bash
yt-dlp --dump-json "https://bilibili.com/video/BVxxx"
yt-dlp --write-sub --sub-lang "zh-Hans" --skip-download "URL"
```

### 小红书 (mcporter + xiaohongshu-mcp)
```bash
mcporter call 'xiaohongshu.search_feeds(keyword: "query")'
mcporter call 'xiaohongshu.get_feed_detail(feed_id: "xxx", xsec_token: "yyy")'
mcporter call 'xiaohongshu.create_image_feed(title: "标题", desc: "内容", image_paths: ["/path/to/img.jpg"])'
```

### 抖音 (mcporter + douyin-mcp-server)
```bash
mcporter call 'douyin.parse_douyin_video_info(share_link: "https://v.douyin.com/xxx/")'
mcporter call 'douyin.get_douyin_download_link(share_link: "https://v.douyin.com/xxx/")'
mcporter call 'douyin.extract_douyin_text(share_link: "https://v.douyin.com/xxx/")'
```

### GitHub (gh CLI)
```bash
gh search repos "query" --sort stars --limit 10
gh repo view owner/repo
gh search code "query" --language python
gh issue list -R owner/repo --state open
```

### Reddit (JSON API)
```bash
curl -s "https://www.reddit.com/r/python/hot.json?limit=10" -H "User-Agent: agent-reach/1.0"
curl -s "https://www.reddit.com/r/python/comments/POST_ID.json" -H "User-Agent: agent-reach/1.0"
```

### 任意网页 (Jina Reader)
```bash
curl -s "https://r.jina.ai/URL" -H "Accept: text/markdown"
curl -s "https://s.jina.ai/query" -H "Accept: text/markdown"
```

---

## 🦎 对话示例

### 示例 1: 首次安装
```
用户：帮我安装 agent-reach

AI: 好的，我来帮你安装 agent-reach...
    ✅ pip install agent-reach
    ✅ agent-reach install --env=auto
    ✅ agent-reach doctor
    
    安装完成！现在可用以下平台：
    🐦 Twitter  📺 YouTube  📱 B 站  🤖 Reddit
    📕 小红书  🎵 抖音  🐙 GitHub  🔍 Exa
    💼 LinkedIn  📱 Boss 直聘  🌍 网页读取  📰 RSS
    
    想配置哪个平台？
```

### 示例 2: 配置 Twitter
```
用户：帮我配 Twitter

AI: 好的，先检查 Twitter 状态...
    [agent-reach doctor]
    
    ⚠️ Twitter 需要 Cookie 才能访问。你有两种方式：
    
    1️⃣ 从浏览器自动提取（推荐）:
       agent-reach configure --from-browser chrome
    
    2️⃣ 手动导入 Cookie:
       - 安装 Cookie-Editor 插件
       - 登录 Twitter → 导出 Cookie → 发给我
    
    你想用哪种方式？
```

### 示例 3: 查询支持的平台
```
用户：agent reach 支持哪些平台？

AI: agent-reach 支持 12+ 个平台：

    社交媒体:
    🐦 Twitter/X  🤖 Reddit  📕 小红书  💼 LinkedIn
    
    视频平台:
    📺 YouTube  📱 Bilibili  🎵 抖音
    
    开发相关:
    🐙 GitHub  📱 Boss 直聘
    
    其他:
    🔍 Exa Search  🌍 任意网页  📰 RSS
    
    需要我帮你配置哪个平台？
```

---

## 📚 相关资源

- **GitHub 仓库**: https://github.com/Panniantong/agent-reach
- **技能文件**: `~/.openclaw/skills/agent-reach/SKILL.md`
- **Cookie-Editor**: https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm

---

## 📝 更新日志

| 日期 | 更新内容 |
|------|---------|
| 2026-03-14 | 初始版本，包含 7 个触发词详解 |

---

**提示**: 将此文件保存到 `docs/agent-reach-triggers.md`，方便随时查阅！
