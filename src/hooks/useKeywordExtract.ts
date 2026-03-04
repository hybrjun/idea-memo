import { useState, useCallback } from 'react';
import { keywordExtractor } from '../services/KeywordExtractor';

export function useKeywordExtract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extract = useCallback(async (idea: string, trigger: string): Promise<string[]> => {
    if (!idea.trim()) return [];
    setLoading(true);
    setError(null);
    try {
      const keywords = await keywordExtractor.extractFromMemo(idea, trigger);
      return keywords;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[KeywordExtractor] 抽出エラー:', msg);
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { extract, loading, error };
}
