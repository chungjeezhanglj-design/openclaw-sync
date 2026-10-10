#!/bin/bash
# 生成本地语音旁白（使用 macOS say 命令）
# 用法：generate-voiceover.sh "文本内容" <output.aiff> [voice]

set -e

TEXT="${1:-你好}"
OUTPUT="${2:-voiceover.aiff}"
VOICE="${3:-Tingting}"

echo "🗣️ 生成本地语音旁白"
echo "   文本：$TEXT"
echo "   输出：$OUTPUT"
echo "   语音：$VOICE"

# 检查 say 命令
if ! command -v say &> /dev/null; then
    echo "❌ 错误：macOS say 命令不可用"
    exit 1
fi

# 生成音频（AIFF 格式，无损）
say -v "$VOICE" -o "$OUTPUT" "$TEXT"

# 如果需要 MP3 格式，可以用 ffmpeg 转换
if [[ "$OUTPUT" == *.mp3 ]]; then
    TEMP_AIFF="${OUTPUT%.mp3}.aiff"
    mv "$OUTPUT" "$TEMP_AIFF" 2>/dev/null || true
    if command -v ffmpeg &> /dev/null; then
        ffmpeg -i "$TEMP_AIFF" -codec:a libmp3lame -qscale:a 2 "$OUTPUT" -y
        rm "$TEMP_AIFF"
        echo "✅ 已转换为 MP3 格式"
    else
        mv "$TEMP_AIFF" "$OUTPUT"
        echo "⚠️  ffmpeg 未安装，输出为 AIFF 格式"
        echo "提示：brew install ffmpeg"
    fi
fi

echo "✅ 语音生成完成：$OUTPUT"
echo ""
echo "可用语音列表:"
echo "  中文：Tingting, Eddy, Flo (zh_CN)"
echo "       Meijia, Sinji (zh_TW, zh_HK)"
echo "  英文：Samantha, Daniel, Moira"
echo ""
echo "试听：say -v Tingting \"你好\""
