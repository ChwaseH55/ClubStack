import { Link, useParams } from 'react-router-dom';

export default function ForumTile({ data }) {
  const { orgId } = useParams();
  const items = data ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">💬</span>
        <h2 className="font-semibold text-gray-800">Forum</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No posts yet. Be the first to start a discussion.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((p, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium text-gray-700">{p.title}</span>
              <div className="text-gray-400 text-xs">
                {p.author} · {p.commentCount} {p.commentCount === 1 ? 'reply' : 'replies'}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link to={`/orgs/${orgId}/forum`} className="text-xs text-org-primary font-medium hover:underline mt-auto">
        Browse forum →
      </Link>
    </div>
  );
}
