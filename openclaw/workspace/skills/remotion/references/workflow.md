# Remotion 完整工作流

## 从创意到成品的完整流程

### 阶段 1: 策划与脚本

```
1. 确定视频类型
   - 营销视频
   - 产品演示
   - 社交媒体短视频
   - 数据可视化
   - 教育内容

2. 编写脚本
   - 旁白文本
   - 场景描述
   - 时间规划（每场景秒数）

3. 素材清单
   - 图片/视频素材
   - 背景音乐
   - 音效
   - 字体/颜色方案
```

### 阶段 2: 资产准备

#### 生成语音旁白

```bash
# 使用 sag (ElevenLabs)
sag -v "Roger" -o assets/voiceover.mp3 "欢迎来到我们的咖啡店"

# 添加情感
sag -o assets/voiceover.mp3 "[excited] 今天有个好消息！[short pause] 我们开业了！"
```

#### 搜索素材

```bash
# 使用 tavily 搜索 Pexels
mcporter call tavily.tavily_search query:"coffee shop interior site:pexels.com" max_results:10

# 或使用 Pexels API
curl -H "Authorization: YOUR_PEXELS_API_KEY" \
  "https://api.pexels.com/videos/search?query=coffee&per_page=10"
```

#### 生成背景音乐

```bash
# 使用 KIE/Suno API (需要 API key)
curl -X POST "https://api.kie.ai/music/generate" \
  -H "Authorization: Bearer $KIE_API_KEY" \
  -d '{"prompt": "warm jazz coffee shop background", "duration": 30}'
```

### 阶段 3: 创建 Remotion 项目

```bash
# 初始化项目
npx create-video@latest coffee-promo --empty
cd coffee-promo

# 安装额外依赖
npm install @remotion/transitions @remotion/captions
```

### 阶段 4: 编写合成

#### 基础结构

```tsx
// src/MyComposition.tsx
import { AbsoluteFill, Sequence, Audio, Img, useCurrentFrame } from 'remotion';
import { Fade } from '@remotion/transitions';

export const MyComposition = () => {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill>
      {/* 场景 1: 开场 (0-3 秒) */}
      <Sequence from={0} durationInFrames={90}>
        <Fade duration={30}>
          <Img src="../assets/coffee-shop.jpg" style={{ width: '100%' }} />
        </Fade>
      </Sequence>
      
      {/* 场景 2: 产品展示 (3-8 秒) */}
      <Sequence from={90} durationInFrames={150}>
        <Img src="../assets/latte.jpg" />
      </Sequence>
      
      {/* 旁白 */}
      <Audio src="../assets/voiceover.mp3" />
      
      {/* 背景音乐 */}
      <Audio src="../assets/music.mp3" volume={0.3} />
    </AbsoluteFill>
  );
};
```

#### 添加字幕

```tsx
// src/CaptionedVideo.tsx
import { Captions } from '@remotion/captions';

<Captions
  src="./captions.vtt"
  style={{
    fontFamily: 'Arial Black',
    fontSize: 60,
    color: 'white',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
  }}
/>
```

### 阶段 5: 预览与迭代

```bash
# 启动预览
npm run dev

# 实时修改代码，浏览器自动刷新
```

### 阶段 6: 渲染输出

```bash
# 最终渲染
npm run build

# 或自定义渲染
npx remotion render MyComposition out/final.mp4 \
  --video-bitrate 5000000 \
  --audio-bitrate 192000
```

### 阶段 7: 质量检查

```
□ 视频分辨率正确
□ 音频清晰无杂音
□ 字幕同步准确
□ 转场流畅
□ 总时长符合预期
□ 文件大小合理
```

## 短视频优化 (TikTok/Reels/Shorts)

### 9:16 竖屏配置

```ts
// remotion.config.ts
Config.setResolution({ width: 1080, height: 1920 });
Config.setFrameRate(30);
Config.setDurationInFrames(900); // 30 秒
```

### 爆款元素

```
1. 前 3 秒钩子（吸引注意力）
2. 快速节奏（每 2-3 秒切换）
3. 大字字幕（无声观看友好）
4. 热门音乐/音效
5. 明确 CTA（点赞/关注）
```

## 常见问题

### Q: 渲染太慢？
A: 降低分辨率 (`--size 50%`)，减少特效，使用并发 (`--concurrency 4`)

### Q: 音频不同步？
A: 检查采样率，使用 `Audio` 组件，预览时开启音频

### Q: 内存溢出？
A: 增加 Node 内存 (`NODE_OPTIONS="--max-old-space-size=4096"`)

### Q: 如何批量生成？
A: 使用 `--props` 参数，配合脚本循环渲染
