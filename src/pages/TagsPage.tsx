import { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { MemoCard } from '../components/memo/MemoCard';
import { AIThemeSummary } from '../components/ai/AIThemeSummary';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { getTagColor } from '../utils/colorUtils';
import { useMemoStore } from '../store/memoStore';
import { useTagStore } from '../store/tagStore';
import { useUIStore } from '../store/uiStore';
import { getStorageAdapter } from '../db';
import type { Tag } from '../types/tag';

export function TagsPage() {
  const { memos, fetchMemos } = useMemoStore();
  const { tags, getTagFrequencies, fetchTags } = useTagStore();
  const { addToast } = useUIStore();

  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelected, setMergeSelected] = useState<Set<string>>(new Set());
  const [canonicalTagId, setCanonicalTagId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  const tagFrequencies = getTagFrequencies(memos);
  const selectedTag = tags.find((t) => t.id === selectedTagId);

  const filteredMemos = selectedTagId
    ? memos.filter((m) => m.tagIds.includes(selectedTagId))
    : [];

  const getTagsForMemo = (tagIds: string[]) =>
    tags.filter((t) => tagIds.includes(t.id));

  // --- 統合モード ---

  const toggleMergeSelect = (tag: Tag) => {
    setMergeSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tag.id)) {
        next.delete(tag.id);
        if (canonicalTagId === tag.id) setCanonicalTagId(null);
      } else {
        next.add(tag.id);
        if (!canonicalTagId) setCanonicalTagId(tag.id);
      }
      return next;
    });
  };

  const handleMerge = async () => {
    if (!canonicalTagId || mergeSelected.size < 2) return;
    const mergeTagIds = [...mergeSelected].filter((id) => id !== canonicalTagId);

    setMerging(true);
    try {
      await getStorageAdapter().mergeTags(canonicalTagId, mergeTagIds);
      await Promise.all([fetchMemos(), fetchTags()]);

      const canonicalTag = tags.find((t) => t.id === canonicalTagId);
      addToast(`「${canonicalTag?.text}」に${mergeTagIds.length}件のタグを統合しました`, 'success');

      // 統合後リセット
      setMergeMode(false);
      setMergeSelected(new Set());
      setCanonicalTagId(null);
    } catch {
      addToast('統合に失敗しました', 'error');
    } finally {
      setMerging(false);
    }
  };

  const cancelMerge = () => {
    setMergeMode(false);
    setMergeSelected(new Set());
    setCanonicalTagId(null);
  };

  return (
    <div>
      <PageHeader
        title="タグ"
        right={
          tagFrequencies.length >= 2 && (
            <button
              onClick={() => mergeMode ? cancelMerge() : setMergeMode(true)}
              className={`text-sm font-medium px-3 py-1.5 rounded-xl min-h-[36px] transition-colors
                ${mergeMode ? 'bg-gray-200 text-gray-700' : 'bg-blue-50 text-blue-600 active:bg-blue-100'}`}
            >
              {mergeMode ? 'キャンセル' : 'タグを統合'}
            </button>
          )
        }
      />

      <div className="px-4 py-4 flex flex-col gap-6">
        {tagFrequencies.length === 0 ? (
          <EmptyState
            title="タグがまだありません"
            description="アイデアを記録すると、キーワードが自動でタグになります"
          />
        ) : (
          <>
            {/* タグ一覧 */}
            <section>
              {mergeMode ? (
                <>
                  <p className="text-sm text-gray-500 mb-3">
                    まとめたいタグを選んでください（2つ以上）
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tagFrequencies.map(({ tag, count }) => {
                      const isSelected = mergeSelected.has(tag.id);
                      const isCanonical = canonicalTagId === tag.id;
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleMergeSelect(tag)}
                          className={`
                            inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium
                            border-2 transition-all
                            ${isCanonical
                              ? 'bg-blue-600 text-white border-blue-600'
                              : isSelected
                                ? 'bg-blue-100 text-blue-700 border-blue-400'
                                : 'bg-gray-100 text-gray-600 border-transparent'
                            }
                          `}
                        >
                          {isCanonical && (
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {isSelected && !isCanonical && (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          {tag.text}
                          <span className="opacity-60 text-xs">({count})</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 統合パネル */}
                  {mergeSelected.size >= 2 && (
                    <div className="mt-4 bg-blue-50 rounded-2xl p-4">
                      <p className="text-sm text-blue-800 font-medium mb-2">統合プレビュー</p>

                      {/* canonical 選択 */}
                      <p className="text-xs text-blue-600 mb-2">残すタグ名を選んでください：</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {[...mergeSelected].map((id) => {
                          const tag = tags.find((t) => t.id === id);
                          if (!tag) return null;
                          return (
                            <button
                              key={id}
                              onClick={() => setCanonicalTagId(id)}
                              className={`
                                px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all
                                ${canonicalTagId === id
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-gray-700 border-gray-300 active:bg-gray-50'
                                }
                              `}
                            >
                              {tag.text}
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-xs text-gray-500 mb-3">
                        選択した {mergeSelected.size} タグを
                        「{tags.find((t) => t.id === canonicalTagId)?.text}」に統合します。
                        既存メモのタグも自動で書き換わります。
                      </p>

                      <Button
                        onClick={handleMerge}
                        disabled={!canonicalTagId || merging}
                        className="w-full"
                      >
                        {merging ? '統合中...' : `「${tags.find((t) => t.id === canonicalTagId)?.text ?? ''}」に統合する`}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-sm font-semibold text-gray-500 mb-3">すべてのタグ</h2>
                  <div className="flex flex-wrap gap-2">
                    {tagFrequencies.map(({ tag, count }) => (
                      <button
                        key={tag.id}
                        onClick={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
                        className={`
                          inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium
                          transition-colors
                          ${selectedTagId === tag.id
                            ? 'bg-blue-600 text-white'
                            : `${getTagColor(tag.text)} active:opacity-80`
                          }
                        `}
                      >
                        {tag.text}
                        <span className="opacity-60 text-xs">({count})</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* 選択タグのメモ一覧（通常モードのみ） */}
            {!mergeMode && selectedTag && filteredMemos.length > 0 && (
              <>
                <AIThemeSummary memos={filteredMemos} tagLabel={selectedTag.text} />

                <section>
                  <h2 className="text-sm font-semibold text-gray-500 mb-3">
                    「{selectedTag.text}」のアイデア ({filteredMemos.length}件)
                  </h2>
                  <div className="flex flex-col gap-3">
                    {filteredMemos.map((memo) => (
                      <MemoCard
                        key={memo.id}
                        memo={memo}
                        tags={getTagsForMemo(memo.tagIds)}
                      />
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
