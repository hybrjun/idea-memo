import { useState, useCallback } from 'react';
import { TextArea } from '../ui/TextArea';
import { Button } from '../ui/Button';
import { VoiceButton } from '../voice/VoiceButton';
import { VoiceTranscript } from '../voice/VoiceTranscript';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import type { MemoCreateInput, MemoUpdateInput, Memo } from '../../types/memo';

interface MemoFormProps {
  initialValues?: Partial<Memo>;
  onSubmit: (data: MemoCreateInput | MemoUpdateInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  showDetailedFields?: boolean;
}

export function MemoForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = '保存',
  showDetailedFields = false,
}: MemoFormProps) {
  const [idea, setIdea] = useState(initialValues?.idea ?? '');
  const [trigger, setTrigger] = useState(initialValues?.trigger ?? '');
  const [details, setDetails] = useState(initialValues?.details ?? '');
  const [actionItemsText, setActionItemsText] = useState(
    (initialValues?.actionItems ?? []).join('\n')
  );
  const [activeVoiceField, setActiveVoiceField] = useState<'idea' | 'trigger' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleTranscript = useCallback(
    (text: string) => {
      if (activeVoiceField === 'idea') {
        setIdea((prev) => (prev ? prev + ' ' + text : text));
      } else if (activeVoiceField === 'trigger') {
        setTrigger((prev) => (prev ? prev + ' ' + text : text));
      }
    },
    [activeVoiceField]
  );

  const voice = useVoiceInput(handleTranscript);

  const handleVoiceToggle = (field: 'idea' | 'trigger') => {
    if (voice.isListening) {
      voice.stop();
      setActiveVoiceField(null);
    } else {
      setActiveVoiceField(field);
      voice.start();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) {
      setError('アイデア本文は必須です');
      return;
    }
    setSubmitting(true);
    try {
      const data: MemoCreateInput | MemoUpdateInput = {
        idea: idea.trim(),
        trigger: trigger.trim(),
        ...(showDetailedFields && {
          details: details.trim(),
          actionItems: actionItemsText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      };
      await onSubmit(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* アイデア本文 */}
      <div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <TextArea
              label="アイデア"
              required
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="思いついたアイデアをざっくり書く..."
              rows={4}
              error={error && !idea.trim() ? error : undefined}
              autoFocus
            />
          </div>
          {voice.isSupported && (
            <div className="pb-1">
              <VoiceButton
                isListening={voice.isListening && activeVoiceField === 'idea'}
                onStart={() => handleVoiceToggle('idea')}
                onStop={() => { voice.stop(); setActiveVoiceField(null); }}
              />
            </div>
          )}
        </div>
        {activeVoiceField === 'idea' && (
          <VoiceTranscript text={voice.interimText} isListening={voice.isListening} />
        )}
      </div>

      {/* 課題・きっかけ */}
      <div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <TextArea
              label="課題・きっかけ（任意）"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="何が問題だった？何をきっかけに思いついた？"
              rows={2}
            />
          </div>
          {voice.isSupported && (
            <div className="pb-1">
              <VoiceButton
                isListening={voice.isListening && activeVoiceField === 'trigger'}
                onStart={() => handleVoiceToggle('trigger')}
                onStop={() => { voice.stop(); setActiveVoiceField(null); }}
              />
            </div>
          )}
        </div>
        {activeVoiceField === 'trigger' && (
          <VoiceTranscript text={voice.interimText} isListening={voice.isListening} />
        )}
      </div>

      {/* 詳細フィールド（Stage 2） */}
      {showDetailedFields && (
        <>
          <TextArea
            label="詳細メモ"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="具体的な内容、調査結果、参考情報など..."
            rows={4}
          />
          <TextArea
            label="アクションアイテム（1行1件）"
            value={actionItemsText}
            onChange={(e) => setActionItemsText(e.target.value)}
            placeholder="- ○○を調べる&#10;- ○○に相談する"
            rows={3}
          />
        </>
      )}

      {voice.error && (
        <p className="text-sm text-red-500">{voice.error}</p>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            キャンセル
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? '保存中...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
