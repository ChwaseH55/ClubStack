import { Link, useParams } from 'react-router-dom';

const Icon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const DUES_BADGE = {
  paid:   'bg-green-100 text-green-700',
  unpaid: 'bg-red-100 text-red-700',
};

export default function ShopTile({ data }) {
  const { slug } = useParams();
  const items = data?.items ?? [];
  const duesStatus = data?.duesStatus;

  return (
    <div className="card p-5 flex flex-col gap-4 min-h-[180px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Icon />
          </span>
          <h2 className="font-semibold text-slate-800">Shop & Dues</h2>
        </div>
        {duesStatus && duesStatus !== 'na' && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${DUES_BADGE[duesStatus] ?? ''}`}>
            Dues: {duesStatus}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 flex-1">No items available yet.</p>
      ) : (
        <ul className="space-y-2 flex-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-slate-700 truncate">{item.name}</span>
              <span className="text-sm text-slate-500 shrink-0">${Number(item.price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      <Link to={`/orgs/${slug}/shop`} className="text-xs text-indigo-600 font-medium hover:underline mt-auto">
        Go to shop →
      </Link>
    </div>
  );
}
