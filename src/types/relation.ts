export type RelationType = 'keyword_overlap' | 'manual' | 'both';

export interface Relation {
  id: string;
  fromMemoId: string;
  toMemoId: string;
  type: RelationType;
  strength: number; // 0.0-1.0（Jaccard類似度）
  sharedTagIds: string[];   // 自動タグ（キーワード重複）
  manualTagIds: string[];   // 手動追加タグ
  createdAt: Date;
}
