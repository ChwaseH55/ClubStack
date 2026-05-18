import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useOrg } from '../../../context/OrgContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export default function Chat() {
  const { org } = useOrg();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const fetchRooms = useCallback(async () => {
    if (!org) return;
    // Rooms this user participates in, with all participants' profiles
    const { data } = await supabase
      .from('chat_participants')
      .select(`
        room_id,
        chat_rooms!inner (
          id, name, is_group, org_id,
          chat_participants ( user_id, profiles!user_id(id, name, avatar_url) )
        )
      `)
      .eq('chat_rooms.org_id', org.id);

    if (!data) { setLoadingRooms(false); return; }

    const roomMap = {};
    data.forEach(row => {
      const r = row.chat_rooms;
      if (!r || roomMap[r.id]) return;
      roomMap[r.id] = {
        id: r.id, name: r.name, is_group: r.is_group, org_id: r.org_id,
        participants: r.chat_participants ?? [],
      };
    });

    // Fetch last message per room
    const roomIds = Object.keys(roomMap);
    if (roomIds.length > 0) {
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('room_id, content, media_type, created_at')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false });

      const lastMsg = {};
      (msgs ?? []).forEach(m => { if (!lastMsg[m.room_id]) lastMsg[m.room_id] = m; });
      Object.values(roomMap).forEach(r => { r.lastMessage = lastMsg[r.id] ?? null; });
    }

    const sorted = Object.values(roomMap).sort((a, b) => {
      const ta = a.lastMessage?.created_at ?? a.id;
      const tb = b.lastMessage?.created_at ?? b.id;
      return tb > ta ? 1 : -1;
    });
    setRooms(sorted);
    setLoadingRooms(false);
  }, [org]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Re-sort sidebar when a new message comes in (realtime handled in MessagePane)
  const bumpRoom = useCallback((roomId, preview) => {
    setRooms(prev => {
      const idx = prev.findIndex(r => r.id === roomId);
      if (idx === -1) return prev;
      const updated = { ...prev[idx], lastMessage: preview };
      return [updated, ...prev.filter(r => r.id !== roomId)];
    });
  }, []);

  const handleNewChat = async ({ memberIds, groupName }) => {
    // For DMs: reuse existing room if it exists
    if (!groupName && memberIds.length === 1) {
      const otherId = memberIds[0];
      const existing = rooms.find(r =>
        !r.is_group &&
        r.participants.length === 2 &&
        r.participants.some(p => p.user_id === otherId)
      );
      if (existing) { setActiveRoom(existing); setShowNewChat(false); return; }
    }

    // Create new room
    const allIds = [user.id, ...memberIds.filter(id => id !== user.id)];
    const { data: room, error } = await supabase
      .from('chat_rooms')
      .insert({ org_id: org.id, is_group: allIds.length > 2 || Boolean(groupName), name: groupName || null, created_by: user.id })
      .select('id, name, is_group, org_id')
      .single();
    if (error || !room) return;

    // Add all participants (self + others) — insert one at a time to satisfy RLS "user_id = auth.uid()"
    await supabase.from('chat_participants').insert({ room_id: room.id, user_id: user.id });
    // Use service-level insert for others via the "admins can add participants" policy fallback
    for (const uid of memberIds.filter(id => id !== user.id)) {
      await supabase.from('chat_participants').insert({ room_id: room.id, user_id: uid });
    }

    const newRoom = { ...room, participants: allIds.map(uid => ({ user_id: uid })), lastMessage: null };
    setRooms(prev => [newRoom, ...prev]);
    setActiveRoom(newRoom);
    setShowNewChat(false);
    // Refresh to get full profile data
    setTimeout(fetchRooms, 500);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] w-full max-w-6xl rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Conversation list */}
      <div className="w-72 shrink-0 border-r border-slate-100 flex flex-col bg-slate-50">
        <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Messages</h2>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
            title="New chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingRooms ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-slate-200 rounded-xl animate-pulse" />)}
            </div>
          ) : rooms.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm space-y-2">
              <p>No conversations yet.</p>
              <button onClick={() => setShowNewChat(true)} className="text-indigo-600 hover:underline text-sm">Start one →</button>
            </div>
          ) : (
            rooms.map(room => (
              <ConversationRow
                key={room.id}
                room={room}
                currentUserId={user.id}
                active={activeRoom?.id === room.id}
                onClick={() => setActiveRoom(room)}
              />
            ))
          )}
        </div>
      </div>

      {/* Message area */}
      {activeRoom ? (
        <MessagePane
          key={activeRoom.id}
          room={activeRoom}
          user={user}
          onNewMessage={bumpRoom}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
          <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <div className="text-center">
            <p className="font-medium text-slate-500">Select a conversation</p>
            <p className="text-sm mt-0.5">or <button onClick={() => setShowNewChat(true)} className="text-indigo-600 hover:underline">start a new one</button></p>
          </div>
        </div>
      )}

      {showNewChat && (
        <NewChatModal
          orgId={org?.id}
          currentUserId={user.id}
          onClose={() => setShowNewChat(false)}
          onCreate={handleNewChat}
        />
      )}
    </div>
  );
}

