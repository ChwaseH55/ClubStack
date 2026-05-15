import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useOrg } from '../../../context/OrgContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export default function Announcements() {
  return (
    <Routes>
      <Route index element={<AnnouncementsList />} />
      <Route path="new" element={<AnnouncementForm />} />
      <Route path=":id" element={<AnnouncementDetail />} />
      <Route path=":id/edit" element={<AnnouncementForm />} />
    </Routes>
  );
}

function AnnouncementsList() {
  const { org, isAdmin } = useOrg();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    supabase
      .from('announcements')
      .select('id, title, body, created_at, profiles!author_id(name, avatar_url)')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setPosts(data ?? []); setLoading(false); });
  }, [org]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
        {isAdmin && (
          <Link to="new" className="btn-primary">+ New</Link>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="card px-8 py-16 text-center text-slate-400 text-sm">
          {isAdmin ? (
            <span>No announcements yet. <Link to="new" className="text-indigo-600 hover:underline">Post the first one.</Link></span>
          ) : 'No announcements yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => <AnnouncementCard key={p.id} post={p} />)}
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ post }) {
  const preview = post.body?.length > 160 ? post.body.slice(0, 160).trimEnd() + '…' : post.body;
  return (
    <Link
      to={post.id}
      className="card block px-6 py-5 hover:shadow-md transition-shadow group space-y-2"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{post.title}</h2>
        <span className="text-xs text-slate-400 shrink-0 mt-0.5">{formatDate(post.created_at)}</span>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed">{preview}</p>
      <p className="text-xs text-slate-400">by {post.profiles?.name ?? 'Unknown'}</p>
    </Link>
  );
}

function AnnouncementDetail() {
  const { id } = useParams();
  const { org, isAdmin } = useOrg();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase
      .from('announcements')
      .select('id, title, body, created_at, updated_at, author_id, profiles!author_id(name, avatar_url)')
      .eq('id', id)
      .single()
      .then(({ data }) => { setPost(data); setLoading(false); });
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this announcement?')) return;
    setDeleting(true);
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) { addToast(error.message, 'error'); setDeleting(false); return; }
    addToast('Announcement deleted.', 'info');
    navigate('..', { relative: 'path' });
  };

  if (loading) return <div className="text-slate-400 text-sm">Loading…</div>;
  if (!post) return <div className="text-slate-400 text-sm">Not found.</div>;

  const canEdit = isAdmin || post.author_id === user.id;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to=".." relative="path" className="hover:text-slate-600 transition-colors">Announcements</Link>
        <span>/</span>
        <span className="text-slate-600 truncate">{post.title}</span>
      </div>

      <div className="card p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span>by {post.profiles?.name ?? 'Unknown'}</span>
            <span>·</span>
            <span>{formatDate(post.created_at)}</span>
            {post.updated_at !== post.created_at && <span>(edited)</span>}
          </div>
        </div>

        <hr className="border-slate-100" />

        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{post.body}</p>

        {canEdit && (
          <div className="flex gap-2 pt-2">
            <Link to="edit" className="btn-secondary text-sm px-4 py-2">Edit</Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AnnouncementForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { org } = useOrg();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    supabase
      .from('announcements')
      .select('title, body')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) { setTitle(data.title); setBody(data.body); }
        setLoading(false);
      });
  }, [id, isEdit]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);

    if (isEdit) {
      const { error } = await supabase
        .from('announcements')
        .update({ title: title.trim(), body: body.trim(), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) { addToast(error.message, 'error'); setSaving(false); return; }
      addToast('Announcement updated.', 'success');
      navigate('..', { relative: 'path' });
    } else {
      const { error } = await supabase
        .from('announcements')
        .insert({ org_id: org.id, author_id: user.id, title: title.trim(), body: body.trim() });
      if (error) { addToast(error.message, 'error'); setSaving(false); return; }
      addToast('Announcement posted.', 'success');
      navigate('..', { relative: 'path' });
    }
  };

  if (loading) return <div className="text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to={isEdit ? '../..' : '..'} relative="path" className="hover:text-slate-600 transition-colors">Announcements</Link>
        <span>/</span>
        <span className="text-slate-600">{isEdit ? 'Edit' : 'New'}</span>
      </div>

      <div className="card p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="What's the announcement?"
              className="input text-base"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Body</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              required
              rows={10}
              placeholder="Write your announcement…"
              className="input resize-none leading-relaxed"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Post announcement'}
            </button>
            <Link to={isEdit ? '../..' : '..'} relative="path" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
