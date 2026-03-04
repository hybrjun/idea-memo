import { create } from 'zustand';
import { getStorageAdapter } from '../db';
import type { Memo, MemoCreateInput, MemoUpdateInput } from '../types/memo';
import type { QueryOptions } from '../db/IStorageAdapter';

interface MemoState {
  memos: Memo[];
  loading: boolean;
  error: string | null;

  fetchMemos: (options?: QueryOptions) => Promise<void>;
  createMemo: (input: MemoCreateInput) => Promise<Memo>;
  updateMemo: (id: string, input: MemoUpdateInput) => Promise<Memo>;
  deleteMemo: (id: string) => Promise<void>;
}

export const useMemoStore = create<MemoState>((set) => ({
  memos: [],
  loading: false,
  error: null,

  fetchMemos: async (options) => {
    set({ loading: true, error: null });
    try {
      const memos = await getStorageAdapter().getMemos(options);
      set({ memos, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  createMemo: async (input) => {
    const memo = await getStorageAdapter().createMemo(input);
    set((s) => ({ memos: [memo, ...s.memos] }));
    return memo;
  },

  updateMemo: async (id, input) => {
    const memo = await getStorageAdapter().updateMemo(id, input);
    set((s) => ({
      memos: s.memos.map((m) => (m.id === id ? memo : m)),
    }));
    return memo;
  },

  deleteMemo: async (id) => {
    await getStorageAdapter().deleteMemo(id);
    await getStorageAdapter().deleteRelationsForMemo(id);
    set((s) => ({ memos: s.memos.filter((m) => m.id !== id) }));
  },
}));
