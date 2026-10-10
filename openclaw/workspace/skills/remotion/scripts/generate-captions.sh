#!/bin/bash
# 生成 TikTok 风格字幕
# 用法：generate-captions.sh <audio.mp3> <output.vtt>

set -e

AUDIO="${1:-input.mp3}"
OUTPUT="${2:-captions.vtt}"

echo "📝 生成字幕：$AUDIO → $OUTPUT"

# 检查 sag 是否可用
if ! command -v sag &> /dev/null; then
    echo "❌ 错误：sag 未安装"
    exit 1
fi

# 使用 OpenAI Whisper 转录（如果可用）
if command -v whisper &> /dev/null; then
    whisper "$AUDIO" --model base --output_format vtt --output_dir "$(dirname "$OUTPUT")"
    echo "✅ 字幕生成完成"
else
    echo "⚠️  Whisper 未安装，使用 tavily 搜索替代方案..."
    echo "提示：brew install openai-whisper"
fi
