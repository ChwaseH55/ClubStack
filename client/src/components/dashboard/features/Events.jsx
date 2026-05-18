import { useEffect, useState, useCallback } from 'react';
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

// ── Calendar helpers ─────────────────────────────────────────────────────────

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── EventsList ───────────────────────────────────────────────────────────────

function EventsList() {
  const { org, isAdmin } = useOrg();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'calendar'
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (!org) return;
    supabase
      .from('events')
      .select('id, title, description, start_at, end_at, max_capacity, author_id')
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

  const filteredEvents = selectedDay
    ? (eventsByDay[selectedDay] ?? [])
    : events;

  const upcomingEvents = filteredEvents.filter(e => new Date(e.start_at) >= new Date());
  const pastEvents = filteredEvents.filter(e => new Date(e.start_at) < new Date());

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Events</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            <button
              onClick={() => { setView('list'); setSelectedDay(null); }}
              className={`px-3 py-1.5 transition-colors ${view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >List</button>
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1.5 transition-colors ${view === 'calendar' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >Calendar</button>
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
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative flex flex-col items-center py-1.5 rounded-lg text-sm transition-colors
                    ${isSelected ? 'bg-indigo-600 text-white' : isToday ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  {day}
                  {hasEvents && (
                    <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                  )}
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
  return (
    <Link
      to={event.id}
      className={`card flex gap-5 px-5 py-4 hover:shadow-md transition-shadow group ${past ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-col items-center justify-center min-w-[48px] text-center">
        <span className="text-xs font-semibold text-indigo-500 uppercase">{start.toLocaleDateString('en-US', { month: 'short' })}</span>
        <span className="text-2xl font-bold text-slate-900 leading-none">{start.getDate()}</span>
      </div>
      <div className="border-l border-slate-100" />
      <div className="flex-1 min-w-0 space-y-1">
        <h2 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{event.title}</h2>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{formatTime(event.start_at)}{event.end_at ? ` – ${formatTime(event.end_at)}` : ''}</span>
          {event.max_capacity && <span>· {event.max_capacity} capacity</span>}
        </div>
        {event.description && (
          <p className="text-sm text-slate-500 truncate">{event.description}</p>
        )}
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
  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [poll, setPoll] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEvent = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, description, start_at, end_at, max_capacity, author_id, profiles!events_author_profile_fk(name, avatar_url)')
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
      .select('id, body, created_at, author_id, profiles!author_id(name, avatar_url)')
      .eq('event_id', id)
      .order('created_at', { ascending: true });
    setComments(data ?? []);
  }, [id]);

  const fetchPoll = useCallback(async () => {
    const { data } = await supabase.from('polls').select('*').eq('event_id', id).maybeSingle();
    setPoll(data);
  }, [id]);

  useEffect(() => {
    fetchEvent();
    fetchRsvps();
    fetchComments();
    fetchPoll();
  }, [fetchEvent, fetchRsvps, fetchComments, fetchPoll]);

  const handleRsvp = async (status) => {
    setRsvpLoading(true);
    if (myRsvp === status) {
      await supabase.from('event_rsvps').delete().eq('event_id', id).eq('user_id', user.id);
    } else {
      await supabase.from('event_rsvps').upsert({ event_id: id, user_id: user.id, status }, { onConflict: 'event_id,user_id' });
    }
    await fetchRsvps();
    setRsvpLoading(false);
  };

  const handleComment = async e => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setPosting(true);
    const { error } = await supabase.from('event_comments').insert({
      event_id: id, author_id: user.id, body: commentBody.trim()
    });
    if (error) { addToast(error.message, 'error'); setPosting(false); return; }
    setCommentBody('');
    await fetchComments();
    setPosting(false);
  };

  const handleDeleteComment = async (commentId) => {
    await supabase.from('event_comments').delete().eq('id', commentId);
    fetchComments();
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

  const rsvpButtons = [
    { status: 'going', label: 'Going', icon: '✓', activeClass: 'bg-green-600 text-white border-green-600' },
    { status: 'maybe', label: 'Maybe', icon: '?', activeClass: 'bg-amber-500 text-white border-amber-500' },
    { status: 'not_going', label: "Can't go", icon: '✕', activeClass: 'bg-slate-400 text-white border-slate-400' },
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
            <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {formatDate(event.start_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {formatTime(event.start_at)}{event.end_at ? ` – ${formatTime(event.end_at)}` : ''}
              </span>
              {event.max_capacity && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {event.max_capacity} capacity
                </span>
              )}
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

        {!isPast && (
          <div className="border border-slate-100 rounded-xl p-5 space-y-3">
            <p className="text-sm font-medium text-slate-700">Are you going?</p>
            <div className="flex flex-wrap gap-3">
              {rsvpButtons.map(({ status, label, activeClass }) => (
                <button
                  key={status}
                  disabled={rsvpLoading}
                  onClick={() => handleRsvp(status)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all
                    ${myRsvp === status ? activeClass : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                >
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
            <span><strong className="text-green-600">{rsvpCounts.going}</strong> went</span>
            <span><strong className="text-amber-500">{rsvpCounts.maybe}</strong> maybe</span>
            <span><strong className="text-slate-400">{rsvpCounts.not_going}</strong> couldn't go</span>
          </div>
        )}
      </div>

      {poll && <PollWidget poll={poll} />}

      <div className="card p-8 space-y-6">
        <h2 className="font-semibold text-slate-900">Comments <span className="text-slate-400 font-normal text-sm">({comments.length})</span></h2>

        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0 overflow-hidden">
                {c.profiles?.avatar_url
                  ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                  : (c.profiles?.name?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-slate-800">{c.profiles?.name ?? 'Unknown'}</span>
                  <span className="text-xs text-slate-400">{formatDate(c.created_at)}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{c.body}</p>
              </div>
              {(c.author_id === user.id || isAdmin) && (
                <button onClick={() => handleDeleteComment(c.id)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-slate-400">No comments yet. Be the first!</p>}
        </div>

        <form onSubmit={handleComment} className="flex gap-3 pt-2 border-t border-slate-100">
          <textarea
            value={commentBody}
            onChange={e => setCommentBody(e.target.value)}
            rows={2}
            placeholder="Add a comment…"
            className="input flex-1 resize-none text-sm"
          />
          <button type="submit" disabled={posting || !commentBody.trim()} className="btn-primary px-4 self-end">
            {posting ? '…' : 'Post'}
          </button>
        </form>
      </div>
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
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
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
    supabase.from('events').select('title, description, start_at, end_at, max_capacity').eq('id', id).single()
      .then(({ data }) => {
        if (!data) return;
        setTitle(data.title);
        setDescription(data.description ?? '');
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
        setLoading(false);
      });
  }, [id, isEdit]);

  const updatePollOption = (i, val) => {
    setPollOptions(prev => { const next = [...prev]; next[i] = val; return next; });
  };
  const addPollOption = () => setPollOptions(prev => [...prev, '']);
  const removePollOption = (i) => setPollOptions(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!title.trim() || !startDate || !startTime) return;
    setSaving(true);

    const start_at = new Date(`${startDate}T${startTime}`).toISOString();
    const end_at = endDate && endTime ? new Date(`${endDate}T${endTime}`).toISOString() : null;

    let eventId = id;

    if (isEdit) {
      const { error } = await supabase.from('events').update({
        title: title.trim(), description: description.trim() || null,
        start_at, end_at, max_capacity: maxCapacity ? Number(maxCapacity) : null,
      }).eq('id', id);
      if (error) { addToast(error.message, 'error'); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('events').insert({
        org_id: org.id, author_id: user.id, created_by: user.id, title: title.trim(),
        description: description.trim() || null, start_at, end_at,
        max_capacity: maxCapacity ? Number(maxCapacity) : null,
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
    }

    if (!isEdit && addPoll && pollQuestion.trim()) {
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
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Event name" className="input" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Tell members what to expect…" className="input resize-none" />
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
            <input type="number" min="1" value={maxCapacity} onChange={e => setMaxCapacity(e.target.value)} placeholder="Leave blank for unlimited" className="input w-40" />
          </div>

          {!isEdit && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={postAsAnnouncement} onChange={e => setPostAsAnnouncement(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Also post as announcement</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={addPoll} onChange={e => setAddPoll(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
                <span className="text-sm font-medium text-slate-700">Attach a poll to this event</span>
              </label>

              {addPoll && (
                <div className="pl-7 space-y-4 border-l-2 border-indigo-100">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Poll question</label>
                    <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="e.g. Which day works best?" className="input" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Options</label>
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={opt} onChange={e => updatePollOption(i, e.target.value)} placeholder={`Option ${i + 1}`} className="input flex-1" />
                        {pollOptions.length > 2 && (
                          <button type="button" onClick={() => removePollOption(i)} className="text-slate-400 hover:text-red-400 transition-colors px-2">✕</button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 6 && (
                      <button type="button" onClick={addPollOption} className="text-sm text-indigo-600 hover:underline">+ Add option</button>
                    )}
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={pollAllowMultiple} onChange={e => setPollAllowMultiple(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
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

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(str) {
  if (!str) return '';
  return new Date(str).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
