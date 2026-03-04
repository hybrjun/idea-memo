import { useNavigate } from 'react-router-dom';
import type { Relation } from '../../types/relation';
import type { Memo } from '../../types/memo';
import type { Tag } from '../../types/tag';
import { TagChip } from '../tags/TagChip';
import { ROUTES } from '../../constants/routes';

interface RelatedMemoListProps {
  relations: Relation[];
  memos: Memo[];
  tags: Tag[];
}

export function RelatedMemoList({ relations, memos, tags }: RelatedMemoListProps) {
  const navigate = useNavigate();

  if (relations.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        関連アイデア
      </h2>
      <div className="flex flex-col gap-2">
        {relations.slice(0, 5).map((rel) => {
          const relatedMemo = memos.find((m) => m.id === rel.toMemoId || m.id === rel.fromMemoId);
          if (!relatedMemo) return null;

          const sharedTags = tags.filter((t) => rel.sharedTagIds.includes(t.id));
          const strengthPct = Math.round(rel.strength * 100);

          return (
            <div
              key={rel.id}
              onClick={() => navigate(ROUTES.MEMO_DETAIL(relatedMemo.id))}
              className="bg-blue-50 rounded-xl p-3 cursor-pointer active:bg-blue-100"
            >
              <p className="text-sm text-gray-800 line-clamp-2 mb-2">
                {relatedMemo.idea}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {sharedTags.slice(0, 3).map((t) => (
                    <TagChip key={t.id} text={t.text} />
                  ))}
                </div>
                <span className="text-xs text-blue-500 font-medium shrink-0 ml-2">
                  関連度 {strengthPct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
