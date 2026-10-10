#!/bin/bash
# 创建新的 Remotion 项目
# 用法：create-remotion-project.sh <project-name>

set -e

PROJECT_NAME="${1:-my-remotion-video}"

echo "🎬 创建 Remotion 项目：$PROJECT_NAME"

# 使用 create-video 初始化
npx create-video@latest "$PROJECT_NAME" --empty

cd "$PROJECT_NAME"

# 安装额外依赖（可选）
echo "📦 安装额外依赖..."
npm install @remotion/transitions @remotion/captions @remotion/three

echo "✅ 项目创建完成！"
echo ""
echo "下一步："
echo "  cd $PROJECT_NAME"
echo "  npm run dev    # 启动预览"
echo "  npm run build  # 渲染视频"
