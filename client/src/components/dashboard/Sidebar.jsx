import { NavLink, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const FEATURE_NAV = [
  { key: 'announcements', label: 'Announcements', icon: '📢', path: 'announcements' },
  { key: 'events',        label: 'Events',         icon: '📅', path: 'events' },
  { key: 'forum',         label: 'Forum',          icon: '💬', path: 'forum' },
  { key: 'chat',          label: 'Chat',           icon: '🗨️', path: 'chat' },
  { key: 'shop',          label: 'Shop',           icon: '🛒', path: 'shop' },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-white/20 text-white'
      : 'text-white/80 hover:bg-white/10 hover:text-white'
  }`;

export default function Sidebar({ enabledFeatures }) {
  const { orgId } = useParams();
  const { logout } = useAuth();
  const navItems = FEATURE_NAV.filter(f => enabledFeatures.includes(f.key));

  return (
    <aside className="w-60 bg-org-primary flex flex-col shrink-0 h-full">
      <div className="px-4 py-5 border-b border-white/20">
        <span className="text-white font-bold text-lg">ClubStack</span>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2">
        <NavLink to={`/orgs/${orgId}`} end className={linkClass}>
          🏠 Home
        </NavLink>
        {navItems.map(item => (
          <NavLink key={item.key} to={`/orgs/${orgId}/${item.path}`} className={linkClass}>
            {item.icon} {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-2 py-4 border-t border-white/20">
        <button
          onClick={logout}
          className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
