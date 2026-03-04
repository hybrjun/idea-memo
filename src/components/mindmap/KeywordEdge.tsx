import { BaseEdge, EdgeLabelRenderer, useReactFlow, type EdgeProps } from 'reactflow';
import { getFloatingEdgeParams } from './floatingEdge';

export interface KeywordEdgeData {
  label: string;
  pathOffset?: number;
}

export function KeywordEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  style,
  data,
}: EdgeProps<KeywordEdgeData>) {
  const { getNode } = useReactFlow();
  const sourceNode = getNode(source);
  const targetNode = getNode(target);

  let sx = sourceX, sy = sourceY;
  let tx = targetX, ty = targetY;

  if (sourceNode?.width && targetNode?.width) {
    const p = getFloatingEdgeParams(sourceNode, targetNode);
    sx = p.sx; sy = p.sy;
    tx = p.tx; ty = p.ty;
  }

  // 法線オフセットで制御点を計算する 2次ベジェ
  // offset が未設定の場合は ID の大小で方向を決めた小さなデフォルト曲率を使う
  const rawOffset = data?.pathOffset ?? 0;
  const offset = Math.abs(rawOffset) < 1 ? (source < target ? 70 : -70) : rawOffset;
  const mx = (sx + tx) / 2, my = (sy + ty) / 2;
  const len = Math.hypot(tx - sx, ty - sy) || 1;
  const nx = -(ty - sy) / len, ny = (tx - sx) / len;
  const cpx = mx + nx * offset, cpy = my + ny * offset;
  const edgePath = `M ${sx},${sy} Q ${cpx},${cpy} ${tx},${ty}`;
  const labelX = 0.25 * sx + 0.5 * cpx + 0.25 * tx;
  const labelY = 0.25 * sy + 0.5 * cpy + 0.25 * ty;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="nodrag nopan"
          >
            <div className="bg-white/90 border border-gray-200 text-gray-500 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap shadow-sm">
              {data.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
