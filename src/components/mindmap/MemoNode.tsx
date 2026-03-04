import { useContext, createContext } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { useNavigate } from 'react-router-dom';
import type { Memo } from '../../types/memo';
import { getFreshnessColor } from '../../utils/colorUtils';
import { ROUTES } from '../../constants/routes';

export const ConnectModeContext = createContext(false);

export interface MemoNodeData {
  memo: Memo;
  tagLabels: string[];
}

export function MemoNode({ data }: NodeProps<MemoNodeData>) {
  const navigate = useNavigate();
  const connectMode = useContext(ConnectModeContext);
  const { memo, tagLabels } = data;
  const freshnessColor = getFreshnessColor(memo.freshnessScore);
  const isStarted = memo.status === '着手済み';

  // 全ハンドルを source に統一（ConnectionMode.Loose で双方向接続可）
  // フローティングエッジ側でノード境界から実際の接続位置を計算するため
  // ハンドルは「接続開始のつかみどころ」として上下左右すべてに配置
  const handleClass = '!w-4 !h-4 !bg-purple-400 !border-2 !border-white';

  return (
    <>
      <Handle type="source" position={Position.Left}   id="l" className={handleClass} />
      <Handle type="source" position={Position.Top}    id="t" className={handleClass} />
      <div
        onClick={() => { if (!connectMode) navigate(ROUTES.MEMO_DETAIL(memo.id)); }}
        className={`
          relative rounded-2xl border-2 p-3 bg-white shadow-md
          min-w-[140px] max-w-[200px]
          transition-transform active:scale-95
          ${connectMode ? 'cursor-default' : 'cursor-pointer'}
          ${isStarted ? 'border-green-400' : 'border-blue-300'}
        `}
      >
        <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${freshnessColor}`} />
        <p className="text-sm font-medium line-clamp-3 text-gray-800 leading-snug pr-4">
          {memo.idea}
        </p>
        {tagLabels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tagLabels.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
        )}
        <p className={`text-[10px] mt-1.5 font-medium ${isStarted ? 'text-green-600' : 'text-gray-400'}`}>
          {memo.status}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} id="b" className={handleClass} />
      <Handle type="source" position={Position.Right}  id="r" className={handleClass} />
    </>
  );
}
