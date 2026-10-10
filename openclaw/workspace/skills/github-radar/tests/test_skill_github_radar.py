from datetime import datetime, timezone
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "skills/github-radar-intelligence/scripts/github_radar.py"
SPEC = spec_from_file_location("skill_github_radar", SCRIPT)
MODULE = module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)

NOW = datetime(2026, 8, 5, tzinfo=timezone.utc)


def repo(name, stars, created="2025-08-05T00:00:00Z"):
    return {
        "full_name": name,
        "html_url": f"https://github.com/{name}",
        "description": "A useful project",
        "stars": stars,
        "forks": 1,
        "language": "Python",
        "topics": [],
        "created_at": created,
        "updated_at": "2026-08-01T00:00:00Z",
        "pushed_at": "2026-08-01T00:00:00Z",
        "archived": False,
        "license": "MIT",
        "matched_queries": ["agent framework"],
    }


def test_normalize_item_keeps_source_and_metadata():
    item = {
        "full_name": "owner/repo",
        "html_url": "https://github.com/owner/repo",
        "description": "demo",
        "stargazers_count": 42,
        "forks_count": 4,
        "language": "Python",
        "topics": ["agents"],
        "created_at": "2025-01-01T00:00:00Z",
        "license": {"spdx_id": "MIT"},
    }
    result = MODULE.normalize_item(item)
    assert result["html_url"] == "https://github.com/owner/repo"
    assert result["stars"] == 42
    assert result["license"] == "MIT"


def test_collect_repos_deduplicates_and_tracks_queries():
    class FakeClient:
        def search(self, query, min_stars, limit):
            return [repo("owner/repo", 100)]

    repos, errors = MODULE.collect_repos(FakeClient(), ["agent", "agent framework"], 20, 10)
    assert errors == []
    assert len(repos) == 1
    assert repos[0]["matched_queries"] == ["agent", "agent framework"]


def test_collect_repos_preserves_partial_success():
    class FakeClient:
        def search(self, query, min_stars, limit):
            if query == "bad":
                raise MODULE.GitHubAPIError("limited")
            return [repo("owner/good", 50)]

    repos, errors = MODULE.collect_repos(FakeClient(), ["bad", "good"], 20, 10)
    assert [item["full_name"] for item in repos] == ["owner/good"]
    assert errors == ["bad: limited"]


def test_rankings_use_estimate_then_snapshot_velocity():
    repos = [repo("owner/fast", 200), repo("owner/slow", 1000)]
    first = MODULE.build_rankings(repos, {"repos": {}}, 10, 20, NOW)
    assert first["first_run"] is True
    assert all(item["is_estimated"] for item in first["combined"])

    previous = {
        "repos": {
            "owner/fast": {"stars": 100, "seen": "2026-08-04T00:00:00+00:00"},
            "owner/slow": {"stars": 995, "seen": "2026-08-04T00:00:00+00:00"},
        }
    }
    later = MODULE.build_rankings(repos, previous, 10, 20, NOW)
    assert later["combined"][0]["full_name"] == "owner/fast"
    assert [item["full_name"] for item in later["burst"]] == ["owner/fast"]


def test_report_contains_source_links_and_estimate_disclosure():
    rankings = MODULE.build_rankings([repo("owner/repo", 100)], {"repos": {}}, 10, 20, NOW)
    report = MODULE.render_markdown(["agent framework"], 20, rankings, [], NOW)
    assert "[owner/repo](https://github.com/owner/repo)" in report
    assert "首跑估算" in report
    assert "带“约”的速度" in report


def test_validate_args_rejects_more_than_five_queries():
    args = MODULE.parse_args(sum((["-q", str(index)] for index in range(6)), []))
    try:
        MODULE.validate_args(args)
    except ValueError as exc:
        assert "最多 5 条" in str(exc)
    else:
        raise AssertionError("expected ValueError")
