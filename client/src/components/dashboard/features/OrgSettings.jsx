import { useState, useRef, useEffect } from 'react';
import { useOrg } from '../../../context/OrgContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { supabase } from '../../../lib/supabase';
import { Avatar } from '../../../pages/Home';

function parseIgEmbed(rawUrl) {
  const m = rawUrl?.trim().match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? `https://www.instagram.com/p/${m[2]}/embed/` : null;
}

export default function OrgSettings() {
  const { org, isAdmin } = useOrg();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [tab, setTab] = useState('branding');

  if (!isAdmin) {
    return <p className="text-slate-400 text-sm">Admin access required.</p>;
  }

  const tabs = [
    { key: 'branding',    label: 'Branding' },
    { key: 'social',      label: 'Social & Posts' },
    { key: 'leadership',  label: 'Leadership' },
  ];

  return (
    <div className="w-full max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'branding'   && <BrandingTab   org={org} addToast={addToast} userId={user.id} />}
      {tab === 'social'     && <SocialTab     org={org} addToast={addToast} />}
      {tab === 'leadership' && <LeadershipTab org={org} addToast={addToast} />}
    </div>
  );
}

// ── Branding ──────────────────────────────────────────────────────────────────

function BrandingTab({ org, addToast, userId }) {
  const b = org?.branding ?? {};
  const [color,          setColor]          = useState(b.primaryColor   ?? '#4f46e5');
  const [secondaryColor, setSecondaryColor] = useState(b.secondaryColor ?? '#6366f1');
  const [tagline, setTagline] = useState(b.tagline ?? '');
  const [about,   setAbout]   = useState(b.about ?? '');
  const [logoUrl,   setLogoUrl]   = useState(b.logoUrl ?? null);
  const [bannerUrl, setBannerUrl] = useState(b.bannerUrl ?? null);
  const [saving,          setSaving]          = useState(false);
  const [uploadingLogo,   setUploadingLogo]   = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoRef   = useRef(null);
  const bannerRef = useRef(null);

  async function uploadAsset(file, type) {
    const ext  = file.name.split('.').pop();
    // Use the avatars bucket (proven working RLS: userId must be first path segment)
    const path = `${userId}/orgs/${org.id}/${type}.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    if (error) { addToast(error.message, 'error'); return null; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  }

  async function handleLogo(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingLogo(true);
    const url = await uploadAsset(file, 'logo');
    if (url) {
      setLogoUrl(url);
      await supabase.from('organizations')
        .update({ branding: { ...org.branding, logoUrl: url } })
        .eq('id', org.id);
      addToast('Logo updated.', 'success');
    }
    setUploadingLogo(false); e.target.value = '';
  }

  async function handleBanner(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingBanner(true);
    const url = await uploadAsset(file, 'banner');
    if (url) {
      setBannerUrl(url);
      await supabase.from('organizations')
        .update({ branding: { ...org.branding, bannerUrl: url } })
        .eq('id', org.id);
      addToast('Banner updated.', 'success');
    }
    setUploadingBanner(false); e.target.value = '';
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({ branding: { ...org.branding, primaryColor: color, secondaryColor, tagline, about, logoUrl, bannerUrl } })
      .eq('id', org.id);
    setSaving(false);
    if (error) { addToast(error.message, 'error'); return; }
    document.documentElement.style.setProperty('--org-primary',   color);
    document.documentElement.style.setProperty('--org-secondary', secondaryColor);
    addToast('Branding saved.', 'success');
  }

  return (
    <div className="space-y-5">
      <div className="card p-6 space-y-6">
        <h2 className="font-semibold text-slate-800">Visual Identity</h2>

        <div className="flex items-start gap-5">
          {/* Logo */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Logo</p>
            <button
              onClick={() => logoRef.current?.click()}
              disabled={uploadingLogo}
              className="relative w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors overflow-hidden group"
            >
              {logoUrl ? (
                <>
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Change</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400">
                  <UploadIcon />
                  <span className="text-xs">{uploadingLogo ? 'Uploading…' : 'Upload'}</span>
                </div>
              )}
            </button>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
          </div>

          {/* Banner */}
          <div className="flex-1 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Banner Image</p>
            <button
              onClick={() => bannerRef.current?.click()}
              disabled={uploadingBanner}
              className="relative w-full h-20 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors overflow-hidden group"
            >
              {bannerUrl ? (
                <>
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Change banner</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400">
                  <UploadIcon />
                  <span className="text-xs">{uploadingBanner ? 'Uploading…' : 'Upload a wide banner image'}</span>
                </div>
              )}
            </button>
            <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBanner} />
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
              />
              <span className="text-sm text-slate-500 font-mono">{color}</span>
            </div>
            <p className="text-xs text-slate-400">Used for the sidebar and hero background.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Secondary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={secondaryColor}
                onChange={e => setSecondaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
              />
              <span className="text-sm text-slate-500 font-mono">{secondaryColor}</span>
            </div>
            <p className="text-xs text-slate-400">Used for accents and highlights.</p>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">About</h2>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            placeholder="A short one-liner about your organization"
            className="input"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">About</label>
          <textarea
            value={about}
            onChange={e => setAbout(e.target.value)}
            rows={5}
            placeholder="Tell members and visitors about your organization…"
            className="input resize-none leading-relaxed"
          />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

// ── Social & Posts ────────────────────────────────────────────────────────────

function SocialTab({ org, addToast }) {
  const b  = org?.branding ?? {};
  const sl = b.socialLinks ?? {};

  const [instagram, setInstagram] = useState(sl.instagram ?? '');
  const [twitter,   setTwitter]   = useState(sl.twitter   ?? '');
  const [tiktok,    setTiktok]    = useState(sl.tiktok    ?? '');
  const [website,   setWebsite]   = useState(sl.website   ?? '');
  const [saving,    setSaving]    = useState(false);

  const [igPosts,    setIgPosts]    = useState(b.igPosts ?? []);
  const [postInput,  setPostInput]  = useState('');
  const [postError,  setPostError]  = useState('');

  async function handleSaveLinks() {
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({ branding: { ...org.branding, socialLinks: { instagram, twitter, tiktok, website } } })
      .eq('id', org.id);
    setSaving(false);
    if (error) addToast(error.message, 'error');
    else addToast('Social links saved.', 'success');
  }

  async function handleAddPost() {
    setPostError('');
    const trimmed = postInput.trim();
    if (!parseIgEmbed(trimmed)) {
      setPostError('Invalid Instagram URL — paste a post or reel link.');
      return;
    }
    if (igPosts.includes(trimmed)) { setPostError('Already added.'); return; }
    const updated = [...igPosts, trimmed];
    setIgPosts(updated);
    setPostInput('');
    const { error } = await supabase
      .from('organizations')
      .update({ branding: { ...org.branding, igPosts: updated } })
      .eq('id', org.id);
    if (error) addToast(error.message, 'error');
  }

  async function handleRemovePost(url) {
    const updated = igPosts.filter(u => u !== url);
    setIgPosts(updated);
    await supabase
      .from('organizations')
      .update({ branding: { ...org.branding, igPosts: updated } })
      .eq('id', org.id);
  }

  const socials = [
    { label: 'Instagram', value: instagram, set: setInstagram, prefix: 'instagram.com/' },
    { label: 'Twitter / X', value: twitter, set: setTwitter, prefix: 'x.com/' },
    { label: 'TikTok', value: tiktok, set: setTiktok, prefix: 'tiktok.com/@' },
    { label: 'Website', value: website, set: setWebsite, prefix: 'https://' },
  ];

  return (
    <div className="space-y-5">
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-800">Social Media Links</h2>
          <p className="text-sm text-slate-400 mt-0.5">Displayed as icons on the org homepage.</p>
        </div>

        {socials.map(({ label, value, set, prefix }) => (
          <div key={label} className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition">
              <span className="px-3 py-2.5 bg-slate-50 text-xs text-slate-400 border-r border-slate-200 shrink-0 flex items-center">
                {prefix}
              </span>
              <input
                type="text"
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={label === 'Website' ? 'yoursite.com' : 'username'}
                className="flex-1 px-3 py-2.5 text-sm text-slate-900 focus:outline-none bg-white"
              />
            </div>
          </div>
        ))}

        <button onClick={handleSaveLinks} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save links'}
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-800">Featured Instagram Posts</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Paste any public post or reel URL. Embeds directly — no API key required.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={postInput}
            onChange={e => { setPostInput(e.target.value); setPostError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleAddPost()}
            placeholder="https://www.instagram.com/p/…"
            className="input"
          />
          <button onClick={handleAddPost} className="btn-secondary shrink-0">Add</button>
        </div>
        {postError && <p className="text-sm text-red-500">{postError}</p>}

        {igPosts.length > 0 && (
          <div className="space-y-4 pt-1">
            {igPosts.map(url => (
              <IgPostCard key={url} url={url} onRemove={() => handleRemovePost(url)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IgPostCard({ url, onRemove }) {
  const embedUrl = parseIgEmbed(url);
  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <span className="text-xs text-slate-500 truncate font-mono">{url}</span>
        <button
          onClick={onRemove}
          className="ml-3 shrink-0 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          Remove
        </button>
      </div>
      {embedUrl && (
        <iframe
          src={embedUrl}
          className="w-full border-0 block"
          style={{ height: 480 }}
          title="Instagram post"
          scrolling="no"
          allowTransparency="true"
        />
      )}
    </div>
  );
}

// ── Leadership ────────────────────────────────────────────────────────────────

function LeadershipTab({ org, addToast }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    supabase
      .from('memberships')
      .select('id, role, title, bio, profiles!user_id(id, name, avatar_url)')
      .eq('org_id', org.id)
      .eq('status', 'active')
      .order('role')
      .then(({ data }) => {
        setMembers((data ?? []).map(m => ({ ...m, _title: m.title ?? '', _bio: m.bio ?? '' })));
        setLoading(false);
      });
  }, [org]);

  async function saveMember(m) {
    const { error } = await supabase
      .from('memberships')
      .update({ title: m._title.trim() || null, bio: m._bio.trim() || null })
      .eq('id', m.id);
    if (error) addToast(error.message, 'error');
    else addToast('Saved.', 'success');
  }

  function update(id, field, value) {
    setMembers(ms => ms.map(m => m.id === id ? { ...m, [field]: value } : m));
  }

  if (loading) return <div className="text-slate-400 text-sm py-4">Loading members…</div>;

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-1">
        <h2 className="font-semibold text-slate-800">Leadership Roster</h2>
        <p className="text-sm text-slate-400">
          Members with a title appear in the leadership section on the org homepage.
          Leave title blank to exclude them.
        </p>
      </div>

      {members.map(m => (
        <MemberCard key={m.id} m={m} onUpdate={update} onSave={saveMember} />
      ))}
    </div>
  );
}

function MemberCard({ m, onUpdate, onSave }) {
  const profile = m.profiles;
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Avatar name={profile?.name ?? '?'} url={profile?.avatar_url} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900">{profile?.name ?? 'Unknown'}</p>
          <p className="text-xs text-slate-400 capitalize">{m.role}</p>
        </div>
        {m._title && (
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            Featured
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Title</label>
          <input
            type="text"
            value={m._title}
            onChange={e => onUpdate(m.id, '_title', e.target.value)}
            placeholder="e.g. President"
            className="input text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Short Bio</label>
          <input
            type="text"
            value={m._bio}
            onChange={e => onUpdate(m.id, '_bio', e.target.value)}
            placeholder="One-liner…"
            className="input text-sm"
          />
        </div>
      </div>

      <button onClick={() => onSave(m)} className="btn-secondary text-sm px-4 py-2">
        Save
      </button>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
