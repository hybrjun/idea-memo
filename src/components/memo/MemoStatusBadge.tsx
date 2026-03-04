import type { MemoStatus } from '../../types/memo';

interface MemoStatusBadgeProps {
  status: MemoStatus;
  onClick?: () => void;
}

export function MemoStatusBadge({ status, onClick }: MemoStatusBadgeProps) {
  const isStarted = status === '着手済み';

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
        min-h-[32px] transition-colors
        ${isStarted
          ? 'bg-green-100 text-green-700 active:bg-green-200'
          : 'bg-gray-100 text-gray-600 active:bg-gray-200'
        }
        ${!onClick ? 'cursor-default' : 'cursor-pointer'}
      `}
    >
      <span className={`w-2 h-2 rounded-full ${isStarted ? 'bg-green-500' : 'bg-gray-400'}`} />
      {status}
    </button>
  );
}
