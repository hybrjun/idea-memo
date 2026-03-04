import { supabase } from '../lib/supabase';
import type { IStorageAdapter, QueryOptions } from './IStorageAdapter';
import type { Memo, MemoCreateInput, MemoUpdateInput, MemoStatus, EditStage } from '../types/memo';
import type { Tag } from '../types/tag';
import type { Relation, RelationType } from '../types/relation';

// ---- DB row types ----

interface MemoRow {
  id: string;
  user_id: string;
  idea: string;
  trigger: string;
  details: string;
  action_items: string[];
  status: string;
  edit_stage: string;
  tag_ids: string[];
  freshness_score: number;
  created_at: string;
  updated_at: string;
}

interface TagRow {
  id: string;
  user_id: string;
  text: string;
  normalized_text: string;
  created_at: string;
}

interface RelationRow {
  id: string;
  user_id: string;
  from_memo_id: string;
  to_memo_id: string;
  type: string;
  strength: number;
  shared_tag_ids: string[];
  created_at: string;
}

// ---- Converters ----

function rowToMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    idea: row.idea,
    trigger: row.trigger,
    details: row.details,
    actionItems: row.action_items,
    status: row.status as MemoStatus,
    editStage: row.edit_stage as EditStage,
    tagIds: row.tag_ids,
    freshnessScore: row.freshness_score,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToTag(row: TagRow): Tag {
  return {
    id: row.id,
    text: row.text,
    normalizedText: row.normalized_text,
    createdAt: new Date(row.created_at),
  };
}

function rowToRelation(row: RelationRow): Relation {
  return {
    id: row.id,
    fromMemoId: row.from_memo_id,
    toMemoId: row.to_memo_id,
    type: row.type as RelationType,
    strength: row.strength,
    sharedTagIds: row.shared_tag_ids,
    createdAt: new Date(row.created_at),
  };
}

// ---- Adapter ----

export class SupabaseAdapter implements IStorageAdapter {
  async initialize(): Promise<void> {
    // Supabase client is already initialized via singleton
  }

