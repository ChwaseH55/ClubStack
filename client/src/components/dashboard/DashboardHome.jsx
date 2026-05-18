import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useOrg } from '../../context/OrgContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../../pages/Home';
import AnnouncementsTile from './tiles/AnnouncementsTile';
import EventsTile from './tiles/EventsTile';
import ForumTile from './tiles/ForumTile';
import ChatTile from './tiles/ChatTile';
import ShopTile from './tiles/ShopTile';

const TILE_MAP = { announcements: AnnouncementsTile, events: EventsTile, forum: ForumTile, chat: ChatTile, shop: ShopTile };

const fetchers = {
  announcements: orgId =>
    supabase.from('announcements').select('title, created_at').eq('org_id', orgId)
      .order('created_at', { ascending: false }).limit(3).then(({ data }) => data ?? []),

  events: orgId =>
    supabase.from('events').select('title, start_at, location').eq('org_id', orgId)
      .gt('start_at', new Date().toISOString()).order('start_at').limit(3)
      .then(({ data }) => data ?? []),

  forum: orgId =>
    supabase.from('forum_posts')
      .select('title, profiles!author_id(name), forum_comments(count)')
      .eq('org_id', orgId).order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => (data ?? []).map(p => ({
        title: p.title,
        author: p.profiles?.name,
        commentCount: p.forum_comments?.[0]?.count ?? 0,
      }))),

  chat: async orgId => {
    const { data: room } = await supabase.from('chat_rooms').select('id, name')
      .eq('org_id', orgId).limit(1).single();
    if (!room) return null;
    const { data: messages } = await supabase.from('chat_messages').select('content')
      .eq('room_id', room.id).order('created_at', { ascending: false }).limit(1);
    return { roomName: room.name, lastMessage: messages?.[0]?.content ?? null, unreadCount: 0 };
  },

  shop: async (orgId, userId) => {
    const [{ data: items }, { data: orders }] = await Promise.all([
      supabase.from('shop_items').select('name, price').eq('org_id', orgId).eq('active', true).limit(3),
      supabase.from('orders').select('status').eq('org_id', orgId).eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(1),
    ]);
    return { items: items ?? [], duesStatus: orders?.[0]?.status === 'paid' ? 'paid' : 'unpaid' };
  },
};

function parseIgEmbed(rawUrl) {
  const m = rawUrl?.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? `https://www.instagram.com/p/${m[2]}/embed/` : null;
}

export default function DashboardHome() {
  const { org, isAdmin } = useOrg();
  const { user } = useAuth();
  const { slug } = useParams();
  const [summary, setSummary] = useState({});
  const [leadership, setLeadership] = useState([]);

  const b            = org?.branding ?? {};
  const igPosts      = b.igPosts ?? [];
  const socialLinks  = b.socialLinks ?? {};
  const features     = org?.enabled_features ?? [];

  useEffect(() => {
    if (!org) return;
    Promise.all(
      features
        .map(key => fetchers[key]?.(org.id, user.id).then(data => ({ [key]: data })))
        .filter(Boolean)
    ).then(results => setSummary(Object.assign({}, ...results)));
  }, [org, user.id]);

  useEffect(() => {
    if (!org) return;
    supabase
      .from('memberships')
      .select('role, title, bio, profiles!user_id(id, name, avatar_url)')
      .eq('org_id', org.id)
      .eq('status', 'active')
      .not('title', 'is', null)
      .then(({ data }) => setLeadership(data ?? []));
  }, [org]);

  return (
    <div className="w-full space-y-8">
      {/* Hero */}
      <OrgHero org={org} b={b} socialLinks={socialLinks} isAdmin={isAdmin} slug={slug} />

      {/* About */}
      {b.about && (
        <section className="card p-6">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{b.about}</p>
        </section>
      )}

      {/* Leadership */}
      {leadership.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Leadership</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leadership.map((m, i) => <LeaderCard key={i} member={m} />)}
          </div>
        </section>
      )}

      {/* Feature tiles */}
      {features.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {features.map(key => {
              const Tile = TILE_MAP[key];
              return Tile ? <Tile key={key} data={summary[key]} /> : null;
            })}
          </div>
        </section>
      )}

      {/* Instagram posts */}
      {igPosts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Posts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {igPosts.map(url => {
              const embedUrl = parseIgEmbed(url);
              return embedUrl ? (
                <div key={url} className="rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                  <iframe
                    src={embedUrl}
                    className="w-full border-0 block"
                    style={{ height: 500 }}
                    title="Instagram post"
                    scrolling="no"
                    allowTransparency="true"
                  />
                </div>
              ) : null;
            })}
          </div>
        </section>
      )}

      {/* Contact */}
      <ContactSection contact={b.contact} orgName={org?.name} isAdmin={isAdmin} slug={slug} />
    </div>
  );
}

