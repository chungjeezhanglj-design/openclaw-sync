# Session: 2026-04-15 09:56:53 UTC

- **Session Key**: agent:codex:main
- **Session ID**: a14f8eac-3ccf-4bbc-954d-33765aa15887
- **Source**: webchat

## Conversation Summary

user: Sender (untrusted metadata):
```json
{
  "label": "openclaw-control-ui",
  "id": "openclaw-control-ui"
}
```

[Wed 2026-04-15 10:48 GMT+8] openclaw现在的版本有哪些新特性
assistant: 根据查询结果，你当前运行的 OpenClaw 版本是 **2026.4.14**（最新 beta 版本，发布于 2026-04-14）。

## 🦞 OpenClaw 核心特性

### 📱 多通道支持
- **内置通道**：Discord、Google Chat、iMessage、IRC、Signal、Slack、Telegram、WebChat、WhatsApp
- **插件通道**：BlueBubbles (iMessage)、飞书、LINE、Matrix、Mattermost、Microsoft Teams、Nextcloud Talk、Nostr、QQ Bot、Synology Chat、Tlon、Twitch、Zalo
- 支持群聊提及激活和 DM 安全白名单

### 🤖 Agent 能力
- 嵌入式 agent 运行时，支持工具流式输出
- 多 agent 路由，每个工作区或发送者隔离会话
- 会话管理：直接聊天合并到 `main`，群组隔离
- 长响应流式传输和分块

### 🔐 认证与模型
- **35+ 模型提供商**：Anthropic、OpenAI、Google 等
- 支持 OAuth 订阅认证（如 OpenAI Codex）
- 自定义和自托管模型（vLLM、SGLang、Ollama 及兼容 API）

### 🎨 媒体支持
- 图片、音频、视频、文档双向传输
- 图像生成和视频生成
- 语音笔记转录
- 多提供商 TTS

### 🖥️ 应用与界面
- WebChat 和浏览器 Control UI
- macOS 菜单栏伴侣应用
- iOS/Android 节点：配对、Canvas、相机、屏幕录制、定位、语音

### 🛠️ 工具与自动化
- 浏览器自动化、exec、沙箱
- 多种搜索工具（Brave、DuckDuckGo、Exa、Tavily、Perplexity 等）
- Cron 任务和心跳调度
- Skills、插件和工作流（Lobster）

---

**查看更新日志**：OpenClaw 没有本地 CHANGELOG 文件，建议查看：
- GitHub releases: https://github.com/openclaw/openclaw/releases
- Discord 社区：https://discord.gg/clawd

需要我帮你检查是否有更新或查看特定功能的文档吗？
user: Sender (untrusted metadata):
```json
{
  "label": "openclaw-control-ui",
  "id": "openclaw-control-ui"
}
```

[Wed 2026-04-15 17:56 GMT+8] 识别图片的内容
assistant: 我需要先看到图片才能识别内容。请上传图片，或者告诉我图片的路径。

你可以：
1. 直接在聊天中发送/上传图片
2. 提供图片的本地路径（如 `~/Pictures/xxx.png`）
3. 提供图片的 URL 链接

收到图片后，我可以使用 Ollama 视觉模型（`openbmb/minicpm-v4.5:8b`）来识别图片内容。🦎
user: Sender (untrusted metadata):
```json
{
  "label": "openclaw-control-ui",
  "id": "openclaw-control-ui"
}
```
assistant: HEARTBEAT_OK
