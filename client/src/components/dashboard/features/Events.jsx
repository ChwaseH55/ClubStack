import { useEffect, useState, useCallback, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useOrg } from '../../../context/OrgContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import PollWidget from './PollWidget';

export default function Events() {
  return (
    <Routes>
      <Route index element={<EventsList />} />
      <Route path="new" element={<EventForm />} />
      <Route path=":id" element={<EventDetail />} />
      <Route path=":id/edit" element={<EventForm />} />
    </Routes>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPES = {
  general:    { label: 'General',    color: 'bg-slate-100 text-slate-600' },
  tournament: { label: 'Tournament', color: 'bg-amber-100 text-amber-700' },
  volunteer:  { label: 'Volunteer',  color: 'bg-green-100 text-green-700' },
};

// ── Calendar helpers ─────────────────────────────────────────────────────────

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── EventsList ───────────────────────────────────────────────────────────────

function EventsList() {
  const { org, isAdmin } = useOrg();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (!org) return;
    supabase
      .from('events')
      .select('id, title, description, start_at, end_at, max_capacity, author_id, event_type, location')
      .eq('org_id', org.id)
      .order('start_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('events fetch error', error);
        setEvents(data ?? []);
        setLoading(false);
      });
  }, [org]);

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const eventsByDay = {};
  events.forEach(ev => {
    if (!ev.start_at) return;
    const d = new Date(ev.start_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  });

  const filteredEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : events;
  const upcomingEvents = filteredEvents.filter(e => new Date(e.start_at) >= new Date());
  const pastEvents    = filteredEvents.filter(e => new Date(e.start_at) < new Date());

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Events</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            <button onClick={() => { setView('list'); setSelectedDay(null); }}
              className={`px-3 py-1.5 transition-colors ${view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              List
            </button>
            <button onClick={() => setView('calendar')}
              className={`px-3 py-1.5 transition-colors ${view === 'calendar' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              Calendar
            </button>
          </div>
          {isAdmin && <Link to="new" className="btn-primary">+ New Event</Link>}
        </div>
      </div>

      {view === 'calendar' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="font-semibold text-slate-800">{MONTHS[month]} {year}</span>
            <button onClick={() => setCalDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-400 mb-2">
            {DOW.map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`blank-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const hasEvents = Boolean(eventsByDay[day]);
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
              const isSelected = selectedDay === day;
              return (
                <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative flex flex-col items-center py-1.5 rounded-lg text-sm transition-colors
                    ${isSelected ? 'bg-indigo-600 text-white' : isToday ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}>
                  {day}
                  {hasEvents && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />}
                </button>
              );
            })}
          </div>
          {selectedDay && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
              <span>{eventsByDay[selectedDay]?.length ?? 0} event(s) on {MONTHS[month]} {selectedDay}</span>
              <button onClick={() => setSelectedDay(null)} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card px-8 py-16 text-center text-slate-400 text-sm">
          {selectedDay ? `No events on ${MONTHS[month]} ${selectedDay}.` : isAdmin
            ? <span>No events yet. <Link to="new" className="text-indigo-600 hover:underline">Create the first one.</Link></span>
            : 'No events yet.'}
        </div>
      ) : (
        <div className="space-y-6">
          {upcomingEvents.length > 0 && (
            <div className="space-y-3">
              {!selectedDay && <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Upcoming</h2>}
              {upcomingEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
            </div>
          )}
          {pastEvents.length > 0 && (
            <div className="space-y-3">
              {!selectedDay && <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Past</h2>}
              {pastEvents.map(ev => <EventCard key={ev.id} event={ev} past />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, past }) {
  const start = new Date(event.start_at);
  const type = EVENT_TYPES[event.event_type] ?? EVENT_TYPES.general;
  return (
    <Link to={event.id} className={`card flex gap-5 px-5 py-4 hover:shadow-md transition-shadow group ${past ? 'opacity-60' : ''}`}>
      <div className="flex flex-col items-center justify-center min-w-[48px] text-center">
        <span className="text-xs font-semibold text-indigo-500 uppercase">{start.toLocaleDateString('en-US', { month: 'short' })}</span>
        <span className="text-2xl font-bold text-slate-900 leading-none">{start.getDate()}</span>
      </div>
      <div className="border-l border-slate-100" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{event.title}</h2>
          {event.event_type && event.event_type !== 'general' && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${type.color}`}>{type.label}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          <span>{formatTime(event.start_at)}{event.end_at ? ` – ${formatTime(event.end_at)}` : ''}</span>
          {event.max_capacity && <span>· {event.max_capacity} capacity</span>}
          {event.location && (
            <span className="flex items-center gap-1">
              ·
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {event.location}
            </span>
          )}
        </div>
        {event.description && <p className="text-sm text-slate-500 truncate">{event.description}</p>}
      </div>
    </Link>
  );
}

// ── EventDetail ──────────────────────────────────────────────────────────────

function EventDetail() {
  const { id } = useParams();
  const { org, isAdmin } = useOrg();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rsvpCounts, setRsvpCounts] = useState({ going: 0, maybe: 0, not_going: 0 });
  const [myRsvp, setMyRsvp] = useState(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [poll, setPoll] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [participants, setParticipants] = useState([]);

  const fetchEvent = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, description, start_at, end_at, max_capacity, author_id, event_type, location, type_metadata, profiles!events_author_profile_fk(name, avatar_url)')
      .eq('id', id)
      .single();
    setEvent(data);
    setLoading(false);
  }, [id]);

  const fetchRsvps = useCallback(async () => {
    const { data } = await supabase.from('event_rsvps').select('user_id, status').eq('event_id', id);
    if (!data) return;
    const counts = { going: 0, maybe: 0, not_going: 0 };
    let mine = null;
    data.forEach(r => {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (r.user_id === user.id) mine = r.status;
    });
    setRsvpCounts(counts);
    setMyRsvp(mine);
  }, [id, user.id]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('event_comments')
      .select('id, body, created_at, author_id, reply_to_id, profiles!author_id(name, avatar_url)')
      .eq('event_id', id)
      .order('created_at', { ascending: true });
    const list = data ?? [];
    setComments(attachReplies(list));
    if (list.length > 0) {
      const { data: likeData } = await supabase
        .from('event_comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', list.map(c => c.id));
      setLikes(buildLikesMap(likeData ?? [], user.id));
    }
  }, [id, user.id]);

  const fetchPoll = useCallback(async () => {
    const { data } = await supabase.from('polls').select('*').eq('event_id', id).maybeSingle();
    setPoll(data);
  }, [id]);

  const fetchParticipants = useCallback(async () => {
    const { data } = await supabase
      .from('tournament_participants')
      .select('id, user_id, score, result_note, registered_at, profiles!user_id(name, avatar_url)')
      .eq('event_id', id)
      .order('registered_at', { ascending: true });
    setParticipants(data ?? []);
  }, [id]);

  useEffect(() => {
    fetchEvent();
    fetchRsvps();
    fetchComments();
    fetchPoll();
  }, [fetchEvent, fetchRsvps, fetchComments, fetchPoll]);

  useEffect(() => {
    if (event?.event_type === 'tournament') fetchParticipants();
  }, [event?.event_type, fetchParticipants]);

  const handleRsvp = async (status) => {
    setRsvpLoading(true);
    const wasTournamentGoing = event?.event_type === 'tournament' && myRsvp === 'going';
    const willBeTournamentGoing = event?.event_type === 'tournament' && status === 'going' && myRsvp !== 'going';

    if (myRsvp === status) {
      await supabase.from('event_rsvps').delete().eq('event_id', id).eq('user_id', user.id);
      if (wasTournamentGoing) {
        await supabase.from('tournament_participants').delete().eq('event_id', id).eq('user_id', user.id);
      }
    } else {
      await supabase.from('event_rsvps').upsert({ event_id: id, user_id: user.id, status }, { onConflict: 'event_id,user_id' });
      if (willBeTournamentGoing) {
        await supabase.from('tournament_participants').upsert({ event_id: id, user_id: user.id }, { onConflict: 'event_id,user_id' });
      } else if (wasTournamentGoing) {
        await supabase.from('tournament_participants').delete().eq('event_id', id).eq('user_id', user.id);
      }
    }
    await fetchRsvps();
    if (event?.event_type === 'tournament') await fetchParticipants();
    setRsvpLoading(false);
  };

  const handleComment = async e => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setPosting(true);
    const { error } = await supabase.from('event_comments').insert({
      event_id: id, author_id: user.id, body: commentBody.trim(),
      reply_to_id: replyTo?.id ?? null,
    });
    if (error) { addToast(error.message, 'error'); setPosting(false); return; }
    setCommentBody('');
    setReplyTo(null);
    await fetchComments();
    setPosting(false);
  };

  const handleDeleteComment = async (commentId) => {
    await supabase.from('event_comments').delete().eq('id', commentId);
    fetchComments();
  };

  const handleLike = async commentId => {
    const current = likes[commentId] ?? { count: 0, liked: false };
    setLikes(prev => ({
      ...prev,
      [commentId]: { count: current.liked ? current.count - 1 : current.count + 1, liked: !current.liked },
    }));
    if (current.liked) {
      await supabase.from('event_comment_likes').delete().eq('comment_id', commentId).eq('user_id', user.id);
    } else {
      await supabase.from('event_comment_likes').insert({ comment_id: commentId, user_id: user.id });
    }
  };

  const handleScoreUpdate = async (participantId, score, resultNote) => {
    await supabase.from('tournament_participants')
      .update({ score: score !== '' ? Number(score) : null, result_note: resultNote || null })
      .eq('id', participantId);
    await fetchParticipants();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return;
    setDeleting(true);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) { addToast(error.message, 'error'); setDeleting(false); return; }
    addToast('Event deleted.', 'info');
    navigate('..', { relative: 'path' });
  };

  if (loading) return <div className="text-slate-400 text-sm">Loading…</div>;
  if (!event) return <div className="text-slate-400 text-sm">Event not found.</div>;

  const isPast = event.end_at ? new Date(event.end_at) < new Date() : new Date(event.start_at) < new Date();
  const canEdit = isAdmin || event.author_id === user.id;
  const type = EVENT_TYPES[event.event_type] ?? EVENT_TYPES.general;
  const meta = event.type_metadata ?? {};

  // Volunteer credit: hours earned if past + RSVP'd going
  const eventDurationHours = event.end_at
    ? Math.round(((new Date(event.end_at) - new Date(event.start_at)) / 3600000) * 10) / 10
    : null;
  const earnedHours = event.event_type === 'volunteer' && isPast && myRsvp === 'going'
    ? eventDurationHours
    : null;

  const rsvpButtons = event.event_type === 'volunteer'
    ? [
        { status: 'going',     label: "I'll volunteer", activeClass: 'bg-green-600 text-white border-green-600' },
        { status: 'maybe',     label: 'Maybe',          activeClass: 'bg-amber-500 text-white border-amber-500' },
        { status: 'not_going', label: "Can't make it",  activeClass: 'bg-slate-400 text-white border-slate-400' },
      ]
    : [
        { status: 'going',     label: 'Going',   activeClass: 'bg-green-600 text-white border-green-600' },
        { status: 'maybe',     label: 'Maybe',   activeClass: 'bg-amber-500 text-white border-amber-500' },
        { status: 'not_going', label: "Can't go", activeClass: 'bg-slate-400 text-white border-slate-400' },
      ];

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to=".." relative="path" className="hover:text-slate-600 transition-colors">Events</Link>
        <span>/</span>
        <span className="text-slate-600 truncate">{event.title}</span>
      </div>

      <div className="card p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
              {event.event_type !== 'general' && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${type.color}`}>{type.label}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {formatDate(event.start_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {formatTime(event.start_at)}{event.end_at ? ` – ${formatTime(event.end_at)}` : ''}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {event.location}
                </span>
              )}
              {event.max_capacity && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {event.max_capacity} capacity
                </span>
              )}
            </div>

            {/* Calendar export */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href={toGoogleCalendarUrl(event)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors border border-slate-200 hover:border-indigo-300 rounded-lg px-2.5 py-1"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 3h-1.5V1.5A1.5 1.5 0 0016.5 0h-1A1.5 1.5 0 0014 1.5V3h-4V1.5A1.5 1.5 0 008.5 0h-1A1.5 1.5 0 006 1.5V3H4.5A4.5 4.5 0 000 7.5v12A4.5 4.5 0 004.5 24h15a4.5 4.5 0 004.5-4.5v-12A4.5 4.5 0 0019.5 3zM22 19.5a2.5 2.5 0 01-2.5 2.5h-15A2.5 2.5 0 012 19.5V10h20v9.5zM2 8V7.5A2.5 2.5 0 014.5 5H6v1.5A1.5 1.5 0 007.5 8h1A1.5 1.5 0 0010 6.5V5h4v1.5A1.5 1.5 0 0015.5 8h1A1.5 1.5 0 0018 6.5V5h1.5A2.5 2.5 0 0122 7.5V8H2z"/></svg>
                Add to Google Calendar
              </a>
              <button
                onClick={() => downloadIcs(event)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors border border-slate-200 hover:border-indigo-300 rounded-lg px-2.5 py-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download .ics
              </button>
            </div>
          </div>

          {canEdit && (
            <div className="flex gap-2 shrink-0">
              <Link to="edit" className="btn-secondary text-sm px-4 py-2">Edit</Link>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>
        )}

        {/* Volunteer metadata card */}
        {event.event_type === 'volunteer' && (meta.organization || meta.what_to_bring || meta.contact || eventDurationHours) && (
          <div className="rounded-xl border border-green-100 bg-green-50/50 p-4 space-y-2 text-sm">
            <p className="font-medium text-green-800 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              Volunteer Event
              {eventDurationHours && <span className="ml-auto font-normal text-green-700">{eventDurationHours}h credited</span>}
            </p>
            {meta.organization && <p className="text-green-700"><span className="font-medium">Organization:</span> {meta.organization}</p>}
            {meta.contact && <p className="text-green-700"><span className="font-medium">Contact:</span> {meta.contact}</p>}
            {meta.what_to_bring && <p className="text-green-700"><span className="font-medium">What to bring:</span> {meta.what_to_bring}</p>}
          </div>
        )}

        {/* Tournament metadata card (pre-Phase 2) */}
        {event.event_type === 'tournament' && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-2 text-sm">
            <p className="font-medium text-amber-800 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              Tournament
              <span className="ml-1 font-normal text-amber-700 capitalize">· {(meta.tournament_mode ?? 'leaderboard').replace('_', ' ')}</span>
            </p>
            {meta.score_label && <p className="text-amber-700"><span className="font-medium">Scoring:</span> {meta.score_label}{meta.lower_is_better !== false ? ' (lower is better)' : ' (higher is better)'}</p>}
            {meta.prize_description && <p className="text-amber-700"><span className="font-medium">Prize:</span> {meta.prize_description}</p>}
          </div>
        )}

        {/* Volunteer hours earned banner */}
        {earnedHours !== null && (
          <div className="flex items-center gap-3 rounded-xl bg-green-600 text-white px-4 py-3">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-sm font-medium">You earned <strong>{earnedHours} volunteer hour{earnedHours !== 1 ? 's' : ''}</strong> for attending this event.</p>
          </div>
        )}

        {!isPast && (
          <div className="border border-slate-100 rounded-xl p-5 space-y-3">
            <p className="text-sm font-medium text-slate-700">
              {event.event_type === 'volunteer' ? 'Are you volunteering?' : 'Are you going?'}
            </p>
            <div className="flex flex-wrap gap-3">
              {rsvpButtons.map(({ status, label, activeClass }) => (
                <button key={status} disabled={rsvpLoading} onClick={() => handleRsvp(status)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all
                    ${myRsvp === status ? activeClass : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                  {label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${myRsvp === status ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                    {rsvpCounts[status] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isPast && (
          <div className="flex gap-6 text-sm text-slate-500 border border-slate-100 rounded-xl p-4">
            <span><strong className="text-green-600">{rsvpCounts.going}</strong> {event.event_type === 'volunteer' ? 'volunteered' : 'went'}</span>
            <span><strong className="text-amber-500">{rsvpCounts.maybe}</strong> maybe</span>
            <span><strong className="text-slate-400">{rsvpCounts.not_going}</strong> couldn't go</span>
          </div>
        )}
      </div>

      {poll && <PollWidget poll={poll} />}

      {event.event_type === 'tournament' && (
        <TournamentLeaderboard
          participants={participants}
          meta={meta}
          currentUserId={user.id}
          isAdmin={isAdmin}
          isPast={isPast}
          onScoreUpdate={handleScoreUpdate}
        />
      )}

      {/* Comments */}
      <div className="card p-8 space-y-6">
        <h2 className="font-semibold text-slate-900">Comments <span className="text-slate-400 font-normal text-sm">({comments.length})</span></h2>
        <div className="space-y-5">
          {comments.map(c => (
            <EventCommentItem key={c.id} comment={c} currentUserId={user.id} isAdmin={isAdmin}
              like={likes[c.id] ?? { count: 0, liked: false }}
              onReply={setReplyTo} onLike={handleLike} onDelete={handleDeleteComment} />
          ))}
          {comments.length === 0 && <p className="text-sm text-slate-400">No comments yet. Be the first!</p>}
        </div>
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {replyTo && (
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="w-0.5 h-7 bg-indigo-400 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-indigo-600">{replyTo.profiles?.name ?? 'Unknown'}</p>
                <p className="text-xs text-slate-500 truncate">{replyTo.body}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          <form onSubmit={handleComment} className="flex gap-3">
            <textarea value={commentBody} onChange={e => setCommentBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape' && replyTo) setReplyTo(null); }}
              rows={2} placeholder={replyTo ? `Replying to ${replyTo.profiles?.name ?? 'Unknown'}…` : 'Add a comment…'}
              className="input flex-1 resize-none text-sm" />
            <button type="submit" disabled={posting || !commentBody.trim()} className="btn-primary px-4 self-end">
              {posting ? '…' : 'Post'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── EventCommentItem ─────────────────────────────────────────────────────────

function EventCommentItem({ comment: c, currentUserId, isAdmin, like, onReply, onLike, onDelete }) {
  return (
    <div className="flex gap-3 group">
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0 overflow-hidden mt-0.5">
        {c.profiles?.avatar_url
          ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
          : (c.profiles?.name?.[0] ?? '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-slate-800">{c.profiles?.name ?? 'Unknown'}</span>
          <span className="text-xs text-slate-400">{formatDate(c.created_at)}</span>
        </div>
        {c.reply_to && (
          <div className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border-l-2 border-slate-300 text-xs text-slate-500">
            <span className="font-medium text-slate-600 shrink-0">{c.reply_to.profiles?.name ?? 'Unknown'}:</span>
            <span className="truncate">{c.reply_to.body ?? '—'}</span>
          </div>
        )}
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{c.body}</p>
        <div className="flex items-center gap-4 pt-0.5">
          <button onClick={() => onLike(c.id)}
            className={`flex items-center gap-1.5 text-xs transition-colors ${like.liked ? 'text-red-500' : 'text-slate-400 hover:text-red-400'}`}>
            <svg className="w-3.5 h-3.5" fill={like.liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {like.count > 0 ? like.count : 'Like'}
          </button>
          <button onClick={() => onReply(c)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply
          </button>
          {(c.author_id === currentUserId || isAdmin) && (
            <button onClick={() => onDelete(c.id)}
              className="ml-auto text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TournamentLeaderboard ────────────────────────────────────────────────────

function TournamentLeaderboard({ participants, meta, currentUserId, isAdmin, isPast, onScoreUpdate }) {
  const lowerIsBetter = meta.lower_is_better !== false;
  const scoreLabel = meta.score_label || 'Score';

  // Sort participants: those with scores first (ranked), then unscored
  const scored = participants
    .filter(p => p.score !== null && p.score !== undefined && !p.result_note)
    .sort((a, b) => lowerIsBetter ? a.score - b.score : b.score - a.score);
  const withdrawn = participants.filter(p => p.result_note);
  const pending = participants.filter(p => (p.score === null || p.score === undefined) && !p.result_note);

  // Compute placements (ties share the same place, next place skips)
  const placed = scored.map((p, i, arr) => {
    if (i === 0 || p.score !== arr[i - 1].score) return { ...p, placement: i + 1 };
    return { ...p, placement: arr.findIndex(x => x.score === p.score) + 1 };
  });

  const ranked = [...placed, ...pending.map(p => ({ ...p, placement: null })), ...withdrawn.map(p => ({ ...p, placement: null }))];
  const hasAnyScore = scored.length > 0;

  return (
    <div className="card p-8 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">
          Leaderboard
          <span className="ml-2 text-sm font-normal text-slate-400">({participants.length} registered)</span>
        </h2>
        {hasAnyScore && (
          <span className="text-xs text-slate-400">{scoreLabel} · {lowerIsBetter ? 'lowest wins' : 'highest wins'}</span>
        )}
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-slate-400">No one has registered yet. RSVP "Going" to register.</p>
      ) : (
        <div className="space-y-1">
          {ranked.map((p, idx) => (
            <ParticipantRow
              key={p.id}
              participant={p}
              rank={idx + 1}
              scoreLabel={scoreLabel}
              isCurrentUser={p.user_id === currentUserId}
              isAdmin={isAdmin}
              isPast={isPast}
              onScoreUpdate={onScoreUpdate}
            />
          ))}
        </div>
      )}

      {!isPast && participants.length > 0 && !hasAnyScore && (
        <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
          {isAdmin ? 'Score entry will be available once the event is underway.' : 'Scores will appear here during and after the event.'}
        </p>
      )}
    </div>
  );
}

function ParticipantRow({ participant: p, rank, scoreLabel, isCurrentUser, isAdmin, isPast, onScoreUpdate }) {
  const [editScore, setEditScore] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setEditScore(p.score !== null && p.score !== undefined ? String(p.score) : '');
    setEditNote(p.result_note ?? '');
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    await onScoreUpdate(p.id, editScore, editNote);
    setSaving(false);
    setEditing(false);
  };

  const medal = p.placement === 1 ? '🥇' : p.placement === 2 ? '🥈' : p.placement === 3 ? '🥉' : null;

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isCurrentUser ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}`}>
      {/* Placement */}
      <div className="w-8 text-center shrink-0">
        {medal
          ? <span className="text-lg leading-none">{medal}</span>
          : p.placement
            ? <span className="text-sm font-bold text-slate-500">#{p.placement}</span>
            : <span className="text-xs text-slate-300">—</span>}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0 overflow-hidden">
        {p.profiles?.avatar_url
          ? <img src={p.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
          : (p.profiles?.name?.[0] ?? '?').toUpperCase()}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${isCurrentUser ? 'text-indigo-700' : 'text-slate-800'}`}>
          {p.profiles?.name ?? 'Unknown'}
          {isCurrentUser && <span className="ml-1.5 text-xs text-indigo-400">(you)</span>}
        </span>
        {p.result_note && <span className="ml-2 text-xs text-slate-400 italic">{p.result_note}</span>}
      </div>

      {/* Score / edit */}
      {editing ? (
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="number"
            value={editScore}
            onChange={e => setEditScore(e.target.value)}
            placeholder={scoreLabel}
            className="input w-24 text-sm py-1 px-2"
            autoFocus
          />
          <input
            type="text"
            value={editNote}
            onChange={e => setEditNote(e.target.value)}
            placeholder="Note (e.g. WD)"
            className="input w-28 text-sm py-1 px-2"
          />
          <button onClick={saveEdit} disabled={saving}
            className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50">
            {saving ? '…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
        </div>
      ) : (
        <div className="flex items-center gap-3 shrink-0">
          {p.score !== null && p.score !== undefined ? (
            <span className="text-sm font-semibold text-slate-700 tabular-nums">{p.score}</span>
          ) : (
            <span className="text-xs text-slate-300">no score</span>
          )}
          {isAdmin && (isPast || true) && (
            <button onClick={startEdit}
              className="text-slate-300 hover:text-indigo-500 transition-colors p-1 rounded"
              title="Edit score">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── EventForm ────────────────────────────────────────────────────────────────

function EventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { org } = useOrg();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('general');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  // Tournament metadata
  const [scoreLabel, setScoreLabel] = useState('Total Strokes');
  const [lowerIsBetter, setLowerIsBetter] = useState(true);
  const [prizeDescription, setPrizeDescription] = useState('');
  // Volunteer metadata
  const [volunteerOrg, setVolunteerOrg] = useState('');
  const [whatToBring, setWhatToBring] = useState('');
  const [volunteerContact, setVolunteerContact] = useState('');
  // Other
  const [postAsAnnouncement, setPostAsAnnouncement] = useState(false);
  const [addPoll, setAddPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [pollEndsAt, setPollEndsAt] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    supabase.from('events')
      .select('title, description, location, start_at, end_at, max_capacity, event_type, type_metadata')
      .eq('id', id).single()
      .then(({ data }) => {
        if (!data) return;
        setTitle(data.title);
        setDescription(data.description ?? '');
        setLocation(data.location ?? '');
        setEventType(data.event_type ?? 'general');
        setMaxCapacity(data.max_capacity ?? '');
        if (data.start_at) {
          const d = new Date(data.start_at);
          setStartDate(d.toISOString().split('T')[0]);
          setStartTime(d.toTimeString().slice(0, 5));
        }
        if (data.end_at) {
          const d = new Date(data.end_at);
          setEndDate(d.toISOString().split('T')[0]);
          setEndTime(d.toTimeString().slice(0, 5));
        }
        const meta = data.type_metadata ?? {};
        setScoreLabel(meta.score_label ?? 'Total Strokes');
        setLowerIsBetter(meta.lower_is_better ?? true);
        setPrizeDescription(meta.prize_description ?? '');
        setVolunteerOrg(meta.organization ?? '');
        setWhatToBring(meta.what_to_bring ?? '');
        setVolunteerContact(meta.contact ?? '');
        setLoading(false);
      });
  }, [id, isEdit]);

  const updatePollOption = (i, val) => setPollOptions(prev => { const next = [...prev]; next[i] = val; return next; });
  const addPollOption = () => setPollOptions(prev => [...prev, '']);
  const removePollOption = (i) => setPollOptions(prev => prev.filter((_, idx) => idx !== i));

  const buildTypeMetadata = () => {
    if (eventType === 'tournament') return {
      tournament_mode: 'leaderboard',
      score_label: scoreLabel.trim() || 'Score',
      lower_is_better: lowerIsBetter,
      ...(prizeDescription.trim() && { prize_description: prizeDescription.trim() }),
    };
    if (eventType === 'volunteer') return {
      ...(volunteerOrg.trim() && { organization: volunteerOrg.trim() }),
      ...(whatToBring.trim() && { what_to_bring: whatToBring.trim() }),
      ...(volunteerContact.trim() && { contact: volunteerContact.trim() }),
    };
    return {};
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!title.trim() || !startDate || !startTime) return;
    setSaving(true);

    const start_at = new Date(`${startDate}T${startTime}`).toISOString();
    const end_at = endDate && endTime ? new Date(`${endDate}T${endTime}`).toISOString() : null;
    const type_metadata = buildTypeMetadata();

    let eventId = id;

    if (isEdit) {
      const { error } = await supabase.from('events').update({
        title: title.trim(), description: description.trim() || null,
        location: location.trim() || null, event_type: eventType,
        start_at, end_at, max_capacity: maxCapacity ? Number(maxCapacity) : null,
        type_metadata,
      }).eq('id', id);
      if (error) { addToast(error.message, 'error'); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('events').insert({
        org_id: org.id, author_id: user.id, created_by: user.id,
        title: title.trim(), description: description.trim() || null,
        location: location.trim() || null, event_type: eventType,
        start_at, end_at, max_capacity: maxCapacity ? Number(maxCapacity) : null,
        type_metadata,
      }).select('id').single();
      if (error) { addToast(error.message, 'error'); setSaving(false); return; }
      eventId = data.id;

      if (postAsAnnouncement) {
        await supabase.from('announcements').insert({
          org_id: org.id, author_id: user.id,
          title: title.trim(),
          body: `${formatDate(start_at)}${end_at ? ` – ${formatDate(end_at)}` : ''}${description.trim() ? `\n\n${description.trim()}` : ''}`,
          event_id: eventId,
        });
      }

      if (addPoll && pollQuestion.trim()) {
        const validOptions = pollOptions.filter(o => o.trim());
        if (validOptions.length >= 2) {
          await supabase.from('polls').insert({
            org_id: org.id, author_id: user.id,
            question: pollQuestion.trim(),
            options: validOptions.map(o => o.trim()),
            allow_multiple: pollAllowMultiple,
            ends_at: pollEndsAt ? new Date(pollEndsAt).toISOString() : null,
            event_id: eventId,
          });
        }
      }
    }

    addToast(isEdit ? 'Event updated.' : 'Event created.', 'success');
    navigate(isEdit ? '../..' : `../${eventId}`, { relative: 'path' });
  };

  if (loading) return <div className="text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to={isEdit ? '../..' : '..'} relative="path" className="hover:text-slate-600 transition-colors">Events</Link>
        <span>/</span>
        <span className="text-slate-600">{isEdit ? 'Edit' : 'New Event'}</span>
      </div>

      <div className="card p-8">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Event type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Event type</label>
            <div className="flex gap-2">
              {Object.entries(EVENT_TYPES).map(([key, { label, color }]) => (
                <button key={key} type="button" onClick={() => setEventType(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                    ${eventType === key ? `${color} border-transparent ring-2 ring-offset-1 ring-indigo-400` : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Event name" className="input" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Tell members what to expect…" className="input resize-none" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Location <span className="text-slate-400 font-normal">(optional)</span></label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Riverside Golf Club, Hole 1" className="input" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Start date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Start time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">End date <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">End time <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Max capacity <span className="text-slate-400 font-normal">(optional)</span></label>
            <input type="number" min="1" value={maxCapacity} onChange={e => setMaxCapacity(e.target.value)}
              placeholder="Leave blank for unlimited" className="input w-40" />
          </div>

          {/* Tournament metadata */}
          {eventType === 'tournament' && (
            <div className="space-y-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-sm font-semibold text-amber-800">Tournament settings</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Score label</label>
                <input type="text" value={scoreLabel} onChange={e => setScoreLabel(e.target.value)}
                  placeholder="e.g. Total Strokes, Net Score" className="input" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={lowerIsBetter} onChange={e => setLowerIsBetter(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
                <span className="text-sm text-slate-700">Lower score is better <span className="text-slate-400">(golf scoring)</span></span>
              </label>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Prize / award <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" value={prizeDescription} onChange={e => setPrizeDescription(e.target.value)}
                  placeholder="e.g. Trophy + $50 gift card" className="input" />
              </div>
            </div>
          )}

          {/* Volunteer metadata */}
          {eventType === 'volunteer' && (
            <div className="space-y-4 p-4 rounded-xl bg-green-50 border border-green-100">
              <p className="text-sm font-semibold text-green-800">Volunteer details</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Organization / cause <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" value={volunteerOrg} onChange={e => setVolunteerOrg(e.target.value)}
                  placeholder="e.g. Riverside Food Bank" className="input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">What to bring <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" value={whatToBring} onChange={e => setWhatToBring(e.target.value)}
                  placeholder="e.g. Closed-toe shoes, work gloves" className="input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Contact <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" value={volunteerContact} onChange={e => setVolunteerContact(e.target.value)}
                  placeholder="e.g. Jane Doe — jane@example.com" className="input" />
              </div>
            </div>
          )}

          {!isEdit && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={postAsAnnouncement} onChange={e => setPostAsAnnouncement(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Also post as announcement</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={addPoll} onChange={e => setAddPoll(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Attach a poll to this event</span>
              </label>
              {addPoll && (
                <div className="pl-7 space-y-4 border-l-2 border-indigo-100">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Poll question</label>
                    <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                      placeholder="e.g. Which tee time works best?" className="input" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Options</label>
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={opt} onChange={e => updatePollOption(i, e.target.value)}
                          placeholder={`Option ${i + 1}`} className="input flex-1" />
                        {pollOptions.length > 2 && (
                          <button type="button" onClick={() => removePollOption(i)}
                            className="text-slate-400 hover:text-red-400 transition-colors px-2">✕</button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 6 && (
                      <button type="button" onClick={addPollOption} className="text-sm text-indigo-600 hover:underline">+ Add option</button>
                    )}
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={pollAllowMultiple} onChange={e => setPollAllowMultiple(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
                    <span className="text-sm text-slate-700">Allow multiple selections</span>
                  </label>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Poll closes at <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input type="datetime-local" value={pollEndsAt} onChange={e => setPollEndsAt(e.target.value)} className="input" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
            </button>
            <Link to={isEdit ? '../..' : '..'} relative="path" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function attachReplies(comments) {
  const byId = Object.fromEntries(comments.map(c => [c.id, c]));
  return comments.map(c => {
    if (!c.reply_to_id) return c;
    const parent = byId[c.reply_to_id];
    return { ...c, reply_to: parent ?? { id: c.reply_to_id, body: null, profiles: null } };
  });
}

function buildLikesMap(likes, userId) {
  const map = {};
  likes.forEach(l => {
    if (!map[l.comment_id]) map[l.comment_id] = { count: 0, liked: false };
    map[l.comment_id].count++;
    if (l.user_id === userId) map[l.comment_id].liked = true;
  });
  return map;
}

function toGoogleCalendarUrl(event) {
  const fmt = dt => new Date(dt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = event.end_at || event.start_at;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(event.start_at)}/${fmt(end)}`,
  });
  if (event.description) params.set('details', event.description);
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

function downloadIcs(event) {
  const fmt = dt => new Date(dt).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const esc = s => (s || '').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const end = event.end_at || event.start_at;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClubStack//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(event.start_at)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(event.title)}`,
    event.description && `DESCRIPTION:${esc(event.description)}`,
    event.location && `LOCATION:${esc(event.location)}`,
    `UID:${event.id}@clubstack`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(str) {
  if (!str) return '';
  return new Date(str).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
