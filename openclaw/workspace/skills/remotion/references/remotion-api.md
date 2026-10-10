# Remotion API 参考

## 核心组件

### AbsoluteFill
全屏容器，所有视频的基础层。

```tsx
import { AbsoluteFill } from 'remotion';

<AbsoluteFill style={{ backgroundColor: 'black' }}>
  {children}
</AbsoluteFill>
```

### Sequence
时间序列控制，指定元素出现的时间段。

```tsx
import { Sequence } from 'remotion';

// 从第 0 帧开始，持续 60 帧
<Sequence from={0} durationInFrames={60}>
  <YourComponent />
</Sequence>

// 延迟出现
<Sequence from={30} durationInFrames={60}>
  <YourComponent />
</Sequence>
```

### Audio
音频组件。

```tsx
import { Audio } from 'remotion';

<Audio src="./audio.mp3" startFrom={0} endAt={100} />
```

### Img / Video
图片和视频组件。

```tsx
import { Img, Video } from 'remotion';

<Img src="./image.jpg" style={{ width: '100%' }} />
<Video src="./video.mp4" style={{ width: '100%' }} />
```

## 动画工具

### useCurrentFrame
获取当前帧号。

```tsx
import { useCurrentFrame } from 'remotion';

const frame = useCurrentFrame();
const opacity = frame / 60; // 60 帧淡入
```

### interpolate
插值函数，创建平滑动画。

```tsx
import { interpolate } from 'remotion';

const frame = useCurrentFrame();
const rotate = interpolate(frame, [0, 60], [0, 360]);

<div style={{ transform: `rotate(${rotate}deg)` }} />
```

### Easing
缓动函数。

```tsx
import { Easing } from 'remotion';

const progress = interpolate(frame, [0, 60], [0, 1], {
  easing: Easing.bezier(0.25, 0.1, 0.25, 1)
});
```

## 转场 (@remotion/transitions)

```tsx
import { Fade, Slide, Wipe } from '@remotion/transitions';

<Fade duration={30}>
  <Scene1 />
</Fade>

<Slide direction="left" duration={30}>
  <Scene2 />
</Slide>
```

## 字幕 (@remotion/captions)

```tsx
import { Captions } from '@remotion/captions';

<Captions
  src="./captions.vtt"
  style={{
    fontFamily: 'Arial',
    fontSize: 48,
    color: 'white',
  }}
/>
```

## 3D (@remotion/three)

```tsx
import { ThreeView } from '@remotion/three';
import * as THREE from 'three';

<ThreeView>
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="hotpink" />
  </mesh>
</ThreeView>
```

## 配置 (remotion.config.ts)

```ts
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setOutputDirectory('out');
Config.setScale(1);
```

## 渲染命令

```bash
# 基础渲染
npx remotion render MyComposition out/video.mp4

# 带参数
npx remotion render MyComposition out/video.mp4 --props '{"title":"Hello"}'

# 降低分辨率（快速预览）
npx remotion render MyComposition out/video.mp4 --size 50%

# 并发渲染
npx remotion render MyComposition out/video.mp4 --concurrency 4
```

## 帧率与分辨率

| 平台 | 分辨率 | 帧率 |
|------|--------|------|
| YouTube | 1920x1080 | 30fps |
| TikTok | 1080x1920 | 30fps |
| Instagram | 1080x1080 | 30fps |
| YouTube Shorts | 1080x1920 | 30fps |

## 音频规范

- 采样率：44.1kHz 或 48kHz
- 格式：MP3 或 AAC
- 比特率：128kbps 或更高
- 声道：立体声
