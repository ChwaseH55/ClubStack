import { useAuth } from '../../context/AuthContext';

export default function TopBar({ org }) {
  const { user } = useAuth();
  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <span className="font-semibold text-gray-800">{org?.name ?? 'ClubStack'}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{user?.name}</span>
        <div className="w-8 h-8 rounded-full bg-org-primary text-white flex items-center justify-center text-sm font-bold">
          {initial}
        </div>
      </div>
    </header>
  );
}
