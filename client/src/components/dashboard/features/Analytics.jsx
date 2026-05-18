import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrg } from '../../../context/OrgContext';
import { supabase } from '../../../lib/supabase';

export default function Analytics() {
  const { org, isAdmin } = useOrg();
  const [stats, setStats] = useState(null);
  const [topEvents, setTopEvents] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org || !isAdmin) return;
    Promise.all([
      // Member counts
      supabase.from('memberships').select('role, status', { count: 'exact' })
        .eq('org_id', org.id).eq('status', 'active'),
      supabase.from('memberships').select('id', { count: 'exact' })
        .eq('org_id', org.id).eq('status', 'requested'),

      // Content counts
      supabase.from('announcements').select('id', { count: 'exact' }).eq('org_id', org.id),
      supabase.from('events').select('id', { count: 'exact' }).eq('org_id', org.id),
      supabase.from('forum_posts').select('id', { count: 'exact' }).eq('org_id', org.id),
      supabase.from('forum_comments').select('id', { count: 'exact' }).eq('org_id', org.id),

      // This month
      supabase.from('events').select('id', { count: 'exact' })
        .eq('org_id', org.id)
        .gte('start_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

      // Total RSVPs going
      supabase.from('event_rsvps').select('event_id, events!inner(org_id)', { count: 'exact' })
        .eq('events.org_id', org.id).eq('status', 'going'),

      // Top 5 events by RSVP going count
      supabase.from('events').select('id, title, start_at, event_rsvps(count)')
        .eq('org_id', org.id).order('start_at', { ascending: false }).limit(10),
    ]).then(results => {
      const [
        activeMembers, pendingReqs,
        announcements, events, forumPosts, forumComments,
        eventsThisMonth, rsvpGoing,
        eventsWithRsvp,
      ] = results;

      setStats({
        activeMembers: activeMembers.count ?? 0,
        pendingRequests: pendingReqs.count ?? 0,
        announcements: announcements.count ?? 0,
        events: events.count ?? 0,
        eventsThisMonth: eventsThisMonth.count ?? 0,
        forumPosts: forumPosts.count ?? 0,
        forumComments: forumComments.count ?? 0,
        rsvpGoing: rsvpGoing.count ?? 0,
      });

      const sorted = (eventsWithRsvp.data ?? [])
        .map(e => ({ ...e, rsvpCount: e.event_rsvps?.[0]?.count ?? 0 }))
        .sort((a, b) => b.rsvpCount - a.rsvpCount)
        .slice(0, 5);
      setTopEvents(sorted);
      setLoading(false);
    });
  }, [org, isAdmin]);

  // Member growth: memberships joined by month
  useEffect(() => {
    if (!org || !isAdmin) return;
    supabase.from('memberships').select('joined_at')
      .eq('org_id', org.id).eq('status', 'active')
      .order('joined_at')
      .then(({ data }) => {
        if (!data) return;
        const byMonth = {};
        data.forEach(m => {
          const d = new Date(m.joined_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          byMonth[key] = (byMonth[key] ?? 0) + 1;
        });
        const months = Object.entries(byMonth).slice(-6).map(([month, count]) => ({ month, count }));
        // Make cumulative
        let total = 0;
        const before = data.filter(m => {
          const key = new Date(m.joined_at).toISOString().slice(0, 7);
          return months.length > 0 && key < months[0].month;
        }).length;
        total = before;
        const cumulativeMonths = months.map(m => {
          total += m.count;
          return { ...m, total };
        });
        setGrowth(cumulativeMonths);
      });
  }, [org, isAdmin]);

  if (!isAdmin) return <p className="text-slate-400 text-sm">Admin access required.</p>;
  if (loading) return (
    <div className="w-full max-w-5xl space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  const maxGrowth = Math.max(...growth.map(g => g.total), 1);

  return (
    <div className="w-full max-w-5xl space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Members" value={stats.activeMembers} icon="members"
          sub={stats.pendingRequests > 0 ? `${stats.pendingRequests} pending` : null}
          subLink="settings" />
        <StatCard label="Total Events" value={stats.events} icon="events"
          sub={stats.eventsThisMonth > 0 ? `${stats.eventsThisMonth} this month` : 'None this month'} />
        <StatCard label="Going RSVPs" value={stats.rsvpGoing} icon="rsvp" />
        <StatCard label="Forum Posts" value={stats.forumPosts} icon="forum"
          sub={`${stats.forumComments} replies`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Member growth chart */}
        {growth.length > 0 && (
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Member Growth</h2>
            <div className="flex items-end gap-2 h-32">
              {growth.map(g => (
                <div key={g.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-600">{g.total}</span>
                  <div
                    className="w-full bg-indigo-500 rounded-t-md transition-all"
                    style={{ height: `${Math.round((g.total / maxGrowth) * 80)}px`, minHeight: '4px' }}
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(g.month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top events by RSVPs */}
        {topEvents.length > 0 && (
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Top Events by RSVPs</h2>
            <div className="space-y-3">
              {topEvents.map((ev, i) => {
                const maxRsvp = topEvents[0]?.rsvpCount || 1;
                const pct = maxRsvp > 0 ? Math.round((ev.rsvpCount / maxRsvp) * 100) : 0;
                return (
                  <div key={ev.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 truncate flex-1 mr-2">{ev.title}</span>
                      <span className="text-slate-500 shrink-0 font-medium">{ev.rsvpCount} going</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Content summary */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Content Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Announcements', value: stats.announcements },
            { label: 'Events', value: stats.events },
            { label: 'Forum Threads', value: stats.forumPosts },
            { label: 'Forum Replies', value: stats.forumComments },
          ].map(item => (
            <div key={item.label} className="text-center py-4 rounded-xl bg-slate-50">
              <p className="text-3xl font-bold text-slate-900">{item.value}</p>
              <p className="text-xs text-slate-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, subLink, icon }) {
  const icons = {
    members: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
    events:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    rsvp:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    forum:   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />,
  };
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icons[icon]}
          </svg>
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {sub && (
        subLink
          ? <Link to={`../${subLink}`} relative="path" className="text-xs text-indigo-600 hover:underline">{sub}</Link>
          : <p className="text-xs text-slate-400">{sub}</p>
      )}
    </div>
  );
}
