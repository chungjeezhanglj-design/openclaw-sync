---
name: baidu-search
description: 百度搜索技能 - 使用百度 AI 搜索引擎搜索中文网页、资讯、视频等内容
metadata:
  emoji: 🔍
  requires:
    bins: ["curl"]
  credentials:
    - name: BAIDU_API_KEY
      description: 百度千帆 API 密钥
---

# Baidu Search Skill

使用百度 AI 搜索引擎进行搜索。

## 使用方法

```bash
# 基本搜索
"用百度搜索 AI 新闻"
"百度搜索 OpenClaw 教程"

# 带参数搜索
"百度搜索 量子计算 site:zhihu.com"
"百度搜索 最新科技新闻 recency:week"
```

## 配置

在 `~/.openclaw/openclaw.json` 中添加：

```json
{
  "credentials": {
    "BAIDU_API_KEY": "bce-v3/YOUR_API_KEY"
  }
}
```

## 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 是 | 搜索关键词 |
| count | number | 否 | 结果数量 (默认 10) |
| recency | string | 否 | 时间过滤：week/month/year |

## 示例

```
query: "人工智能最新进展", count: 5
query: "OpenClaw 教程", recency: "month"
```
