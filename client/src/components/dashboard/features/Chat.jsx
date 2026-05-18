import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useOrg } from '../../../context/OrgContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export default function Chat() {
  const { org, isAdmin } = useOrg();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (!org) return;
    const { data } = await supabase
      .from('chat_rooms')
      .select('id, name, org_id')
      .eq('org_id', org.id)
      .order('name');
    const list = data ?? [];
    setRooms(list);
    if (!activeRoom && list.length > 0) setActiveRoom(list[0]);
  }, [org, activeRoom]);

  useEffect(() => { fetchRooms(); }, [org]);

  const handleCreateRoom = async e => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreatingRoom(true);
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({ org_id: org.id, name: newRoomName.trim().toLowerCase().replace(/\s+/g, '-') })
      .select('id, name')
      .single();
    setCreatingRoom(false);
    if (error) { addToast(error.message, 'error'); return; }
    setRooms(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setActiveRoom(data);
    setNewRoomName('');
    setShowNewRoom(false);
  };

  const handleDeleteRoom = async room => {
    if (!confirm(`Delete #${room.name} and all its messages?`)) return;
    await supabase.from('chat_rooms').delete().eq('id', room.id);
    setRooms(prev => prev.filter(r => r.id !== room.id));
    if (activeRoom?.id === room.id) setActiveRoom(rooms.find(r => r.id !== room.id) ?? null);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] w-full max-w-6xl rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Sidebar – room list */}
      <div className="w-56 shrink-0 bg-slate-900 flex flex-col">
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Channels</p>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {rooms.map(room => (
            <div key={room.id} className="group flex items-center gap-1">
              <button
                onClick={() => setActiveRoom(room)}
                className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeRoom?.id === room.id
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`}
              >
                <span className="text-slate-500 mr-1">#</span>{room.name}
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteRoom(room)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {rooms.length === 0 && (
            <p className="text-xs text-slate-600 px-3 py-2">No channels yet.</p>
          )}
        </div>

        {isAdmin && (
          <div className="px-2 pb-3 border-t border-white/10 pt-3">
            {showNewRoom ? (
              <form onSubmit={handleCreateRoom} className="space-y-2">
                <input
                  autoFocus
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  placeholder="channel-name"
                  className="w-full bg-white/10 text-white placeholder-slate-500 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex gap-1.5">
                  <button type="submit" disabled={creatingRoom} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-1.5 rounded-lg transition-colors">
                    {creatingRoom ? '…' : 'Create'}
                  </button>
                  <button type="button" onClick={() => { setShowNewRoom(false); setNewRoomName(''); }} className="flex-1 text-slate-400 hover:text-slate-200 text-xs py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowNewRoom(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-300 hover:bg-white/10 rounded-lg text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add channel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main – message area */}
      {activeRoom ? (
        <MessagePane key={activeRoom.id} room={activeRoom} user={user} isAdmin={isAdmin} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          {isAdmin ? 'Create a channel to get started.' : 'No channels available yet.'}
        </div>
      )}
    </div>
  );
}

// ── MessagePane ──────────────────────────────────────────────────────────────

function MessagePane({ room, user, isAdmin }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    supabase
      .from('chat_messages')
      .select('id, content, created_at, author_id, profiles!chat_messages_author_profile_fk(name, avatar_url)')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        setMessages(data ?? []);
        setLoading(false);
        setTimeout(() => scrollToBottom('instant'), 50);
      });
  }, [room.id, scrollToBottom]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${room.id}`,
      }, async payload => {
        // Fetch with profile join since payload won't have it
        const { data } = await supabase
          .from('chat_messages')
          .select('id, content, created_at, author_id, profiles!chat_messages_author_profile_fk(name, avatar_url)')
          .eq('id', payload.new.id)
          .single();
        if (data) {
          setMessages(prev => {
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, data];
          });
          scrollToBottom();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room.id, scrollToBottom]);

  const handleSend = async e => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput('');
    const { error } = await supabase.from('chat_messages').insert({
      org_id: room.org_id ?? null,
      room_id: room.id,
      author_id: user.id,
      content: text,
    });
    if (error) {
      setInput(text);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleDelete = async id => {
    await supabase.from('chat_messages').delete().eq('id', id);
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // Group consecutive messages from the same author within 5 minutes
  const grouped = groupMessages(messages);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Channel header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
        <span className="text-slate-400 font-medium">#</span>
        <h2 className="font-semibold text-slate-900">{room.name}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
              <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="font-medium text-slate-700">Start of #{room.name}</p>
            <p className="text-sm text-slate-400 mt-1">Be the first to say something!</p>
          </div>
        ) : (
          grouped.map((group, gi) => (
            <MessageGroup
              key={group[0].id}
              group={group}
              currentUserId={user.id}
              isAdmin={isAdmin}
              onDelete={handleDelete}
              showHeader={gi === 0 || !sameAuthorClose(grouped[gi - 1]?.at(-1), group[0])}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-3 border-t border-slate-100">
        <form onSubmit={handleSend} className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Message #${room.name}`}
            className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition max-h-32"
            style={{ fieldSizing: 'content' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-1.5 pl-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ── MessageGroup ─────────────────────────────────────────────────────────────

function MessageGroup({ group, currentUserId, isAdmin, onDelete, showHeader }) {
  const first = group[0];
  const isOwn = first.author_id === currentUserId;

  return (
    <div className="flex gap-3 group/msg hover:bg-slate-50 rounded-lg px-2 py-0.5 -mx-2">
      <div className="w-9 shrink-0 mt-0.5">
        {showHeader && (
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 overflow-hidden">
            {first.profiles?.avatar_url
              ? <img src={first.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
              : (first.profiles?.name?.[0] ?? '?').toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        {showHeader && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-900">{first.profiles?.name ?? 'Unknown'}</span>
            <span className="text-xs text-slate-400">{formatTime(first.created_at)}</span>
          </div>
        )}
        {group.map(msg => (
          <div key={msg.id} className="flex items-start gap-2 group/line">
            <p className="text-sm text-slate-800 leading-relaxed flex-1 whitespace-pre-wrap break-words">{msg.content}</p>
            {(isOwn || isAdmin) && (
              <button
                onClick={() => onDelete(msg.id)}
                className="opacity-0 group-hover/line:opacity-100 text-slate-300 hover:text-red-400 transition-all shrink-0 mt-0.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupMessages(messages) {
  const groups = [];
  let current = [];
  for (const msg of messages) {
    if (current.length === 0 || sameAuthorClose(current.at(-1), msg)) {
      current.push(msg);
    } else {
      groups.push(current);
      current = [msg];
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

function sameAuthorClose(a, b) {
  if (!a || !b) return false;
  if (a.author_id !== b.author_id) return false;
  return (new Date(b.created_at) - new Date(a.created_at)) < 5 * 60 * 1000;
}

function formatTime(str) {
  if (!str) return '';
  const d = new Date(str);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
