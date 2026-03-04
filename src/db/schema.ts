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
  }
}

export const db = new IdeaMemoDatabase();
