import { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { orgId } = useParams();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orgs/${orgId}`).then(res => {
      setOrg(res.data);
      const color = res.data.branding?.primaryColor ?? '#4f46e5';
      document.documentElement.style.setProperty('--org-primary', color);
    }).finally(() => setLoading(false));
  }, [orgId]);

  return (
    <OrgContext.Provider value={{ org, loading }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
