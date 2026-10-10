#!/usr/bin/env bash
# smoke-test-webhooks.sh — OpenClaw Webhooks 插件端到端烟测
#
# 覆盖范围 (20 用例):
#   连接层  : 1) 401 无 secret  2) 401 错 Bearer  3) 401 错 x-openclaw-webhook-secret header
#             4) 405 GET  5) 415 text/plain
#   读路径  : 6) create_flow  7) list_flows  8) get_flow  9) find_latest_flow
#             10) resolve_flow (token 字段)  11) get_task_summary
#   写路径  : 12) set_waiting  13) resume_flow  14) run_task (在 finish 之前)  15) finish_flow
#   失败路径: 16) 409 stale revision  17) 200+null flow 不存在 (per docs)
#             18) 400 未知字段  19) 400 错枚举  20) 400 startedAt+queued
#
# 用法:
#   ./scripts/smoke-test-webhooks.sh [gateway] [route_id] [secret]
# 默认:
#   gateway   = http://127.0.0.1:18789
#   route_id  = smoke
#   secret    = $OPENCLAW_WEBHOOK_SECRET
set -uo pipefail

GATEWAY="${1:-http://127.0.0.1:18789}"
ROUTE_ID="${2:-smoke}"
SECRET="${3:-${OPENCLAW_WEBHOOK_SECRET:-}}"
PATH_URL="/plugins/webhooks/${ROUTE_ID}"

if [[ -z "$SECRET" ]]; then
  echo "❌ secret 不能为空。请用: $0 <gateway> <route_id> <secret>" >&2
  echo "   或先 export OPENCLAW_WEBHOOK_SECRET=<secret>" >&2
  exit 2
fi

PASS=0; FAIL=0; TOTAL=0
declare -a RESULTS

if [[ -t 1 ]]; then
  C_OK=$'\033[32m'; C_BAD=$'\033[31m'; C_DIM=$'\033[2m'; C_RST=$'\033[0m'
else
  C_OK=""; C_BAD=""; C_DIM=""; C_RST=""
fi

