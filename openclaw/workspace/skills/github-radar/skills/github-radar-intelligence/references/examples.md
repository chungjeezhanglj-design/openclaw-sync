# 使用示例

## 示例一：AI Agent 框架调研

用户请求：

> 帮我找近期值得关注的开源 AI Agent 框架，成熟项目和新兴项目都要。

建议命令：

```bash
python3 scripts/github_radar.py \
  -q "AI agent framework" \
  -q "agentic workflow" \
  -q "multi agent orchestration" \
  --min-stars 50 \
  --top 10 \
  -o ai-agent-radar.md
```

回答时先概括候选池规模，再分别指出综合榜、标杆榜和爆发榜中的代表项目，并保留报告中的 GitHub 链接。

## 示例二：限定语言的 RAG 评测工具

用户请求：

> 找 Python 生态里用于 RAG evaluation 的开源工具。

建议命令：

```bash
python3 scripts/github_radar.py \
  -q "RAG evaluation language:python archived:false" \
  -q "retrieval augmented generation benchmark language:python archived:false" \
  --min-stars 20 \
  --top 8
```

## 示例三：查询失败

如果报告包含查询警告，明确告诉用户哪些检索式失败。如果所有检索式都失败，不要凭记忆补出项目清单；先建议检查网络、GitHub API 状态或限流额度。
