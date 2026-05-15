import { Link } from 'react-router-dom';
import { Avatar } from '../../pages/Home';

export default function TopBar({ org, profile }) {
  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-3">
        <Link
          to="/home"
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Home</span>
        </Link>
        <span className="text-slate-200 select-none">|</span>
        <span className="font-semibold text-slate-800 text-sm">{org?.name}</span>
      </div>
      <Link to="/profile" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
        <Avatar name={profile?.name ?? '?'} url={profile?.avatar_url} size="sm" />
        <span className="text-sm text-slate-600 hidden sm:block">{profile?.name}</span>
      </Link>
    </header>
  );
}
