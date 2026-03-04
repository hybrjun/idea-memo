import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { MemoForm } from '../components/memo/MemoForm';
import { useMemoStore } from '../store/memoStore';
import { useTagStore } from '../store/tagStore';
import { useUIStore } from '../store/uiStore';
import { useSettingsStore } from '../store/settingsStore';
import { useKeywordExtract } from '../hooks/useKeywordExtract';
import { getStorageAdapter } from '../db';
import { computeRelations } from '../services/RelationEngine';
import { computeFreshness } from '../services/FreshnessService';
import { aiService } from '../services/AIService';
import type { MemoCreateInput, MemoUpdateInput } from '../types/memo';
import { ROUTES } from '../constants/routes';

export function NewMemoPage() {
  const navigate = useNavigate();
  const { createMemo, updateMemo, fetchMemos } = useMemoStore();
  const { fetchTags } = useTagStore();
  const { addToast } = useUIStore();
  const aiSettings = useSettingsStore((s) => s.ai);
  const { extract } = useKeywordExtract();

  const handleSubmit = async (data: MemoCreateInput | MemoUpdateInput) => {
    const input = data as MemoCreateInput;
    const adapter = getStorageAdapter();

    // メモ作成
    const memo = await createMemo({ idea: input.idea, trigger: input.trigger });

    // キーワード抽出（kuromoji）
    const rawKeywords = await extract(input.idea, input.trigger ?? '');

    // AI有効時: 既存タグと照合して同義語を自動正規化
    const existingTags = await adapter.getAllTags();
    const keywords = await aiService.normalizeKeywords(rawKeywords, existingTags, aiSettings);

    // タグ化
    const tagIds: string[] = [];
    for (const kw of keywords) {
      const tag = await adapter.findOrCreateTag(kw);
      tagIds.push(tag.id);
    }

    // 鮮度スコア計算・メモ更新
    const freshnessScore = computeFreshness(memo.createdAt);
    const updatedMemo = await updateMemo(memo.id, { tagIds, freshnessScore });

    // 関連付け計算
    const allMemos = await adapter.getMemos();
    const otherMemos = allMemos.filter((m) => m.id !== updatedMemo.id);
    const relations = computeRelations(updatedMemo, otherMemos);
    for (const rel of relations) {
      await adapter.upsertRelation(rel);
    }

    await Promise.all([fetchMemos(), fetchTags()]);
    addToast('アイデアを保存しました', 'success');
    navigate(ROUTES.HOME);
  };

  return (
    <div>
      <PageHeader title="新しいアイデア" showBack />
      <div className="px-4 py-4">
        <p className="text-sm text-gray-500 mb-4">
          思いついたことをざっくり書いておこう。後から詳細を追加できます。
        </p>
        <MemoForm
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          submitLabel="保存する"
        />
      </div>
    </div>
  );
}
