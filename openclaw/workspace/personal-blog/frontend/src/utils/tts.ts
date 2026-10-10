const synth = window.speechSynthesis;

export interface VoiceOption {
  name: string;
  lang: string;
  voice: SpeechSynthesisVoice;
}

export function getAvailableVoices(): VoiceOption[] {
  const voices = synth.getVoices();
  return voices.map(voice => ({
    name: voice.name,
    lang: voice.lang,
    voice,
  }));
}

export function getChineseVoices(): VoiceOption[] {
  return getAvailableVoices().filter(v => 
    v.lang.startsWith('zh') || v.name.toLowerCase().includes('chinese')
  );
}

export function getPreferredVoice(): VoiceOption | null {
  const savedVoiceName = localStorage.getItem('preferred-voice');
  const chineseVoices = getChineseVoices();
  
  if (savedVoiceName) {
    const saved = chineseVoices.find(v => v.name === savedVoiceName);
    if (saved) return saved;
  }
  
  return chineseVoices[0] || null;
}

export function setPreferredVoice(voiceName: string): void {
  localStorage.setItem('preferred-voice', voiceName);
}

export function stopSpeaking(): void {
  if (synth.speaking) {
    synth.cancel();
  }
}

export function isSpeaking(): boolean {
  return synth.speaking;
}

export function speak(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: any) => void
): void {
  stopSpeaking();
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  const preferredVoice = getPreferredVoice();
  if (preferredVoice) {
    utterance.voice = preferredVoice.voice;
  }
  
  utterance.lang = 'zh-CN';
  utterance.rate = parseFloat(localStorage.getItem('speech-rate') || '1');
  utterance.pitch = parseFloat(localStorage.getItem('speech-pitch') || '1');
  utterance.volume = 1;
  
  utterance.onstart = () => {
    onStart?.();
  };
  
  utterance.onend = () => {
    onEnd?.();
  };
  
  utterance.onerror = (event) => {
    console.error('TTS Error:', event);
    onError?.(event);
  };
  
  synth.speak(utterance);
}

export function speakBlogPost(
  title: string,
  content: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (error: any) => void
): void {
  const fullText = `标题：${title}。正文：${content}`;
  speak(fullText, onStart, onEnd, onError);
}
