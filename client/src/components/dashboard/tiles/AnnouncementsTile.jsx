import { Link, useParams } from 'react-router-dom';

export default function AnnouncementsTile({ data }) {
  const { orgId } = useParams();
  const items = data ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">📢</span>
        <h2 className="font-semibold text-gray-800">Announcements</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No announcements yet. Admins can post updates here.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium text-gray-700">{a.title}</span>
              <span className="ml-2 text-gray-400 text-xs">
                {new Date(a.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link to={`/orgs/${orgId}/announcements`} className="text-xs text-org-primary font-medium hover:underline mt-auto">
        View all →
      </Link>
    </div>
  );
}
