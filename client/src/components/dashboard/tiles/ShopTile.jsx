import { Link, useParams } from 'react-router-dom';

const DUES_BADGE = {
  paid:   'bg-green-100 text-green-700',
  unpaid: 'bg-red-100 text-red-700',
};

export default function ShopTile({ data }) {
  const { orgId } = useParams();
  const items = data?.items ?? [];
  const duesStatus = data?.duesStatus;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛒</span>
          <h2 className="font-semibold text-gray-800">Shop & Dues</h2>
        </div>
        {duesStatus && duesStatus !== 'na' && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${DUES_BADGE[duesStatus]}`}>
            Dues: {duesStatus}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">No items available yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">{item.name}</span>
              <span className="text-gray-500">${Number(item.price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
      <Link to={`/orgs/${orgId}/shop`} className="text-xs text-org-primary font-medium hover:underline mt-auto">
        Go to shop →
      </Link>
    </div>
  );
}
