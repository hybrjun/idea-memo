import { useNavigate } from 'react-router-dom';
import { TagChip } from './TagChip';
import type { TagFrequency } from '../../types/tag';
import { ROUTES } from '../../constants/routes';

const MAX_FILTER_TAGS = 5;

interface TagFilterProps {
  tagFrequencies: TagFrequency[];
  selectedTagId: string | null;
  onSelect: (id: string | null) => void;
}

export function TagFilter({ tagFrequencies, selectedTagId, onSelect }: TagFilterProps) {
  const navigate = useNavigate();
  if (tagFrequencies.length === 0) return null;

  const visible = tagFrequencies.slice(0, MAX_FILTER_TAGS);
  const hiddenCount = tagFrequencies.length - MAX_FILTER_TAGS;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 px-4 no-scrollbar">
      <TagChip
        text="すべて"
        active={selectedTagId === null}
        onClick={() => onSelect(null)}
        size="md"
      />
      {visible.map(({ tag, count }) => (
        <TagChip
          key={tag.id}
          text={`${tag.text} ${count}`}
          active={selectedTagId === tag.id}
          onClick={() => onSelect(tag.id)}
          size="md"
        />
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={() => navigate(ROUTES.TAGS)}
          className="shrink-0 text-xs text-blue-500 font-medium px-2 py-1 rounded-full bg-blue-50 active:bg-blue-100 whitespace-nowrap"
        >
          +{hiddenCount} もっと見る
        </button>
      )}
    </div>
  );
}
