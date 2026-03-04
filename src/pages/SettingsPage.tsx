import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { useSettingsStore } from '../store/settingsStore';
import { useUIStore } from '../store/uiStore';
import { useMemoStore } from '../store/memoStore';
import { useTagStore } from '../store/tagStore';
import { getStorageAdapter } from '../db';
import { DexieAdapter } from '../db/DexieAdapter';
import { db } from '../db/schema';
import { AI_MODELS } from '../constants/ai';
import { useAuthStore } from '../store/authStore';
import { ROUTES } from '../constants/routes';

export function SettingsPage() {
  const { ai, voiceLanguage, setApiKey, setModel, toggleAI, setVoiceLanguage } = useSettingsStore();
  const { addToast } = useUIStore();
  const { fetchMemos } = useMemoStore();
  const { fetchTags } = useTagStore();
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [keyVisible, setKeyVisible] = useState(false);
  const [keyInput, setKeyInput] = useState(ai.apiKey);
  const [migrating, setMigrating] = useState(false);

  const handleSaveKey = () => {
    setApiKey(keyInput.trim());
    addToast('APIキーを保存しました', 'success');
  };

  const handleExport = async () => {
    const data = await getStorageAdapter().exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `idea-memo-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('エクスポートしました', 'success');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const handleMigrateLocalToCloud = async () => {
    if (!window.confirm('ローカルデータをクラウドに移行しますか？\n移行後、ローカルデータは削除されます。')) return;
    setMigrating(true);
    try {
      const localAdapter = new DexieAdapter();
      await localAdapter.initialize();
      const { memos, tags, relations } = await localAdapter.exportAll();

      const cloud = getStorageAdapter();

      // タグを先に移行（メモの tagIds が参照するため）
      const tagIdMap = new Map<string, string>();
      for (const tag of tags) {
        const created = await cloud.findOrCreateTag(tag.text);
        tagIdMap.set(tag.id, created.id);
      }

      // メモを移行
      const memoIdMap = new Map<string, string>();
      for (const memo of memos) {
        const created = await cloud.createMemo({ idea: memo.idea, trigger: memo.trigger });
        await cloud.updateMemo(created.id, {
          details: memo.details,
          actionItems: memo.actionItems,
          status: memo.status,
          editStage: memo.editStage,
          tagIds: memo.tagIds.map(id => tagIdMap.get(id) ?? id),
          freshnessScore: memo.freshnessScore,
        });
        memoIdMap.set(memo.id, created.id);
      }

      // 関連を移行
      for (const rel of relations) {
        const fromId = memoIdMap.get(rel.fromMemoId);
        const toId = memoIdMap.get(rel.toMemoId);
        if (!fromId || !toId) continue;
        await cloud.upsertRelation({
          fromMemoId: fromId,
          toMemoId: toId,
          type: rel.type,
          strength: rel.strength,
          sharedTagIds: rel.sharedTagIds.map(id => tagIdMap.get(id) ?? id),
        });
      }

      // ローカルをクリア
      await db.memos.clear();
      await db.tags.clear();
      await db.relations.clear();

      await Promise.all([fetchMemos(), fetchTags()]);
      addToast('ローカルデータをクラウドに移行しました', 'success');
    } catch (e) {
      addToast(`移行に失敗しました: ${String(e)}`, 'error');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div>
      <PageHeader title="設定" />
      <div className="px-4 py-4 flex flex-col gap-6">

        {/* アカウント */}
        {user && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-4">アカウント</h2>
            <p className="text-sm text-gray-600 mb-4">
              ログイン中: <span className="font-medium text-gray-800">{user.email}</span>
            </p>
            <Button variant="secondary" onClick={handleSignOut} className="w-full">
              ログアウト
            </Button>
          </section>
        )}

        {/* AI設定 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">AI機能（Claude API）</h2>

          <div className="flex flex-col gap-4">
            {/* APIキー */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                APIキー
              </label>
              <div className="flex gap-2">
                <input
                  type={keyVisible ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setKeyVisible(!keyVisible)}
                  className="px-3 py-3 rounded-xl bg-gray-100 text-gray-600 active:bg-gray-200 text-sm min-w-[44px]"
                >
                  {keyVisible ? '隠す' : '表示'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                キーはブラウザのlocalStorageに保存されます
              </p>
            </div>

            {/* モデル選択 */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                モデル
              </label>
              <select
                value={ai.model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSaveKey} className="flex-1">
                保存
              </Button>
              <Button
                variant={ai.enabled ? 'secondary' : 'ghost'}
                onClick={toggleAI}
                className="flex-1"
              >
                {ai.enabled ? 'AI: ON' : 'AI: OFF'}
              </Button>
            </div>
          </div>
        </section>

        {/* 音声設定 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">音声入力</h2>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              言語
            </label>
            <select
              value={voiceLanguage}
              onChange={(e) => setVoiceLanguage(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ja-JP">日本語</option>
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
            </select>
          </div>
        </section>

        {/* データ管理 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">データ管理</h2>
          <Button variant="secondary" onClick={handleExport} className="w-full">
            データをエクスポート（JSON）
          </Button>
          <p className="text-xs text-gray-400 mt-2 text-center">
            全メモ・タグ・関連データをJSONでダウンロード
          </p>

          {/* ローカル → クラウド移行（Supabase ログイン中のみ） */}
          {user && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Button
                variant="secondary"
                onClick={handleMigrateLocalToCloud}
                disabled={migrating}
                className="w-full"
              >
                {migrating ? '移行中...' : 'ローカルデータをクラウドに移行'}
              </Button>
              <p className="text-xs text-gray-400 mt-1 text-center">
                IndexedDB のデータを Supabase にコピーし、ローカルをクリアします
              </p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <Button
              variant="danger"
              onClick={async () => {
                if (!window.confirm('全データを削除しますか？この操作は取り消せません。')) return;
                await db.memos.clear();
                await db.tags.clear();
                await db.relations.clear();
                await Promise.all([fetchMemos(), fetchTags()]);
                addToast('データを削除しました');
              }}
              className="w-full"
            >
              全データをリセット
            </Button>
            <p className="text-xs text-red-400 mt-1 text-center">
              開発・テスト用。全メモ・タグ・関連を削除します
            </p>
          </div>
        </section>

        <p className="text-xs text-center text-gray-400">
          アイデアメモ v1.0.0 — フェーズ3-A+3-B
        </p>
      </div>
    </div>
  );
}