  private async getUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return user.id;
  }

  // === Memos ===

  async getMemo(id: string): Promise<Memo | undefined> {
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data ? rowToMemo(data as MemoRow) : undefined;
  }

  async getMemos(options: QueryOptions = {}): Promise<Memo[]> {
    const {
      orderBy = 'createdAt',
      direction = 'desc',
      tagId,
      status,
      limit,
      offset,
    } = options;

    const columnMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      freshnessScore: 'freshness_score',
    };
    const col = columnMap[orderBy] ?? 'created_at';

    let query = supabase
      .from('memos')
      .select('*')
      .order(col, { ascending: direction === 'asc' });

    if (status) {
      query = query.eq('status', status);
    }
    if (tagId) {
      query = query.contains('tag_ids', [tagId]);
    }
    if (offset) {
      query = query.range(offset, offset + (limit ?? 1000) - 1);
    } else if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as MemoRow[]).map(rowToMemo);
  }

  async createMemo(input: MemoCreateInput): Promise<Memo> {
    const userId = await this.getUserId();
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      user_id: userId,
      idea: input.idea,
      trigger: input.trigger ?? '',
      details: '',
      action_items: [] as string[],
      status: '未着手',
      edit_stage: 'rough',
      tag_ids: [] as string[],
      freshness_score: 100,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase.from('memos').insert(row).select().single();
    if (error) throw error;
    return rowToMemo(data as MemoRow);
  }

  async updateMemo(id: string, input: MemoUpdateInput): Promise<Memo> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.idea !== undefined) updates.idea = input.idea;
    if (input.trigger !== undefined) updates.trigger = input.trigger;
    if (input.details !== undefined) updates.details = input.details;
    if (input.actionItems !== undefined) updates.action_items = input.actionItems;
    if (input.status !== undefined) updates.status = input.status;
    if (input.editStage !== undefined) updates.edit_stage = input.editStage;
    if (input.tagIds !== undefined) updates.tag_ids = input.tagIds;
    if (input.freshnessScore !== undefined) updates.freshness_score = input.freshnessScore;

    const { data, error } = await supabase
      .from('memos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToMemo(data as MemoRow);
  }

  async deleteMemo(id: string): Promise<void> {
    await this.deleteRelationsForMemo(id);
    const { error } = await supabase.from('memos').delete().eq('id', id);
    if (error) throw error;
  }

  // === Tags ===

  async getAllTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as TagRow[]).map(rowToTag);
  }

  async findOrCreateTag(text: string): Promise<Tag> {
    const userId = await this.getUserId();
    const normalized = text.normalize('NFC').toLowerCase().trim();
    if (!normalized) throw new Error('Tag text cannot be empty');

    const { data: existing } = await supabase
      .from('tags')
      .select('*')
      .eq('normalized_text', normalized)
      .eq('user_id', userId)
      .single();

    if (existing) return rowToTag(existing as TagRow);

    const row = {
      id: crypto.randomUUID(),
      user_id: userId,
      text,
      normalized_text: normalized,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('tags').insert(row).select().single();
    if (error) throw error;
    return rowToTag(data as TagRow);
  }

  async deleteUnusedTags(): Promise<number> {
    const [allMemos, allTags] = await Promise.all([
      this.getMemos(),
      this.getAllTags(),
    ]);
    const usedTagIds = new Set(allMemos.flatMap(m => m.tagIds));
    const unusedIds = allTags.filter(t => !usedTagIds.has(t.id)).map(t => t.id);
    if (unusedIds.length === 0) return 0;
    const { error } = await supabase.from('tags').delete().in('id', unusedIds);
    if (error) throw error;
    return unusedIds.length;
  }

  async mergeTags(canonicalTagId: string, mergeTagIds: string[]): Promise<void> {
    const mergeSet = new Set(mergeTagIds);
    const allMemos = await this.getMemos();
    const affected = allMemos.filter(m => m.tagIds.some(id => mergeSet.has(id)));

    for (const memo of affected) {
      const newTagIds = [
        ...new Set([
          ...memo.tagIds.filter(id => !mergeSet.has(id)),
          canonicalTagId,
        ]),
      ];
      await this.updateMemo(memo.id, { tagIds: newTagIds });
    }

    const { error } = await supabase.from('tags').delete().in('id', mergeTagIds);
    if (error) throw error;
  }

  // === Relations ===

  async getAllRelations(): Promise<Relation[]> {
    const { data, error } = await supabase.from('relations').select('*');
    if (error) throw error;
    return (data as RelationRow[]).map(rowToRelation);
  }

  async getRelationsForMemo(memoId: string): Promise<Relation[]> {
    const { data, error } = await supabase
      .from('relations')
      .select('*')
      .or(`from_memo_id.eq.${memoId},to_memo_id.eq.${memoId}`);
    if (error) throw error;
    return (data as RelationRow[]).map(rowToRelation);
  }

  async upsertRelation(relation: Omit<Relation, 'id' | 'createdAt'>): Promise<Relation> {
    const userId = await this.getUserId();

    // Check existing (both directions)
    const { data: existingArr } = await supabase
      .from('relations')
      .select('*')
      .or(
        `and(from_memo_id.eq.${relation.fromMemoId},to_memo_id.eq.${relation.toMemoId}),` +
        `and(from_memo_id.eq.${relation.toMemoId},to_memo_id.eq.${relation.fromMemoId})`
      );

    const existing = existingArr?.[0] as RelationRow | undefined;

    if (existing) {
      const resolvedType: RelationType =
        existing.type === relation.type ? relation.type : 'both';
      const mergedTagIds = [...new Set([...existing.shared_tag_ids, ...relation.sharedTagIds])];
      const { data, error } = await supabase
        .from('relations')
        .update({
          type: resolvedType,
          strength: relation.strength,
          shared_tag_ids: mergedTagIds,
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return rowToRelation(data as RelationRow);
    }

    const row = {
      id: crypto.randomUUID(),
      user_id: userId,
      from_memo_id: relation.fromMemoId,
      to_memo_id: relation.toMemoId,
      type: relation.type,
      strength: relation.strength,
      shared_tag_ids: relation.sharedTagIds,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('relations').insert(row).select().single();
    if (error) throw error;
    return rowToRelation(data as RelationRow);
  }

  async deleteRelation(id: string): Promise<void> {
    const { error } = await supabase.from('relations').delete().eq('id', id);
    if (error) throw error;
  }

  async updateRelationTags(id: string, sharedTagIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('relations')
      .update({ shared_tag_ids: sharedTagIds })
      .eq('id', id);
    if (error) throw error;
  }

  async deleteRelationsForMemo(memoId: string): Promise<void> {
    const { error } = await supabase
      .from('relations')
      .delete()
      .or(`from_memo_id.eq.${memoId},to_memo_id.eq.${memoId}`);
    if (error) throw error;
  }

  // === Export ===

  async exportAll() {
    const [memos, tags, relations] = await Promise.all([
      this.getMemos(),
      this.getAllTags(),
      this.getAllRelations(),
    ]);
    return { memos, tags, relations };
  }
}
