

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentService } from '@/services/commentService';
import { toast } from 'sonner';

export const commentKeys = {
  all: ['comments'] as const,
  list: (taskId: string) => [...commentKeys.all, 'list', taskId] as const,
};

export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: commentKeys.list(taskId ?? ''),
    queryFn: async () => {
      if (!taskId) return [];
      const result = await commentService.list(taskId);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!taskId,
    staleTime: 10_000,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      authorId,
      body,
      parentCommentId,
    }: {
      taskId: string;
      authorId: string;
      body: string;
      parentCommentId?: string | null;
    }) => {
      const result = await commentService.create(taskId, authorId, body, parentCommentId);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(taskId) });
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? 'Failed to post comment');
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const result = await commentService.delete(id);
      if (result.error) throw result.error;
      return taskId;
    },
    onSuccess: (taskId) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.list(taskId) });
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? 'Failed to delete comment');
    },
  });
}
