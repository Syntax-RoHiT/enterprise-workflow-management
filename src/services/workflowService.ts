

import { supabase } from '@/integrations/supabase/client';
import type {
  Workflow,
  WorkflowExecution,
  ExecutionStep,
  AppError,
  ServiceResult,
} from '@/lib/types';

function mapError(error: { message: string; code?: string }): AppError {
  if (error.code === '42501') return { code: 'FORBIDDEN', message: 'Permission denied.' };
  if (error.code === 'PGRST116') return { code: 'NOT_FOUND', message: 'Workflow not found.' };
  return { code: 'UNKNOWN', message: error.message };
}

export const workflowService = {
  async list(orgId: string | null): Promise<ServiceResult<Workflow[]>> {
    let query = supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) return { data: null, error: mapError(error) };
    return { data: (data ?? []) as unknown as Workflow[], error: null };
  },

  async getById(id: string): Promise<ServiceResult<Workflow>> {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return { data: null, error: mapError(error) };
    return { data: data as unknown as Workflow, error: null };
  },

  async save(
    workflow: Partial<Workflow> & { name: string; created_by: string },
  ): Promise<ServiceResult<Workflow>> {
    const payload = {
      name: workflow.name,
      description: workflow.description ?? null,
      nodes: (workflow.nodes ?? []) as never,
      edges: (workflow.edges ?? []) as never,

    };

    if (workflow.id) {
      const { data, error } = await supabase
        .from('workflows')
        .update(payload)
        .eq('id', workflow.id)
        .select()
        .single();
      if (error) return { data: null, error: mapError(error) };
      return { data: data as unknown as Workflow, error: null };
    } else {
      const { data, error } = await supabase
        .from('workflows')
        .insert({ ...payload, created_by: workflow.created_by })
        .select()
        .single();
      if (error) return { data: null, error: mapError(error) };
      return { data: data as unknown as Workflow, error: null };
    }
  },

  async delete(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.from('workflows').delete().eq('id', id);
    if (error) return { data: null, error: mapError(error) };
    return { data: null, error: null };
  },

  async activate(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('workflows')
      .update({ is_active: true })
      .eq('id', id);
    if (error) return { data: null, error: mapError(error) };
    return { data: null, error: null };
  },

  async deactivate(id: string): Promise<ServiceResult<null>> {
    const { error } = await supabase
      .from('workflows')
      .update({ is_active: false })
      .eq('id', id);
    if (error) return { data: null, error: mapError(error) };
    return { data: null, error: null };
  },

  async listExecutions(workflowId: string): Promise<ServiceResult<WorkflowExecution[]>> {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false })
      .limit(50);
    if (error) return { data: null, error: mapError(error) };
    return { data: (data ?? []) as WorkflowExecution[], error: null };
  },

  async getExecutionSteps(executionId: string): Promise<ServiceResult<ExecutionStep[]>> {
    const { data, error } = await supabase
      .from('workflow_execution_steps')
      .select('*')
      .eq('execution_id', executionId)
      .order('started_at', { ascending: true });
    if (error) return { data: null, error: mapError(error) };
    return { data: (data ?? []) as ExecutionStep[], error: null };
  },

  async triggerEngine(): Promise<ServiceResult<{ processed: number }>> {
    const { data, error } = await supabase.functions.invoke('workflow-engine');
    if (error) return { data: null, error: { code: 'UNKNOWN', message: error.message } };
    return { data: data as { processed: number }, error: null };
  },
};
