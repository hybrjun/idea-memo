import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function PageHeader({ title, showBack = false, right }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-30">
      <div className="flex items-center h-14 px-4">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 -ml-2 rounded-xl active:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="flex-1 text-lg font-bold text-gray-900 truncate">{title}</h1>
        {right && <div className="ml-2">{right}</div>}
      </div>
    </header>
  );
}