function OrgHero({ org, b, socialLinks, isAdmin, slug }) {
  const color     = b.primaryColor   ?? '#4f46e5';
  const secondary = b.secondaryColor ?? '#6366f1';
  const hasSocial = socialLinks.instagram || socialLinks.twitter || socialLinks.tiktok || socialLinks.website;

  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[160px]">
      {/* Background: banner image or color gradient */}
      {b.bannerUrl ? (
        <img src={b.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : null}
      <div
        className="relative px-8 py-10 flex items-start gap-5"
        style={{
          background: b.bannerUrl
            ? 'linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 100%)'
            : `linear-gradient(135deg, ${color}f0 0%, ${secondary}c0 100%)`,
        }}
      >
        {/* Logo */}
        {b.logoUrl ? (
          <img
            src={b.logoUrl}
            alt={`${org?.name} logo`}
            className="w-16 h-16 rounded-xl object-cover shrink-0 ring-2 ring-white/30 shadow-lg"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-2xl ring-2 ring-white/30"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            {org?.name?.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name + tagline + socials */}
        <div className="flex-1 min-w-0 space-y-2">
          <h1 className="text-2xl font-bold text-white leading-tight">{org?.name}</h1>
          {b.tagline && <p className="text-white/75 text-sm">{b.tagline}</p>}

          {hasSocial && (
            <div className="flex items-center gap-3 pt-1">
              {socialLinks.instagram && (
                <SocialLink href={`https://instagram.com/${socialLinks.instagram}`}>
                  <InstagramIcon />
                </SocialLink>
              )}
              {socialLinks.twitter && (
                <SocialLink href={`https://x.com/${socialLinks.twitter}`}>
                  <TwitterIcon />
                </SocialLink>
              )}
              {socialLinks.tiktok && (
                <SocialLink href={`https://tiktok.com/@${socialLinks.tiktok}`}>
                  <TikTokIcon />
                </SocialLink>
              )}
              {socialLinks.website && (
                <SocialLink href={socialLinks.website.startsWith('http') ? socialLinks.website : `https://${socialLinks.website}`}>
                  <GlobeIcon />
                </SocialLink>
              )}
            </div>
          )}
        </div>

        {/* Admin: edit page link */}
        {isAdmin && (
          <Link
            to={`/orgs/${slug}/settings`}
            className="shrink-0 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 text-xs font-medium transition-colors border border-white/20"
          >
            Edit page
          </Link>
        )}
      </div>
    </div>
  );
}

function SocialLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-white/70 hover:text-white transition-colors"
    >
      {children}
    </a>
  );
}

function LeaderCard({ member }) {
  const profile = member.profiles;
  return (
    <div className="card p-5 flex items-start gap-4">
      <Avatar name={profile?.name ?? '?'} url={profile?.avatar_url} />
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">{profile?.name ?? 'Unknown'}</p>
        {member.title && (
          <p className="text-sm text-indigo-600 font-medium">{member.title}</p>
        )}
        {member.bio && (
          <p className="text-sm text-slate-500 mt-0.5 leading-snug">{member.bio}</p>
        )}
      </div>
    </div>
  );
}

// ── Contact section ──────────────────────────────────────────────────────────

export function ContactSection({ contact, orgName, isAdmin, slug }) {
  const c = contact ?? {};
  const hasAny = c.email || c.phone || c.address || c.meetingTime || c.officeHours;

  if (!hasAny) {
    if (!isAdmin) return null;
    return (
      <section className="card p-6 border-dashed text-center space-y-2">
        <p className="text-sm text-slate-400">No contact info added yet.</p>
        <a href={`/orgs/${slug}/settings`} className="text-sm text-indigo-600 hover:underline">
          Add contact info in Settings →
        </a>
      </section>
    );
  }

  const items = [
    { icon: 'email',    label: 'Email',          value: c.email,       href: c.email ? `mailto:${c.email}` : null },
    { icon: 'phone',    label: 'Phone',          value: c.phone,       href: c.phone ? `tel:${c.phone}` : null },
    { icon: 'location', label: 'Location',       value: c.address,     href: null },
    { icon: 'clock',    label: 'Meeting Time',   value: c.meetingTime, href: null },
    { icon: 'hours',    label: 'Office Hours',   value: c.officeHours, href: null },
  ].filter(i => i.value);

  return (
    <section className="card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
        {isAdmin && (
          <a href={`/orgs/${slug}/settings`} className="text-xs text-indigo-600 hover:underline">Edit</a>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map(({ icon, label, value, href }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <ContactIcon type={icon} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
              {href ? (
                <a href={href} className="text-sm font-medium text-indigo-600 hover:underline break-all">{value}</a>
              ) : (
                <p className="text-sm font-medium text-slate-800">{value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactIcon({ type }) {
  const cls = 'w-4 h-4 text-indigo-600';
  if (type === 'email') return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
  if (type === 'phone') return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
  if (type === 'location') return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  if (type === 'clock') return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ── Social icons ──────────────────────────────────────────────────────────────

function InstagramIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.25 8.25 0 004.83 1.54V6.77a4.85 4.85 0 01-1.06-.08z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
    </svg>
  );
}
