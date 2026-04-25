

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type AppRole = 'admin' | 'member' | 'viewer';

export type AppErrorCode =
  | 'VERSION_CONFLICT'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'UNKNOWN';

export interface AppError {
  code: AppErrorCode;
  message: string;
  detail?: unknown;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Profile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  description_html: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  created_by: string;
  due_date: string | null;
  position: number;
  version: number;
  parent_task_id: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskInsert = {
  title: string;
  created_by: string;
  organization_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  description?: string | null;
  description_html?: string | null;
  assignee_id?: string | null;
  due_date?: string | null;
  parent_task_id?: string | null;
};

export type TaskUpdate = Partial<
  Pick<
    Task,
    | 'title'
    | 'description'
    | 'description_html'
    | 'status'
    | 'priority'
    | 'assignee_id'
    | 'due_date'
    | 'position'
    | 'parent_task_id'
  >
>;

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  storage_path: string;
  created_at: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  nodes: unknown[];
  edges: unknown[];
  is_active: boolean;
  trigger_event: string | null;
  organization_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  event_id: string | null;
  status: 'running' | 'completed' | 'failed';
  trigger_data: unknown;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface ExecutionStep {
  id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input_data: unknown;
  output_data: unknown;
  error: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface AuditLogEntry {
  id: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  row_id: string | null;
  user_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_at: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

export type ServiceResult<T> = {
  data: T | null;
  error: AppError | null;
};
