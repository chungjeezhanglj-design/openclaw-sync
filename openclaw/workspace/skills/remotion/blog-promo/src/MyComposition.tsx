import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, Audio } from 'remotion';

const TitleSlide = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  const translateY = interpolate(frame, [0, 30], [50, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ 
        textAlign: 'center', 
        opacity, 
        transform: `translateY(${translateY}px)`,
        color: 'white'
      }}>
        <h1 style={{ fontSize: 80, margin: 0, fontWeight: 'bold' }}>个人博客系统</h1>
        <p style={{ fontSize: 32, marginTop: 20, color: '#e94560' }}>简约 · 高效 · 优雅</p>
      </div>
    </AbsoluteFill>
  );
};

const FeatureSlide = ({ title, icon, delay }: { title: string; icon: string; delay: number }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 30], [0, 1]);
  const scale = interpolate(frame, [delay, delay + 30], [0.8, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#16213e', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ 
        textAlign: 'center', 
        opacity, 
        transform: `scale(${scale})`,
        color: 'white',
        padding: 60
      }}>
        <div style={{ fontSize: 100, marginBottom: 30 }}>{icon}</div>
        <h2 style={{ fontSize: 48, margin: 0 }}>{title}</h2>
      </div>
    </AbsoluteFill>
  );
};

const EndSlide = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f3460', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', opacity, color: 'white' }}>
        <h1 style={{ fontSize: 60, margin: 0 }}>立即体验</h1>
        <p style={{ fontSize: 36, marginTop: 30, color: '#e94560' }}>https://chungjee.cc.cd:8443</p>
        <p style={{ fontSize: 24, marginTop: 40, color: '#aaa' }}>开启你的博客之旅</p>
      </div>
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <AbsoluteFill>
      {/* 背景音乐/旁白 */}
      <Audio src="./assets/voiceover.aiff" />
      
      {/* 开场标题 (0-5 秒，150 帧) */}
      <Sequence from={0} durationInFrames={150}>
        <TitleSlide />
      </Sequence>

      {/* 功能 1: 现代化界面 (5-8 秒) */}
      <Sequence from={150} durationInFrames={90}>
        <FeatureSlide title="现代化界面" icon="🎨" delay={0} />
      </Sequence>

      {/* 功能 2: 快速加载 (8-11 秒) */}
      <Sequence from={240} durationInFrames={90}>
        <FeatureSlide title="快速加载" icon="⚡" delay={0} />
      </Sequence>

      {/* 功能 3: 响应式设计 (11-14 秒) */}
      <Sequence from={330} durationInFrames={90}>
        <FeatureSlide title="响应式设计" icon="📱" delay={0} />
      </Sequence>

      {/* 功能 4: 易于管理 (14-17 秒) */}
      <Sequence from={420} durationInFrames={90}>
        <FeatureSlide title="易于管理" icon="🔧" delay={0} />
      </Sequence>

      {/* 结尾 (17-22 秒) */}
      <Sequence from={510} durationInFrames={150}>
        <EndSlide />
      </Sequence>
    </AbsoluteFill>
  );
};
