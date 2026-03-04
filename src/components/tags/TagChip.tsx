import { getTagColor } from '../../utils/colorUtils';

interface TagChipProps {
  text: string;
  onClick?: () => void;
  active?: boolean;
  size?: 'sm' | 'md';
}

export function TagChip({ text, onClick, active = false, size = 'sm' }: TagChipProps) {
  const colorClass = active ? 'bg-blue-600 text-white' : getTagColor(text);
  const sizeClass = size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5';

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        inline-flex items-center rounded-full font-medium
        ${colorClass} ${sizeClass}
        ${onClick ? 'active:opacity-80 cursor-pointer' : 'cursor-default'}
        transition-colors
      `}
    >
      {text}
    </button>
  );
}
