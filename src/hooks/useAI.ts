import { useState, useCallback, useRef } from 'react';
import { aiService } from '../services/AIService';
import { useSettingsStore } from '../store/settingsStore';
import type { Memo } from '../types/memo';
import type { AISuggestion } from '../types/ai';

export function useAISuggestions() {
  const [streamText, setStreamText] = useState('');
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);
  const settings = useSettingsStore((s) => s.ai);

  const getSuggestions = useCallback(
    async (newMemo: Memo, candidates: Memo[]) => {
      abortRef.current = false;
      setIsStreaming(true);
      setStreamText('');
      setSuggestions([]);
      setError(null);
      let fullText = '';

      try {
        for await (const chunk of aiService.suggestConnections(newMemo, candidates, settings)) {
          if (abortRef.current) break;
          if (chunk.type === 'text') {
            fullText += chunk.text;
            setStreamText(fullText);
          } else if (chunk.type === 'error') {
            setError(chunk.error ?? 'エラー');
          }
        }
        if (fullText) {
          setSuggestions(aiService.parseSuggestions(fullText));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'AI接続エラー');
      } finally {
        setIsStreaming(false);
      }
    },
    [settings]
  );

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { streamText, suggestions, isStreaming, error, getSuggestions, abort };
}

export function useAISummary() {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settings = useSettingsStore((s) => s.ai);

  const summarize = useCallback(
    async (memos: Memo[]) => {
      setLoading(true);
      setError(null);
      try {
        const text = await aiService.summarizeTheme(memos, settings);
        setSummary(text);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'AI接続エラー');
      } finally {
        setLoading(false);
      }
    },
    [settings]
  );

  return { summary, loading, error, summarize };
}
