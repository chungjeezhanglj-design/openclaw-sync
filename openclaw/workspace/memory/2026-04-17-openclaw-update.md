# Session: 2026-04-17 10:25:03 UTC

- **Session Key**: agent:codex:main
- **Session ID**: 03ea624e-0b41-49d2-8a28-7571addb0110
- **Source**: webchat

## Conversation Summary

user: A new session was started via /new or /reset. If runtime-provided startup context is included for this first turn, use it before responding to the user. Then greet the user in your configured persona, if one is provided. Be yourself - use your defined voice, mannerisms, and mood. Keep it to 1-3 sentences and ask what they want to do. If the runtime model differs from default_model in the system prompt, mention the default model. Do not mention internal steps, files, tools, or reasoning.
Current time: Friday, April 17th, 2026 - 3:19 PM (Asia/Shanghai) / 2026-04-17 07:19 UTC
assistant: 嘿，JackLee！🦎 我是 Ady，刚上线～ 今天下午有什么想一起做的吗？
user: Sender (untrusted metadata):
```json
{
  "label": "openclaw-control-ui",
  "id": "openclaw-control-ui"
}
```

[Fri 2026-04-17 15:20 GMT+8] openclaw更新的版本有哪些新特性
assistant: 让我查一下 OpenClaw 的最新更新信息。


assistant: 根据官方 CHANGELOG，**OpenClaw 2026.4.15**（你当前安装的版本）的主要新特性包括：

## 🎉 核心新功能

1. **Claude Opus 4.7 默认支持** - Anthropic 模型系列默认升级到 Claude Opus 4.7，包括图像理解能力

2. **Gemini TTS 语音合成** - Google 插件新增 Gemini 文本转语音支持，支持 WAV 和 PCM 输出格式

3. **Model Auth 状态卡片** - Control UI 新增 OAuth 令牌健康状态面板，可一目了然查看令牌有效期和速率限制压力

4. **LanceDB 云存储支持** - 记忆系统支持远程对象存储，不再局限于本地磁盘

5. **GitHub Copilot 嵌入 provider** - 为记忆搜索添加 Copilot 嵌入支持

6. **本地模型精简模式** - 实验性功能 `localModelLean: true` 可移除 browser/cron/message 等重型工具，减少提示词体积

## 🐛 重要修复

- 修复了工具命名冲突导致的安全问题
- 优化了 Telegram 流式回复和自动压缩逻辑
- 修复 Matrix 子代理会话绑定问题
- 改进 BlueBubbles 消息捕获的稳定性
- 修复 TTS 语音合成 provider 路由问题
- 优化技能缓存失效机制，避免"Tool not found"循环

---

你当前已经是最新版本（2026.4.15）！如果想查看未发布的开发版更新，可以运行 `openclaw update status` 查看更新状态。需要我帮你检查是否有新版本吗？
