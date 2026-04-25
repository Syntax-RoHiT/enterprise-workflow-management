

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowService } from '@/services/workflowService';
import type { Workflow } from '@/lib/types';
import { toast } from 'sonner';

export const workflowKeys = {
  all: ['workflows'] as const,
  list: (orgId: string | null) => [...workflowKeys.all, 'list', orgId] as const,
  detail: (id: string) => [...workflowKeys.all, 'detail', id] as const,
  executions: (workflowId: string) => [...workflowKeys.all, 'executions', workflowId] as const,
  steps: (executionId: string) => [...workflowKeys.all, 'steps', executionId] as const,
};

export function useWorkflows(orgId: string | null) {
  return useQuery({
    queryKey: workflowKeys.list(orgId),
    queryFn: async () => {
      const result = await workflowService.list(orgId);
      if (result.error) throw result.error;
      return result.data!;
    },
    staleTime: 30_000,
  });
}

export function useSaveWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflow: Partial<Workflow> & { name: string; created_by: string }) => {
      const result = await workflowService.save(workflow);
      if (result.error) throw result.error;
      return result.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all });
      toast.success('Workflow saved');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? 'Failed to save workflow');
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await workflowService.delete(id);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all });
      toast.success('Workflow deleted');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? 'Failed to delete workflow');
    },
  });
}

export function useToggleWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const result = active
        ? await workflowService.activate(id)
        : await workflowService.deactivate(id);
      if (result.error) throw result.error;
    },
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all });
      toast.success(active ? 'Workflow activated' : 'Workflow deactivated');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message ?? 'Failed to toggle workflow');
    },
  });
}

export function useWorkflowExecutions(workflowId: string | null) {
  return useQuery({
    queryKey: workflowKeys.executions(workflowId ?? ''),
    queryFn: async () => {
      if (!workflowId) return [];
      const result = await workflowService.listExecutions(workflowId);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!workflowId,
    staleTime: 10_000,
  });
}

export function useExecutionSteps(executionId: string | null) {
  return useQuery({
    queryKey: workflowKeys.steps(executionId ?? ''),
    queryFn: async () => {
      if (!executionId) return [];
      const result = await workflowService.getExecutionSteps(executionId);
      if (result.error) throw result.error;
      return result.data!;
    },
    enabled: !!executionId,
  });
}
