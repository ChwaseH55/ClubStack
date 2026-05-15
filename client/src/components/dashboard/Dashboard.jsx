import { Routes, Route } from 'react-router-dom';
import { useOrg } from '../../context/OrgContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import DashboardHome from './DashboardHome';

export default function Dashboard() {
  const { org, loading } = useOrg();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar enabledFeatures={org?.enabled_features ?? []} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar org={org} />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<DashboardHome />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
