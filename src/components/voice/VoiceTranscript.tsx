interface VoiceTranscriptProps {
  text: string;
  isListening: boolean;
}

export function VoiceTranscript({ text, isListening }: VoiceTranscriptProps) {
  if (!isListening && !text) return null;

  return (
    <div className="mt-2 px-3 py-2 bg-blue-50 rounded-xl text-sm text-blue-700 min-h-[40px]">
      {isListening && !text && (
        <span className="text-blue-400 italic">聞き取り中...</span>
      )}
      {text && <span>{text}</span>}
    </div>
  );
}
