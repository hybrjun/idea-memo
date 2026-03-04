import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ROUTES } from '../constants/routes';

export function LoginPage() {
  const { user, loading, signIn, signUp } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (user) return <Navigate to={ROUTES.HOME} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (tab === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setSuccessMsg('確認メールを送信しました。メールを確認してログインしてください。');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(translateError(msg));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-8">
          アイデアメモ
        </h1>

        {/* タブ */}
        <div className="flex rounded-2xl bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === 'login'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === 'register'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            新規登録
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              required
              minLength={6}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="text-sm text-green-600 bg-green-50 rounded-xl px-4 py-3">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm active:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '処理中...' : tab === 'login' ? 'ログイン' : 'アカウント作成'}
          </button>
        </form>
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'メールアドレスまたはパスワードが正しくありません';
  if (msg.includes('Email not confirmed')) return 'メールアドレスが確認されていません。確認メールをご確認ください';
  if (msg.includes('User already registered')) return 'このメールアドレスはすでに登録されています';
  if (msg.includes('Password should be at least 6 characters')) return 'パスワードは6文字以上で入力してください';
  if (msg.includes('Unable to validate email address')) return 'メールアドレスの形式が正しくありません';
  if (msg.includes('signup_disabled')) return '新規登録は現在無効になっています';
  return msg;
}
