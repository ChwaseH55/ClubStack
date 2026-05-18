import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function JoinViaInvite() {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | joining | already | full | expired | error | done
  const [org, setOrg] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('Invalid invite link.'); return; }

    supabase
      .from('invite_links')
      .select('id, org_id, active, expires_at, max_uses, uses_count, organizations(id, name, slug, branding)')
      .eq('token', token)
      .eq('active', true)
      .maybeSingle()
      .then(async ({ data: invite }) => {
        if (!invite) { setStatus('expired'); return; }
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) { setStatus('expired'); return; }
        if (invite.max_uses && invite.uses_count >= invite.max_uses) { setStatus('full'); return; }

        const orgData = invite.organizations;
        const orgSlug = orgData?.slug;
        setOrg(orgData);

        if (!user) {
          setStatus('unauthenticated');
          return;
        }

        // Check if already a member
        const { data: existing } = await supabase.from('memberships')
          .select('id, status').eq('org_id', invite.org_id).eq('user_id', user.id).maybeSingle();

        if (existing?.status === 'active') { setStatus('already'); return; }

        setStatus('joining');
        if (existing) {
          await supabase.from('memberships').update({ status: 'active' }).eq('id', existing.id);
        } else {
          await supabase.from('memberships').insert({
            org_id: invite.org_id, user_id: user.id, role: 'member', status: 'active',
          });
        }

        await supabase.from('invite_links').update({ uses_count: invite.uses_count + 1 }).eq('id', invite.id);
        setStatus('done');
        if (orgSlug) {
          setTimeout(() => navigate(`/orgs/${orgSlug}`), 1500);
        }
      });
  }, [token, user, navigate]);

  if (status === 'loading' || status === 'joining') {
    return <Shell><Spinner text={status === 'joining' ? 'Joining…' : 'Loading…'} /></Shell>;
  }

  if (status === 'unauthenticated') {
    return (
      <Shell org={org}>
        <p className="text-slate-600 text-center">Sign in or create an account to join <strong>{org?.name}</strong>.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link to={`/register?redirect=/join/${token}`} className="btn-primary text-center py-2.5">Create account</Link>
          <Link to={`/login?redirect=/join/${token}`} className="btn-secondary text-center py-2.5">Sign in</Link>
        </div>
      </Shell>
    );
  }

  if (status === 'done') {
    return (
      <Shell org={org}>
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-slate-900 text-lg">You're in!</p>
        {org?.slug ? (
          <p className="text-slate-500 text-sm">Redirecting to {org.name}…</p>
        ) : (
          <Link to="/home" className="btn-primary px-6 py-2.5">Go to dashboard</Link>
        )}
      </Shell>
    );
  }

  if (status === 'already') {
    return (
      <Shell org={org}>
        <p className="text-slate-700 font-medium">You're already a member of {org?.name}.</p>
        <Link to={`/orgs/${org?.slug}`} className="btn-primary px-6 py-2.5">Go to dashboard</Link>
      </Shell>
    );
  }

  if (status === 'expired') {
    return <Shell><p className="text-slate-600">This invite link has expired or is no longer valid.</p></Shell>;
  }

  if (status === 'full') {
    return <Shell><p className="text-slate-600">This invite link has reached its maximum uses.</p></Shell>;
  }

  return <Shell><p className="text-red-500">{errorMsg || 'Something went wrong.'}</p></Shell>;
}

function Shell({ org, children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 gap-6">
      <Link to="/" className="font-bold text-xl text-slate-900 tracking-tight mb-2">
        Club<span className="text-indigo-500">Stack</span>
      </Link>
      {org && (
        <div className="text-center space-y-1">
          {org.branding?.logoUrl && (
            <img src={org.branding.logoUrl} className="w-16 h-16 rounded-xl object-cover mx-auto mb-3" alt="" />
          )}
          <p className="text-sm text-slate-500 uppercase tracking-widest font-medium">You've been invited to</p>
          <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-8 py-10 flex flex-col items-center gap-5 w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}

function Spinner({ text }) {
  return (
    <div className="flex flex-col items-center gap-3 text-slate-400">
      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span className="text-sm">{text}</span>
    </div>
  );
}
