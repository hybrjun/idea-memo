import { useState, useEffect } from 'react';
import { BaseEdge, EdgeLabelRenderer, useReactFlow, type EdgeProps } from 'reactflow';
import { useTagStore } from '../../store/tagStore';
import { getStorageAdapter } from '../../db';
import { getFloatingEdgeParams } from './floatingEdge';

export interface ManualEdgeData {
  sharedTagIds: string[];   // 自動タグ（読み取り専用）
  manualTagIds: string[];   // 手動タグ（編集可能）
  relationType?: 'manual' | 'both';
  onDelete: (id: string) => void;
  onTagsUpdate: (id: string, tagIds: string[]) => void;
  pathOffset?: number;
}

export function ManualEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  selected,
  style,
  data,
}: EdgeProps<ManualEdgeData>) {
  const { getNode } = useReactFlow();
  const [showPicker, setShowPicker] = useState(false);
  const [inputText, setInputText] = useState('');
  const { tags, fetchTags } = useTagStore();

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

  // 自動＋手動（both）のとき、青実線とオレンジ破線を平行に並べて描画する
  const isBoth = data?.relationType === 'both';
  const PARALLEL = 5; // 2本の線の間隔（片側 px）
  const bluePath   = `M ${sx + nx * PARALLEL},${sy + ny * PARALLEL} Q ${cpx + nx * PARALLEL},${cpy + ny * PARALLEL} ${tx + nx * PARALLEL},${ty + ny * PARALLEL}`;
  const orangePath = `M ${sx - nx * PARALLEL},${sy - ny * PARALLEL} Q ${cpx - nx * PARALLEL},${cpy - ny * PARALLEL} ${tx - nx * PARALLEL},${ty - ny * PARALLEL}`;
  const labelY = 0.25 * sy + 0.5 * cpy + 0.25 * ty;

  useEffect(() => {
    if (!selected) {
      setShowPicker(false);
      setInputText('');
    }
  }, [selected]);

  // 自動タグ（読み取り専用）
  const autoTagIds  = data?.sharedTagIds ?? [];
  const autoTags    = tags.filter((t) => autoTagIds.includes(t.id));
  // 手動タグ（編集可能）
  const manualTagIds = data?.manualTagIds ?? [];
  const manualTags   = tags.filter((t) => manualTagIds.includes(t.id));
  // ラベル表示: 手動タグ優先、なければ自動タグ
  const tagLabel = (manualTags.length > 0 ? manualTags : autoTags).map((t) => t.text).join(' · ');

  // サジェスト対象: 既に追加済みのタグを除く
  const usedIds      = new Set([...autoTagIds, ...manualTagIds]);
  const availableTags = tags.filter((t) => !usedIds.has(t.id));

  const trimmed = inputText.trim();
  const filteredTags = trimmed
    ? availableTags.filter(
        (t) =>
          t.text.includes(trimmed) ||
          t.normalizedText.includes(trimmed.normalize('NFC').toLowerCase())
      )
    : availableTags;

  const hasExactMatch = availableTags.some(
    (t) => t.normalizedText === trimmed.normalize('NFC').toLowerCase()
  );
  const showCreateOption = trimmed.length > 0 && !hasExactMatch;

  const removeTag = (tagId: string) => {
    data?.onTagsUpdate(id, manualTagIds.filter((tid) => tid !== tagId));
  };

  const addTag = (tagId: string) => {
    data?.onTagsUpdate(id, [...manualTagIds, tagId]);
    setInputText('');
  };

  const createAndAddTag = async () => {
    if (!trimmed) return;
    const newTag = await getStorageAdapter().findOrCreateTag(trimmed);
    await fetchTags();
    data?.onTagsUpdate(id, [...manualTagIds, newTag.id]);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTags.length === 1) {
        addTag(filteredTags[0].id);
      } else if (showCreateOption) {
        createAndAddTag();
      }
    }
    if (e.key === 'Escape') {
      setShowPicker(false);
      setInputText('');
    }
  };

  return (
    <>
      {/* エッジパス（SVGレイヤー）— ラベルはここで描かず EdgeLabelRenderer で描く */}
      {isBoth ? (
        <>
          {/* 青実線（自動接続） */}
          <path d={bluePath} fill="none" stroke="#60a5fa" strokeWidth={4} className="react-flow__edge-path" />
          {/* オレンジ破線（手動接続）+ id で React Flow 選択処理と紐付け */}
          <BaseEdge id={id} path={orangePath} style={{ stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '6 3' }} />
        </>
      ) : (
        <BaseEdge id={id} path={edgePath} style={style} />
      )}

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: selected ? 'all' : 'none',
          }}
          className="nodrag nopan"
        >
          {selected ? (
            /* ── 選択時：タグ管理パネル ── */
            <div className={`flex flex-col gap-2 bg-white rounded-2xl shadow-2xl border p-3 w-56 ${data?.relationType === 'both' ? 'border-blue-200' : 'border-amber-200'}`}>

              {/* 接続タイプバッジ */}
              {data?.relationType === 'both' && (
                <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block -ml-1" />
                  自動接続＋手動接続
                </div>
              )}

              {/* 自動タグ（読み取り専用） */}
              {autoTags.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 font-medium">自動タグ（編集不可）</span>
                  <div className="flex flex-wrap gap-1">
                    {autoTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5 text-xs"
                      >
                        {tag.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 手動タグ（編集可能） */}
              {(manualTags.length > 0 || data?.relationType !== 'keyword_overlap') && (
                <div className="flex flex-col gap-1">
                  {autoTags.length > 0 && (
                    <span className="text-[10px] text-gray-400 font-medium">手動タグ</span>
                  )}
                  {manualTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {manualTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="flex items-center gap-0.5 bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-xs"
                        >
                          {tag.text}
                          <button
                            onClick={() => removeTag(tag.id)}
                            className="ml-0.5 text-amber-500 leading-none active:opacity-60"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* テキスト入力＋サジェスト */}
              {showPicker && (
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="タグを検索・作成..."
                    autoFocus
                    className="w-full text-xs rounded-lg border border-gray-300 px-2.5 py-1.5 outline-none focus:border-amber-400"
                  />
                  {(filteredTags.length > 0 || showCreateOption) && (
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {filteredTags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => addTag(tag.id)}
                          className="w-full text-left text-xs px-3 py-1.5 hover:bg-amber-50 active:bg-amber-100 text-gray-700"
                        >
                          {tag.text}
                        </button>
                      ))}
                      {showCreateOption && (
                        <button
                          onClick={createAndAddTag}
                          className="w-full text-left text-xs px-3 py-1.5 text-amber-700 font-medium border-t border-gray-100 hover:bg-amber-50 active:bg-amber-100"
                        >
                          「{trimmed}」を新規作成
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* アクションボタン */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowPicker((v) => !v); setInputText(''); }}
                  className="flex-1 flex items-center justify-center gap-1 bg-amber-50 border border-amber-300 text-amber-700 rounded-full px-2 py-1 text-xs active:bg-amber-100"
                >
                  <span>＋</span>
                  <span>タグ追加</span>
                </button>
                <button
                  onClick={() => data?.onDelete(id)}
                  className="w-7 h-7 shrink-0 rounded-full bg-red-500 text-white text-sm flex items-center justify-center shadow active:scale-90"
                  title="接続を削除"
                >
                  ×
                </button>
              </div>
            </div>
          ) : tagLabel ? (
            /* ── 非選択時：タグラベルをHTMLレイヤーで表示（ノードカードより前面） ── */
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap shadow-sm">
              {tagLabel}
            </div>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
