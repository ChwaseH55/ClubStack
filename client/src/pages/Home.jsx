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
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-6 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">
          Club<span className="text-indigo-600">Stack</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 hidden sm:block">{user.email}</span>
          <button onClick={handleLogout} className="btn-ghost text-slate-500">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your organizations</h1>
            <p className="text-sm text-slate-400 mt-0.5">Select an org to open its dashboard.</p>
          </div>
          <Link to="/create-org" className="btn-primary">
            + New org
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-[72px] bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : memberships.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {adminOrgs.length > 0 && <OrgSection title="Admin" orgs={adminOrgs} />}
            {memberOrgs.length > 0 && <OrgSection title="Member" orgs={memberOrgs} />}
          </div>
        )}
      </main>
    </div>
  );
}

function OrgSection({ title, orgs }) {
  return (
    <section className="space-y-3">
      <h2 className="section-label">{title}</h2>
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
      className="card flex items-center gap-4 px-5 py-4 hover:shadow-md transition-shadow group"
    >
      <div
        className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: color }}
      >
        {org.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{org.name}</p>
        <p className="text-xs text-slate-400">/{org.slug}</p>
      </div>
      <span className="text-xs text-slate-400 capitalize shrink-0 hidden sm:block">{role}</span>
      <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card px-8 py-16 text-center space-y-4">
      <p className="text-slate-400 text-sm">You're not in any organizations yet.</p>
      <Link to="/create-org" className="btn-primary">
        Create your first organization
      </Link>
    </div>
  );
}
