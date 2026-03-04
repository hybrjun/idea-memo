import Dexie, { type Table } from 'dexie';
import type { Memo } from '../types/memo';
import type { Tag } from '../types/tag';
import type { Relation } from '../types/relation';

export class IdeaMemoDatabase extends Dexie {
  memos!: Table<Memo, string>;
  tags!: Table<Tag, string>;
  relations!: Table<Relation, string>;

  constructor() {
    super('IdeaMemoDB');

    this.version(1).stores({
      memos: '&id, status, editStage, createdAt, updatedAt, freshnessScore, *tagIds',
      tags: '&id, normalizedText, createdAt',
      relations: '&id, fromMemoId, toMemoId, type, [fromMemoId+toMemoId]',
    });

    this.version(2).stores({
      memos: '&id, status, editStage, createdAt, updatedAt, freshnessScore, *tagIds',
      tags: '&id, normalizedText, createdAt',
      relations: '&id, fromMemoId, toMemoId, type, [fromMemoId+toMemoId]',
    }).upgrade((tx) => {
      // 既存の relation に manualTagIds フィールドを追加（旧 sharedTagIds は自動タグとして保持）
      return tx.table('relations').toCollection().modify((rel) => {
        if (rel.manualTagIds === undefined) rel.manualTagIds = [];
      });
    });
  }
}

export const db = new IdeaMemoDatabase();
