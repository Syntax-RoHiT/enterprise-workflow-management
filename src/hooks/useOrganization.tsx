import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { organizationService } from '@/services/organizationService';
import { useAuth } from '@/hooks/useAuth';
import type { Organization } from '@/lib/types';

const STORAGE_KEY = 'nexus:activeOrgId';

interface OrgCtx {
  organizations: Organization[];
  activeOrgId: string | null;
  activeOrg: Organization | null;
  setActiveOrgId: (id: string | null) => void;
  isLoading: boolean;
}

const OrgContext = createContext<OrgCtx>({
  organizations: [],
  activeOrgId: null,
  activeOrg: null,
  setActiveOrgId: () => {},
  isLoading: true,
});

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ['organizations', 'mine', user?.id],
    queryFn: async () => {
      const result = await organizationService.listMine(user?.id);
      if (result.error) throw result.error;
      return result.data!;
    },
    staleTime: 60_000,
    enabled: !!user,  // Only query when authenticated
  });

  useEffect(() => {
    if (!isLoading && organizations.length > 0 && !activeOrgId) {
      setActiveOrgIdState(organizations[0].id);
      localStorage.setItem(STORAGE_KEY, organizations[0].id);
    }
  }, [isLoading, organizations, activeOrgId]);

  const setActiveOrgId = (id: string | null) => {
    setActiveOrgIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const activeOrg = organizations.find((o) => o.id === activeOrgId) ?? null;

  return (
    <OrgContext.Provider value={{ organizations, activeOrgId, activeOrg, setActiveOrgId, isLoading }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrganization = () => useContext(OrgContext);
