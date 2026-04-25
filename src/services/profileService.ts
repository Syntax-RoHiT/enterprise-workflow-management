

import { supabase } from '@/integrations/supabase/client';
import type { Profile, AppError, ServiceResult } from '@/lib/types';

function mapError(error: { message: string; code?: string }): AppError {
  return { code: 'UNKNOWN', message: error.message };
}

export const profileService = {
  async listPublic(): Promise<ServiceResult<Profile[]>> {
    const { data, error } = await supabase.rpc('list_profiles_public');
    if (error) return { data: null, error: mapError(error) };
    return {
      data: ((data ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>).map(
        (r) => ({ user_id: r.user_id, display_name: r.display_name, avatar_url: r.avatar_url, email: null }),
      ),
      error: null,
    };
  },

  async getOwn(userId: string): Promise<ServiceResult<Profile & { email: string | null }>> {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, email')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return { data: null, error: mapError(error) };
    return { data: data as Profile & { email: string | null }, error: null };
  },

  async updateOwn(userId: string, patch: { display_name?: string }): Promise<ServiceResult<null>> {
    const { error } = await supabase.from('profiles').update(patch).eq('user_id', userId);
    if (error) return { data: null, error: mapError(error) };
    return { data: null, error: null };
  },
};
