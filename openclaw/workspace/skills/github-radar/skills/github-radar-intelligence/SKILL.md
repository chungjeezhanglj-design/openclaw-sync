---
name: github-radar-intelligence
description: 检索、去重并分析 GitHub 开源项目，生成带仓库来源链接的综合榜、标杆榜与爆发榜。用户提出“找 GitHub 项目”“技术选型”“开源项目调研”“发现热门或高增长仓库”“GitHub radar”等需求时使用；支持多查询融合、可选历史快照和无 Token 降级运行。
---

# GitHub Radar Intelligence

把一个技术主题拆成多条 GitHub 检索式，调用 GitHub 官方 API，合并重复仓库并生成可溯源的三榜技术雷达。

## 工作流

1. 从用户问题中提取一个明确主题。如果主题不明确，先询问用户。
2. 生成 2–5 条互补的英文 GitHub 检索词：
   - 一条描述核心技术；
   - 一条描述典型应用或同义词；
   - 必要时增加框架、工具链或垂直场景词。
3. 运行 `scripts/github_radar.py`。每条检索词分别通过 `--query` 传入。
4. 读取生成的 Markdown 报告，优先解释：
   - 综合榜：规模与增速的综合信号；
   - 标杆榜：候选池中存量最高的前 5%；
   - 爆发榜：近期增速高，或首跑时年龄均速高的项目。
5. 向用户给出结论时保留仓库链接，说明筛选条件，并区分“真实增速”与“首跑估算”。

## 快速运行

在本 Skill 目录下执行：

```bash
python3 scripts/github_radar.py \
  --query "AI agent framework" \
  --query "agentic workflow" \
  --min-stars 50 \
  --top 10 \
  --output github-radar-report.md
```

脚本仅使用 Python 标准库。未设置 `GITHUB_TOKEN` 时仍可运行，但 GitHub 匿名 Search API 的限额较低。若环境中已有 Token，脚本会自动读取：

```bash
export GITHUB_TOKEN="YOUR_GITHUB_TOKEN"
```

不要把真实 Token 写入 Skill 文件、命令记录或报告。

## 连续观测

首次运行没有历史数据，爆发速度使用“Stars ÷ 项目年龄”估算。需要真实增速时，保存本次快照并在下次复用：

```bash
python3 scripts/github_radar.py \
  --query "RAG evaluation" \
  --snapshot radar-snapshot.json \
  --save-snapshot radar-snapshot.json \
  --output radar-report.md
```

脚本会先读取 `--snapshot`；文件不存在时按首次运行处理。完成后再将新快照写入 `--save-snapshot`。

## 输出要求

- 默认把 Markdown 输出到标准输出；使用 `--output` 写入文件。
- 使用 `--json-output` 可同时保存机器可读结果。
- 报告中的仓库名必须保持为 GitHub 链接，不得删除来源。
- 把年龄均速标为“估算”，不要将它描述为真实近期涨幅。
- 如果部分查询失败，保留成功结果并在报告“查询警告”中披露。
- 如果全部查询都失败，停止并向用户说明 API、网络或限流错误，不得编造仓库。

## 参数选择

- `--min-stars 20`：探索新兴项目；`50–200`：常规技术选型；`1000` 以上：成熟生态。
- `--per-query`：每条检索式获取的仓库数，范围 1–100，默认 50。
- `--top`：每个榜单显示数量，默认 10。
- 查询词不要超过 5 条，避免匿名 Search API 很快触发限流。

需要解释评分、快照结构、检索策略或故障处理时，读取 `references/methodology.md`。需要快速验证触发和输出形式时，读取 `references/examples.md`。

## 已知限制

- 数据来自 GitHub 官方公开 API，不包含无法访问的私有仓库。
- GitHub Search 不是语义向量检索；多条互补查询用于降低关键词偏差。
- Stars 是关注度信号，不等同于代码质量、安全性或许可证适用性。
- 最终技术选型前，应继续核查许可证、维护状态、Issue 和安全公告。
