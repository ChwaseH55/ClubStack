import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('memberships')
      .select('role, organizations(id, name, slug, branding)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .then(({ data }) => setMemberships(data ?? []))
      .finally(() => setLoading(false));
  }, [user.id]);

  const adminOrgs = memberships.filter(m => m.role === 'owner' || m.role === 'admin');
  const memberOrgs = memberships.filter(m => m.role === 'member');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold text-gray-900">ClubStack</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Your organizations</h1>
          <Link
            to="/create-org"
            className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            + New organization
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : memberships.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {adminOrgs.length > 0 && (
              <OrgSection title="Admin" orgs={adminOrgs} />
            )}
            {memberOrgs.length > 0 && (
              <OrgSection title="Member" orgs={memberOrgs} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function OrgSection({ title, orgs }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h2>
      {orgs.map(({ role, organizations: org }) => (
        <OrgCard key={org.id} org={org} role={role} />
      ))}
    </section>
  );
}

function OrgCard({ org, role }) {
  const color = org.branding?.primaryColor ?? '#4f46e5';
  return (
    <Link
      to={`/orgs/${org.slug}`}
      className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition group"
    >
      <div
        className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: color }}
      >
        {org.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition">{org.name}</p>
        <p className="text-xs text-gray-400">/{org.slug}</p>
      </div>
      <span className="text-xs text-gray-400 capitalize shrink-0">{role}</span>
      <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 space-y-4">
      <p className="text-gray-400 text-sm">You're not in any organizations yet.</p>
      <Link
        to="/create-org"
        className="inline-block text-sm bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition"
      >
        Create your first organization
      </Link>
    </div>
  );
}
