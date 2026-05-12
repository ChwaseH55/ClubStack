import { Link, useParams } from 'react-router-dom';

export default function EventsTile({ data }) {
  const { orgId } = useParams();
  const items = data ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">📅</span>
        <h2 className="font-semibold text-gray-800">Upcoming Events</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No upcoming events. Check back soon.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((e, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium text-gray-700">{e.title}</span>
              <div className="text-gray-400 text-xs">
                {new Date(e.startAt).toLocaleDateString()}
                {e.location && ` · ${e.location}`}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link to={`/orgs/${orgId}/events`} className="text-xs text-org-primary font-medium hover:underline mt-auto">
        View calendar →
      </Link>
    </div>
  );
}
