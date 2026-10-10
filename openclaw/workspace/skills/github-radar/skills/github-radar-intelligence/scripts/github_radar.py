#!/usr/bin/env python3
"""Build a source-linked GitHub technology radar with no third-party packages."""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


API_URL = "https://api.github.com/search/repositories"
USER_AGENT = "github-radar-intelligence-skill/1.0"
LANDMARK_FRACTION = 0.05
MAX_QUERIES = 5


class GitHubAPIError(RuntimeError):
    """A GitHub request failed with a safe, user-facing message."""


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def minmax(values: list[float]) -> list[float]:
    if not values:
        return []
    low, high = min(values), max(values)
    if high == low:
        return [1.0 for _ in values]
    return [(value - low) / (high - low) for value in values]


def age_days(created_at: str | None, now: datetime) -> float:
    created = parse_iso(created_at)
    if created is None:
        return 1.0
    return max((now - created).total_seconds() / 86400.0, 1.0)


def load_snapshot(path: Path | None) -> dict[str, Any]:
    if path is None or not path.exists():
        return {"last_run": None, "repos": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"无法读取快照 {path}: {exc}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("repos", {}), dict):
        raise ValueError(f"快照格式无效: {path}")
    return data


def save_snapshot(path: Path, repos: list[dict[str, Any]], now: datetime) -> None:
    previous = load_snapshot(path)
    entries = dict(previous.get("repos") or {})
    seen = now.isoformat()
    for repo in repos:
        entries[repo["full_name"]] = {"stars": repo["stars"], "seen": seen}
    payload = {"last_run": seen, "repos": entries}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build_rankings(
    repos: list[dict[str, Any]],
    previous: dict[str, Any],
    top: int,
    burst_min_velocity: float,
    now: datetime,
) -> dict[str, Any]:
    previous_repos = previous.get("repos") or {}
    first_run = not previous_repos
    enriched: list[dict[str, Any]] = []

    for repo in repos:
        item = dict(repo)
        old = previous_repos.get(repo["full_name"])
        if isinstance(old, dict) and isinstance(old.get("stars"), (int, float)):
            prior_stars = int(old["stars"])
            prior_seen = parse_iso(old.get("seen"))
            elapsed = max((now - prior_seen).total_seconds() / 86400.0, 1.0) if prior_seen else 1.0
            item["delta"] = max(item["stars"] - prior_stars, 0)
            item["velocity_per_day"] = item["delta"] / elapsed
            item["is_estimated"] = False
        else:
            item["delta"] = None
            item["velocity_per_day"] = item["stars"] / age_days(item.get("created_at"), now)
            item["is_estimated"] = True
        enriched.append(item)

    stock_scores = minmax([math.log(item["stars"] + 1) for item in enriched])
    velocity_scores = minmax([item["velocity_per_day"] for item in enriched])
    for item, stock, velocity in zip(enriched, stock_scores, velocity_scores):
        item["stock_score"] = stock
        item["velocity_score"] = velocity
        item["combined_score"] = 0.4 * stock + 0.6 * velocity

    combined = sorted(enriched, key=lambda item: item["combined_score"], reverse=True)[:top]
    by_stars = sorted(enriched, key=lambda item: item["stars"], reverse=True)
    cutoff = max(1, math.ceil(len(by_stars) * LANDMARK_FRACTION)) if by_stars else 0
    landmark = by_stars[:cutoff][:top]
    burst = sorted(
        [
            item
            for item in enriched
            if item["is_estimated"] or item["velocity_per_day"] >= burst_min_velocity
        ],
        key=lambda item: item["velocity_per_day"],
        reverse=True,
    )[:top]
    return {
        "first_run": first_run,
        "pool_size": len(enriched),
        "combined": combined,
        "landmark": landmark,
        "burst": burst,
    }


def retry_delay(headers: Any, attempt: int) -> float:
    retry_after = headers.get("Retry-After")
    if retry_after:
        try:
            return min(max(float(retry_after), 0.0), 20.0)
        except ValueError:
            try:
                target = parsedate_to_datetime(retry_after)
                return min(max((target - datetime.now(timezone.utc)).total_seconds(), 0.0), 20.0)
            except (TypeError, ValueError, OverflowError):
                pass
    reset = headers.get("X-RateLimit-Reset")
    if headers.get("X-RateLimit-Remaining") == "0" and reset:
        try:
            return min(max(float(reset) - time.time(), 1.0), 20.0)
        except ValueError:
            pass
    return min(2.0**attempt, 8.0)


class GitHubClient:
    def __init__(self, token: str | None, timeout: float = 20.0) -> None:
        self.token = token
        self.timeout = timeout

    def _request_json(self, params: dict[str, Any]) -> dict[str, Any]:
        url = f"{API_URL}?{urlencode(params)}"
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": USER_AGENT,
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        for attempt in range(2):
            try:
                with urlopen(Request(url, headers=headers), timeout=self.timeout) as response:
                    payload = json.load(response)
                if not isinstance(payload, dict):
                    raise GitHubAPIError("GitHub API 返回了无法识别的数据")
                return payload
            except HTTPError as exc:
                if attempt == 0 and (exc.code in (403, 429) or 500 <= exc.code < 600):
                    time.sleep(retry_delay(exc.headers, attempt))
                    continue
                remaining = exc.headers.get("X-RateLimit-Remaining")
                hint = "；API 限额已用尽，请稍后重试或设置 GITHUB_TOKEN" if remaining == "0" else ""
                raise GitHubAPIError(f"GitHub API HTTP {exc.code}{hint}") from exc
            except (URLError, TimeoutError, OSError) as exc:
                if attempt == 0:
                    time.sleep(retry_delay({}, attempt))
                    continue
                reason = getattr(exc, "reason", exc)
                raise GitHubAPIError(f"无法连接 GitHub API: {reason}") from exc
        raise GitHubAPIError("GitHub API 请求失败")

    def search(self, query: str, min_stars: int, limit: int) -> list[dict[str, Any]]:
        qualified = f"{query} stars:>={min_stars}"
        items: list[dict[str, Any]] = []
        page = 1
        while len(items) < limit:
            per_page = min(100, limit - len(items))
            payload = self._request_json(
                {
                    "q": qualified,
                    "sort": "stars",
                    "order": "desc",
                    "per_page": per_page,
                    "page": page,
                }
            )
            page_items = payload.get("items") or []
            if not isinstance(page_items, list):
                raise GitHubAPIError("GitHub API 的 items 字段格式无效")
            items.extend(item for item in page_items if isinstance(item, dict))
            if len(page_items) < per_page:
                break
            page += 1
        return [normalize_item(item) for item in items[:limit]]


def normalize_item(item: dict[str, Any]) -> dict[str, Any]:
    try:
        full_name = str(item["full_name"])
        html_url = str(item["html_url"])
    except KeyError as exc:
        raise GitHubAPIError(f"GitHub 仓库数据缺少字段: {exc.args[0]}") from exc
    return {
        "full_name": full_name,
        "html_url": html_url,
        "description": str(item.get("description") or ""),
        "stars": int(item.get("stargazers_count") or 0),
        "forks": int(item.get("forks_count") or 0),
        "language": item.get("language"),
        "topics": item.get("topics") if isinstance(item.get("topics"), list) else [],
        "created_at": item.get("created_at"),
        "updated_at": item.get("updated_at"),
        "pushed_at": item.get("pushed_at"),
        "archived": bool(item.get("archived", False)),
        "license": (item.get("license") or {}).get("spdx_id")
        if isinstance(item.get("license"), dict)
        else None,
    }


def collect_repos(
    client: GitHubClient,
    queries: list[str],
    min_stars: int,
    per_query: int,
) -> tuple[list[dict[str, Any]], list[str]]:
    seen: dict[str, dict[str, Any]] = {}
    errors: list[str] = []
    for query in queries:
        try:
            repos = client.search(query, min_stars, per_query)
        except GitHubAPIError as exc:
            errors.append(f"{query}: {exc}")
            continue
        for repo in repos:
            name = repo["full_name"]
            if name not in seen:
                repo["matched_queries"] = [query]
                seen[name] = repo
            else:
                seen[name]["matched_queries"].append(query)
    return list(seen.values()), errors


def clean_cell(value: Any, limit: int = 120) -> str:
    text = " ".join(str(value or "").split()).replace("|", "\\|")
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def velocity_text(item: dict[str, Any]) -> str:
    prefix = "约 " if item["is_estimated"] else ""
    return f"{prefix}{item['velocity_per_day']:.1f}/天"


def render_table(items: list[dict[str, Any]], score_key: str | None = None) -> str:
    if not items:
        return "暂无符合条件的仓库。\n"
    lines = [
        "| # | 仓库 | Stars | 速度 | 语言 | 命中 | 说明 |",
        "|---:|---|---:|---:|---|---:|---|",
    ]
    for index, item in enumerate(items, 1):
        name = clean_cell(item["full_name"], 80)
        link = f"[{name}]({item['html_url']})"
        matches = len(item.get("matched_queries") or [])
        description = clean_cell(item.get("description") or "无描述")
        language = clean_cell(item.get("language") or "—", 30)
        if score_key:
            description = f"综合分 {item[score_key]:.3f}；{description}"
        lines.append(
            f"| {index} | {link} | {item['stars']:,} | {velocity_text(item)} | "
            f"{language} | {matches} | {description} |"
        )
    return "\n".join(lines) + "\n"


def render_markdown(
    queries: list[str],
    min_stars: int,
    rankings: dict[str, Any],
    errors: list[str],
    now: datetime,
) -> str:
    query_text = "、".join(f"`{clean_cell(query, 100)}`" for query in queries)
    mode = "首跑估算" if rankings["first_run"] else "历史快照真实增速（新仓库仍为估算）"
    lines = [
        "# GitHub 技术雷达",
        "",
        f"- 生成时间：{now.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        f"- 查询：{query_text}",
        f"- Stars 下限：{min_stars}",
        f"- 去重后候选池：{rankings['pool_size']} 个仓库",
        f"- 速度口径：{mode}",
        "",
        "## 综合榜",
        "",
        "存量分 40% + 速度分 60%，用于同时发现成熟项目和增长项目。",
        "",
        render_table(rankings["combined"], "combined_score").rstrip(),
        "",
        "## 标杆榜",
        "",
        "候选池中 Stars 存量最高的前 5%。",
        "",
        render_table(rankings["landmark"]).rstrip(),
        "",
        "## 爆发榜",
        "",
        "按 Stars 日增速排序；带“约”的速度为首次观察时的年龄均速估算。",
        "",
        render_table(rankings["burst"]).rstrip(),
    ]
    if errors:
        lines.extend(["", "## 查询警告", ""])
        lines.extend(f"- {clean_cell(error, 240)}" for error in errors)
    lines.extend(
        [
            "",
            "## 解读提示",
            "",
            "- 仓库名称均链接到 GitHub 原始页面，可用于核验来源。",
            "- Stars 与增速是发现候选的信号，不等同于代码质量或安全结论。",
            "- 采用前请继续检查许可证、最近提交、Issue 响应和安全公告。",
            "",
        ]
    )
    return "\n".join(lines)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="生成可溯源的 GitHub 三榜技术雷达")
    parser.add_argument("-q", "--query", action="append", required=True, help="GitHub 检索式，可重复 2–5 次")
    parser.add_argument("--min-stars", type=int, default=20, help="最低 Stars，默认 20")
    parser.add_argument("--per-query", type=int, default=50, help="每条查询最多获取数量，默认 50，最大 100")
    parser.add_argument("--top", type=int, default=10, help="每个榜单展示数量，默认 10")
    parser.add_argument("--burst-min-velocity", type=float, default=20.0, help="真实爆发速度门槛，默认 20 Stars/天")
    parser.add_argument("--snapshot", type=Path, help="读取历史快照 JSON；文件不存在时按首跑处理")
    parser.add_argument("--save-snapshot", type=Path, help="保存本次快照 JSON")
    parser.add_argument("-o", "--output", type=Path, help="Markdown 输出路径；不填则输出到终端")
    parser.add_argument("--json-output", type=Path, help="可选的机器可读 JSON 输出路径")
    parser.add_argument("--timeout", type=float, default=20.0, help="单次 HTTP 超时秒数，默认 20")
    return parser.parse_args(argv)


