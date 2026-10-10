#!/bin/bash
# Baidu Search Script

API_KEY="${BAIDU_API_KEY:-}"
QUERY="$1"
COUNT="${2:-10}"

if [ -z "$QUERY" ]; then
  echo "Usage: $0 <query> [count]"
  exit 1
fi

if [ -z "$API_KEY" ]; then
  echo "Error: BAIDU_API_KEY not set"
  exit 1
fi

# 百度 AI 搜索 API 端点
curl -s -X POST "https://qianfan.baidubce.com/rpc/2.0/ai_custom/v1/baidu_search" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"query\": \"$QUERY\",
    \"count\": $COUNT
  }" | jq '.'
