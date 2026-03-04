import { db } from './schema';
import type { IStorageAdapter, QueryOptions } from './IStorageAdapter';
import type { Memo, MemoCreateInput, MemoUpdateInput } from '../types/memo';
import type { Tag } from '../types/tag';
import type { Relation } from '../types/relation';

export class DexieAdapter implements IStorageAdapter {
  async initialize(): Promise<void> {
    await db.open();
  }

  // === Memos ===

  async getMemo(id: string): Promise<Memo | undefined> {
    return db.memos.get(id);
  }

  async getMemos(options: QueryOptions = {}): Promise<Memo[]> {
    const { orderBy = 'createdAt', direction = 'desc', tagId, status, limit, offset } = options;

    let collection = db.memos.orderBy(orderBy);
    if (direction === 'desc') collection = collection.reverse();

    let results = await collection.toArray();

    if (tagId) {
      results = results.filter(m => m.tagIds.includes(tagId));
    }
    if (status) {
      results = results.filter(m => m.status === status);
    }
    if (offset) {
      results = results.slice(offset);
    }
    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }

  async createMemo(input: MemoCreateInput): Promise<Memo> {
    const now = new Date();
    const memo: Memo = {
      id: crypto.randomUUID(),
      idea: input.idea,
      trigger: input.trigger ?? '',
      details: '',
      actionItems: [],
      status: '未着手',
      editStage: 'rough',
      tagIds: [],
      createdAt: now,
      updatedAt: now,
      freshnessScore: 100,
    };
    await db.memos.add(memo);
    return memo;
  }

  async updateMemo(id: string, input: MemoUpdateInput): Promise<Memo> {
    const existing = await db.memos.get(id);
    if (!existing) throw new Error(`Memo not found: ${id}`);

    const updated: Memo = {
      ...existing,
      ...input,
      updatedAt: new Date(),
    };
    await db.memos.put(updated);
    return updated;
  }

  async deleteMemo(id: string): Promise<void> {
    await db.memos.delete(id);
  }

  // === Tags ===

  async getAllTags(): Promise<Tag[]> {
    return db.tags.orderBy('createdAt').toArray();
  }

  async findOrCreateTag(text: string): Promise<Tag> {
    const normalized = text.normalize('NFC').toLowerCase().trim();
    if (!normalized) throw new Error('Tag text cannot be empty');

    const existing = await db.tags.where('normalizedText').equals(normalized).first();
    if (existing) return existing;

    const tag: Tag = {
      id: crypto.randomUUID(),
      text,
      normalizedText: normalized,
      createdAt: new Date(),
    };
    await db.tags.add(tag);
    return tag;
  }

  async deleteUnusedTags(): Promise<number> {
    const allMemos = await db.memos.toArray();
    const usedTagIds = new Set(allMemos.flatMap(m => m.tagIds));
    const allTags = await db.tags.toArray();
    const unusedIds = allTags.filter(t => !usedTagIds.has(t.id)).map(t => t.id);
    await db.tags.bulkDelete(unusedIds);
    return unusedIds.length;
  }

  async mergeTags(canonicalTagId: string, mergeTagIds: string[]): Promise<void> {
    const mergeSet = new Set(mergeTagIds);

    // mergeTagIds を使っている全メモの tagIds を書き換える
    const affectedMemos = await db.memos
      .filter(m => m.tagIds.some(id => mergeSet.has(id)))
      .toArray();

    for (const memo of affectedMemos) {
      const newTagIds = [
        ...memo.tagIds.filter(id => !mergeSet.has(id)), // 対象外はそのまま残す
        canonicalTagId,                                  // canonical を追加
      ];
      // 重複除去
      const deduped = [...new Set(newTagIds)];
      await db.memos.update(memo.id, { tagIds: deduped, updatedAt: new Date() });
    }

    // 統合されたタグを削除
    await db.tags.bulkDelete([...mergeTagIds]);
  }

  // === Relations ===

  async getAllRelations(): Promise<Relation[]> {
    return db.relations.toArray();
  }

  async getRelationsForMemo(memoId: string): Promise<Relation[]> {
    const from = await db.relations.where('fromMemoId').equals(memoId).toArray();
    const to = await db.relations.where('toMemoId').equals(memoId).toArray();
    return [...from, ...to];
  }

  async upsertRelation(relation: Omit<Relation, 'id' | 'createdAt'>): Promise<Relation> {
    const existing = await db.relations
      .where('[fromMemoId+toMemoId]')
      .equals([relation.fromMemoId, relation.toMemoId])
      .first();

    if (existing) {
      // 異なる型が混在する場合は 'both' に昇格（keyword_overlap が manual/both を降格させない）
      const resolvedType = existing.type === relation.type ? relation.type : 'both';
      // sharedTagIds（自動）: 新しい計算結果で置き換え
      // manualTagIds（手動）: 既存を保持しつつ新規があればマージ
      const mergedManualTagIds = [
        ...new Set([...(existing.manualTagIds ?? []), ...(relation.manualTagIds ?? [])]),
      ];
      const updated: Relation = {
        ...existing,
        ...relation,
        type: resolvedType,
        manualTagIds: mergedManualTagIds,
      };
      await db.relations.put(updated);
      return updated;
    }

    const newRelation: Relation = {
      id: crypto.randomUUID(),
      ...relation,
      manualTagIds: relation.manualTagIds ?? [],
      createdAt: new Date(),
    };
    await db.relations.add(newRelation);
    return newRelation;
  }

  async deleteRelation(id: string): Promise<void> {
    await db.relations.delete(id);
  }

  async updateRelationTags(id: string, manualTagIds: string[]): Promise<void> {
    await db.relations.update(id, { manualTagIds });
  }

  async deleteRelationsForMemo(memoId: string): Promise<void> {
    await db.relations.where('fromMemoId').equals(memoId).delete();
    await db.relations.where('toMemoId').equals(memoId).delete();
  }

  // === Export ===

  async exportAll() {
    const [memos, tags, relations] = await Promise.all([
      db.memos.toArray(),
      db.tags.toArray(),
      db.relations.toArray(),
    ]);
    return { memos, tags, relations };
  }
}
