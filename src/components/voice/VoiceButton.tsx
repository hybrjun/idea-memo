interface VoiceButtonProps {
  isListening: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function VoiceButton({ isListening, onStart, onStop, disabled }: VoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={isListening ? onStop : onStart}
      disabled={disabled}
      className={`
        w-14 h-14 rounded-full flex items-center justify-center
        transition-all duration-200 shadow-md
        disabled:opacity-40
        ${isListening
          ? 'bg-red-500 animate-pulse active:bg-red-600'
          : 'bg-blue-600 active:bg-blue-700'
        }
      `}
      aria-label={isListening ? '録音停止' : '音声入力開始'}
    >
      {isListening ? (
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      )}
    </button>
  );
}
