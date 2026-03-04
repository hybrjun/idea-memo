import { getTagColor } from '../../utils/colorUtils';
import type { TagFrequency } from '../../types/tag';

interface TagCloudProps {
  tagFrequencies: TagFrequency[];
  selectedTagId?: string | null;
  onSelect?: (id: string | null) => void;
}

// 使用回数に応じてフォントサイズクラスを返す
function getSizeClass(count: number, maxCount: number): string {
  const ratio = maxCount > 1 ? count / maxCount : 1;
  if (ratio >= 0.7) return 'text-xl font-bold px-4 py-2';
  if (ratio >= 0.4) return 'text-base font-semibold px-3 py-1.5';
  return 'text-sm font-medium px-2.5 py-1';
}

export function TagCloud({ tagFrequencies, selectedTagId, onSelect }: TagCloudProps) {
  if (tagFrequencies.length === 0) return null;

  const maxCount = tagFrequencies[0]?.count ?? 1;

  // count >= 2 を上段、count === 1 を折りたたみ対象に分ける
  const mainTags = tagFrequencies.filter(({ count }) => count >= 2);
  const rareTags = tagFrequencies.filter(({ count }) => count === 1);

  const renderTag = ({ tag, count }: TagFrequency) => {
    const isSelected = selectedTagId === tag.id;
    const sizeClass = getSizeClass(count, maxCount);
    const colorClass = isSelected ? 'bg-blue-600 text-white' : getTagColor(tag.text);

    return (
      <button
        key={tag.id}
        onClick={() => onSelect?.(isSelected ? null : tag.id)}
        className={`rounded-full transition-colors active:opacity-80 ${sizeClass} ${colorClass}`}
      >
        {tag.text}
        <span className="opacity-50 ml-1 text-[0.7em]">{count}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* よく使うタグ（count >= 2）*/}
      {mainTags.length > 0 && (
        <div className="flex flex-wrap gap-2 leading-relaxed">
          {mainTags.map(renderTag)}
        </div>
      )}

      {/* 1回だけのタグ */}
      {rareTags.length > 0 && (
        <details className="group">
          <summary className="text-xs text-gray-400 cursor-pointer list-none flex items-center gap-1 select-none">
            <svg
              className="w-3 h-3 transition-transform group-open:rotate-90"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            1件のみのタグ（{rareTags.length}個）
          </summary>
          <div className="flex flex-wrap gap-2 mt-2 leading-relaxed">
            {rareTags.map(renderTag)}
          </div>
        </details>
      )}
    </div>
  );
}
