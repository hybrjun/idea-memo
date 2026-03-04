import { useState, useCallback, useRef } from 'react';
import { VoiceInputService } from '../services/VoiceInputService';
import { useSettingsStore } from '../store/settingsStore';

export function useVoiceInput(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef(new VoiceInputService());
  const lang = useSettingsStore((s) => s.voiceLanguage);

  const start = useCallback(() => {
    if (!VoiceInputService.isSupported()) {
      setError('このブラウザは音声入力に対応していません');
      return;
    }
    setError(null);
    setIsListening(true);

    serviceRef.current.start(
      lang,
      (transcript, isFinal) => {
        if (isFinal) {
          onTranscript(transcript);
          setInterimText('');
        } else {
          setInterimText(transcript);
        }
      },
      (err) => {
        setError(`音声認識エラー: ${err}`);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
        setInterimText('');
      }
    );
  }, [lang, onTranscript]);

  const stop = useCallback(() => {
    serviceRef.current.stop();
    setIsListening(false);
  }, []);

  return {
    isListening,
    interimText,
    error,
    start,
    stop,
    isSupported: VoiceInputService.isSupported(),
  };
}
