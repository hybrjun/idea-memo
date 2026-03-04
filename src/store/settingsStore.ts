import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AISettings } from '../types/ai';

interface SettingsState {
  ai: AISettings;
  voiceLanguage: string;
  setApiKey: (key: string) => void;
  setModel: (model: string) => void;
  toggleAI: () => void;
  setVoiceLanguage: (lang: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ai: { apiKey: '', model: 'claude-opus-4-6', enabled: false },
      voiceLanguage: 'ja-JP',
      setApiKey: (apiKey) =>
        set((s) => ({ ai: { ...s.ai, apiKey, enabled: !!apiKey } })),
      setModel: (model) =>
        set((s) => ({ ai: { ...s.ai, model } })),
      toggleAI: () =>
        set((s) => ({ ai: { ...s.ai, enabled: !s.ai.enabled } })),
      setVoiceLanguage: (voiceLanguage) => set({ voiceLanguage }),
    }),
    { name: 'idea-memo-settings' }
  )
);
