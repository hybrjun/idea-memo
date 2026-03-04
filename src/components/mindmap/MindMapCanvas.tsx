import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ConnectionMode,
  type Node,
  type Edge,
  type Connection,
  type EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { MemoNode, ConnectModeContext, type MemoNodeData } from './MemoNode';
import { ManualEdge } from './ManualEdge';
import { KeywordEdge } from './KeywordEdge';
import type { Memo } from '../../types/memo';
import type { Relation } from '../../types/relation';
import type { Tag } from '../../types/tag';

const nodeTypes = { memoNode: MemoNode };
const edgeTypes = { manualEdge: ManualEdge, keywordEdge: KeywordEdge };

// ─── 交差最小化ユーティリティ ───────────────────────────────────────────────

type P2 = { x: number; y: number };

/** CCW（反時計回り）判定 */
function ccw(a: P2, b: P2, c: P2): boolean {
  return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
}

/** 線分 ab と cd が交差するか（端点共有は除く） */
function segmentsIntersect(a: P2, b: P2, c: P2, d: P2): boolean {
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

/** ノード中心間の直線で交差数をカウント */
function countCrossings(
  compEdges: Array<{ source: string; target: string }>,
  pos: Map<string, P2>,
): number {
  let n = 0;
  for (let i = 0; i < compEdges.length; i++) {
    for (let j = i + 1; j < compEdges.length; j++) {
      const e1 = compEdges[i], e2 = compEdges[j];
      // 端点を共有するエッジは交差にならない
      if (e1.source === e2.source || e1.source === e2.target ||
          e1.target === e2.source || e1.target === e2.target) continue;
      const p1 = pos.get(e1.source), p2 = pos.get(e1.target);
      const p3 = pos.get(e2.source), p4 = pos.get(e2.target);
      if (p1 && p2 && p3 && p4 && segmentsIntersect(p1, p2, p3, p4)) n++;
    }
  }
  return n;
}

/**
 * グリーディなノード位置交換で交差数を削減する。
 * フォースシミュレーション後のポストプロセスとして実行。
 */
function reduceCrossings(
  compNodes: Node[],
  compEdges: Array<{ source: string; target: string }>,
  pos: Map<string, P2>,
  maxPasses = 6,
): Map<string, P2> {
  const cur = new Map(pos);
  let crossings = countCrossings(compEdges, cur);
  if (crossings === 0) return cur;

  for (let pass = 0; pass < maxPasses && crossings > 0; pass++) {
    let improved = false;
    outer:
    for (let i = 0; i < compNodes.length; i++) {
      for (let j = i + 1; j < compNodes.length; j++) {
        const ia = compNodes[i].id, ib = compNodes[j].id;
        const pa = cur.get(ia)!, pb = cur.get(ib)!;
        // 位置を交換して交差数が減るか試す
        cur.set(ia, pb);
        cur.set(ib, pa);
        const c = countCrossings(compEdges, cur);
        if (c < crossings) {
          crossings = c;
          improved = true;
          if (crossings === 0) break outer;
        } else {
          // 改善しなければ戻す
          cur.set(ia, pa);
          cur.set(ib, pb);
        }
      }
    }
    if (!improved) break;
  }
  return cur;
}

// ─── フォースシミュレーション ─────────────────────────────────────────────

/**
 * 1つの連結成分に対してバネ-反発力シミュレーションを実行し、
 * 各ノードの最終座標を返す。
 *
 * - 接続ノード間にはバネ引力（理想距離に近づける）
 * - 全ノード間にはクーロン斥力（重なり防止・十分な間隔を確保）
 * - 次数に比例した中心引力（接続数が多いほど中央寄り）
 */
function runForceSimulation(
  compNodes: Node[],
  compEdges: Edge[],
  degree: (id: string) => number,
): Map<string, P2> {
  const n = compNodes.length;
  if (n === 0) return new Map();
  if (n === 1) return new Map([[compNodes[0].id, { x: 0, y: 0 }]]);

  const maxDeg = Math.max(...compNodes.map((nd) => degree(nd.id)), 1);

  // 初期配置: 次数が高いほど中心に近い円周上に並べる（広めの半径で開始）
  type PV = P2 & { vx: number; vy: number };
  const pos = new Map<string, PV>();
  compNodes.forEach((nd, i) => {
    const r = ((maxDeg - degree(nd.id)) / maxDeg) * 420 + 120;
    const angle = (i / n) * 2 * Math.PI;
    pos.set(nd.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r, vx: 0, vy: 0 });
  });

  const IDEAL = 520;    // バネ自然長: カード間に十分な余白を確保
  const K_S   = 0.08;   // バネ定数
  const K_R   = 340000; // 斥力定数（強めにして重なりを防ぐ）
  const K_C   = 0.016;  // 中心引力係数
  const DAMP  = 0.78;   // 速度減衰率

  for (let iter = 0; iter < 600; iter++) {
    const fx = new Map<string, number>(compNodes.map((nd) => [nd.id, 0]));
    const fy = new Map<string, number>(compNodes.map((nd) => [nd.id, 0]));

    // ── バネ引力（エッジで繋がったノード同士） ──
    compEdges.forEach((e) => {
      const a = pos.get(e.source), b = pos.get(e.target);
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = K_S * (d - IDEAL);
      const nx = dx / d, ny = dy / d;
      fx.set(e.source, fx.get(e.source)! + nx * f);
      fy.set(e.source, fy.get(e.source)! + ny * f);
      fx.set(e.target, fx.get(e.target)! - nx * f);
      fy.set(e.target, fy.get(e.target)! - ny * f);
    });

    // ── クーロン斥力（全ノード対） ──
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = pos.get(compNodes[i].id)!;
        const b = pos.get(compNodes[j].id)!;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const f = K_R / (d * d);
        const nx = dx / d, ny = dy / d;
        fx.set(compNodes[i].id, fx.get(compNodes[i].id)! - nx * f);
        fy.set(compNodes[i].id, fy.get(compNodes[i].id)! - ny * f);
        fx.set(compNodes[j].id, fx.get(compNodes[j].id)! + nx * f);
        fy.set(compNodes[j].id, fy.get(compNodes[j].id)! + ny * f);
      }
    }

    // ── 中心引力（次数が高いほど原点に引き寄せる） ──
    compNodes.forEach((nd) => {
      const p = pos.get(nd.id)!;
      const g = K_C * (degree(nd.id) / maxDeg);
      fx.set(nd.id, fx.get(nd.id)! - p.x * g);
      fy.set(nd.id, fy.get(nd.id)! - p.y * g);
    });

    // ── 速度・位置を更新 ──
    compNodes.forEach((nd) => {
      const p = pos.get(nd.id)!;
      p.vx = (p.vx + fx.get(nd.id)!) * DAMP;
      p.vy = (p.vy + fy.get(nd.id)!) * DAMP;
      p.x += p.vx;
      p.y += p.vy;
    });
  }

  return new Map(compNodes.map((nd) => [nd.id, { x: pos.get(nd.id)!.x, y: pos.get(nd.id)!.y }]));
}

