import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { MindMapCanvas } from '../components/mindmap/MindMapCanvas';
import { EmptyState } from '../components/ui/EmptyState';
import { useMemoStore } from '../store/memoStore';
import { useTagStore } from '../store/tagStore';
import { getStorageAdapter } from '../db';
import type { Relation } from '../types/relation';

export function MindMapPage() {
  const { memos, fetchMemos } = useMemoStore();
  const { tags, fetchTags } = useTagStore();
  const [relations, setRelations] = useState<Relation[]>([]);

  useEffect(() => {
    getStorageAdapter().initialize().then(() => {
      Promise.all([fetchMemos(), fetchTags()]);
    });
  }, []);

  const reloadRelations = useCallback(async () => {
    const all = await getStorageAdapter().getAllRelations();
    setRelations(all);
  }, []);

  useEffect(() => {
    reloadRelations();
  }, [memos, reloadRelations]);

  const handleManualConnect = useCallback(async (sourceId: string, targetId: string) => {
    // 既存の関連を双方向で確認
    const existing = relations.find(
      (r) => (r.fromMemoId === sourceId && r.toMemoId === targetId) ||
              (r.fromMemoId === targetId && r.toMemoId === sourceId)
    );

    if (existing?.type === 'manual' || existing?.type === 'both') {
      // すでに手動接続済み → 何もしない
      return;
    }

    if (existing) {
      // 自動接続が存在 → 'both' に昇格（既存の方向・強度・タグを維持）
      await getStorageAdapter().upsertRelation({
        fromMemoId: existing.fromMemoId,
        toMemoId: existing.toMemoId,
        type: 'both',
        strength: existing.strength,
        sharedTagIds: existing.sharedTagIds,
      });
    } else {
      // 新規手動接続
      await getStorageAdapter().upsertRelation({
        fromMemoId: sourceId,
        toMemoId: targetId,
        type: 'manual',
        strength: 1.0,
        sharedTagIds: [],
      });
    }
    await reloadRelations();
  }, [relations, reloadRelations]);

  const handleRelationDelete = useCallback(async (relationId: string) => {
    await getStorageAdapter().deleteRelation(relationId);
    setRelations((prev) => prev.filter((r) => r.id !== relationId));
  }, []);

  const handleRelationTagsUpdate = useCallback(async (relationId: string, sharedTagIds: string[]) => {
    await getStorageAdapter().updateRelationTags(relationId, sharedTagIds);
    setRelations((prev) =>
      prev.map((r) => r.id === relationId ? { ...r, sharedTagIds } : r)
    );
  }, []);

  return (
    <div>
      <PageHeader title="アイデアマップ" />
      {memos.length < 2 ? (
        <div className="mt-8">
          <EmptyState
            title="マップを表示するには2件以上のアイデアが必要です"
            description="アイデアを追加すると、ここでつながりを可視化・手動で接続できます"
          />
        </div>
      ) : (
        <MindMapCanvas
          memos={memos}
          relations={relations}
          tags={tags}
          onManualConnect={handleManualConnect}
          onRelationDelete={handleRelationDelete}
          onRelationTagsUpdate={handleRelationTagsUpdate}
        />
      )}
    </div>
  );
}
