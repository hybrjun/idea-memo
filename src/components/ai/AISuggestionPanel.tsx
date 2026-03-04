import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { useAISuggestions } from '../../hooks/useAI';
import { useSettingsStore } from '../../store/settingsStore';
import type { Memo } from '../../types/memo';
import { ROUTES } from '../../constants/routes';

interface AISuggestionPanelProps {
  currentMemo: Memo;
  allMemos: Memo[];
}

export function AISuggestionPanel({ currentMemo, allMemos }: AISuggestionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { suggestions, isStreaming, error, getSuggestions, abort } = useAISuggestions();
  const navigate = useNavigate();
  const aiEnabled = useSettingsStore((s) => s.ai.enabled);

  if (!aiEnabled) return null;

  const candidates = allMemos.filter((m) => m.id !== currentMemo.id);

  const handleExpand = () => {
    setExpanded(true);
    if (suggestions.length === 0 && !isStreaming) {
      getSuggestions(currentMemo, candidates);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={handleExpand}
        className="w-full flex items-center gap-2 px-4 py-3 bg-purple-50 rounded-xl text-purple-700 text-sm font-medium active:bg-purple-100"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        AIで関連アイデアを探す
      </button>
    );
  }

  return (
    <section className="bg-purple-50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-purple-800">AI関連アイデア提案</h2>
        {isStreaming && (
          <Button size="sm" variant="ghost" onClick={abort}>
            停止
          </Button>
        )}
      </div>

      {isStreaming && suggestions.length === 0 && (
        <div className="flex items-center gap-2 text-purple-600 text-sm">
          <Spinner size={16} />
          <span>関連アイデアを探しています...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 rounded-xl p-3">
          <p className="text-sm text-red-700 mb-2">{error}</p>
          {(error.includes('クレジット') || error.includes('APIキー')) && (
            <button
              onClick={() => navigate(ROUTES.SETTINGS)}
              className="text-xs text-red-600 underline active:opacity-70"
            >
              設定画面を開く →
            </button>
          )}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          {suggestions.map((s, i) => {
            const memo = allMemos.find((m) => m.id === s.memoId);
            if (!memo) return null;
            return (
              <div
                key={i}
                onClick={() => navigate(ROUTES.MEMO_DETAIL(memo.id))}
                className="bg-white rounded-xl p-3 cursor-pointer active:bg-gray-50"
              >
                <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">
                  {memo.idea}
                </p>
                <p className="text-xs text-gray-500">{s.reasoning}</p>
                <p className="text-xs text-purple-500 mt-1">
                  関連スコア {Math.round(s.score * 100)}%
                </p>
              </div>
            );
          })}
        </div>
      )}

      {!isStreaming && suggestions.length === 0 && !error && (
        <p className="text-sm text-purple-600">関連アイデアが見つかりませんでした。</p>
      )}
    </section>
  );
}
