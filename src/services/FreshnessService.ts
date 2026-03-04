import { daysSince } from '../utils/dateUtils';

// 鮮度スコア: 100（作成直後）→ 0（古い）
// 60日で0になる設定
const DECAY_DAYS = 60;

export function computeFreshness(createdAt: Date): number {
  const days = daysSince(createdAt);
  const score = Math.max(0, 100 - (days / DECAY_DAYS) * 100);
  return Math.round(score);
}
