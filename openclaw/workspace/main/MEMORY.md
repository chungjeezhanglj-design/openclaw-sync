# MEMORY.md — Long-term Memory

> 私有会话专属。**不**加载到群聊 / 共享会话 / 外部会话。
> 写什么: 重大事件、决定、踩过的坑、可复用的事实。**不**写 raw logs（那进 `memory/YYYY-MM-DD.md`）。

---

## Chat Output Rendering Pitfall — `$(...)` 被吞

**症状**：在 chat 里给用户的 bash 命令或 heredoc 里写 `$(cat foo)` / `$(cmd)`，送达 shell 时 `$` 被吃掉，命令变成 `(cat foo)` 这种，zsh/bash 报 `parse error near unexpected token `)'`。

**踩过的次数**（2026-09-01，Webhooks 烟测那次连续翻车）：
1. 用户跑我给的 smoke 命令 → `SECRET=*** /path)` 报 `parse error`
2. 我用反引号绕开 → 又因另一处中招
3. 子代理 heredoc 里的 `SECRET=*** /path)` → 文件写入也丢了 `$`（**注意：连 heredoc → 文件这条链路都吃**，不只是显示层）
4. 我 exec 时自己写 `SECRET=*** /path)` → zsh 也报 parse error

**规律**（观察到的）：
- `$(curl ...)`, `$(date ...)` 这类**紧跟 `(` 后是命令动词**的偶尔保住
- `$(cat ...)`, `$(<file)` 这类**短小的 cat / file-read 模式**几乎**一定被吃**
- 反引号 `` `cmd` `` **从未被吃**
- 这套坑覆盖**显示层 / 文件写入 / shell 解析**三处，不是单点问题

**规避姿势**（强制规则）：

1. **首选反引号** `` `cmd` ``，不用 `$(...)`。
2. 如果一定要 `$(...)`，加 `\$(...)` 转义也救不了——直接换写法。
3. **多步骤串联**：把中间结果写文件再读。
   ```bash
   curl -o /tmp/.out ... 
   C=`cat /tmp/.out`    # 而不是 C=$(curl ...)
   ```
4. **子代理 heredoc 里也用反引号**：单引号 heredoc (`<<'EOF'`)`保护不了这个坑，渲染发生在更上游。
5. **写完之后必 `bash -n` 验证** + `grep -n '\$(' file` 应该 0 行（或仅注释里）。
7. **用户在终端执行时也命中**：用户跑我给的命令也炸 `parse error near ')'`——同样要回退反引号。

**诊断口诀**：看到 `parse error near ')'` / `syntax error near ')'` → **第一反应 `$(...)` 被吃**，不要排查别的。

---

## 本机环境（zhanglj@Mac mini）

- **OpenClaw Gateway**：`https://127.0.0.1:18789`（TLS + 自签证书，curl 要 `-k`）
- **本机 LAN IP**：`192.168.1.102`
- **NAS**（Synology，DSM 7.x）：同 LAN，配有 `synology-chat` channel 接入 OpenClaw
- **工作区**：`/Users/zhanglj/openclaw/workspace/main`（git repo）
- **Gateway 配置**：`~/.openclaw/openclaw.json`（每次改完都要 `openclaw daemon restart`）
- **Gateway 日志**：`~/.openclaw/logs/gateway-restart.log`、`~/.openclaw/logs/gateway.log`（后者大多为空）
- **Exec 工具在主会话不可用**——这一轮 system prompt 里没有 `exec` 工具，只能派子代理 / 让用户跑 shell 命令。

## Webhooks 插件（zhanglj 已落地）

- 插件：`webhooks`，allowlist + entries 都已配。
- Route：`smoke` 在 `/plugins/webhooks/smoke`，绑定 `sessionKey: agent:main:main`。
- Secret：**SecretRef 形态**，env var `OPENCLAW_WEBHOOK_SECRET`（`source: "env", provider: "default"`）。
- Secret 值落盘：`~/.openclaw/webhooks-smoke.secret`（用于 env `setenv` 和本地 curl 注入）。
- 配套烟测脚本：`~/openclaw/workspace/main/scripts/smoke-test-webhooks.sh`（20 用例，20/20 全过）。
- 完整冷热演示脚本：`/tmp/secretref-demo.sh`（**注意：v2 之后 PROBE 拆成 GATEWAY_URL + ROUTE_PATH，不要再塞整路径到 PROBE**）。

## 已知文档与实现差异

- **`resolve_flow` 字段名**：docs 没写，源码 `dist/extensions/webhooks/index.js:87` 要求字段叫 `token`，不是 `flowId`。所有写 `flowId` 的请求会被 schema 拒（`400 invalid_request: "token: Invalid input: expected string, received undefined"`）。
- **`flow_not_found` 行为**：docs 明确说 read actions 对不存在的 flow **返回 200 + body `flow: null`**（防 side-channel），不是 404。测试断言要校验 status 200 + body null。