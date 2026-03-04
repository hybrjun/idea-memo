import type { Memo, MemoCreateInput, MemoUpdateInput } from '../types/memo';
import type { Tag } from '../types/tag';
import type { Relation } from '../types/relation';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'freshnessScore';
  direction?: 'asc' | 'desc';
  tagId?: string;
  status?: Memo['status'];
}

/**
 * ストレージ抽象インターフェース。
 * フェーズ3でDexie→REST APIに切り替える際はここを実装するだけでよい。
 */
export interface IStorageAdapter {
  initialize(): Promise<void>;

  // Memos
  getMemo(id: string): Promise<Memo | undefined>;
  getMemos(options?: QueryOptions): Promise<Memo[]>;
  createMemo(input: MemoCreateInput): Promise<Memo>;
  updateMemo(id: string, input: MemoUpdateInput): Promise<Memo>;
  deleteMemo(id: string): Promise<void>;

  // Tags
  getAllTags(): Promise<Tag[]>;
  findOrCreateTag(text: string): Promise<Tag>;
  deleteUnusedTags(): Promise<number>;
  /** canonicalTagId に残し、mergeTagIds を使っている全メモを書き換えてから削除する */
  mergeTags(canonicalTagId: string, mergeTagIds: string[]): Promise<void>;

  // Relations
  getAllRelations(): Promise<Relation[]>;
  getRelationsForMemo(memoId: string): Promise<Relation[]>;
  upsertRelation(relation: Omit<Relation, 'id' | 'createdAt'>): Promise<Relation>;
  deleteRelation(id: string): Promise<void>;
  updateRelationTags(id: string, sharedTagIds: string[]): Promise<void>;
  deleteRelationsForMemo(memoId: string): Promise<void>;

  // Export
  exportAll(): Promise<{ memos: Memo[]; tags: Tag[]; relations: Relation[] }>;
}
