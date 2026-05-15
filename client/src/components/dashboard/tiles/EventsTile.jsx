import { Link, useParams } from 'react-router-dom';

const Icon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

function fmt(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function EventsTile({ data }) {
  const { slug } = useParams();
  const items = data ?? [];

  return (
    <div className="card p-5 flex flex-col gap-4 min-h-[180px]">
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <Icon />
        </span>
        <h2 className="font-semibold text-slate-800">Upcoming Events</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 flex-1">No upcoming events.</p>
      ) : (
        <ul className="space-y-2.5 flex-1">
          {items.map((e, i) => (
            <li key={i}>
              <p className="text-sm font-medium text-slate-700 truncate">{e.title}</p>
              <p className="text-xs text-slate-400">
                {fmt(e.start_at)}{e.location ? ` · ${e.location}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Link to={`/orgs/${slug}/events`} className="text-xs text-indigo-600 font-medium hover:underline mt-auto">
        View calendar →
      </Link>
    </div>
  );
}
