# Synology Chat Mirror — Current Session Only

**Status:** ACTIVE
**Channel:** `synology-chat`
**Target:** `4`
**Strategy:** 双发 (dual-send)

## 规则

- 本 session 内**每一条**给用户的回复，必须**先**用 `message` 工具显式发到 `synology-chat:4`
- 然后**再**在当前 session 打字
- 两份内容**完全一致**
- message 工具返回的 `messageId` 在 session 内的回复中**附带标注**

## 适用

- ✅ 最终结论
- ✅ 中间过程回复（"稍等" / "我去查"）
- ✅ 任何包含代码 / 长文本的回复
- ✅ 任何包含 `MEDIA:` 附件的回复

## 不适用

- ❌ tool 调用的中间产物（不直接呈现给用户的）
- ❌ 系统事件触发的自动化输出
- ❌ 子 agent 的回执

## 失效条件

- Session 结束 / 重启
- 用户明确说"停止"
- 改用其他 channel（用户改主意）

## 历史原因

- 2026-06-11 4:26 的大回复用户没收到（投递失败/没回执）
- 用户决定：以后所有回复**双发**确保可见
- 该决策**仅本 session**，不继承到新 session