def validate_args(args: argparse.Namespace) -> list[str]:
    queries = list(dict.fromkeys(query.strip() for query in args.query if query.strip()))
    if not queries:
        raise ValueError("至少需要一条非空查询")
    if len(queries) > MAX_QUERIES:
        raise ValueError(f"查询最多 {MAX_QUERIES} 条，以控制 GitHub Search API 限流")
    if any(len(query) > 256 for query in queries):
        raise ValueError("单条查询不能超过 256 个字符")
    if args.min_stars < 0:
        raise ValueError("--min-stars 不能小于 0")
    if not 1 <= args.per_query <= 100:
        raise ValueError("--per-query 必须在 1–100 之间")
    if not 1 <= args.top <= 100:
        raise ValueError("--top 必须在 1–100 之间")
    if args.burst_min_velocity < 0:
        raise ValueError("--burst-min-velocity 不能小于 0")
    if not 1 <= args.timeout <= 120:
        raise ValueError("--timeout 必须在 1–120 秒之间")
    return queries


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    try:
        args = parse_args(argv)
        queries = validate_args(args)
        previous = load_snapshot(args.snapshot)
        client = GitHubClient(os.environ.get("GITHUB_TOKEN"), timeout=args.timeout)
        repos, errors = collect_repos(client, queries, args.min_stars, args.per_query)
        if not repos:
            detail = "; ".join(errors) if errors else "没有找到符合条件的仓库"
            raise GitHubAPIError(detail)
        now = datetime.now(timezone.utc)
        rankings = build_rankings(repos, previous, args.top, args.burst_min_velocity, now)
        report = render_markdown(queries, args.min_stars, rankings, errors, now)
        if args.output:
            write_text(args.output, report)
            print(f"报告已生成: {args.output}")
        else:
            print(report, end="")
        if args.json_output:
            payload = {
                "generated_at": now.isoformat(),
                "queries": queries,
                "min_stars": args.min_stars,
                "errors": errors,
                "rankings": rankings,
            }
            write_text(args.json_output, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
        if args.save_snapshot:
            save_snapshot(args.save_snapshot, repos, now)
        return 0
    except (GitHubAPIError, ValueError, OSError) as exc:
        print(f"错误: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
