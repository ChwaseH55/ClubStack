import { Link, useParams } from 'react-router-dom';

export default function ChatTile({ data }) {
  const { orgId } = useParams();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗨️</span>
          <h2 className="font-semibold text-gray-800">Chat</h2>
        </div>
        {data?.unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
            {data.unreadCount}
          </span>
        )}
      </div>
      {data ? (
        <div className="text-sm">
          <span className="font-medium text-gray-700">#{data.roomName}</span>
          {data.lastMessage && (
            <p className="text-gray-400 text-xs mt-1 truncate">{data.lastMessage}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No chat rooms yet.</p>
      )}
      <Link to={`/orgs/${orgId}/chat`} className="text-xs text-org-primary font-medium hover:underline mt-auto">
        Open chat →
      </Link>
    </div>
  );
}
