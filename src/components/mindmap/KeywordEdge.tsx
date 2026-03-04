import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from 'reactflow';
import { getFloatingEdgeParams } from './floatingEdge';

export interface KeywordEdgeData {
  label: string;
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

  let sx = sourceX, sy = sourceY, sp = sourcePosition;
  let tx = targetX, ty = targetY, tp = targetPosition;

  if (sourceNode?.width && targetNode?.width) {
    const p = getFloatingEdgeParams(sourceNode, targetNode);
    sx = p.sx; sy = p.sy; sp = p.sp;
    tx = p.tx; ty = p.ty; tp = p.tp;
  }

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx, sourceY: sy, sourcePosition: sp,
    targetX: tx, targetY: ty, targetPosition: tp,
  });

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
