import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Home() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('orgs');
  const [profile, setProfile] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notifLoading, setNotifLoading] = useState(true);

  const fetchNotifications = useCallback(async (orgIds) => {
    setNotifLoading(true);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [invitesRes, friendReqRes, announcementsRes] = await Promise.all([
      supabase
        .from('memberships')
        .select('id, role, organizations(id, name, slug, branding)')
        .eq('user_id', user.id)
        .eq('status', 'invited'),
      supabase
        .from('friendships')
        .select('id, created_at, requester:requester_id(id, name, avatar_url)')
        .eq('addressee_id', user.id)
        .eq('status', 'pending'),
      orgIds.length > 0
        ? supabase
            .from('announcements')
            .select('id, title, created_at, organizations(name, slug)')
            .in('org_id', orgIds)
            .gte('created_at', sevenDaysAgo)
            .order('created_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] }),
    ]);

    const invites = (invitesRes.data ?? []).map(m => ({ type: 'invite', id: m.id, org: m.organizations, role: m.role }));
    const friendReqs = (friendReqRes.data ?? []).map(f => ({ type: 'friend_request', id: f.id, requester: f.requester, date: f.created_at }));
    const announcements = (announcementsRes.data ?? []).map(a => ({ type: 'announcement', id: a.id, title: a.title, org: a.organizations, date: a.created_at }));

    setNotifications([...invites, ...friendReqs, ...announcements]);
    setNotifCount(invites.length + friendReqs.length);
    setNotifLoading(false);
  }, [user.id]);

  useEffect(() => {
    const load = async () => {
      const [profileRes, membershipsRes] = await Promise.all([
        supabase.from('profiles').select('name, avatar_url').eq('id', user.id).single(),
        supabase
          .from('memberships')
          .select('id, role, organizations(id, name, slug, branding, enabled_features, memberships(count))')
          .eq('user_id', user.id)
          .eq('status', 'active'),
      ]);

      setProfile(profileRes.data);
      const ms = membershipsRes.data ?? [];
      setMemberships(ms);
      setLoading(false);

      await fetchNotifications(ms.map(m => m.organizations.id));
    };
    load();
  }, [user.id, fetchNotifications]);

  const handleAcceptInvite = async (membershipId) => {
    const { error } = await supabase.from('memberships').update({ status: 'active' }).eq('id', membershipId);
    if (error) { addToast(error.message, 'error'); return; }
    addToast('Joined organization!', 'success');
    setNotifications(n => n.filter(x => !(x.type === 'invite' && x.id === membershipId)));
    setNotifCount(c => Math.max(0, c - 1));
    const ms = await supabase
      .from('memberships')
      .select('id, role, organizations(id, name, slug, branding, enabled_features, memberships(count))')
      .eq('user_id', user.id).eq('status', 'active');
    setMemberships(ms.data ?? []);
  };

  const handleDeclineInvite = async (membershipId) => {
    const { error } = await supabase.from('memberships').delete().eq('id', membershipId);
    if (error) { addToast(error.message, 'error'); return; }
    addToast('Invite declined.', 'info');
    setNotifications(n => n.filter(x => !(x.type === 'invite' && x.id === membershipId)));
    setNotifCount(c => Math.max(0, c - 1));
  };

  const handleAcceptFriend = async (friendshipId) => {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    if (error) { addToast(error.message, 'error'); return; }
    addToast('Friend request accepted!', 'success');
    setNotifications(n => n.filter(x => !(x.type === 'friend_request' && x.id === friendshipId)));
    setNotifCount(c => Math.max(0, c - 1));
  };

  const handleDeclineFriend = async (friendshipId) => {
    const { error } = await supabase.from('friendships').update({ status: 'declined' }).eq('id', friendshipId);
    if (error) { addToast(error.message, 'error'); return; }
    setNotifications(n => n.filter(x => !(x.type === 'friend_request' && x.id === friendshipId)));
    setNotifCount(c => Math.max(0, c - 1));
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  const adminOrgs = memberships.filter(m => m.role === 'owner' || m.role === 'admin');
  const memberOrgs = memberships.filter(m => m.role === 'member');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">Club<span className="text-indigo-600">Stack</span></span>
        <div className="flex items-center gap-2">
          <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            <Avatar name={profile?.name ?? user.email} url={profile?.avatar_url} size="sm" />
            <span className="text-sm text-slate-600 hidden sm:block">{profile?.name ?? user.email}</span>
          </Link>
          <button onClick={handleLogout} className="btn-ghost text-slate-500 text-sm">Sign out</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Heading row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <TabBtn active={tab === 'orgs'} onClick={() => setTab('orgs')}>Organizations</TabBtn>
            <TabBtn active={tab === 'notifs'} onClick={() => setTab('notifs')}>
              Notifications
              {notifCount > 0 && (
                <span className="ml-1.5 bg-indigo-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {notifCount}
                </span>
              )}
            </TabBtn>
          </div>
          {tab === 'orgs' && <Link to="/create-org" className="btn-primary">+ New org</Link>}
        </div>

        {/* Tab content */}
        {tab === 'orgs' ? (
          loading ? <Skeleton /> : memberships.length === 0 ? <EmptyOrgs /> : (
            <div className="space-y-8">
              {adminOrgs.length > 0 && <OrgSection title="Admin" orgs={adminOrgs} />}
              {memberOrgs.length > 0 && <OrgSection title="Member" orgs={memberOrgs} />}
            </div>
          )
        ) : (
          notifLoading ? <Skeleton /> : notifications.length === 0 ? (
            <div className="card px-8 py-14 text-center text-slate-400 text-sm">You're all caught up.</div>
          ) : (
            <div className="space-y-3">
              {notifications.map(n => (
                <NotificationItem
                  key={`${n.type}-${n.id}`}
                  notif={n}
                  onAcceptInvite={handleAcceptInvite}
                  onDeclineInvite={handleDeclineInvite}
                  onAcceptFriend={handleAcceptFriend}
                  onDeclineFriend={handleDeclineFriend}
                />
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function OrgSection({ title, orgs }) {
  return (
    <section className="space-y-3">
      <h2 className="section-label">{title}</h2>
      {orgs.map(({ id, role, organizations: org }) => (
        <OrgCard key={id} org={org} role={role} />
      ))}
    </section>
  );
}

function OrgCard({ org, role }) {
  const color = org.branding?.primaryColor ?? '#4f46e5';
  const memberCount = org.memberships?.[0]?.count ?? 0;
  const featureCount = org.enabled_features?.length ?? 0;

  return (
    <Link
      to={`/orgs/${org.slug}`}
      className="card flex items-center gap-4 px-5 py-4 hover:shadow-md transition-shadow group"
    >
      <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-base" style={{ backgroundColor: color }}>
        {org.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{org.name}</p>
        <p className="text-xs text-slate-400">
          /{org.slug} · {memberCount} {memberCount === 1 ? 'member' : 'members'} · {featureCount} {featureCount === 1 ? 'feature' : 'features'}
        </p>
      </div>
      <span className="text-xs text-slate-400 capitalize shrink-0 hidden sm:block">{role}</span>
      <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

function NotificationItem({ notif, onAcceptInvite, onDeclineInvite, onAcceptFriend, onDeclineFriend }) {
  if (notif.type === 'invite') {
    const color = notif.org?.branding?.primaryColor ?? '#4f46e5';
    return (
      <div className="card px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: color }}>
          {notif.org?.name?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900">Invited to <span className="text-indigo-600">{notif.org?.name}</span></p>
          <p className="text-xs text-slate-400 capitalize">as {notif.role}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => onAcceptInvite(notif.id)} className="btn-primary py-1.5 px-3 text-xs">Accept</button>
          <button onClick={() => onDeclineInvite(notif.id)} className="btn-secondary py-1.5 px-3 text-xs">Decline</button>
        </div>
      </div>
    );
  }

  if (notif.type === 'friend_request') {
    return (
      <div className="card px-5 py-4 flex items-center gap-4">
        <Avatar name={notif.requester?.name ?? '?'} url={notif.requester?.avatar_url} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900"><span className="text-indigo-600">{notif.requester?.name}</span> wants to connect</p>
          <p className="text-xs text-slate-400">Friend request</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => onAcceptFriend(notif.id)} className="btn-primary py-1.5 px-3 text-xs">Accept</button>
          <button onClick={() => onDeclineFriend(notif.id)} className="btn-secondary py-1.5 px-3 text-xs">Decline</button>
        </div>
      </div>
    );
  }

  if (notif.type === 'announcement') {
    return (
      <Link to={`/orgs/${notif.org?.slug}/announcements`} className="card px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow group">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 shrink-0 flex items-center justify-center text-indigo-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{notif.title}</p>
          <p className="text-xs text-slate-400">New announcement in {notif.org?.name} · {timeAgo(notif.date)}</p>
        </div>
        <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    );
  }

  return null;
}

export function Avatar({ name, url, size = 'md' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm' };
  if (url) {
    return <img src={url} alt={name} className={`${sizes[size]} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${sizes[size]} rounded-full bg-indigo-600 text-white font-semibold flex items-center justify-center shrink-0`}>
      {(name ?? '?').charAt(0).toUpperCase()}
    </div>
  );
}

function EmptyOrgs() {
  return (
    <div className="card px-8 py-16 text-center space-y-4">
      <p className="text-slate-400 text-sm">You're not in any organizations yet.</p>
      <Link to="/create-org" className="btn-primary">Create your first organization</Link>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-[72px] bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
