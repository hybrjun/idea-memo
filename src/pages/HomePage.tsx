import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { MemoCard } from '../components/memo/MemoCard';
import { TagFilter } from '../components/tags/TagFilter';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { useMemoStore } from '../store/memoStore';
import { useTagStore } from '../store/tagStore';
import { getStorageAdapter } from '../db';
import { ROUTES } from '../constants/routes';

export function HomePage() {
  const navigate = useNavigate();
  const { memos, loading, fetchMemos } = useMemoStore();
  const { tags, fetchTags, getTagFrequencies, selectedTagId, selectTag } = useTagStore();

  useEffect(() => {
    getStorageAdapter().initialize().then(() => {
      fetchMemos();
      fetchTags();
    });
  }, []);

  const tagFrequencies = getTagFrequencies(memos);

  const filteredMemos = selectedTagId
    ? memos.filter((m) => m.tagIds.includes(selectedTagId))
    : memos;

  const getMemotags = (tagIds: string[]) =>
    tags.filter((t) => tagIds.includes(t.id));

  return (
    <div>
      <PageHeader
        title="アイデアメモ"
        right={<span className="text-sm text-gray-500">{memos.length}件</span>}
      />

      {tagFrequencies.length > 0 && (
        <div className="py-3 bg-white border-b border-gray-100">
          <TagFilter
            tagFrequencies={tagFrequencies}
            selectedTagId={selectedTagId}
            onSelect={selectTag}
          />
        </div>
      )}

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filteredMemos.length === 0 ? (
          <EmptyState
            title="アイデアがまだありません"
            description="右下のボタンから最初のアイデアを記録しましょう"
            action={
              <Button onClick={() => navigate(ROUTES.NEW_MEMO)}>
                アイデアを記録する
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredMemos.map((memo) => (
              <MemoCard
                key={memo.id}
                memo={memo}
                tags={getMemotags(memo.tagIds)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate(ROUTES.NEW_MEMO)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:bg-blue-700 transition-colors z-30"
        aria-label="新規メモ"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
