export type MemoStatus = '未着手' | '着手済み';
export type EditStage = 'rough' | 'detailed';

export interface Memo {
  id: string;
  // Stage 1（ラフ）
  idea: string;
  trigger: string;
  // Stage 2（詳細）
  details: string;
  actionItems: string[];
  // 管理情報
  status: MemoStatus;
  editStage: EditStage;
  tagIds: string[];
  createdAt: Date;
  updatedAt: Date;
  freshnessScore: number; // 0-100
}

export interface MemoCreateInput {
  idea: string;
  trigger?: string;
}

export interface MemoUpdateInput {
  idea?: string;
  trigger?: string;
  details?: string;
  actionItems?: string[];
  status?: MemoStatus;
  editStage?: EditStage;
  tagIds?: string[];
  freshnessScore?: number;
}