# 校验 HTTP status
run_case() {
  local name="$1" want_code="$2" body="${3:--}" method="${4:-POST}" path_override="${5:-}"
  local url="${GATEWAY}${path_override:-$PATH_URL}"
  TOTAL=$((TOTAL+1))
  local resp_code resp_body
  if [[ "$body" == "-" ]]; then
    resp_code=$(curl -sk -o /tmp/.wh.body -w "%{http_code}" --max-time 15 \
      -X "$method" -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${SECRET}" \
      "$url" 2>/dev/null) || resp_code="000"
  else
    resp_code=$(curl -sk -o /tmp/.wh.body -w "%{http_code}" --max-time 15 \
      -X "$method" -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${SECRET}" \
      --data "$body" \
      "$url" 2>/dev/null) || resp_code="000"
  fi
  resp_body=$(cat /tmp/.wh.body 2>/dev/null || echo "")
  if [[ "$resp_code" == "$want_code" ]]; then
    PASS=$((PASS+1))
    RESULTS+=("ok  $name  → $resp_code")
    printf "  %s✓%s #%-2d %-45s %s\n" "$C_OK" "$C_RST" "$TOTAL" "$name" "$resp_code"
  else
    FAIL=$((FAIL+1))
    RESULTS+=("bad $name  → got $resp_code want $want_code  body: ${resp_body:0:120}")
    printf "  %s✗%s #%-2d %-45s %s (want %s)\n" "$C_BAD" "$C_RST" "$TOTAL" "$name" "$resp_code" "$want_code"
    printf "    %s%s%s\n" "$C_DIM" "${resp_body:0:200}" "$C_RST"
  fi
}

# 校验 HTTP status + JSON 路径值
run_case_body() {
  local name="$1" want_code="$2" jq_path="$3" want_value="$4" body="$5" method="${6:-POST}" path_override="${7:-}"
  local url="${GATEWAY}${path_override:-$PATH_URL}"
  TOTAL=$((TOTAL+1))
  local resp_code resp_body got
  resp_code=$(curl -sk -o /tmp/.wh.body -w "%{http_code}" --max-time 15 \
    -X "$method" -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SECRET}" \
    --data "$body" \
    "$url" 2>/dev/null) || resp_code="000"
  resp_body=$(cat /tmp/.wh.body 2>/dev/null || echo "")
  got=$(printf '%s' "$resp_body" | jq -r "$jq_path" 2>/dev/null)
  if [[ "$resp_code" == "$want_code" && "$got" == "$want_value" ]]; then
    PASS=$((PASS+1))
    RESULTS+=("ok  $name  → $resp_code  $jq_path=$got")
    printf "  %s✓%s #%-2d %-45s %s (body %s=%s)\n" "$C_OK" "$C_RST" "$TOTAL" "$name" "$resp_code" "$jq_path" "$got"
  else
    FAIL=$((FAIL+1))
    RESULTS+=("bad $name  → got $resp_code want $want_code; $jq_path=$got want $want_value")
    printf "  %s✗%s #%-2d %-45s %s want %s (body %s=%s want %s)\n" "$C_BAD" "$C_RST" "$TOTAL" "$name" "$resp_code" "$want_code" "$jq_path" "$got" "$want_value"
    printf "    %s%s%s\n" "$C_DIM" "${resp_body:0:200}" "$C_RST"
  fi
}

json_get() {
  printf '%s' "$1" | jq -r "$2" 2>/dev/null
}

echo "→ ${GATEWAY}${PATH_URL}"
echo

# ============================================================
# 1) 连接 / 认证 / 协议层 (5)
# ============================================================
# 1) 401 — 完全不带 auth header
TOTAL=$((TOTAL+1)); RESP=$(curl -sk -o /tmp/.wh.body -w "%{http_code}" --max-time 15 \
  -X POST -H "Content-Type: application/json" \
  --data '{"action":"list_flows"}' \
  "${GATEWAY}${PATH_URL}" 2>/dev/null) || RESP="000"
[[ "$RESP" == "401" ]] && { PASS=$((PASS+1)); RESULTS+=("ok  auth_missing → 401"); printf "  %s✓%s #%-2d %-45s %s\n" "$C_OK" "$C_RST" "$TOTAL" "auth_missing (no header)" "$RESP"; } \
  || { FAIL=$((FAIL+1)); printf "  %s✗%s #%-2d %-45s %s (want 401)\n" "$C_BAD" "$C_RST" "$TOTAL" "auth_missing (no header)" "$RESP"; }

# 2) 401 — 错 Bearer (用显式 curl 不用 run_case)
TOTAL=$((TOTAL+1)); RESP=$(curl -sk -o /tmp/.wh.body -w "%{http_code}" --max-time 15 \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer WRONG" \
  --data '{"action":"list_flows"}' \
  "${GATEWAY}${PATH_URL}" 2>/dev/null) || RESP="000"
[[ "$RESP" == "401" ]] && { PASS=$((PASS+1)); RESULTS+=("ok  auth_wrong_bearer → 401"); printf "  %s✓%s #%-2d %-45s %s\n" "$C_OK" "$C_RST" "$TOTAL" "auth_wrong_bearer" "$RESP"; } \
  || { FAIL=$((FAIL+1)); printf "  %s✗%s #%-2d %-45s %s (want 401)\n" "$C_BAD" "$C_RST" "$TOTAL" "auth_wrong_bearer" "$RESP"; }

# 3) 401 — 错 x-openclaw-webhook-secret
TOTAL=$((TOTAL+1)); RESP=$(curl -sk -o /tmp/.wh.body -w "%{http_code}" --max-time 15 \
  -X POST -H "Content-Type: application/json" \
  -H "x-openclaw-webhook-secret: WRONG" \
  --data '{"action":"list_flows"}' \
  "${GATEWAY}${PATH_URL}" 2>/dev/null) || RESP="000"
[[ "$RESP" == "401" ]] && { PASS=$((PASS+1)); RESULTS+=("ok  auth_wrong_header → 401"); printf "  %s✓%s #%-2d %-45s %s\n" "$C_OK" "$C_RST" "$TOTAL" "auth_wrong_header (x-openclaw-...)" "$RESP"; } \
  || { FAIL=$((FAIL+1)); printf "  %s✗%s #%-2d %-45s %s (want 401)\n" "$C_BAD" "$C_RST" "$TOTAL" "auth_wrong_header (x-openclaw-...)" "$RESP"; }

# 4) 405 — GET not allowed
run_case "method_not_allowed (GET)"        405 "-" GET

# 5) 415 — text/plain not allowed (显式 curl,因为 run_case 强制 application/json)
TOTAL=$((TOTAL+1)); RESP=$(curl -sk -o /tmp/.wh.body -w "%{http_code}" --max-time 15 \
  -X POST -H "Content-Type: text/plain" \
  -H "Authorization: Bearer ${SECRET}" \
  --data 'plain body not json' \
  "${GATEWAY}${PATH_URL}" 2>/dev/null) || RESP="000"
[[ "$RESP" == "415" ]] && { PASS=$((PASS+1)); RESULTS+=("ok  content_type_text_plain → 415"); printf "  %s✓%s #%-2d %-45s %s\n" "$C_OK" "$C_RST" "$TOTAL" "content_type_text_plain" "$RESP"; } \
  || { FAIL=$((FAIL+1)); printf "  %s✗%s #%-2d %-45s %s (want 415)\n" "$C_BAD" "$C_RST" "$TOTAL" "content_type_text_plain" "$RESP"; }

# ============================================================
# 2) 读路径 — create_flow (inline 拿 flow_id)
# ============================================================
CREATE_RESP=$(curl -sk --max-time 15 \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SECRET}" \
  --data '{"action":"create_flow","goal":"smoke-test: NAS roundtrip","notifyPolicy":"silent","controllerId":"smoke/tester"}' \
  "${GATEWAY}${PATH_URL}")
FLOW_ID=$(json_get "$CREATE_RESP" '.result.flow.flowId')
FLOW_REV=$(json_get "$CREATE_RESP" '.result.flow.revision')

# 6) create_flow — 计为用例
TOTAL=$((TOTAL+1))
if [[ -n "$FLOW_ID" ]]; then
  PASS=$((PASS+1)); RESULTS+=("ok  create_flow → 200  flow_id=$FLOW_ID")
  printf "  %s✓%s #%-2d %-45s %s (flow_id=%s)\n" "$C_OK" "$C_RST" "$TOTAL" "create_flow" "200" "$FLOW_ID"
else
  FAIL=$((FAIL+1))
  echo "  ❌ create_flow 没拿到 flowId"
  echo "  body: $CREATE_RESP"
  exit 3
fi
echo

# 7-11) 读路径
run_case "list_flows"                       200 '{"action":"list_flows"}'
run_case "get_flow (by id)"                 200 "{\"action\":\"get_flow\",\"flowId\":\"${FLOW_ID}\"}"
run_case "find_latest_flow"                 200 '{"action":"find_latest_flow"}'
# resolve_flow 字段名是 "token", 不是 "flowId" (per dist/extensions/webhooks/index.js:87)
run_case "resolve_flow (by token)"          200 "{\"action\":\"resolve_flow\",\"token\":\"${FLOW_ID}\"}"
run_case "get_task_summary (empty)"         200 "{\"action\":\"get_task_summary\",\"flowId\":\"${FLOW_ID}\"}"

# ============================================================
# 3) 写路径 (乐观并发) — run_task 必须在 finish 之前
# ============================================================
# 12) set_waiting
run_case "set_waiting rev=0"                200 "{\"action\":\"set_waiting\",\"flowId\":\"${FLOW_ID}\",\"expectedRevision\":${FLOW_REV},\"currentStep\":\"awaiting-approval\"}"

# 13) resume_flow
run_case "resume_flow rev=1"                200 "{\"action\":\"resume_flow\",\"flowId\":\"${FLOW_ID}\",\"expectedRevision\":1,\"currentStep\":\"resumed\"}"

# 14) run_task — 在 flow 还是 running 时挂上 (必须在 finish 之前)
run_case "run_task (unbacked, subagent)"    200 "{\"action\":\"run_task\",\"flowId\":\"${FLOW_ID}\",\"runtime\":\"subagent\",\"task\":\"smoke subtask\"}"

# 15) finish_flow — 在 run_task 之后
run_case "finish_flow rev=2"                200 "{\"action\":\"finish_flow\",\"flowId\":\"${FLOW_ID}\",\"expectedRevision\":2,\"stateJson\":{\"note\":\"smoke ok\"}}"

# ============================================================
# 4) 失败路径
# ============================================================
# 16) 409 — 旧 revision 撞新 revision
run_case "stale_revision_conflict"          409 "{\"action\":\"set_waiting\",\"flowId\":\"${FLOW_ID}\",\"expectedRevision\":0,\"currentStep\":\"will-conflict\"}"

# 17) 200 + body null — per docs (anti side-channel,不是 404)
run_case_body "flow_absent_returns_null"   200 '.result.flow' 'null' "{\"action\":\"get_flow\",\"flowId\":\"flow_does_not_exist_smoke_xyz\"}"

# 18) 400 — 未知字段
run_case "invalid_request_unknown_field"    400 '{"action":"list_flows","sneakyField":1}'

# 19) 400 — 错枚举
run_case "invalid_request_bad_status"       400 '{"action":"create_flow","goal":"x","status":"banana"}'

# 20) 400 — startedAt 与 queued 冲突
run_case "invalid_request_startedAt_queued" 400 "{\"action\":\"run_task\",\"flowId\":\"${FLOW_ID}\",\"runtime\":\"subagent\",\"task\":\"x\",\"status\":\"queued\",\"startedAt\":1234567890}"

# ============================================================
# 汇总
# ============================================================
echo
echo "──────────────────────────────────────────────"
printf "Total: %d   %sPass: %d%s   %sFail: %d%s\n" \
  "$TOTAL" "$C_OK" "$PASS" "$C_RST" "$C_BAD" "$FAIL" "$C_RST"
echo "──────────────────────────────────────────────"

if [[ $FAIL -gt 0 ]]; then
  echo
  echo "失败用例:"
  printf '  - %s\n' "${RESULTS[@]}" | grep -E '^bad ' || true
fi

exit $FAIL
