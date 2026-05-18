import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useOrg } from '../../context/OrgContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import DashboardHome from './DashboardHome';
import Announcements from './features/Announcements';
import OrgSettings from './features/OrgSettings';
import ComingSoon from './features/ComingSoon';

export default function Dashboard() {
  const { org, loading } = useOrg();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.from('profiles').select('name, avatar_url').eq('id', user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar enabledFeatures={org?.enabled_features ?? []} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar org={org} profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route index element={<DashboardHome />} />
            <Route path="announcements/*" element={<Announcements />} />
            <Route path="events/*" element={<ComingSoon feature="Events" />} />
            <Route path="forum/*" element={<ComingSoon feature="Forum" />} />
            <Route path="chat/*" element={<ComingSoon feature="Chat" />} />
            <Route path="shop/*" element={<ComingSoon feature="Shop & Dues" />} />
            <Route path="settings/*" element={<OrgSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
