export const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080');

export const WS_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080')
    : (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080');

export const AUDIO_SAMPLE_RATE_INPUT = 16000;   // 16 kHz for mic capture
export const AUDIO_SAMPLE_RATE_OUTPUT = 24000;   // 24 kHz for TTS playback
export const AUDIO_CHANNELS = 1;                  // Mono
export const AUDIO_BIT_DEPTH = 16;                // 16-bit PCM

export const SUPPORTED_LANGUAGES = [
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
];

export const VOICE_OPTIONS: Record<string, VoiceOption[]> = {
  th: [
    { type: 'adult_male', label: 'ผู้ชาย', icon: '👨‍🏫', description: 'เสียงผู้ชายผู้ใหญ่' },
    { type: 'adult_female', label: 'ผู้หญิง', icon: '👩‍🏫', description: 'เสียงผู้หญิงผู้ใหญ่' },
    { type: 'child_male', label: 'เด็กชาย', icon: '👦', description: 'เสียงเด็กผู้ชาย' },
    { type: 'child_female', label: 'เด็กหญิง', icon: '👧', description: 'เสียงเด็กผู้หญิง' },
  ],
  en: [
    { type: 'adult_male', label: 'Adult Male', icon: '👨‍🏫', description: 'Deep, clear voice' },
    { type: 'adult_female', label: 'Adult Female', icon: '👩‍🏫', description: 'Warm, friendly voice' },
    { type: 'child_male', label: 'Child Male', icon: '👦', description: 'Young, energetic voice' },
    { type: 'child_female', label: 'Child Female', icon: '👧', description: 'Young, bright voice' },
  ],
};

export interface VoiceOption {
  type: string;
  label: string;
  icon: string;
  description: string;
}

export const DIFFICULTY_COLORS = {
  easy: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  hard: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
};
