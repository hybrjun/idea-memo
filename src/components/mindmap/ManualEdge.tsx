import { useState, useEffect } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from 'reactflow';
import { useTagStore } from '../../store/tagStore';
import { getStorageAdapter } from '../../db';
import { getFloatingEdgeParams } from './floatingEdge';

export interface ManualEdgeData {
  sharedTagIds: string[];
  relationType?: 'manual' | 'both';
  onDelete: (id: string) => void;
  onTagsUpdate: (id: string, tagIds: string[]) => void;
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

  useEffect(() => {
    if (!selected) {
      setShowPicker(false);
      setInputText('');
    }
  }, [selected]);

  const sharedTagIds = data?.sharedTagIds ?? [];
  const sharedTags = tags.filter((t) => sharedTagIds.includes(t.id));
  const availableTags = tags.filter((t) => !sharedTagIds.includes(t.id));
  const tagLabel = sharedTags.map((t) => t.text).join(' · ');

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
    data?.onTagsUpdate(id, sharedTagIds.filter((tid) => tid !== tagId));
  };

  const addTag = (tagId: string) => {
    data?.onTagsUpdate(id, [...sharedTagIds, tagId]);
    setInputText('');
  };

  const createAndAddTag = async () => {
    if (!trimmed) return;
    const newTag = await getStorageAdapter().findOrCreateTag(trimmed);
    await fetchTags();
    data?.onTagsUpdate(id, [...sharedTagIds, newTag.id]);
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
      <BaseEdge id={id} path={edgePath} style={style} />

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
            <div className={`flex flex-col gap-2 bg-white rounded-2xl shadow-2xl border p-3 w-56 ${data?.relationType === 'both' ? 'border-violet-200' : 'border-amber-200'}`}>

              {/* 接続タイプバッジ */}
              {data?.relationType === 'both' && (
                <div className="flex items-center gap-1 text-[10px] text-violet-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                  自動接続＋手動接続
                </div>
              )}

              {/* 設定済みタグ */}
              {sharedTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sharedTags.map((tag) => (
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
