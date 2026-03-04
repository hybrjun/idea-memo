import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { SupabaseAdapter } from '../db/SupabaseAdapter';
import { DexieAdapter } from '../db/DexieAdapter';
import { setStorageAdapter } from '../db';
import { useMemoStore } from './memoStore';
import { useTagStore } from './tagStore';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  initialize(): Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      setStorageAdapter(new SupabaseAdapter());
      set({ user: session.user });
    } else {
      setStorageAdapter(new DexieAdapter());
    }

    set({ initialized: true });

    supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_IN' && newSession?.user) {
        setStorageAdapter(new SupabaseAdapter());
        set({ user: newSession.user });
        await Promise.all([
          useMemoStore.getState().fetchMemos(),
          useTagStore.getState().fetchTags(),
        ]);
      } else if (event === 'SIGNED_OUT') {
        setStorageAdapter(new DexieAdapter());
        set({ user: null });
      }
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) throw error;
  },

  signUp: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signUp({ email, password });
    set({ loading: false });
    if (error) throw error;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
}));
