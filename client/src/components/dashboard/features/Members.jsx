import { useEffect, useState } from 'react';
import { useOrg } from '../../../context/OrgContext';
import { supabase } from '../../../lib/supabase';

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Member' };
const ROLE_COLORS = {
  owner:  'bg-amber-50 text-amber-700 border-amber-200',
  admin:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  member: 'bg-slate-50 text-slate-500 border-slate-200',
};

export default function Members() {
  const { org } = useOrg();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!org) return;
    supabase
      .from('memberships')
      .select('role, title, bio, profiles!user_id(id, name, avatar_url)')
      .eq('org_id', org.id)
      .eq('status', 'active')
      .order('role')
      .then(({ data }) => { setMembers(data ?? []); setLoading(false); });
  }, [org]);

  const ROLE_ORDER = { owner: 0, admin: 1, member: 2 };
  const filtered = members
    .filter(m => {
      const q = search.toLowerCase();
      return (
        m.profiles?.name?.toLowerCase().includes(q) ||
        m.title?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (ROLE_ORDER[a.role] ?? 3) - (ROLE_ORDER[b.role] ?? 3));

  return (
    <div className="w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">
          Members
          {!loading && <span className="ml-2 text-lg font-normal text-slate-400">({members.length})</span>}
        </h1>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members…"
            className="input pl-9 w-56"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card px-8 py-16 text-center text-slate-400 text-sm">
          {search ? `No members match "${search}".` : 'No members yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => <MemberCard key={m.profiles?.id} member={m} />)}
        </div>
      )}
    </div>
  );
}

function MemberCard({ member }) {
  const name = member.profiles?.name ?? 'Unknown';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="card px-5 py-5 flex gap-4 items-start">
      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0 overflow-hidden">
        {member.profiles?.avatar_url
          ? <img src={member.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
          : initials}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-slate-900 truncate">{name}</p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${ROLE_COLORS[member.role]}`}>
            {ROLE_LABELS[member.role]}
          </span>
        </div>
        {member.title && (
          <p className="text-sm text-indigo-600 font-medium truncate">{member.title}</p>
        )}
        {member.bio && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{member.bio}</p>
        )}
        {!member.title && !member.bio && (
          <p className="text-xs text-slate-400">—</p>
        )}
      </div>
    </div>
  );
}
