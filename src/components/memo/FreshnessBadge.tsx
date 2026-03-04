import { getFreshnessColor } from '../../utils/colorUtils';

interface FreshnessBadgeProps {
  score: number;
}

export function FreshnessBadge({ score }: FreshnessBadgeProps) {
  const color = getFreshnessColor(score);
  const label = score >= 70 ? '新鮮' : score >= 40 ? '熟成' : '化石化';

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
