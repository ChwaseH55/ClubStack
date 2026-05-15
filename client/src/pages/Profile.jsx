import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from './Home';

const FRIEND_TABS = ['Friends', 'Requests', 'Find People'];

export default function Profile() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const fileRef = useRef();

  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [friendTab, setFriendTab] = useState('Friends');

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [coMembers, setCoMembers] = useState([]);
  const [friendshipMap, setFriendshipMap] = useState({});
  const [socialLoading, setSocialLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadSocial();
  }, []);

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('name, avatar_url').eq('id', user.id).single();
    if (data) { setProfile(data); setName(data.name ?? ''); }
  };

  const loadSocial = async () => {
    setSocialLoading(true);

    const [friendshipsRes, membershipsRes] = await Promise.all([
      supabase
        .from('friendships')
        .select('id, status, requester:requester_id(id, name, avatar_url), addressee:addressee_id(id, name, avatar_url)')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
      supabase
        .from('memberships')
        .select('org_id')
        .eq('user_id', user.id)
        .eq('status', 'active'),
    ]);

    const allFriendships = friendshipsRes.data ?? [];

    // Build friendship map: other user id → { id, status, direction }
    const fMap = {};
    allFriendships.forEach(f => {
      const other = f.requester.id === user.id ? f.addressee : f.requester;
      fMap[other.id] = { id: f.id, status: f.status, isMine: f.requester.id === user.id, other };
    });
    setFriendshipMap(fMap);

    setFriends(allFriendships
      .filter(f => f.status === 'accepted')
      .map(f => f.requester.id === user.id ? f.addressee : f.requester)
    );

    setRequests(allFriendships
      .filter(f => f.status === 'pending' && f.addressee.id === user.id)
      .map(f => ({ friendshipId: f.id, ...f.requester }))
    );

    // Load co-members from shared orgs
    const orgIds = (membershipsRes.data ?? []).map(m => m.org_id);
    if (orgIds.length > 0) {
      const { data: coMemberData } = await supabase
        .from('memberships')
        .select('user_id, profiles(id, name, avatar_url), organizations(name)')
        .in('org_id', orgIds)
        .neq('user_id', user.id)
        .eq('status', 'active');

      // Deduplicate by user_id
      const seen = new Set();
      const unique = (coMemberData ?? []).filter(m => {
        if (seen.has(m.user_id)) return false;
        seen.add(m.user_id);
        return true;
      });
      setCoMembers(unique);
    }

    setSocialLoading(false);
  };

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', user.id);
    setSaving(false);
    if (error) { addToast(error.message, 'error'); return; }
    setProfile(p => ({ ...p, name: name.trim() }));
    addToast('Profile updated.', 'success');
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { addToast(uploadError.message, 'error'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
    setProfile(p => ({ ...p, avatar_url: avatarUrl }));
    addToast('Avatar updated.', 'success');
    setUploading(false);
  };

  const sendFriendRequest = async (toUserId) => {
    const { data, error } = await supabase
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id: toUserId })
      .select('id').single();
    if (error) { addToast(error.message, 'error'); return; }
    const target = coMembers.find(m => m.profiles.id === toUserId)?.profiles;
    setFriendshipMap(m => ({ ...m, [toUserId]: { id: data.id, status: 'pending', isMine: true, other: target } }));
    addToast('Friend request sent!', 'success');
  };

  const acceptRequest = async (friendshipId, fromUser) => {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    if (error) { addToast(error.message, 'error'); return; }
    setRequests(r => r.filter(x => x.friendshipId !== friendshipId));
    setFriends(f => [...f, fromUser]);
    setFriendshipMap(m => ({ ...m, [fromUser.id]: { ...m[fromUser.id], status: 'accepted' } }));
    addToast('You are now connected!', 'success');
  };

  const removeFriend = async (otherId) => {
    const entry = friendshipMap[otherId];
    if (!entry) return;
    await supabase.from('friendships').delete().eq('id', entry.id);
    setFriends(f => f.filter(x => x.id !== otherId));
    setFriendshipMap(m => { const next = { ...m }; delete next[otherId]; return next; });
    addToast('Removed.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-6 h-14 flex items-center gap-3">
        <Link to="/home" className="btn-ghost text-slate-500 text-sm">← Back</Link>
        <span className="text-sm text-slate-300">|</span>
        <span className="text-sm font-medium text-slate-700">Profile</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Avatar + name */}
        <div className="card p-8 space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
                : <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                    {(profile?.name ?? user.email).charAt(0).toUpperCase()}
                  </div>
              }
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                {uploading ? '…' : 'Change'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-lg">{profile?.name ?? '—'}</p>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Display name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="input"
              />
              <button
                onClick={handleSaveName}
                disabled={saving || name.trim() === (profile?.name ?? '')}
                className="btn-primary px-5 shrink-0"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Friends section */}
        <div className="card">
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Connections</h2>
          </div>
          <div className="px-2 pt-3 flex gap-1">
            {FRIEND_TABS.map(t => (
              <button
                key={t}
                onClick={() => setFriendTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  friendTab === t ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t}
                {t === 'Requests' && requests.length > 0 && (
                  <span className="ml-1.5 bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{requests.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-2">
            {socialLoading ? (
              <div className="space-y-2 py-4">
                {[1, 2].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : friendTab === 'Friends' ? (
              friends.length === 0
                ? <p className="text-center text-slate-400 text-sm py-8">No connections yet. Find people in your organizations.</p>
                : friends.map(f => (
                  <PersonRow key={f.id} person={f}>
                    <button onClick={() => removeFriend(f.id)} className="btn-secondary py-1.5 px-3 text-xs">Remove</button>
                  </PersonRow>
                ))
            ) : friendTab === 'Requests' ? (
              requests.length === 0
                ? <p className="text-center text-slate-400 text-sm py-8">No pending requests.</p>
                : requests.map(r => (
                  <PersonRow key={r.id} person={r}>
                    <button onClick={() => acceptRequest(r.friendshipId, r)} className="btn-primary py-1.5 px-3 text-xs">Accept</button>
                  </PersonRow>
                ))
            ) : (
              coMembers.length === 0
                ? <p className="text-center text-slate-400 text-sm py-8">Join an organization to find people.</p>
                : coMembers.map(m => {
                  const p = m.profiles;
                  const entry = friendshipMap[p.id];
                  return (
                    <PersonRow key={p.id} person={p} sub={m.organizations?.name}>
                      {!entry && (
                        <button onClick={() => sendFriendRequest(p.id)} className="btn-secondary py-1.5 px-3 text-xs">Connect</button>
                      )}
                      {entry?.status === 'pending' && entry.isMine && (
                        <span className="text-xs text-slate-400 px-3">Pending</span>
                      )}
                      {entry?.status === 'accepted' && (
                        <span className="text-xs text-indigo-600 px-3 font-medium">Connected</span>
                      )}
                    </PersonRow>
                  );
                })
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

function PersonRow({ person, sub, children }) {
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors">
      <Avatar name={person.name ?? '?'} url={person.avatar_url} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{person.name ?? 'Unknown'}</p>
        {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
