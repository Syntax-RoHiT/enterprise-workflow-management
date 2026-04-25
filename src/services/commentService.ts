

import { supabase } from '@/integrations/supabase/client';
import type { Comment, AppError, ServiceResult } from '@/lib/types';

function mapError(error: { message: string; code?: string }): AppError {
  if (error.code === '42501') return { code: 'FORBIDDEN', message: 'Permission denied.' };
  return { code: 'UNKNOWN', message: error.message };
}

export const commentService = {
  async list(taskId: string): Promise<ServiceResult<Comment[]>> {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (error) return { data: null, error: mapError(error) };
    return { data: (data ?? []) as Comment[], error: null };
  },

  async create(
    taskId: string,
    authorId: string,
    body: string,
    parentCommentId?: string | null,
  ): Promise<ServiceResult<Comment>> {
    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        author_id: authorId,
        body,

      })
      .select()
      .single();
    if (error) return { data: null, error: mapError(error) };
    return { data: data as Comment, error: null };
  },

  async update(id: string, body: string): Promise<ServiceResult<Comment>> {
    const { data, error } = await supabase
      .from('task_comments')
      .update({ body })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error: mapError(error) };
    return { data: data as Comment, error: null };
  },

  async delete(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.from('task_comments').delete().eq('id', id);
    if (error) return { data: null, error: mapError(error) };
    return { data: null, error: null };
  },
};
