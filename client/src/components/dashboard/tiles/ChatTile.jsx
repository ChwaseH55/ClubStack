import { Link, useParams } from 'react-router-dom';

const Icon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export default function ChatTile({ data }) {
  const { slug } = useParams();

  return (
    <div className="card p-5 flex flex-col gap-4 min-h-[180px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Icon />
          </span>
          <h2 className="font-semibold text-slate-800">Chat</h2>
        </div>
        {data?.unreadCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
            {data.unreadCount}
          </span>
        )}
      </div>

      {data ? (
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700">#{data.roomName}</p>
          {data.lastMessage ? (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{data.lastMessage}</p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">No messages yet.</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-400 flex-1">No chat rooms yet.</p>
      )}

      <Link to={`/orgs/${slug}/chat`} className="text-xs text-indigo-600 font-medium hover:underline mt-auto">
        Open chat →
      </Link>
    </div>
  );
}
