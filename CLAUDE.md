# アイデアメモアプリ — 開発ノート

## プロジェクト概要
個人でアイデアを素早く記録・管理できるスマホファースト Web アプリ（フェーズ1+2）。
ブラウザのみで動作（IndexedDB）、将来のフェーズ3（チーム機能）に備えてバックエンド差し替え可能な設計。

---

## 実装済み機能

### フェーズ1 — メモ CRUD・タグ・関連付け
- テキスト入力 + 音声入力（Web Speech API）
- 2段階編集（rough / detailed）
- ステータス管理（未着手 / 着手済み）
- kuromoji による日本語キーワード自動抽出 → タグ化
- Jaccard 類似度でメモ間の関連付けを自動計算（保存時）
- 鮮度スコア（freshnessScore）

### フェーズ2 — マインドマップ・AI
- React Flow + dagre によるマインドマップ表示
- AI 関連アイデア提案（Claude API ストリーミング）
- AI タグ同義語正規化（保存時に自動実行）
- AI テーマ要約（TagsPage）
- API エラーの日本語変換（クレジット不足・APIキー無効など）

### マインドマップ改善（直近セッション）
- マップ手動接続：ノードのハンドルをドラッグして紐づけ
- 接続タイプ別のビジュアル区別：
  - 青（実線、太さ可変）= 自動（キーワード重複）
  - 琥珀色（破線）= 手動のみ
  - 紫（実線 3px）= 自動 ＋ 手動
- 接続のタグ管理：接続線タップ → テキスト入力で絞り込み、新規タグ作成も可能
- 手動と自動の接続が共存（`RelationType: 'both'`）
- `upsertRelation` のマージロジック改善（型が混在 → 'both' に昇格、タグはユニオン）
- エッジラベルを `EdgeLabelRenderer`（HTML レイヤー）に統一してノードの前面に表示
- MindMapPage マウント時に `fetchMemos` / `fetchTags` を呼び出し（リアルタイム反映）

---

## 重要な設計ポイント

### ストレージ層
- `src/db/IStorageAdapter.ts` = フェーズ3バックエンド差し替えポイント
- `src/db/index.ts` の1行を変えるだけで Dexie → REST API に切り替え可能
- スキーマ: `memos: '&id, status, editStage, createdAt, updatedAt, freshnessScore, *tagIds'`

### kuromoji
- `IpadicFeatures` のフィールドは `pos`（`part_of_speech` ではない）と `pos_detail_1`
- 辞書は `public/kuromoji/` に静的配置（vite-plugin-static-copy で自動コピー）
- 開発時は `node_modules/kuromoji/dict/` から手動コピーが必要
- `vite-plugin-node-polyfills` で `path` / `Buffer` をポリフィル

### React Flow
- `.react-flow__edgelabel-renderer { z-index: 9999 !important; }` を `index.css` に追加済み
  （EdgeLabelRenderer コンテンツをノードの前面に出すため）
- カスタムエッジ: `ManualEdge`（手動/both）、`KeywordEdge`（自動のみ）
- 接続タイプ `RelationType = 'keyword_overlap' | 'manual' | 'both'`
- `upsertRelation` のマージルール: 型が異なる → `'both'`、`sharedTagIds` はユニオン

### AI 連携
- `dangerouslyAllowBrowser: true` でブラウザから Claude API を直接呼び出し
- API キーは Zustand persist（localStorage）に保存
- `parseAPIError()` で Anthropic API エラーを日本語メッセージに変換

---

## 主要ファイルパス
```
src/
  types/
    memo.ts              # Memo, MemoStatus, EditStage, MemoCreateInput, MemoUpdateInput
    tag.ts               # Tag, TagFrequency
    relation.ts          # Relation, RelationType（'keyword_overlap'|'manual'|'both'）
    ai.ts                # AISettings, AISuggestion
  db/
    IStorageAdapter.ts   # 抽象インターフェース（フェーズ3差し替えポイント）
    DexieAdapter.ts      # Dexie 実装
    schema.ts            # DB スキーマ
    index.ts             # シングルトン
  services/
    KeywordExtractor.ts  # kuromoji キーワード抽出
    RelationEngine.ts    # Jaccard 類似度
    AIService.ts         # Claude API（suggestConnections / summarizeTheme / normalizeKeywords）
    FreshnessService.ts  # 鮮度スコア
    VoiceInputService.ts # Web Speech API
  store/
    memoStore.ts         # メモ CRUD
    tagStore.ts          # タグ管理
    relationStore.ts     # 関連
    settingsStore.ts     # APIキー（localStorage persist）
    uiStore.ts           # Toast など
  pages/
    HomePage.tsx         # 一覧 + タグフィルタ + FAB
    NewMemoPage.tsx      # 新規作成（kuromoji → AI 正規化 → 関連計算）
    MemoDetailPage.tsx   # 詳細 + 編集 + AI 提案
    MindMapPage.tsx      # React Flow マップ（手動接続・タグ管理）
    TagsPage.tsx         # タグブラウザ + AI 要約 + タグ統合
    SettingsPage.tsx     # APIキー設定 + JSON エクスポート
  components/
    mindmap/
      MindMapCanvas.tsx  # React Flow キャンバス
      MemoNode.tsx       # カスタムノード
      ManualEdge.tsx     # 手動/both エッジ（タグ管理パネル付き）
      KeywordEdge.tsx    # 自動エッジ（HTMLラベル）
```

---

## 既知の課題・注意事項

- ビルド警告: バンドルサイズ > 500kB（React Flow + kuromoji）→ 動的 import で改善可能
- `Module "path" has been externalized` 警告（kuromoji 内部依存、動作に影響なし）
- MemoNode のクリックが詳細遷移とハンドルドラッグを兼ねているため、モバイルで誤タップが起きやすい

---

## 次にやるべきこと（優先度順）

### UI / UX
- [ ] **MindMap — 未接続ノードの配置改善**: 孤立ノード（関連なし）がマップ左端に固まる問題。専用エリアや折りたたみ対応を検討
- [ ] **MemoNode — 接続モードと詳細遷移の競合解消**: ハンドルをタップしようとして誤って詳細ページに遷移しやすい。「編集モード / 接続モード」のトグルを検討
- [ ] **マップのズームリセットボタン**: fitView を手動でリセットできるボタン

### 機能追加
- [ ] **関連付け削除の保護**: `deleteRelationsForMemo` は `manual`/`both` タイプの関連も消してしまう。メモ更新時は `keyword_overlap` のみ再計算するよう修正
- [ ] **タグ統合（TagsPage）の改善**: 統合後に AI 正規化と整合性が取れているか確認
- [ ] **PWA 対応**: Web App Manifest + Service Worker でホーム画面追加・オフライン対応

### 品質・インフラ
- [ ] **バンドルサイズ削減**: React Flow と kuromoji を動的 import（`React.lazy`）に変更
- [ ] **エラーバウンダリ**: DB 操作失敗・kuromoji 初期化失敗のフォールバック UI
- [ ] **IndexedDB 容量超過ハンドリング**: QuotaExceededError のキャッチと通知
