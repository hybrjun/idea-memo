import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { NewMemoPage } from './pages/NewMemoPage';
import { MemoDetailPage } from './pages/MemoDetailPage';
import { MindMapPage } from './pages/MindMapPage';
import { TagsPage } from './pages/TagsPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/new" element={<NewMemoPage />} />
          <Route path="/memo/:id" element={<MemoDetailPage />} />
          <Route path="/mindmap" element={<MindMapPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
