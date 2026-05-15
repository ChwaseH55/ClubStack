import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const FEATURES = [
  { id: 'announcements', label: 'Announcements', description: 'Post updates to all members' },
  { id: 'events',        label: 'Events',         description: 'Calendar and RSVPs' },
  { id: 'forum',         label: 'Forum',           description: 'Discussion threads' },
  { id: 'chat',          label: 'Chat',            description: 'Real-time messaging' },
  { id: 'shop',          label: 'Shop & Dues',     description: 'Collect payments and sell items' },
];

const COLORS = [
  { label: 'Indigo',  value: '#4f46e5' },
  { label: 'Blue',    value: '#2563eb' },
  { label: 'Green',   value: '#16a34a' },
  { label: 'Red',     value: '#dc2626' },
  { label: 'Orange',  value: '#ea580c' },
  { label: 'Purple',  value: '#9333ea' },
  { label: 'Pink',    value: '#db2777' },
  { label: 'Teal',    value: '#0d9488' },
];

function toSlug(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function CreateOrg() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [color, setColor] = useState('#4f46e5');
  const [features, setFeatures] = useState(['announcements', 'events']);
  const [slugError, setSlugError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slugManuallyEdited) setSlug(toSlug(name));
  }, [name, slugManuallyEdited]);

  const handleSlugChange = e => {
    setSlugManuallyEdited(true);
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    setSlugError('');
  };

  const toggleFeature = id => {
    setFeatures(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!slug) { setSlugError('Slug is required'); return; }
    if (features.length === 0) { addToast('Select at least one feature', 'error'); return; }

    setLoading(true);

    const orgId = crypto.randomUUID();

    const { error: orgError } = await supabase
      .from('organizations')
      .insert({ id: orgId, name, slug, branding: { primaryColor: color }, enabled_features: features });

    if (orgError) {
      setLoading(false);
      if (orgError.code === '23505') {
        setSlugError('This slug is already taken — try another');
      } else {
        addToast(orgError.message, 'error');
      }
      return;
    }

    const { error: memberError } = await supabase
      .from('memberships')
      .insert({ org_id: orgId, user_id: user.id, role: 'owner', status: 'active' });

    if (memberError) {
      addToast(memberError.message, 'error');
      setLoading(false);
      return;
    }

    addToast(`${name} created!`, 'success');
    navigate(`/orgs/${org.slug}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="text-sm text-gray-400 hover:text-gray-700 transition">&larr; Back</button>
        <span className="text-sm text-gray-300">|</span>
        <span className="text-sm font-medium text-gray-700">New organization</span>
      </header>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-6 py-10 space-y-8">
        {/* Name + Slug */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Details</h2>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Organization name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Golf Club UCF"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">
              Slug <span className="text-gray-400 font-normal">— used in the URL</span>
            </label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
              <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 select-none">clubstack.app/orgs/</span>
              <input
                type="text"
                value={slug}
                onChange={handleSlugChange}
                required
                placeholder="golf-club-ucf"
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            {slugError && <p className="text-xs text-red-600">{slugError}</p>}
          </div>
        </section>

        {/* Brand color */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Brand color</h2>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setColor(c.value)}
                className="w-8 h-8 rounded-full transition ring-offset-2"
                style={{
                  backgroundColor: c.value,
                  boxShadow: color === c.value ? `0 0 0 3px ${c.value}` : undefined,
                  outline: color === c.value ? '2px solid white' : undefined,
                  outlineOffset: color === c.value ? '-4px' : undefined,
                }}
              />
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Features</h2>
          <p className="text-xs text-gray-400">You can change these later from settings.</p>
          <div className="space-y-2">
            {FEATURES.map(f => {
              const enabled = features.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFeature(f.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition ${
                    enabled
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition ${
                    enabled ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                  }`}>
                    {enabled && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{f.label}</p>
                    <p className="text-xs text-gray-400">{f.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <button
          type="submit"
          disabled={loading || !name || !slug}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
          style={{ backgroundColor: color }}
        >
          {loading ? 'Creating...' : 'Create organization'}
        </button>
      </form>
    </div>
  );
}