/**
 * フォースレイアウト（メインエントリ）:
 * - 連結成分ごとにシミュレーションを実行し横に並べる
 * - 孤立ノードはグリッドで下段に配置
 */
function applyForceLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const adj = new Map<string, Set<string>>();
  nodes.forEach((n) => adj.set(n.id, new Set()));
  edges.forEach((e) => {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  });
  const degree = (id: string) => adj.get(id)?.size ?? 0;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const connectedNodes = nodes.filter((n) => degree(n.id) > 0);
  const isolatedNodes  = nodes.filter((n) => degree(n.id) === 0);

  // 連結成分を BFS で列挙
  const visited = new Set<string>();
  const components: Node[][] = [];
  for (const node of connectedNodes) {
    if (!visited.has(node.id)) {
      const comp: Node[] = [];
      const q = [node.id];
      visited.add(node.id);
      while (q.length) {
        const cur = q.shift()!;
        comp.push(nodeMap.get(cur)!);
        for (const nb of adj.get(cur)!) {
          if (!visited.has(nb)) { visited.add(nb); q.push(nb); }
        }
      }
      components.push(comp);
    }
  }
  components.sort((a, b) => b.length - a.length);

  let offsetX = 0;
  let globalMaxAbsY = 0;
  const layoutedConnected: Node[] = [];

  for (const comp of components) {
    const compIds = new Set(comp.map((n) => n.id));
    const compEdges = edges.filter((e) => compIds.has(e.source) && compIds.has(e.target));

    // フォースシミュレーションで有機的な配置を得る
    const simPos = runForceSimulation(comp, compEdges, degree);

    // 交差最小化ポストプロセス（ノード位置のグリーディ交換）
    const edgePairs = compEdges.map((e) => ({ source: e.source, target: e.target }));
    const finalPos = reduceCrossings(comp, edgePairs, simPos);

    const xs = [...finalPos.values()].map((p) => p.x);
    const ys = [...finalPos.values()].map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const cx = (minX + maxX) / 2;
    const width = maxX - minX + 300;
    const maxAbsY = Math.max(...ys.map(Math.abs));

    comp.forEach((n) => {
      const p = finalPos.get(n.id)!;
      layoutedConnected.push({
        ...n,
        position: {
          x: Math.round(p.x - cx + offsetX + width / 2),
          y: Math.round(p.y),
        },
      });
    });

    globalMaxAbsY = Math.max(globalMaxAbsY, maxAbsY);
    offsetX += width + 200;
  }

  const COLS = 4, IW = 320, IH = 200;
  const startY = components.length > 0 ? globalMaxAbsY + 200 : 0;
  const layoutedIsolated = isolatedNodes.map((n, i) => ({
    ...n,
    position: { x: (i % COLS) * IW, y: startY + Math.floor(i / COLS) * IH },
  }));

  return [...layoutedConnected, ...layoutedIsolated];
}

