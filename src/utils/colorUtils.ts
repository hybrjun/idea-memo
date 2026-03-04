// タグテキストから決定論的な色を生成
const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
  'bg-yellow-100 text-yellow-700',
  'bg-indigo-100 text-indigo-700',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTagColor(text: string): string {
  return TAG_COLORS[hashString(text) % TAG_COLORS.length];
}

export function getFreshnessColor(score: number): string {
  if (score >= 70) return 'bg-green-400';
  if (score >= 40) return 'bg-yellow-400';
  return 'bg-red-400';
}
