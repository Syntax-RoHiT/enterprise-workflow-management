

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '@/services/taskService';
import type { Task, TaskInsert, TaskUpdate, PaginationParams } from '@/lib/types';
import { toast } from 'sonner';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (orgId: string | null, filters?: Record<string, unknown>, pagination?: PaginationParams) =>
    [...taskKeys.lists(), orgId, filters, pagination] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
  subtasks: (parentId: string) => [...taskKeys.all, 'subtasks', parentId] as const,
  attachments: (taskId: string) => [...taskKeys.all, 'attachments', taskId] as const,
};

export function useTasks(
  orgId: string | null,
  filters?: { status?: string; priority?: string; assigneeId?: string; search?: string },
  pagination?: PaginationParams,
) {
  return useQuery({
    queryKey: taskKeys.list(orgId, filters, pagination),
    queryFn: async () => {
      const result = await taskService.list(orgId, filters, pagination);
      if (result.error) throw result.error;
      return result.data!;
    },
    staleTime: 30_000,
  });
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const result = await taskService.getById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TaskInsert) => {
      const result = await taskService.create(input);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      toast.success('Task created');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? 'Failed to create task');
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
      version,
    }: {
      id: string;
      patch: TaskUpdate;
      version: number;
    }) => {
      const result = await taskService.update(id, patch, version);
      if (result.error) throw result.error;
      return result.data!;
    },

    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const previousLists = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: { data: Task[]; count: number; page: number; pageSize: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((t: Task) => (t.id === id ? { ...t, ...patch } : t)),
          };
        },
      );

      return { previousLists };
    },
    onError: (error: { code?: string; message?: string }, _vars, context) => {

      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }

      if (error.code === 'VERSION_CONFLICT') {
        toast.error('Conflict: This task was modified by someone else. Please reload.');
      } else {
        toast.error(error.message ?? 'Failed to update task');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await taskService.delete(id);
      if (result.error) throw result.error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const previousLists = queryClient.getQueriesData({ queryKey: taskKeys.lists() });

      queryClient.setQueriesData(
        { queryKey: taskKeys.lists() },
        (old: { data: Task[]; count: number; page: number; pageSize: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((t: Task) => t.id !== id),
            count: old.count - 1,
          };
        },
      );

      return { previousLists };
    },
    onError: (error: { message?: string }, _id, context) => {
      if (context?.previousLists) {
        for (const [key, data] of context.previousLists) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(error.message ?? 'Failed to delete task');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useSubtasks(parentId: string | null) {
  return useQuery({
    queryKey: taskKeys.subtasks(parentId ?? ''),
    queryFn: async () => {
      if (!parentId) return [];
      const result = await taskService.listSubtasks(parentId);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!parentId,
  });
}

export function useAttachments(taskId: string | null) {
  return useQuery({
    queryKey: taskKeys.attachments(taskId ?? ''),
    queryFn: async () => {
      if (!taskId) return [];
      const result = await taskService.listAttachments(taskId);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!taskId,
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId, file }: { taskId: string; userId: string; file: File }) => {
      const result = await taskService.uploadAttachment(taskId, userId, file);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.attachments(taskId) });
      toast.success('File uploaded');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? 'Upload failed');
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, storagePath, taskId }: { id: string; storagePath: string; taskId: string }) => {
      const result = await taskService.deleteAttachment(id, storagePath);
      if (result.error) throw result.error;
      return taskId;
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.attachments(taskId) });
      toast.success('Attachment deleted');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? 'Failed to delete attachment');
    },
  });
}
