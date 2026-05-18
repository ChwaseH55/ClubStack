import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useOrg } from '../../../context/OrgContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export default function Forum() {
  return (
    <Routes>
      <Route index element={<ForumList />} />
      <Route path="new" element={<ForumNew />} />
      <Route path=":id" element={<ForumThread />} />
    </Routes>
  );
}

// ── ForumList ────────────────────────────────────────────────────────────────

function ForumList() {
  const { org, isAdmin } = useOrg();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    supabase
      .from('forum_posts')
      .select(`
        id, title, body, created_at, author_id,
        profiles!author_id(name, avatar_url),
        forum_comments(count)
      `)
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setPosts(data ?? []); setLoading(false); });
  }, [org]);

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Forum</h1>
        <Link to="new" className="btn-primary">+ New Thread</Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="card px-8 py-16 text-center text-slate-400 text-sm">
          No threads yet. <Link to="new" className="text-indigo-600 hover:underline">Start the conversation.</Link>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {posts.map(p => <ThreadRow key={p.id} post={p} currentUserId={user.id} isAdmin={isAdmin} onDelete={setPosts} />)}
        </div>
      )}
    </div>
  );
}

function ThreadRow({ post, currentUserId, isAdmin, onDelete }) {
  const replyCount = post.forum_comments?.[0]?.count ?? 0;
  const preview = post.body?.length > 120 ? post.body.slice(0, 120).trimEnd() + '…' : post.body;
  const canDelete = isAdmin || post.author_id === currentUserId;

  const handleDelete = async e => {
    e.preventDefault();
    if (!confirm('Delete this thread and all its comments?')) return;
    await supabase.from('forum_posts').delete().eq('id', post.id);
    onDelete(prev => prev.filter(p => p.id !== post.id));
  };

  return (
    <Link to={post.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 shrink-0 overflow-hidden mt-0.5">
        {post.profiles?.avatar_url
          ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
          : (post.profiles?.name?.[0] ?? '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <h2 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{post.title}</h2>
        <p className="text-sm text-slate-400 truncate">{preview}</p>
        <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
          <span>{post.profiles?.name ?? 'Unknown'}</span>
          <span>·</span>
          <span>{formatDate(post.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
          </svg>
          {replyCount}
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="text-slate-300 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </Link>
  );
}

// ── ForumThread ──────────────────────────────────────────────────────────────

function ForumThread() {
  const { id } = useParams();
  const { org, isAdmin } = useOrg();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPost = useCallback(async () => {
    const { data } = await supabase
      .from('forum_posts')
      .select('id, title, body, created_at, author_id, profiles!author_id(name, avatar_url)')
      .eq('id', id)
      .single();
    setPost(data);
    setLoading(false);
  }, [id]);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('forum_comments')
      .select('id, body, created_at, author_id, profiles!author_id(name, avatar_url)')
      .eq('post_id', id)
      .order('created_at', { ascending: true });
    setComments(data ?? []);
  }, [id]);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [fetchPost, fetchComments]);

  const handleComment = async e => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setPosting(true);
    const { error } = await supabase.from('forum_comments').insert({
      org_id: org.id, post_id: id, author_id: user.id, body: commentBody.trim()
    });
    if (error) { addToast(error.message, 'error'); setPosting(false); return; }
    setCommentBody('');
    await fetchComments();
    setPosting(false);
  };

  const handleDeleteComment = async commentId => {
    await supabase.from('forum_comments').delete().eq('id', commentId);
    fetchComments();
  };

  const handleDeletePost = async () => {
    if (!confirm('Delete this thread and all its comments?')) return;
    setDeleting(true);
    const { error } = await supabase.from('forum_posts').delete().eq('id', id);
    if (error) { addToast(error.message, 'error'); setDeleting(false); return; }
    addToast('Thread deleted.', 'info');
    navigate('..', { relative: 'path' });
  };

  if (loading) return <div className="text-slate-400 text-sm">Loading…</div>;
  if (!post) return <div className="text-slate-400 text-sm">Thread not found.</div>;

  const canDelete = isAdmin || post.author_id === user.id;

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to=".." relative="path" className="hover:text-slate-600 transition-colors">Forum</Link>
        <span>/</span>
        <span className="text-slate-600 truncate">{post.title}</span>
      </div>

      {/* Original post */}
      <div className="card p-8 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 shrink-0 overflow-hidden">
              {post.profiles?.avatar_url
                ? <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                : (post.profiles?.name?.[0] ?? '?').toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{post.title}</h1>
              <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5">
                <span>{post.profiles?.name ?? 'Unknown'}</span>
                <span>·</span>
                <span>{formatDate(post.created_at)}</span>
              </div>
            </div>
          </div>
          {canDelete && (
            <button onClick={handleDeletePost} disabled={deleting} className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
        <hr className="border-slate-100" />
        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{post.body}</p>
      </div>

      {/* Comments */}
      <div className="card p-8 space-y-6">
        <h2 className="font-semibold text-slate-900">
          Replies <span className="text-slate-400 font-normal text-sm">({comments.length})</span>
        </h2>

        <div className="space-y-5">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700 shrink-0 overflow-hidden">
                {c.profiles?.avatar_url
                  ? <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                  : (c.profiles?.name?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-slate-800">{c.profiles?.name ?? 'Unknown'}</span>
                  <span className="text-xs text-slate-400">{formatDate(c.created_at)}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{c.body}</p>
              </div>
              {(c.author_id === user.id || isAdmin) && (
                <button onClick={() => handleDeleteComment(c.id)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0 mt-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-slate-400">No replies yet. Start the discussion!</p>}
        </div>

        <form onSubmit={handleComment} className="flex gap-3 pt-2 border-t border-slate-100">
          <textarea
            value={commentBody}
            onChange={e => setCommentBody(e.target.value)}
            rows={3}
            placeholder="Write a reply…"
            className="input flex-1 resize-none text-sm"
          />
          <button type="submit" disabled={posting || !commentBody.trim()} className="btn-primary px-4 self-end">
            {posting ? '…' : 'Reply'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── ForumNew ────────────────────────────────────────────────────────────────

function ForumNew() {
  const { org } = useOrg();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({ org_id: org.id, author_id: user.id, title: title.trim(), body: body.trim() })
      .select('id')
      .single();
    if (error) { addToast(error.message, 'error'); setSaving(false); return; }
    addToast('Thread posted.', 'success');
    navigate(`../${data.id}`, { relative: 'path' });
  };

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to=".." relative="path" className="hover:text-slate-600 transition-colors">Forum</Link>
        <span>/</span>
        <span className="text-slate-600">New Thread</span>
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
              placeholder="What do you want to discuss?"
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
              placeholder="Share your thoughts, questions, or ideas…"
              className="input resize-none leading-relaxed"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Posting…' : 'Post thread'}
            </button>
            <Link to=".." relative="path" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