// ── ConversationRow ──────────────────────────────────────────────────────────

function ConversationRow({ room, currentUserId, active, onClick }) {
  const others = room.participants.filter(p => p.user_id !== currentUserId);
  const displayName = room.name || others.map(p => p.profiles?.name ?? 'Unknown').join(', ') || 'Unknown';
  const lastMsg = room.lastMessage;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-slate-100 transition-colors hover:bg-white ${active ? 'bg-white border-l-2 border-l-indigo-500' : ''}`}
    >
      <ParticipantAvatar participants={others} isGroup={room.is_group} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
          {lastMsg && <span className="text-xs text-slate-400 shrink-0">{relTime(lastMsg.created_at)}</span>}
        </div>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {lastMsg
            ? lastMsg.media_type === 'image' ? '📷 Photo'
              : lastMsg.media_type === 'video' ? '🎥 Video'
              : lastMsg.content ?? ''
            : 'No messages yet'}
        </p>
      </div>
    </button>
  );
}

function ParticipantAvatar({ participants, isGroup }) {
  if (participants.length === 0) {
    return <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />;
  }
  if (!isGroup || participants.length === 1) {
    const p = participants[0];
    return (
      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 shrink-0 overflow-hidden">
        {p.profiles?.avatar_url
          ? <img src={p.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
          : (p.profiles?.name?.[0] ?? '?').toUpperCase()}
      </div>
    );
  }
  // Group: stack two avatars
  const [a, b] = participants;
  return (
    <div className="relative w-10 h-10 shrink-0">
      <div className="absolute top-0 left-0 w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 overflow-hidden border-2 border-white">
        {a.profiles?.avatar_url ? <img src={a.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : (a.profiles?.name?.[0] ?? '?').toUpperCase()}
      </div>
      <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-xs font-semibold text-purple-700 overflow-hidden border-2 border-white">
        {b.profiles?.avatar_url ? <img src={b.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : (b.profiles?.name?.[0] ?? '?').toUpperCase()}
      </div>
    </div>
  );
}

// ── MessagePane ──────────────────────────────────────────────────────────────

function MessagePane({ room, user, onNewMessage }) {
  const { addToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null); // { file, url, type }
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  const others = room.participants.filter(p => p.user_id !== user.id);
  const headerName = room.name || others.map(p => p.profiles?.name ?? 'Unknown').join(', ') || 'Unknown';

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    setLoading(true);
    supabase
      .from('chat_messages')
      .select('id, content, media_url, media_type, created_at, author_id, profiles!chat_messages_author_profile_fk(name, avatar_url)')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        setMessages(data ?? []);
        setLoading(false);
        setTimeout(() => scrollToBottom('instant'), 50);
      });
  }, [room.id, scrollToBottom]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` },
        async payload => {
          const { data } = await supabase
            .from('chat_messages')
            .select('id, content, media_url, media_type, created_at, author_id, profiles!chat_messages_author_profile_fk(name, avatar_url)')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
            scrollToBottom();
            onNewMessage(room.id, { content: data.content, media_type: data.media_type, created_at: data.created_at });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room.id, scrollToBottom, onNewMessage]);

  const pickMedia = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);
    setMediaPreview({ file, url, type: isVideo ? 'video' : 'image' });
    e.target.value = '';
  };

  const clearMedia = () => {
    if (mediaPreview?.url) URL.revokeObjectURL(mediaPreview.url);
    setMediaPreview(null);
  };

  const uploadMedia = async () => {
    const { file, type } = mediaPreview;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/chat/${room.id}-${Date.now()}.${ext}`;
    setUploading(true);
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: false });
    setUploading(false);
    if (error) { addToast('Upload failed: ' + error.message, 'error'); return null; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return { url: data.publicUrl, type };
  };

  const handleSend = async e => {
    e.preventDefault();
    const text = input.trim();
    if (!text && !mediaPreview) return;
    setSending(true);

    let media = null;
    if (mediaPreview) {
      media = await uploadMedia();
      if (!media) { setSending(false); return; }
      clearMedia();
    }

    setInput('');
    await supabase.from('chat_messages').insert({
      room_id: room.id,
      author_id: user.id,
      org_id: room.org_id,
      content: text || null,
      media_url: media?.url ?? null,
      media_type: media?.type ?? null,
    });

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); }
  };

  const grouped = groupMessages(messages);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3">
        <ParticipantAvatar participants={others} isGroup={room.is_group} />
        <div>
          <h2 className="font-semibold text-slate-900 text-sm">{headerName}</h2>
          {room.is_group && (
            <p className="text-xs text-slate-400">{room.participants.length} members</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading…</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
            <ParticipantAvatar participants={others} isGroup={room.is_group} />
            <p className="font-medium text-slate-700 mt-2">{headerName}</p>
            <p className="text-sm text-slate-400">No messages yet. Say hi!</p>
          </div>
        ) : (
          grouped.map((group, gi) => (
            <MessageGroup
              key={group[0].id}
              group={group}
              currentUserId={user.id}
              showHeader={gi === 0 || !sameAuthorClose(grouped[gi - 1]?.at(-1), group[0])}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Media preview */}
      {mediaPreview && (
        <div className="px-5 pb-2">
          <div className="relative inline-block">
            {mediaPreview.type === 'image' ? (
              <img src={mediaPreview.url} className="h-24 w-auto rounded-xl object-cover border border-slate-200" alt="preview" />
            ) : (
              <video src={mediaPreview.url} className="h-24 rounded-xl border border-slate-200" />
            )}
            <button
              onClick={clearMedia}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-700 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
            >✕</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-3 border-t border-slate-100">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={pickMedia} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
            title="Attach photo or video"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Message ${headerName}`}
            className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition max-h-28"
          />
          <button
            type="submit"
            disabled={(!input.trim() && !mediaPreview) || sending || uploading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
          >
            {uploading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-1.5 pl-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ── MessageGroup ─────────────────────────────────────────────────────────────

function MessageGroup({ group, currentUserId, showHeader }) {
  const first = group[0];
  const isOwn = first.author_id === currentUserId;

  return (
    <div className={`flex gap-3 group/msg hover:bg-slate-50 rounded-xl px-2 py-1 -mx-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className="w-8 shrink-0 mt-0.5">
        {showHeader && !isOwn && (
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 overflow-hidden">
            {first.profiles?.avatar_url
              ? <img src={first.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
              : (first.profiles?.name?.[0] ?? '?').toUpperCase()}
          </div>
        )}
      </div>
      <div className={`flex-1 min-w-0 space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {showHeader && !isOwn && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-slate-700">{first.profiles?.name ?? 'Unknown'}</span>
            <span className="text-xs text-slate-400">{formatTime(first.created_at)}</span>
          </div>
        )}
        {group.map(msg => (
          <div key={msg.id} className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
            {msg.media_url && (
              msg.media_type === 'image' ? (
                <a href={msg.media_url} target="_blank" rel="noreferrer">
                  <img
                    src={msg.media_url}
                    className={`rounded-2xl object-cover max-h-64 w-auto cursor-pointer hover:opacity-90 transition-opacity ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    alt="shared image"
                  />
                </a>
              ) : (
                <video
                  src={msg.media_url}
                  controls
                  className={`rounded-2xl max-h-64 max-w-full ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                />
              )
            )}
            {msg.content && (
              <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                isOwn
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
              }`}>
                {msg.content}
              </div>
            )}
            {isOwn && (
              <span className="text-xs text-slate-400 px-1">{formatTime(msg.created_at)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NewChatModal ─────────────────────────────────────────────────────────────

function NewChatModal({ orgId, currentUserId, onClose, onCreate }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase
      .from('memberships')
      .select('profiles!user_id(id, name, avatar_url)')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .then(({ data }) => {
        setMembers((data ?? [])
          .map(m => m.profiles)
          .filter(p => p && p.id !== currentUserId));
        setLoading(false);
      });
  }, [orgId, currentUserId]);

  const filtered = members.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()));

  const toggle = m => {
    setSelected(prev => prev.some(p => p.id === m.id) ? prev.filter(p => p.id !== m.id) : [...prev, m]);
  };

  const handleCreate = async () => {
    if (!selected.length) return;
    setCreating(true);
    await onCreate({ memberIds: selected.map(m => m.id), groupName: groupName.trim() || null });
    setCreating(false);
  };

  const isGroup = selected.length > 1;
  const btnLabel = selected.length === 0 ? 'Select someone'
    : isGroup ? `Create group (${selected.length + 1})`
    : `Message ${selected[0].name}`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">New Message</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {selected.length > 0 && (
          <div className="px-4 pt-3 flex flex-wrap gap-2">
            {selected.map(m => (
              <span key={m.id} className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1.5 rounded-full">
                {m.name}
                <button onClick={() => toggle(m)} className="hover:text-red-500 transition-colors">×</button>
              </span>
            ))}
          </div>
        )}

        <div className="px-4 py-3">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members…"
            className="input w-full text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto border-t border-slate-100">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-slate-400 text-sm">No members found.</p>
          ) : (
            filtered.map(m => {
              const isSel = selected.some(p => p.id === m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 ${isSel ? 'bg-indigo-50' : ''}`}
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 shrink-0 overflow-hidden">
                    {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" /> : (m.name?.[0] ?? '?').toUpperCase()}
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-slate-800">{m.name}</span>
                  {isSel && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {isGroup && (
          <div className="px-4 py-3 border-t border-slate-100">
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Group name (optional)"
              className="input w-full text-sm"
            />
          </div>
        )}

        <div className="px-4 py-4 border-t border-slate-100">
          <button
            onClick={handleCreate}
            disabled={!selected.length || creating}
            className="btn-primary w-full py-2.5"
          >
            {creating ? 'Starting…' : btnLabel}
          </button>
        </div>
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
  if (!a || !b || a.author_id !== b.author_id) return false;
  return (new Date(b.created_at) - new Date(a.created_at)) < 5 * 60 * 1000;
}

function formatTime(str) {
  if (!str) return '';
  const d = new Date(str);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function relTime(str) {
  if (!str) return '';
  const diff = (Date.now() - new Date(str)) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
