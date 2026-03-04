export interface AISettings {
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface AISuggestion {
  memoId: string;
  reasoning: string;
  score: number;
}

export interface AIStreamChunk {
  type: 'text' | 'done' | 'error';
  text?: string;
  error?: string;
}
