// =============================================================================
// Workflow Engine — Supabase Edge Function
// =============================================================================
// Polls workflow_events queue, matches active workflows, executes DAG nodes.
// Actions supported: update_task, send_webhook
// Called via: supabase.functions.invoke('workflow-engine') or scheduled cron
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;
const BATCH_SIZE = 10;

// ---------------------------------------------------------------------------
// Lightweight DAG helpers (duplicated from frontend for Deno runtime)
// ---------------------------------------------------------------------------
interface GNode { id: string; data?: Record<string, unknown>; [k: string]: unknown }
interface GEdge { id: string; source: string; target: string; sourceHandle?: string; [k: string]: unknown }

function topologicalSort(nodes: GNode[], edges: GEdge[]): string[] | null {
  const inDeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) { inDeg.set(n.id, 0); adj.set(n.id, []); }
  for (const e of edges) { adj.get(e.source)?.push(e.target); inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1); }
  const queue: string[] = [];
  for (const [id, d] of inDeg) if (d === 0) queue.push(id);
  const result: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    result.push(id);
    for (const nb of adj.get(id) ?? []) { const nd = (inDeg.get(nb) ?? 1) - 1; inDeg.set(nb, nd); if (nd === 0) queue.push(nb); }
  }
  return result.length === nodes.length ? result : null;
}

function resolveNodeType(node: GNode): string {
  if (node.data?.nodeType) return node.data.nodeType as string;
  const label = String(node.data?.label ?? '');
  if (label.startsWith('⚡') || label.toLowerCase().includes('trigger')) return 'trigger';
  if (label.startsWith('❓') || label.toLowerCase().includes('condition')) return 'condition';
  if (label.startsWith('⚙') || label.toLowerCase().includes('action')) return 'action';
  return 'unknown';
}

function evaluateCondition(expression: string, ctx: Record<string, unknown>): boolean {
  try {
    const orParts = expression.split('||').map(s => s.trim());
    return orParts.some(or => {
      const andParts = or.split('&&').map(s => s.trim());
      return andParts.every(comp => evalComp(comp, ctx));
    });
  } catch { return false; }
}

function evalComp(expr: string, ctx: Record<string, unknown>): boolean {
  const ops = ['!=', '==', '>=', '<=', '>', '<'] as const;
  for (const op of ops) {
    const i = expr.indexOf(op);
    if (i === -1) continue;
    const l = resolve(ctx, expr.slice(0, i).trim());
    const r = parseVal(expr.slice(i + op.length).trim());
    switch (op) {
      case '==': return l == r;
      case '!=': return l != r;
      case '>':  return Number(l) > Number(r);
      case '<':  return Number(l) < Number(r);
      case '>=': return Number(l) >= Number(r);
      case '<=': return Number(l) <= Number(r);
    }
  }
  return !!resolve(ctx, expr);
}

function resolve(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((a, k) => a && typeof a === 'object' ? (a as Record<string, unknown>)[k] : undefined, obj);
}

