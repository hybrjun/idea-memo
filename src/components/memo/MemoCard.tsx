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
  relationTags?: Tag[]; // 紐づけから派生したタグ
  onStatusToggle?: (memo: Memo) => void;
}

export function MemoCard({ memo, tags, relationTags = [], onStatusToggle }: MemoCardProps) {
  const navigate = useNavigate();
  const allTags = [...tags, ...relationTags];
  const visibleTags = allTags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenCount = allTags.length - MAX_VISIBLE_TAGS;
  const relationTagIds = new Set(relationTags.map((t) => t.id));

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
            relationTagIds.has(tag.id)
              ? (
                <span key={tag.id} className="inline-flex items-center gap-0.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">
                  <svg className="w-2.5 h-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {tag.text}
                </span>
              )
              : <TagChip key={tag.id} text={tag.text} />
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
          <MemoStatusBadge
            status={memo.status}
            onClick={onStatusToggle ? (e) => { e.stopPropagation(); onStatusToggle(memo); } : undefined}
          />
        </div>
      </div>
    </div>
  );
}
