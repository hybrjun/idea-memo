import { Position, type Node } from 'reactflow';

export interface FloatingEdgeParams {
  sx: number; sy: number;
  tx: number; ty: number;
  sp: Position; tp: Position;
}

/**
 * 2ノードの中心間を結ぶ直線がそれぞれのノード矩形と交差する点を求め、
 * エッジの始点・終点・方向を返す（フローティングエッジ用）
 */
export function getFloatingEdgeParams(source: Node, target: Node): FloatingEdgeParams {
  const sw = source.width ?? 200;
  const sh = source.height ?? 110;
  const tw = target.width ?? 200;
  const th = target.height ?? 110;

  const sc = { x: source.position.x + sw / 2, y: source.position.y + sh / 2 };
  const tc = { x: target.position.x + tw / 2, y: target.position.y + th / 2 };

  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;

  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
    return { sx: sc.x + sw / 2, sy: sc.y, tx: tc.x - tw / 2, ty: tc.y, sp: Position.Right, tp: Position.Left };
  }

  // source ノード境界との交点
  const sRx = dx !== 0 ? (sw / 2) / Math.abs(dx) : Infinity;
  const sRy = dy !== 0 ? (sh / 2) / Math.abs(dy) : Infinity;
  const sR = Math.min(sRx, sRy);
  const sx = sc.x + dx * sR;
  const sy = sc.y + dy * sR;
  const sp = sRx <= sRy
    ? (dx > 0 ? Position.Right : Position.Left)
    : (dy > 0 ? Position.Bottom : Position.Top);

  // target ノード境界との交点
  const tRx = dx !== 0 ? (tw / 2) / Math.abs(dx) : Infinity;
  const tRy = dy !== 0 ? (th / 2) / Math.abs(dy) : Infinity;
  const tR = Math.min(tRx, tRy);
  const tx = tc.x - dx * tR;
  const ty = tc.y - dy * tR;
  const tp = tRx <= tRy
    ? (dx > 0 ? Position.Left : Position.Right)
    : (dy > 0 ? Position.Top : Position.Bottom);

  return { sx, sy, tx, ty, sp, tp };
}
