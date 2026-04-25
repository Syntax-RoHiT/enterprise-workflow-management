

import { useQuery } from '@tanstack/react-query';
import { profileService } from '@/services/profileService';
import { useMemo } from 'react';
import type { Profile } from '@/lib/types';

export const profileKeys = {
  all: ['profiles'] as const,
  public: () => [...profileKeys.all, 'public'] as const,
  own: (userId: string) => [...profileKeys.all, 'own', userId] as const,
};

export function useProfiles() {
  return useQuery({
    queryKey: profileKeys.public(),
    queryFn: async () => {
      const result = await profileService.listPublic();
      if (result.error) throw result.error;
      return result.data!;
    },
    staleTime: 60_000,
  });
}

export function useProfileMap() {
  const { data: profiles } = useProfiles();
  return useMemo(() => {
    const map: Record<string, Profile> = {};
    (profiles ?? []).forEach((p) => (map[p.user_id] = p));
    return map;
  }, [profiles]);
}
