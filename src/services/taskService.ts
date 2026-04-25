

import { supabase } from '@/integrations/supabase/client';
import type {
  Task,
  TaskInsert,
  TaskUpdate,
  Attachment,
  AppError,
  ServiceResult,
  PaginationParams,
  PaginatedResult,
} from '@/lib/types';

const STORAGE_BUCKET = 'task-attachments';

function mapError(error: { message: string; code?: string }): AppError {
  if (error.code === '40001' || error.message?.includes('VERSION_CONFLICT')) {
    return { code: 'VERSION_CONFLICT', message: 'This task was modified by someone else. Please reload and try again.' };
  }
  if (error.code === '42501' || error.message?.includes('permission denied')) {
    return { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' };
  }
  if (error.code === 'PGRST116') {
    return { code: 'NOT_FOUND', message: 'Task not found.' };
  }
  return { code: 'UNKNOWN', message: error.message };
}

export const taskService = {

  async list(
    orgId: string | null,
    filters?: { status?: string; priority?: string; assigneeId?: string; search?: string; parentTaskId?: string | null },
    pagination?: PaginationParams,
  ): Promise<ServiceResult<PaginatedResult<Task>>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority);
    if (filters?.assigneeId && filters.assigneeId !== 'all') query = query.eq('assignee_id', filters.assigneeId);
    if (filters?.search) query = query.ilike('title', `%${filters.search}%`);

    const { data, error, count } = await query;
    if (error) return { data: null, error: mapError(error) };

    return {
      data: {
        data: (data ?? []) as Task[],
        count: count ?? 0,
        page,
        pageSize,
      },
      error: null,
    };
  },

  async getById(id: string): Promise<ServiceResult<Task>> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return { data: null, error: mapError(error) };
    return { data: data as Task, error: null };
  },

  async create(input: TaskInsert): Promise<ServiceResult<Task>> {

    const { organization_id, version, parent_task_id, description_html, ...safeInput } = input as any;

    const { data, error } = await supabase
      .from('tasks')
      .insert(safeInput)
      .select()
      .single();
    if (error) return { data: null, error: mapError(error) };
    return { data: data as Task, error: null };
  },

  async update(
    id: string,
    patch: TaskUpdate,
    expectedVersion: number,
  ): Promise<ServiceResult<Task>> {

    const { organization_id, version, parent_task_id, description_html, ...safePatch } = patch as any;

    const { data, error } = await supabase
      .from('tasks')
      .update(safePatch)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: mapError(error) };
    return { data: data as Task, error: null };
  },

  async delete(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return { data: null, error: mapError(error) };
    return { data: null, error: null };
  },

  async listSubtasks(parentId: string): Promise<ServiceResult<Task[]>> {

    return { data: [], error: null };
  },

  async uploadAttachment(
    taskId: string,
    userId: string,
    file: File,
  ): Promise<ServiceResult<Attachment>> {
    return { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented without DB migration.' } };
  },

  async listAttachments(taskId: string): Promise<ServiceResult<Attachment[]>> {
    return { data: [], error: null };
  },

  async getAttachmentUrl(storagePath: string): Promise<ServiceResult<string>> {
    return { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented.' } };
  },

  async deleteAttachment(id: string, storagePath: string): Promise<ServiceResult<null>> {
    return { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented.' } };
  },
};
