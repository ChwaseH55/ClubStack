import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrg } from '../../../context/OrgContext';
import { supabase } from '../../../lib/supabase';

export default function Analytics() {
  const { org, isAdmin } = useOrg();
  const [stats, setStats] = useState(null);
  const [topEvents, setTopEvents] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [memberActivity, setMemberActivity] = useState([]);
  const [tournamentStats, setTournamentStats] = useState([]);
  const [volunteerStats, setVolunteerStats] = useState([]);
  const [hasTournaments, setHasTournaments] = useState(false);
  const [hasVolunteer, setHasVolunteer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org || !isAdmin) return;
    Promise.all([
      supabase.from('memberships').select('role, status', { count: 'exact' })
        .eq('org_id', org.id).eq('status', 'active'),
      supabase.from('memberships').select('id', { count: 'exact' })
        .eq('org_id', org.id).eq('status', 'requested'),
      supabase.from('announcements').select('id', { count: 'exact' }).eq('org_id', org.id),
      supabase.from('events').select('id', { count: 'exact' }).eq('org_id', org.id),
      supabase.from('forum_posts').select('id', { count: 'exact' }).eq('org_id', org.id),
      supabase.from('forum_comments').select('id', { count: 'exact' }).eq('org_id', org.id),
      supabase.from('events').select('id', { count: 'exact' })
        .eq('org_id', org.id)
        .gte('start_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from('event_rsvps').select('event_id, events!inner(org_id)', { count: 'exact' })
        .eq('events.org_id', org.id).eq('status', 'going'),
      supabase.from('events').select('id, title, start_at, event_rsvps(status)')
        .eq('org_id', org.id).order('start_at', { ascending: false }).limit(20),
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
        .map(e => ({
          ...e,
          rsvpCount: (e.event_rsvps ?? []).filter(r => r.status === 'going').length,
        }))
        .sort((a, b) => b.rsvpCount - a.rsvpCount)
        .slice(0, 5);
      setTopEvents(sorted);
      setLoading(false);
    });
  }, [org, isAdmin]);

  // Member growth
  useEffect(() => {
    if (!org || !isAdmin) return;
    supabase.from('memberships').select('joined_at')
      .eq('org_id', org.id).eq('status', 'active').order('joined_at')
      .then(({ data }) => {
        if (!data) return;
        const byMonth = {};
        data.forEach(m => {
          const d = new Date(m.joined_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          byMonth[key] = (byMonth[key] ?? 0) + 1;
        });
        const months = Object.entries(byMonth).slice(-6).map(([month, count]) => ({ month, count }));
        let total = data.filter(m => months.length > 0 && new Date(m.joined_at).toISOString().slice(0, 7) < months[0].month).length;
        setGrowth(months.map(m => { total += m.count; return { ...m, total }; }));
      });
  }, [org, isAdmin]);

  // Member activity: events attended + forum posts + comments
  useEffect(() => {
    if (!org || !isAdmin) return;
    Promise.all([
      // RSVPs going for past events in this org
      supabase.from('event_rsvps')
        .select('user_id, events!inner(org_id, start_at)')
        .eq('events.org_id', org.id)
        .eq('status', 'going')
        .lt('events.start_at', new Date().toISOString()),
      // Forum posts
      supabase.from('forum_posts').select('author_id').eq('org_id', org.id),
      // Forum comments
      supabase.from('forum_comments').select('author_id').eq('org_id', org.id),
      // Active members for names
      supabase.from('memberships')
        .select('user_id, profiles!memberships_user_profile_fk(name, avatar_url)')
        .eq('org_id', org.id).eq('status', 'active'),
    ]).then(([rsvps, posts, comments, members]) => {
      const scores = {};
      const inc = (uid, key, val = 1) => {
        if (!scores[uid]) scores[uid] = { events: 0, posts: 0, comments: 0 };
        scores[uid][key] += val;
      };
      (rsvps.data ?? []).forEach(r => inc(r.user_id, 'events'));
      (posts.data ?? []).forEach(p => inc(p.author_id, 'posts'));
      (comments.data ?? []).forEach(c => inc(c.author_id, 'comments'));

      const memberMap = {};
      (members.data ?? []).forEach(m => { memberMap[m.user_id] = m.profiles; });

      const rows = Object.entries(scores)
        .map(([uid, s]) => ({
          user_id: uid,
          profile: memberMap[uid],
          ...s,
          total: s.events * 3 + s.posts * 2 + s.comments,
        }))
        .filter(r => r.profile)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      setMemberActivity(rows);
    });
  }, [org, isAdmin]);

  // Tournament stats
  useEffect(() => {
    if (!org || !isAdmin) return;
    supabase.from('events')
      .select('id, title, start_at, type_metadata, tournament_participants(user_id, score, profiles!user_id(name, avatar_url))')
      .eq('org_id', org.id)
      .eq('event_type', 'tournament')
      .lt('start_at', new Date().toISOString())
      .order('start_at', { ascending: false })
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        setHasTournaments(true);

        // Per-member stats across all tournaments
        const playerMap = {};
        data.forEach(ev => {
          const lowerIsBetter = ev.type_metadata?.lower_is_better !== false;
          const participants = ev.tournament_participants ?? [];
          const scored = participants.filter(p => p.score !== null && p.score !== undefined);
          const sorted = [...scored].sort((a, b) => lowerIsBetter ? a.score - b.score : b.score - a.score);

          participants.forEach(p => {
            if (!playerMap[p.user_id]) {
              playerMap[p.user_id] = { profile: p.profiles, entries: 0, scores: [], placements: [] };
            }
            const pm = playerMap[p.user_id];
            pm.entries++;
            if (p.score !== null && p.score !== undefined) {
              pm.scores.push(p.score);
              const placement = sorted.findIndex(x => x.user_id === p.user_id) + 1;
              pm.placements.push(placement);
            }
          });
        });

        const rows = Object.entries(playerMap)
          .map(([uid, d]) => ({
            user_id: uid,
            profile: d.profile,
            entries: d.entries,
            avgScore: d.scores.length ? Math.round((d.scores.reduce((a, b) => a + b, 0) / d.scores.length) * 10) / 10 : null,
            bestScore: d.scores.length ? Math.min(...d.scores) : null,
            avgPlacement: d.placements.length ? Math.round(d.placements.reduce((a, b) => a + b, 0) / d.placements.length * 10) / 10 : null,
            wins: d.placements.filter(p => p === 1).length,
          }))
          .sort((a, b) => (a.avgPlacement ?? 999) - (b.avgPlacement ?? 999));
        setTournamentStats(rows);
      });
  }, [org, isAdmin]);

  // Volunteer stats
  useEffect(() => {
    if (!org || !isAdmin) return;
    supabase.from('event_rsvps')
      .select('user_id, events!inner(org_id, start_at, end_at, event_type, profiles!events_author_profile_fk(name))')
      .eq('events.org_id', org.id)
      .eq('events.event_type', 'volunteer')
      .eq('status', 'going')
      .lt('events.start_at', new Date().toISOString())
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        setHasVolunteer(true);

        // Fetch member profiles
        supabase.from('memberships')
          .select('user_id, profiles!memberships_user_profile_fk(name, avatar_url)')
          .eq('org_id', org.id).eq('status', 'active')
          .then(({ data: members }) => {
            const profileMap = {};
            (members ?? []).forEach(m => { profileMap[m.user_id] = m.profiles; });

            const hoursByMember = {};
            data.forEach(r => {
              const ev = r.events;
              if (!ev.end_at) return;
              const hours = Math.round(((new Date(ev.end_at) - new Date(ev.start_at)) / 3600000) * 10) / 10;
              if (!hoursByMember[r.user_id]) hoursByMember[r.user_id] = { hours: 0, events: 0 };
              hoursByMember[r.user_id].hours += hours;
              hoursByMember[r.user_id].events += 1;
            });

            const rows = Object.entries(hoursByMember)
              .map(([uid, d]) => ({
                user_id: uid,
                profile: profileMap[uid],
                hours: Math.round(d.hours * 10) / 10,
                events: d.events,
              }))
              .filter(r => r.profile)
              .sort((a, b) => b.hours - a.hours)
              .slice(0, 10);
            setVolunteerStats(rows);
          });
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
          sub={stats.pendingRequests > 0 ? `${stats.pendingRequests} pending` : null} subLink="settings" />
        <StatCard label="Total Events" value={stats.events} icon="events"
          sub={stats.eventsThisMonth > 0 ? `${stats.eventsThisMonth} this month` : 'None this month'} />
        <StatCard label="Going RSVPs" value={stats.rsvpGoing} icon="rsvp" />
        <StatCard label="Forum Posts" value={stats.forumPosts} icon="forum"
          sub={`${stats.forumComments} replies`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Member growth */}
        {growth.length > 0 && (
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Member Growth</h2>
            <div className="flex items-end gap-2 h-32">
              {growth.map(g => (
                <div key={g.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-600">{g.total}</span>
                  <div className="w-full bg-indigo-500 rounded-t-md transition-all"
                    style={{ height: `${Math.round((g.total / maxGrowth) * 80)}px`, minHeight: '4px' }} />
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
              {topEvents.map(ev => {
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

      {/* Most active members */}
      {memberActivity.length > 0 && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Most Active Members</h2>
            <span className="text-xs text-slate-400">Events attended × 3 + posts × 2 + replies</span>
          </div>
          <div className="space-y-2">
            {memberActivity.map((m, i) => {
              const maxTotal = memberActivity[0]?.total || 1;
              const pct = Math.round((m.total / maxTotal) * 100);
              return (
                <div key={m.user_id} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400 w-5 text-right">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0 overflow-hidden">
                    {m.profile?.avatar_url
                      ? <img src={m.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                      : (m.profile?.name?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800 truncate">{m.profile?.name ?? 'Unknown'}</span>
                      <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0 ml-2">
                        <span title="Events attended">{m.events} events</span>
                        <span title="Forum posts">{m.posts} posts</span>
                        <span title="Replies">{m.comments} replies</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tournament leaderboard */}
      {hasTournaments && tournamentStats.length > 0 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Tournament Rankings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="text-left pb-2 font-medium">#</th>
                  <th className="text-left pb-2 font-medium">Player</th>
                  <th className="text-right pb-2 font-medium">Entered</th>
                  <th className="text-right pb-2 font-medium">Avg Score</th>
                  <th className="text-right pb-2 font-medium">Best Score</th>
                  <th className="text-right pb-2 font-medium">Wins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tournamentStats.map((p, i) => (
                  <tr key={p.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pr-3 text-slate-400 font-medium">{i + 1}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0 overflow-hidden">
                          {p.profile?.avatar_url
                            ? <img src={p.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                            : (p.profile?.name?.[0] ?? '?').toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{p.profile?.name ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-slate-600 tabular-nums">{p.entries}</td>
                    <td className="py-2.5 text-right text-slate-600 tabular-nums">{p.avgScore ?? '—'}</td>
                    <td className="py-2.5 text-right text-slate-600 tabular-nums">{p.bestScore ?? '—'}</td>
                    <td className="py-2.5 text-right">
                      {p.wins > 0
                        ? <span className="font-semibold text-amber-600">{p.wins} 🏆</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Volunteer hours */}
      {hasVolunteer && volunteerStats.length > 0 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Volunteer Hours</h2>
          <div className="space-y-2">
            {volunteerStats.map((m, i) => {
              const maxHours = volunteerStats[0]?.hours || 1;
              const pct = Math.round((m.hours / maxHours) * 100);
              return (
                <div key={m.user_id} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400 w-5 text-right">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-semibold text-green-700 shrink-0 overflow-hidden">
                    {m.profile?.avatar_url
                      ? <img src={m.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                      : (m.profile?.name?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800 truncate">{m.profile?.name ?? 'Unknown'}</span>
                      <span className="text-xs text-slate-500 shrink-0 ml-2 tabular-nums">
                        {m.hours}h · {m.events} event{m.events !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
