import { Link, useParams } from 'react-router-dom';

const Icon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
  </svg>
);

export default function ForumTile({ data }) {
  const { slug } = useParams();
  const items = data ?? [];

  return (
    <div className="card p-5 flex flex-col gap-4 min-h-[180px]">
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Icon />
        </span>
        <h2 className="font-semibold text-slate-800">Forum</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 flex-1">No posts yet. Start a discussion.</p>
      ) : (
        <ul className="space-y-2.5 flex-1">
          {items.map((p, i) => (
            <li key={i}>
              <p className="text-sm font-medium text-slate-700 truncate">{p.title}</p>
              <p className="text-xs text-slate-400">
                {p.author ?? 'Unknown'} · {p.commentCount} {p.commentCount === 1 ? 'reply' : 'replies'}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Link to={`/orgs/${slug}/forum`} className="text-xs text-indigo-600 font-medium hover:underline mt-auto">
        Browse forum →
      </Link>
    </div>
  );
}