function FitViewButton() {
  const { fitView } = useReactFlow();
  return (
    <button
      onClick={() => fitView({ duration: 300 })}
      className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs shadow-sm text-gray-600 hover:bg-gray-50 transition-colors"
    >
      全体表示
    </button>
  );
}

interface MindMapCanvasProps {
  memos: Memo[];
  relations: Relation[];
  tags: Tag[];
  onManualConnect?: (sourceId: string, targetId: string) => Promise<void>;
  onRelationDelete?: (relationId: string) => Promise<void>;
  onRelationTagsUpdate?: (relationId: string, sharedTagIds: string[]) => Promise<void>;
}

export function MindMapCanvas({
  memos,
  relations,
  tags,
  onManualConnect,
  onRelationDelete,
  onRelationTagsUpdate,
}: MindMapCanvasProps) {
  const onManualConnectRef = useRef(onManualConnect);
  const onRelationDeleteRef = useRef(onRelationDelete);
  const onRelationTagsUpdateRef = useRef(onRelationTagsUpdate);
  useEffect(() => { onManualConnectRef.current = onManualConnect; }, [onManualConnect]);
  useEffect(() => { onRelationDeleteRef.current = onRelationDelete; }, [onRelationDelete]);
  useEffect(() => { onRelationTagsUpdateRef.current = onRelationTagsUpdate; }, [onRelationTagsUpdate]);

  const [connectMode, setConnectMode] = useState(false);

  const tagMap = useMemo(() =>
    new Map(tags.map((t) => [t.id, t.text])),
    [tags]
  );

  const rawNodes = useMemo<Node<MemoNodeData>[]>(() =>
    memos.map((memo) => ({
      id: memo.id,
      type: 'memoNode',
      position: { x: 0, y: 0 },
      data: {
        memo,
        tagLabels: memo.tagIds
          .map((id) => tagMap.get(id))
          .filter((t): t is string => !!t),
      },
    })), [memos, tagMap]);

  const rawEdges = useMemo<Edge[]>(() =>
    relations.map((rel) => {
      const isManual = rel.type === 'manual';
      const isBoth = rel.type === 'both';
      const needsManualUI = isManual || isBoth;

      const sharedLabels = rel.sharedTagIds
        .map((id) => tagMap.get(id))
        .filter((t): t is string => !!t)
        .slice(0, 2);
      const label = sharedLabels.join(' · ');

      const kwStrokeWidth = Math.max(1, Math.round(rel.strength * 5));

      // タイプ別に色・線スタイルを決定
      let stroke: string;
      let strokeWidth: number;
      let strokeDasharray: string | undefined;
      if (isBoth) {
        stroke = '#7c3aed';   // 紫：自動＋手動
        strokeWidth = 3;
        strokeDasharray = undefined;
      } else if (isManual) {
        stroke = '#f59e0b';   // 琥珀：手動のみ（破線）
        strokeWidth = 2;
        strokeDasharray = '6 3';
      } else {
        stroke = kwStrokeWidth >= 4 ? '#60a5fa' : '#bfdbfe'; // 青：自動のみ
        strokeWidth = kwStrokeWidth;
        strokeDasharray = undefined;
      }

      return {
        id: rel.id,
        source: rel.fromMemoId,
        target: rel.toMemoId,
        type: needsManualUI ? 'manualEdge' : 'keywordEdge',
        style: { strokeWidth, stroke, strokeDasharray },
        animated: false,
        data: needsManualUI
          ? {
              sharedTagIds: rel.sharedTagIds,
              relationType: rel.type,
              onDelete: (id: string) => onRelationDeleteRef.current?.(id),
              onTagsUpdate: (id: string, tagIds: string[]) =>
                onRelationTagsUpdateRef.current?.(id, tagIds),
            }
          : { label },
      };
    }), [relations, tagMap]);

  const layoutedNodes = useMemo(() =>
    applyForceLayout(rawNodes, rawEdges),
    [rawNodes, rawEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges);

  useEffect(() => {
    setNodes((current) => {
      const posMap = new Map(current.map((n) => [n.id, n.position]));
      return layoutedNodes.map((n) => ({
        ...n,
        position: posMap.has(n.id) ? posMap.get(n.id)! : n.position,
      }));
    });
  }, [layoutedNodes, setNodes]);

  // rawEdges 更新時は選択状態を維持しながら反映
  useEffect(() => {
    setEdges((prev) => {
      const selectedIds = new Set(prev.filter((e) => e.selected).map((e) => e.id));
      return rawEdges.map((e) =>
        selectedIds.has(e.id) ? { ...e, selected: true } : e
      );
    });
  }, [rawEdges, setEdges]);

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;
    // DB保存 → reloadRelations → rawEdges更新の順で反映（楽観的更新なし）
    onManualConnectRef.current?.(connection.source, connection.target);
  }, []);

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const change of changes) {
      if (change.type === 'remove') {
        onRelationDeleteRef.current?.(change.id);
      }
    }
    onEdgesChange(changes);
  }, [onEdgesChange]);

  return (
    <ConnectModeContext.Provider value={connectMode}>
      <div style={{ width: '100%', height: 'calc(100vh - 116px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode="Delete"
        >
          <Panel position="top-left">
            <div className="bg-white/90 text-xs text-gray-500 rounded-xl px-3 py-2 shadow-sm backdrop-blur-sm leading-relaxed flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span><span className="text-blue-400 font-bold">─</span> 自動</span>
                <span><span className="text-amber-400 font-bold">╌</span> 手動</span>
                <span><span className="text-violet-500 font-bold">─</span> 自動＋手動</span>
              </div>
              <div className="text-gray-400">ハンドルをドラッグして接続 · 線をタップして編集</div>
            </div>
          </Panel>
          <Panel position="top-right">
            <div className="flex flex-col gap-2 items-end">
              <FitViewButton />
              <button
                onClick={() => setConnectMode((v) => !v)}
                className={`rounded-lg px-3 py-1.5 text-xs shadow-sm border transition-colors ${
                  connectMode
                    ? 'bg-amber-400 border-amber-500 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {connectMode ? '接続モード中' : '接続モード'}
              </button>
            </div>
          </Panel>
          <Background gap={24} color="#e5e7eb" />
          <Controls position="bottom-right" />
          <MiniMap
            nodeColor={(n) =>
              (n.data as MemoNodeData).memo.status === '着手済み' ? '#86efac' : '#bfdbfe'
            }
            maskColor="rgba(0,0,0,0.08)"
            style={{ bottom: 56 }}
          />
        </ReactFlow>
      </div>
    </ConnectModeContext.Provider>
  );
}
