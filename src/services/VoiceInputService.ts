export type VoiceCallback = (transcript: string, isFinal: boolean) => void;
export type VoiceErrorCallback = (error: string) => void;

// SpeechRecognition is available in modern browsers but not in all TS DOM typings
type SpeechRecognitionAPI = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { resultIndex: number; results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

function createSpeechRecognition(): SpeechRecognitionAPI | null {
  const W = window as unknown as Record<string, unknown>;
  const Ctor = W['SpeechRecognition'] ?? W['webkitSpeechRecognition'];
  if (!Ctor) return null;
  return new (Ctor as new () => SpeechRecognitionAPI)();
}

export class VoiceInputService {
  private recognition: SpeechRecognitionAPI | null = null;
  private isListening = false;

  static isSupported(): boolean {
    const W = window as unknown as Record<string, unknown>;
    return 'SpeechRecognition' in W || 'webkitSpeechRecognition' in W;
  }

  start(
    lang: string,
    onResult: VoiceCallback,
    onError: VoiceErrorCallback,
    onEnd: () => void
  ): void {
    if (this.isListening) return;

    this.recognition = createSpeechRecognition();
    if (!this.recognition) {
      onError('音声認識がサポートされていません');
      return;
    }

    this.recognition.lang = lang;
    this.recognition.interimResults = true;
    this.recognition.continuous = false;

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        onResult(result[0].transcript, result.isFinal);
      }
    };

    this.recognition.onerror = (event) => {
      onError(event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    this.recognition.start();
    this.isListening = true;
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  get listening(): boolean {
    return this.isListening;
  }
}
