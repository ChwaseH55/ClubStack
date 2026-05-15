import { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { orgId } = useParams();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('organizations')
      .select('id, name, slug, branding, enabled_features')
      .eq('id', orgId)
      .single()
      .then(({ data }) => {
        setOrg(data);
        const color = data?.branding?.primaryColor ?? '#4f46e5';
        document.documentElement.style.setProperty('--org-primary', color);
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  return (
    <OrgContext.Provider value={{ org, loading }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
