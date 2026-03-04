export const DEFAULT_AI_MODEL = 'claude-opus-4-6';

export const AI_MODELS = [
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6（高品質）' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6（バランス）' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5（高速）' },
] as const;

export const MAX_SUGGESTION_CANDIDATES = 15;
export const MAX_RELATIONS_PER_MEMO = 10;
export const RELATION_THRESHOLD = 0.15;
