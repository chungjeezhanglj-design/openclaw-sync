---
name: remotion
description: 使用 Remotion + React 创建视频，整合本地语音合成 (macOS say)、素材搜索、字幕生成、视频渲染等完整工作流。用于：(1) 创建编程视频 (2) 生成 TikTok 短视频 (3) 制作营销视频 (4) 数据可视化视频 (5) 自动化视频生产
metadata:
  {
    "openclaw":
      {
        "emoji": "🎬",
        "requires": { "bins": ["npx", "say", "ffmpeg"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "remotion",
              "bins": ["remotion"],
              "label": "Install Remotion CLI",
            },
            {
              "id": "brew",
              "kind": "brew",
              "formula": "ffmpeg",
              "bins": ["ffmpeg"],
              "label": "Install ffmpeg (optional, for MP3 conversion)",
            },
          ],
      },
  }
---

# Remotion 视频制作技能

用 Remotion + React 编程方式创建视频，整合语音合成、素材搜索、字幕生成等能力。

## 快速开始

### 创建新项目

```bash
# 初始化 Remotion 项目
{baseDir}/skills/remotion/scripts/create-project.sh my-video
```

### 渲染视频

```bash
# 渲染合成
{baseDir}/skills/remotion/scripts/render-video.sh MyComposition out/video.mp4
```

### 生成语音旁白

```bash
# 使用本地 TTS (macOS say)
{baseDir}/skills/remotion/scripts/generate-voiceover.sh "你好，这是一个演示" voiceover.aiff

# 指定中文语音
{baseDir}/skills/remotion/scripts/generate-voiceover.sh "你好" voiceover.aiff Tingting

# 输出 MP3 格式（需要 ffmpeg）
{baseDir}/skills/remotion/scripts/generate-voiceover.sh "你好" voiceover.mp3 Eddy
```

## 核心能力

| 功能 | 脚本/工具 | 说明 |
|------|----------|------|
| 🎬 视频渲染 | `render-video.sh` | 渲染 Remotion 合成 |
| 📦 项目创建 | `create-project.sh` | 初始化新项目 |
| 🗣️ 语音合成 | `generate-voiceover.sh` | ElevenLabs TTS (via sag) |
| 📝 字幕生成 | `generate-captions.sh` | Whisper 转录 |
| 📸 素材搜索 | `find-footage.sh` | Pexels 素材查找 |

## 完整工作流

### 1. 创建项目

```bash
cd /Users/zhanglj/openclaw/workspace
./skills/remotion/scripts/create-project.sh coffee-promo
cd coffee-promo
```

### 2. 生成资产

```bash
# 生成旁白
../skills/remotion/scripts/generate-voiceover.sh "欢迎来到我们的咖啡店" assets/voiceover.mp3

# 搜索素材
../skills/remotion/scripts/find-footage.sh "coffee shop" assets/footage
```

### 3. 编写合成

在 `src/MyComposition.tsx` 中：

```tsx
import { AbsoluteFill, Sequence, Audio, Img } from 'remotion';

export const MyComposition = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={150}>
        <Img src="./assets/coffee.jpg" />
        <Audio src="./assets/voiceover.mp3" />
      </Sequence>
    </AbsoluteFill>
  );
};
```

### 4. 预览

```bash
npm run dev
```

### 5. 渲染

```bash
npm run build
# 或
../skills/remotion/scripts/render-video.sh MyComposition out/final.mp4
```

## API 参考

### 环境变量

| 变量 | 用途 | 必需 |
|------|------|------|
| `PEXELS_API_KEY` | 素材搜索 | 可选 |
| `REPLICATE_API_TOKEN` | AI 生成 | 可选 |

**语音合成**：使用 macOS 本地 `say` 命令，无需 API Key ✅

### Remotion 核心组件

```tsx
import {
  AbsoluteFill,      // 全屏容器
  Sequence,          // 时间序列
  Audio,             // 音频
  Img,               // 图片
  Video,             // 视频
  useCurrentFrame,   // 当前帧
  interpolate,       // 插值动画
} from 'remotion';
```

## 高级功能

### TikTok 风格短视频

```bash
# 创建 9:16 竖屏视频
./skills/remotion/scripts/create-project.sh tiktok-short
# 修改 remotion.config.ts 设置宽高比
```

### 添加转场

```tsx
import { Fade } from '@remotion/transitions';

<Fade duration={30}>
  <YourComponent />
</Fade>
```

### 自动生成字幕

```bash
# 转录音频
./skills/remotion/scripts/generate-captions.sh voiceover.mp3 captions.vtt
```

## 提示与技巧

### 性能优化

- 使用 `remotion studio` 实时预览
- 大项目用 `--concurrency` 并行渲染
- 素材预加载到 `public/` 目录

### 语音合成技巧

```bash
# 使用特定声音（中文）
say -v Tingting -o output.aiff "你好欢迎"

# 使用特定声音（英文）
say -v Samantha -o output.aiff "Hello welcome"

# 试听语音
say -v Tingting "你好"

# 查看可用语音
say -v '?'

# 输出 MP3 格式（需要 ffmpeg）
./scripts/generate-voiceover.sh "你好" output.mp3 Eddy
```

**注意**：本地 `say` 命令不支持情感标签，但可以通过语速、停顿控制节奏。

### 素材搜索技巧

- Pexels 免费高质量素材
- 用 tavily 搜索特定网站
- 本地素材放 `public/` 目录

## 故障排除

### 渲染失败

```bash
# 检查依赖
npm install

# 清除缓存
rm -rf node_modules/.cache
```

### 音频不同步

- 检查采样率（44.1kHz 标准）
- 用 `Audio` 组件而非 `<audio>` 标签
- 预览时开启音频同步检查
- 本地 TTS 生成的 AIFF 格式最稳定

### 本地 TTS 限制

- **无情感控制**：不支持 `[whispers]` 等情感标签
- **语音选择有限**：依赖 macOS 系统语音
- **音质**：AIFF 无损格式，文件较大（可用 ffmpeg 转 MP3）

### 内存不足

```bash
# 降低渲染分辨率
npx remotion render --size 50%

# 增加 Node 内存
export NODE_OPTIONS="--max-old-space-size=4096"
```

## 扩展阅读

- [Remotion 官方文档](https://www.remotion.dev/docs)
- [Remotion 模板库](https://www.remotion.dev/templates)
- [ElevenLabs 语音指南](https://elevenlabs.io/docs)

## 许可证

MIT — 自由使用和修改
