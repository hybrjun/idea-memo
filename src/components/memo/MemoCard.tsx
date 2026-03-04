import { useNavigate } from 'react-router-dom';
import type { Memo } from '../../types/memo';
import type { Tag } from '../../types/tag';
import { MemoStatusBadge } from './MemoStatusBadge';
import { FreshnessBadge } from './FreshnessBadge';
import { TagChip } from '../tags/TagChip';
import { formatRelativeTime } from '../../utils/dateUtils';
import { ROUTES } from '../../constants/routes';

const MAX_VISIBLE_TAGS = 2;

interface MemoCardProps {
  memo: Memo;
  tags: Tag[];
}

export function MemoCard({ memo, tags }: MemoCardProps) {
  const navigate = useNavigate();
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenCount = tags.length - MAX_VISIBLE_TAGS;

  return (
    <div
      onClick={() => navigate(ROUTES.MEMO_DETAIL(memo.id))}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-base font-medium text-gray-900 leading-snug line-clamp-3 flex-1">
          {memo.idea}
        </p>
        <FreshnessBadge score={memo.freshnessScore} />
      </div>

      {memo.trigger && (
        <p className="text-sm text-gray-500 mb-2 line-clamp-1">
          {memo.trigger}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {visibleTags.map((tag) => (
            <TagChip key={tag.id} text={tag.text} />
          ))}
          {hiddenCount > 0 && (
            <span className="text-xs text-gray-400 font-medium shrink-0">
              +{hiddenCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400">
            {formatRelativeTime(memo.createdAt instanceof Date ? memo.createdAt : new Date(memo.createdAt))}
          </span>
          <MemoStatusBadge status={memo.status} />
        </div>
      </div>
    </div>
  );
}
