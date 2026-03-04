import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { MemoForm } from '../components/memo/MemoForm';
import { MemoStatusBadge } from '../components/memo/MemoStatusBadge';
import { FreshnessBadge } from '../components/memo/FreshnessBadge';
import { RelatedMemoList } from '../components/memo/RelatedMemoList';
import { AISuggestionPanel } from '../components/ai/AISuggestionPanel';
import { TagChip } from '../components/tags/TagChip';
import { Button } from '../components/ui/Button';
import { useMemoStore } from '../store/memoStore';
import { useTagStore } from '../store/tagStore';
import { useUIStore } from '../store/uiStore';
import { useSettingsStore } from '../store/settingsStore';
import { useKeywordExtract } from '../hooks/useKeywordExtract';
import { getStorageAdapter } from '../db';
import { computeRelations } from '../services/RelationEngine';
import { computeFreshness } from '../services/FreshnessService';
import { aiService } from '../services/AIService';
import { formatDateTime } from '../utils/dateUtils';
import type { MemoUpdateInput } from '../types/memo';
import type { Relation } from '../types/relation';
import type { Tag } from '../types/tag';

export function MemoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { memos, updateMemo, deleteMemo } = useMemoStore();
  const { tags, fetchTags } = useTagStore();
  const { addToast } = useUIStore();
  const aiSettings = useSettingsStore((s) => s.ai);
  const { extract } = useKeywordExtract();

  const [editing, setEditing] = useState(false);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [memoTags, setMemoTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  const memo = memos.find((m) => m.id === id);

  useEffect(() => {
    if (memo) {
      setMemoTags(tags.filter((t) => memo.tagIds.includes(t.id)));
      setAllTags(tags);
      getStorageAdapter()
        .getRelationsForMemo(memo.id)
        .then(setRelations);
    }
  }, [memo, tags]);

  if (!memo) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500">メモが見つかりません</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
          戻る
        </Button>
      </div>
    );
  }

  const handleStatusToggle = async () => {
    const newStatus = memo.status === '未着手' ? '着手済み' : '未着手';
    await updateMemo(memo.id, { status: newStatus });
    addToast(`ステータスを「${newStatus}」に変更しました`);
  };

  const handleEditSubmit = async (data: MemoUpdateInput) => {
    const adapter = getStorageAdapter();

    // キーワード再抽出（kuromoji）
    const rawKeywords = await extract(
      data.idea ?? memo.idea,
      data.trigger ?? memo.trigger
    );

    // AI有効時: 既存タグと照合して同義語を自動正規化
    const existingTags = await adapter.getAllTags();
    const keywords = await aiService.normalizeKeywords(rawKeywords, existingTags, aiSettings);

    const tagIds: string[] = [];
    for (const kw of keywords) {
      const tag = await adapter.findOrCreateTag(kw);
      tagIds.push(tag.id);
    }

    const freshnessScore = computeFreshness(memo.createdAt instanceof Date ? memo.createdAt : new Date(memo.createdAt));
    const updatedMemo = await updateMemo(memo.id, {
      ...data,
      tagIds,
      freshnessScore,
      editStage: 'detailed',
    });

    // 関連付け再計算 — DBから最新メモ一覧を取得
    const allMemos = await adapter.getMemos();
    const otherMemos = allMemos.filter((m) => m.id !== memo.id);
    const newRelations = computeRelations(updatedMemo, otherMemos);
    await adapter.deleteRelationsForMemo(memo.id);
    for (const rel of newRelations) {
      await adapter.upsertRelation(rel);
    }

    await fetchTags();
    setEditing(false);
    addToast('更新しました', 'success');
  };

  const handleDelete = async () => {
    if (!window.confirm('このアイデアを削除しますか？')) return;
    await deleteMemo(memo.id);
    addToast('削除しました');
    navigate(-1);
  };

  const createdAt = memo.createdAt instanceof Date ? memo.createdAt : new Date(memo.createdAt);

  return (
    <div>
      <PageHeader
        title={editing ? '編集' : 'アイデア詳細'}
        showBack
        right={
          !editing && (
            <button
              onClick={handleDelete}
              className="p-2 text-red-400 active:text-red-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )
        }
      />

      <div className="px-4 py-4 flex flex-col gap-6">
        {editing ? (
          <MemoForm
            initialValues={memo}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditing(false)}
            submitLabel="更新する"
            showDetailedFields
          />
        ) : (
          <>
            {/* メタ情報 */}
            <div className="flex items-center gap-3 flex-wrap">
              <MemoStatusBadge status={memo.status} onClick={handleStatusToggle} />
              <FreshnessBadge score={memo.freshnessScore} />
              <span className="text-xs text-gray-400 ml-auto">
                {formatDateTime(createdAt)}
              </span>
            </div>

            {/* アイデア本文 */}
            <section>
              <p className="text-lg font-semibold text-gray-900 leading-relaxed">
                {memo.idea}
              </p>
            </section>

            {/* 課題・きっかけ */}
            {memo.trigger && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  課題・きっかけ
                </h2>
                <p className="text-base text-gray-700">{memo.trigger}</p>
              </section>
            )}

            {/* 詳細（Stage 2） */}
            {memo.details && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  詳細
                </h2>
                <p className="text-base text-gray-700 whitespace-pre-wrap">{memo.details}</p>
              </section>
            )}

            {/* アクションアイテム */}
            {memo.actionItems.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  アクションアイテム
                </h2>
                <ul className="flex flex-col gap-1.5">
                  {memo.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* タグ */}
            {memoTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {memoTags.map((tag) => (
                  <TagChip key={tag.id} text={tag.text} size="md" />
                ))}
              </div>
            )}

            {/* 詳細編集ボタン */}
            <Button
              variant="secondary"
              onClick={() => setEditing(true)}
              className="w-full"
            >
              {memo.editStage === 'rough' ? '詳細を追記する' : '編集する'}
            </Button>

            {/* 関連アイデア */}
            <RelatedMemoList
              relations={relations}
              memos={memos}
              tags={allTags}
            />

            {/* AI提案 */}
            <AISuggestionPanel currentMemo={memo} allMemos={memos} />
          </>
        )}
      </div>
    </div>
  );
}
