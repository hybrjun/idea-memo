import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AuthGuard } from './components/AuthGuard';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { NewMemoPage } from './pages/NewMemoPage';
import { MemoDetailPage } from './pages/MemoDetailPage';
import { MindMapPage } from './pages/MindMapPage';
import { TagsPage } from './pages/TagsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuthStore } from './store/authStore';
import { ROUTES } from './constants/routes';

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/new" element={<NewMemoPage />} />
            <Route path="/memo/:id" element={<MemoDetailPage />} />
            <Route path="/mindmap" element={<MindMapPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
