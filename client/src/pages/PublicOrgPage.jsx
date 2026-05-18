import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function parseIgEmbed(rawUrl) {
  const m = rawUrl?.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? `https://www.instagram.com/p/${m[2]}/embed/` : null;
}

export default function PublicOrgPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [org, setOrg] = useState(null);
  const [leadership, setLeadership] = useState([]);
  const [memberStatus, setMemberStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, slug, branding, is_public')
        .eq('slug', slug)
        .eq('is_public', true)
        .single();

      if (!orgData) { setNotFound(true); setLoading(false); return; }

      setOrg(orgData);
      const b = orgData.branding ?? {};
      document.documentElement.style.setProperty('--org-primary',   b.primaryColor   ?? '#4f46e5');
      document.documentElement.style.setProperty('--org-secondary', b.secondaryColor ?? '#6366f1');

      const { data: leaders } = await supabase
        .from('memberships')
        .select('role, title, bio, profiles!user_id(id, name, avatar_url)')
        .eq('org_id', orgData.id)
        .eq('status', 'active')
        .not('title', 'is', null);
      setLeadership(leaders ?? []);

      if (user) {
        const { data: mem } = await supabase
          .from('memberships')
          .select('status')
          .eq('org_id', orgData.id)
          .eq('user_id', user.id)
          .maybeSingle();
        setMemberStatus(mem?.status ?? null);
      }

      setLoading(false);
    }
    load();
  }, [slug, user]);

  async function handleJoin() {
    if (!user) { navigate(`/register?redirect=/club/${slug}`); return; }
    setRequesting(true);
    await supabase.from('memberships').insert({
      org_id: org.id, user_id: user.id, role: 'member', status: 'requested',
    });
    setMemberStatus('requested');
    setRequesting(false);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <p className="text-slate-500 text-lg">This organization isn't public or doesn't exist.</p>
      <Link to="/" className="text-indigo-600 hover:underline text-sm">Back to ClubStack</Link>
    </div>
  );

  const b           = org.branding ?? {};
  const color       = b.primaryColor   ?? '#4f46e5';
  const secondary   = b.secondaryColor ?? '#6366f1';
  const igPosts     = b.igPosts        ?? [];
  const socialLinks = b.socialLinks    ?? {};

  const JoinButton = () => {
    if (memberStatus === 'active') return (
      <Link to={`/orgs/${slug}`} className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-white font-semibold text-sm transition-opacity hover:opacity-90" style={{ backgroundColor: color }}>
        Go to dashboard →
      </Link>
    );
    if (memberStatus === 'requested') return (
      <span className="inline-flex items-center px-7 py-3 rounded-full text-white/80 font-semibold text-sm" style={{ backgroundColor: color }}>
        Request pending…
      </span>
    );
    return (
      <button onClick={handleJoin} disabled={requesting} className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-white font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: color }}>
        {requesting ? 'Sending…' : 'Join this club'}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 w-full z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 py-3">
        <Link to="/" className="font-bold text-slate-800 tracking-tight">
          Club<span className="text-indigo-600">Stack</span>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to="/home" className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              My dashboard
            </Link>
          ) : (
            <>
              <Link to={`/login?redirect=/club/${slug}`} className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                Sign in
              </Link>
              <Link to={`/register?redirect=/club/${slug}`} className="px-4 py-1.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: color }}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="relative min-h-screen flex items-center justify-center pt-14">
        {/* Background */}
        {b.bannerUrl
          ? <img src={b.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${color} 0%, ${secondary} 100%)` }} />
        }
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 text-center text-white px-6 max-w-3xl mx-auto space-y-6">
          {b.logoUrl && (
            <img src={b.logoUrl} alt={`${org.name} logo`} className="w-24 h-24 rounded-2xl object-cover mx-auto ring-4 ring-white/25 shadow-xl" />
          )}
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight drop-shadow">
            {org.name}
          </h1>
          {b.tagline && (
            <p className="text-xl md:text-2xl text-white/80 max-w-xl mx-auto">{b.tagline}</p>
          )}

          {/* Social icons */}
          {(socialLinks.instagram || socialLinks.twitter || socialLinks.tiktok || socialLinks.website) && (
            <div className="flex items-center justify-center gap-4 pt-1">
              {socialLinks.instagram && <SocialLink href={`https://instagram.com/${socialLinks.instagram}`}><InstagramIcon /></SocialLink>}
              {socialLinks.twitter   && <SocialLink href={`https://x.com/${socialLinks.twitter}`}><TwitterIcon /></SocialLink>}
              {socialLinks.tiktok    && <SocialLink href={`https://tiktok.com/@${socialLinks.tiktok}`}><TikTokIcon /></SocialLink>}
              {socialLinks.website   && <SocialLink href={socialLinks.website.startsWith('http') ? socialLinks.website : `https://${socialLinks.website}`}><GlobeIcon /></SocialLink>}
            </div>
          )}

          <div className="pt-2">
            <JoinButton />
          </div>
        </div>

        {/* Scroll chevron */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 animate-bounce">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </header>

      {/* ── About ────────────────────────────────────────────────────── */}
      {b.about && (
        <>
          <Divider />
          <section className="py-20 px-8 bg-slate-50">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <h2 className="text-3xl font-bold text-slate-900">About</h2>
              <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap">{b.about}</p>
            </div>
          </section>
        </>
      )}

      {/* ── Leadership ───────────────────────────────────────────────── */}
      {leadership.length > 0 && (
        <>
          <Divider />
          <section className="py-20 px-8 bg-white">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Meet the Team</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
                {leadership.map((m, i) => (
                  <LeaderCard key={i} member={m} color={color} />
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── Instagram posts ──────────────────────────────────────────── */}
      {igPosts.length > 0 && (
        <>
          <Divider />
          <section className="py-20 px-8 bg-slate-50">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">Recent Posts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {igPosts.map(url => {
                  const embedUrl = parseIgEmbed(url);
                  return embedUrl ? (
                    <div key={url} className="rounded-2xl overflow-hidden shadow-md border border-slate-100">
                      <iframe src={embedUrl} className="w-full border-0 block" style={{ height: 480 }} scrolling="no" allowTransparency="true" title="Instagram post" />
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── Join CTA ─────────────────────────────────────────────────── */}
      <Divider />
      <section className="py-20 px-8" style={{ background: `linear-gradient(135deg, ${color} 0%, ${secondary} 100%)` }}>
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">Ready to join?</h2>
          <p className="text-white/75 text-lg">
            {user ? 'Send a request and an admin will approve you.' : 'Create a free ClubStack account to become a member.'}
          </p>
          <JoinButton />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white py-8 px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <span>{org.name}</span>
          <span>Powered by <Link to="/" className="text-white hover:underline font-medium">ClubStack</Link></span>
        </div>
      </footer>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />;
}

function LeaderCard({ member, color }) {
  const profile = member.profiles;
  return (
    <div className="text-center space-y-4">
      <div className="mx-auto w-36 h-36 rounded-full overflow-hidden border-4 shadow-lg" style={{ borderColor: color }}>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl" style={{ backgroundColor: color }}>
            {profile?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
        )}
      </div>
      <div>
        <p className="font-semibold text-slate-900 text-lg">{profile?.name ?? 'Unknown'}</p>
        {member.title && <p className="font-medium text-sm" style={{ color }}>{member.title}</p>}
        {member.bio   && <p className="text-sm text-slate-500 mt-1">{member.bio}</p>}
      </div>
    </div>
  );
}

function SocialLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors">
      {children}
    </a>
  );
}

function InstagramIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
}
function TwitterIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
}
function TikTokIcon() {
  return <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.25 8.25 0 004.83 1.54V6.77a4.85 4.85 0 01-1.06-.08z"/></svg>;
}
function GlobeIcon() {
  return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>;
}
