import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { ToastContainer } from '../ui/Toast';

export function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pb-16">
        <Outlet />
      </main>
      <BottomNav />
      <ToastContainer />
    </div>
  );
}
