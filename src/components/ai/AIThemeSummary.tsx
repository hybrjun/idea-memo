import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { useAISummary } from '../../hooks/useAI';
import { useSettingsStore } from '../../store/settingsStore';
import type { Memo } from '../../types/memo';

interface AIThemeSummaryProps {
  memos: Memo[];
  tagLabel: string;
}

export function AIThemeSummary({ memos, tagLabel }: AIThemeSummaryProps) {
  const { summary, loading, error, summarize } = useAISummary();
  const aiEnabled = useSettingsStore((s) => s.ai.enabled);

  if (!aiEnabled || memos.length < 2) return null;

  return (
    <div className="bg-purple-50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-purple-800">
          「{tagLabel}」の共通テーマ
        </h3>
        {!summary && !loading && (
          <Button size="sm" variant="ghost" onClick={() => summarize(memos)}>
            AI要約
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-purple-600 text-sm">
          <Spinner size={16} />
          <span>共通テーマを分析中...</span>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {summary && (
        <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
      )}
    </div>
  );
}