function parseVal(raw: string): unknown {
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) return raw.slice(1, -1);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;
  const n = Number(raw);
  return isNaN(n) ? raw : n;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Claim pending events
    const { data: events, error: fetchErr } = await db
      .from('workflow_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) throw fetchErr;
    if (!events?.length) {
      return jsonResponse({ processed: 0 });
    }

    // Mark as processing
    const eventIds = events.map((e: { id: string }) => e.id);
    await db
      .from('workflow_events')
      .update({ status: 'processing' })
      .in('id', eventIds);

    let totalProcessed = 0;

    for (const event of events) {
      try {
        const eventType = event.event_type;
        const payload = event.payload as Record<string, unknown>;

        // 2. Find active workflows matching this event type
        const { data: workflows } = await db
          .from('workflows')
          .select('*')
          .eq('is_active', true)
          .eq('trigger_event', eventType);

        for (const wf of workflows ?? []) {
          await executeWorkflow(db, wf, event.id, payload);
        }

        // Mark event as done
        await db
          .from('workflow_events')
          .update({ status: 'done', processed_at: new Date().toISOString() })
          .eq('id', event.id);

        totalProcessed++;
      } catch (err) {
        const retryCount = (event.retry_count ?? 0) + 1;
        await db
          .from('workflow_events')
          .update({
            status: retryCount >= MAX_RETRIES ? 'failed' : 'pending',
            retry_count: retryCount,
          })
          .eq('id', event.id);
      }
    }

    return jsonResponse({ processed: totalProcessed });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Execute a single workflow
// ---------------------------------------------------------------------------
async function executeWorkflow(
  db: ReturnType<typeof createClient>,
  workflow: Record<string, unknown>,
  eventId: string,
  payload: Record<string, unknown>,
) {
  const nodes = (workflow.nodes as GNode[]) ?? [];
  const edges = (workflow.edges as GEdge[]) ?? [];

  // Create execution record
  const { data: exec } = await db
    .from('workflow_executions')
    .insert({
      workflow_id: workflow.id,
      event_id: eventId,
      status: 'running',
      trigger_data: payload,
    })
    .select()
    .single();

  if (!exec) return;
  const executionId = exec.id;

  try {
    const order = topologicalSort(nodes, edges);
    if (!order) {
      await db.from('workflow_executions')
        .update({ status: 'failed', error: 'Cycle detected in workflow graph', completed_at: new Date().toISOString() })
        .eq('id', executionId);
      return;
    }

    const context: Record<string, unknown> = { ...payload };
    const skippedNodes = new Set<string>();

    for (const nodeId of order) {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      // If any upstream node was skipped (condition false), skip this node too
      const incomingEdges = edges.filter((e) => e.target === nodeId);
      const allUpstreamSkipped = incomingEdges.length > 0 &&
        incomingEdges.every((e) => skippedNodes.has(e.source));
      if (allUpstreamSkipped && incomingEdges.length > 0) {
        skippedNodes.add(nodeId);
        await logStep(db, executionId, nodeId, resolveNodeType(node), 'skipped');
        continue;
      }

      const nodeType = resolveNodeType(node);

      // Log step as running
      const stepId = await logStep(db, executionId, nodeId, nodeType, 'running', { context });

      try {
        switch (nodeType) {
          case 'trigger': {
            // Trigger nodes just pass through — data is already in context
            await updateStep(db, stepId, 'completed');
            break;
          }

          case 'condition': {
            const expression = String(node.data?.expression ?? node.data?.label ?? 'true');
            const result = evaluateCondition(expression, context);
            if (!result) {
              // Skip downstream nodes connected via 'false' handle or default
              const downstreamEdges = edges.filter((e) => e.source === nodeId);
              for (const e of downstreamEdges) {
                if (e.sourceHandle !== 'true') skippedNodes.add(e.target);
              }
            }
            await updateStep(db, stepId, 'completed', { result });
            break;
          }

          case 'action': {
            const actionType = String(node.data?.actionType ?? 'unknown');
            const config = (node.data?.config ?? {}) as Record<string, unknown>;

            let retries = 0;
            let success = false;
            let lastError = '';

            while (retries <= MAX_RETRIES && !success) {
              try {
                if (actionType === 'update_task') {
                  await executeUpdateTask(db, config, context);
                } else if (actionType === 'send_webhook') {
                  await executeSendWebhook(config, context);
                }
                success = true;
              } catch (err) {
                lastError = String(err);
                retries++;
                if (retries <= MAX_RETRIES) {
                  await new Promise((r) => setTimeout(r, 1000 * retries));
                }
              }
            }

            if (success) {
              await updateStep(db, stepId, 'completed', { actionType });
            } else {
              await updateStep(db, stepId, 'failed', null, lastError, retries);
              throw new Error(`Action ${actionType} failed after ${retries} retries: ${lastError}`);
            }
            break;
          }

          default:
            await updateStep(db, stepId, 'skipped');
        }
      } catch (stepErr) {
        // Already logged in action block — just re-throw to fail execution
        throw stepErr;
      }
    }

    // Mark execution as completed
    await db.from('workflow_executions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', executionId);

  } catch (err) {
    await db.from('workflow_executions')
      .update({ status: 'failed', error: String(err), completed_at: new Date().toISOString() })
      .eq('id', executionId);
  }
}

// ---------------------------------------------------------------------------
// Action executors
// ---------------------------------------------------------------------------
async function executeUpdateTask(
  db: ReturnType<typeof createClient>,
  config: Record<string, unknown>,
  context: Record<string, unknown>,
) {
  const record = context.record as Record<string, unknown> | undefined;
  const taskId = (config.task_id as string) ?? record?.id;
  if (!taskId) throw new Error('No task_id in config or context');

  const patch: Record<string, unknown> = {};
  if (config.status) patch.status = config.status;
  if (config.priority) patch.priority = config.priority;
  if (config.assignee_id) patch.assignee_id = config.assignee_id;

  if (Object.keys(patch).length === 0) throw new Error('No fields to update');

  const { error } = await db.from('tasks').update(patch).eq('id', taskId);
  if (error) throw error;
}

async function executeSendWebhook(
  config: Record<string, unknown>,
  context: Record<string, unknown>,
) {
  const url = config.url as string;
  if (!url) throw new Error('No webhook URL configured');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: context,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    throw new Error(`Webhook returned ${res.status}: ${await res.text()}`);
  }
}

// ---------------------------------------------------------------------------
// Step logging helpers
// ---------------------------------------------------------------------------
async function logStep(
  db: ReturnType<typeof createClient>,
  executionId: string,
  nodeId: string,
  nodeType: string,
  status: string,
  inputData?: unknown,
): Promise<string> {
  const { data } = await db
    .from('workflow_execution_steps')
    .insert({
      execution_id: executionId,
      node_id: nodeId,
      node_type: nodeType,
      status,
      input_data: inputData ?? null,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  return data?.id ?? '';
}

async function updateStep(
  db: ReturnType<typeof createClient>,
  stepId: string,
  status: string,
  outputData?: unknown,
  error?: string,
  retryCount?: number,
) {
  if (!stepId) return;
  await db.from('workflow_execution_steps')
    .update({
      status,
      output_data: outputData ?? null,
      error: error ?? null,
      retry_count: retryCount ?? 0,
      completed_at: new Date().toISOString(),
    })
    .eq('id', stepId);
}

// ---------------------------------------------------------------------------
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
