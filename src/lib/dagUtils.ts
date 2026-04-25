

export interface GraphNode {
  id: string;
  type?: string;
  data?: {
    label?: string;
    nodeType?: string;       // 'trigger' | 'condition' | 'action'
    actionType?: string;     // 'update_task' | 'send_webhook'
    config?: Record<string, unknown>;
    expression?: string;     // condition expression
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;    // for conditions: 'true' or 'false'
  [key: string]: unknown;
}

export function detectCycles(nodes: GraphNode[], edges: GraphEdge[]): boolean {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const list = adj.get(e.source);
    if (list) list.push(e.target);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const n of nodes) color.set(n.id, WHITE);

  function dfs(id: string): boolean {
    color.set(id, GRAY);
    for (const neighbor of adj.get(id) ?? []) {
      const c = color.get(neighbor);
      if (c === GRAY) return true;   // back edge = cycle
      if (c === WHITE && dfs(neighbor)) return true;
    }
    color.set(id, BLACK);
    return false;
  }

  for (const n of nodes) {
    if (color.get(n.id) === WHITE && dfs(n.id)) return true;
  }
  return false;
}

export function topologicalSort(nodes: GraphNode[], edges: GraphEdge[]): string[] | null {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }

  for (const e of edges) {
    adj.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    for (const neighbor of adj.get(id) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return result.length === nodes.length ? result : null; // null = cycle
}

export function getNodeById(nodes: GraphNode[], id: string): GraphNode | undefined {
  return nodes.find((n) => n.id === id);
}

export function getOutgoingEdges(edges: GraphEdge[], nodeId: string): GraphEdge[] {
  return edges.filter((e) => e.source === nodeId);
}

export function resolveNodeType(node: GraphNode): 'trigger' | 'condition' | 'action' | 'unknown' {

  if (node.data?.nodeType) return node.data.nodeType as 'trigger' | 'condition' | 'action';

  const label = String(node.data?.label ?? '');
  if (label.startsWith('⚡') || label.toLowerCase().includes('trigger')) return 'trigger';
  if (label.startsWith('❓') || label.toLowerCase().includes('condition')) return 'condition';
  if (label.startsWith('⚙') || label.toLowerCase().includes('action')) return 'action';
  return 'unknown';
}

export function evaluateCondition(
  expression: string,
  context: Record<string, unknown>,
): boolean {
  try {

    const orParts = expression.split('||').map((s) => s.trim());
    return orParts.some((orPart) => {
      const andParts = orPart.split('&&').map((s) => s.trim());
      return andParts.every((comp) => evaluateSingleComparison(comp, context));
    });
  } catch {
    return false;
  }
}

function evaluateSingleComparison(
  expr: string,
  context: Record<string, unknown>,
): boolean {

  const operators = ['!=', '==', '>=', '<=', '>', '<', 'contains'] as const;
  for (const op of operators) {
    const idx = expr.indexOf(op === 'contains' ? ' contains ' : op);
    if (idx === -1) continue;

    const left = expr.slice(0, idx).trim();
    const right = expr.slice(idx + (op === 'contains' ? 10 : op.length)).trim();

    const leftVal = resolvePath(context, left);
    const rightVal = parseValue(right);

    switch (op) {
      case '==': return leftVal == rightVal;
      case '!=': return leftVal != rightVal;
      case '>':  return Number(leftVal) > Number(rightVal);
      case '<':  return Number(leftVal) < Number(rightVal);
      case '>=': return Number(leftVal) >= Number(rightVal);
      case '<=': return Number(leftVal) <= Number(rightVal);
      case 'contains':
        return String(leftVal).toLowerCase().includes(String(rightVal).toLowerCase());
    }
  }

  return !!resolvePath(context, expr);
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function parseValue(raw: string): unknown {

  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    return raw.slice(1, -1);
  }

  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null') return null;

  const num = Number(raw);
  if (!isNaN(num)) return num;
  return raw;
}
