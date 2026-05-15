import { Link, useParams } from 'react-router-dom';

const Icon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
  </svg>
);

function fmt(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function AnnouncementsTile({ data }) {
  const { slug } = useParams();
  const items = data ?? [];

  return (
    <div className="card p-5 flex flex-col gap-4 min-h-[180px]">
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Icon />
        </span>
        <h2 className="font-semibold text-slate-800">Announcements</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 flex-1">No announcements yet.</p>
      ) : (
        <ul className="space-y-2.5 flex-1">
          {items.map((a, i) => (
            <li key={i} className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-slate-700 truncate">{a.title}</span>
              <span className="text-xs text-slate-400 shrink-0">{fmt(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}

      <Link to={`/orgs/${slug}/announcements`} className="text-xs text-indigo-600 font-medium hover:underline mt-auto">
        View all →
      </Link>
    </div>
  );
}
