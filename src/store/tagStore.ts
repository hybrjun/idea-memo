import { create } from 'zustand';
import { getStorageAdapter } from '../db';
import type { Tag, TagFrequency } from '../types/tag';

interface TagState {
  tags: Tag[];
  selectedTagId: string | null;

  fetchTags: () => Promise<void>;
  getTagFrequencies: (memos: { tagIds: string[] }[]) => TagFrequency[];
  selectTag: (id: string | null) => void;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  selectedTagId: null,

  fetchTags: async () => {
    const tags = await getStorageAdapter().getAllTags();
    set({ tags });
  },

  getTagFrequencies: (memos) => {
    const { tags } = get();
    const freqMap = new Map<string, { count: number; lastUsedAt: Date }>();

    for (const memo of memos) {
      for (const tagId of memo.tagIds) {
        const existing = freqMap.get(tagId);
        freqMap.set(tagId, {
          count: (existing?.count ?? 0) + 1,
          lastUsedAt: existing?.lastUsedAt ?? new Date(),
        });
      }
    }

    return tags
      .filter((t) => freqMap.has(t.id))
      .map((tag) => ({
        tag,
        count: freqMap.get(tag.id)!.count,
        lastUsedAt: freqMap.get(tag.id)!.lastUsedAt,
      }))
      .sort((a, b) => b.count - a.count);
  },

  selectTag: (id) => set({ selectedTagId: id }),
}));
