import { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { slug } = useParams();
  const { user } = useAuth();
  const [org, setOrg] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, slug, branding, enabled_features')
        .eq('slug', slug)
        .single();

      if (!orgData) { setLoading(false); return; }

      setOrg(orgData);
      const color     = orgData.branding?.primaryColor   ?? '#4f46e5';
      const secondary = orgData.branding?.secondaryColor ?? '#6366f1';
      document.documentElement.style.setProperty('--org-primary',   color);
      document.documentElement.style.setProperty('--org-secondary', secondary);

      const { data: membership } = await supabase
        .from('memberships')
        .select('role')
        .eq('org_id', orgData.id)
        .eq('user_id', user.id)
        .single();

      setRole(membership?.role ?? null);
      setLoading(false);
    };
    load();
  }, [slug, user.id]);

  const isAdmin = role === 'owner' || role === 'admin';

  return (
    <OrgContext.Provider value={{ org, role, isAdmin, loading }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
