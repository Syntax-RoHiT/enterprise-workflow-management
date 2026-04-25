-- =============================================================================
-- Phase 1: Enterprise Data Foundation
-- =============================================================================
-- Creates: organizations, teams, team_members, task_attachments,
--          workflow_events, workflow_executions, workflow_execution_steps,
--          audit_log
-- Alters:  app_role enum, tasks, task_comments, workflows
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1.1  Extend app_role enum with 'viewer'
-- ---------------------------------------------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- ---------------------------------------------------------------------------
-- 1.2  Organizations
-- ---------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_organizations_updated
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 1.3  Teams (belong to an organization)
-- ---------------------------------------------------------------------------
CREATE TABLE public.teams (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_teams_org ON public.teams(organization_id);

-- ---------------------------------------------------------------------------
-- 1.4  Team members (user ↔ team join with role)
-- ---------------------------------------------------------------------------
CREATE TABLE public.team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL DEFAULT 'member',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_team_members_user ON public.team_members(user_id);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);

-- ---------------------------------------------------------------------------
-- 1.5  Alter tasks: version, rich text, subtasks, org scoping
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS version          INT  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS description_html TEXT,
  ADD COLUMN IF NOT EXISTS parent_task_id   UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS organization_id  UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_tasks_parent     ON public.tasks(parent_task_id);
CREATE INDEX idx_tasks_org        ON public.tasks(organization_id);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);

-- ---------------------------------------------------------------------------
-- 1.6  Alter task_comments: threaded replies
-- ---------------------------------------------------------------------------
ALTER TABLE public.task_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE;

CREATE INDEX idx_comments_parent ON public.task_comments(parent_comment_id);

-- Add FK that was missing in original migration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_comments_task_id_fkey'
      AND table_name = 'task_comments'
  ) THEN
    ALTER TABLE public.task_comments
      ADD CONSTRAINT task_comments_task_id_fkey
      FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_comments_author_id_fkey'
      AND table_name = 'task_comments'
  ) THEN
    ALTER TABLE public.task_comments
      ADD CONSTRAINT task_comments_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1.7  Task attachments (metadata; files in private Supabase Storage bucket)
-- ---------------------------------------------------------------------------
CREATE TABLE public.task_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_size     BIGINT NOT NULL DEFAULT 0,
  mime_type     TEXT,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_attachments_task ON public.task_attachments(task_id);

-- ---------------------------------------------------------------------------
-- 1.8  Alter workflows: activation, trigger event, org scoping
-- ---------------------------------------------------------------------------
ALTER TABLE public.workflows
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trigger_event   TEXT,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_workflows_org     ON public.workflows(organization_id);
CREATE INDEX idx_workflows_active  ON public.workflows(is_active) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 1.9  Workflow event queue (replaces pg_net dependency)
-- ---------------------------------------------------------------------------
CREATE TABLE public.workflow_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,              -- 'task.created', 'task.updated'
  payload     JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, done, failed
  retry_count INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_wf_events_status ON public.workflow_events(status, created_at)
  WHERE status IN ('pending', 'processing');

-- ---------------------------------------------------------------------------
-- 1.10  Workflow executions (one per workflow × event)
-- ---------------------------------------------------------------------------
CREATE TABLE public.workflow_executions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  event_id      UUID REFERENCES public.workflow_events(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'running',  -- running, completed, failed
  trigger_data  JSONB,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  error         TEXT
);
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_executions_workflow ON public.workflow_executions(workflow_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- 1.11  Workflow execution steps (one per node per execution)
-- ---------------------------------------------------------------------------
CREATE TABLE public.workflow_execution_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id  UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id       TEXT NOT NULL,
  node_type     TEXT NOT NULL,    -- 'trigger', 'condition', 'action'
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed, skipped
  input_data    JSONB,
  output_data   JSONB,
  error         TEXT,
  retry_count   INT NOT NULL DEFAULT 0,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_exec_steps_exec ON public.workflow_execution_steps(execution_id);

-- ---------------------------------------------------------------------------
-- 1.12  Audit log (populated by triggers in Phase 5)
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_log (
  id          BIGSERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,
  operation   TEXT NOT NULL,     -- INSERT, UPDATE, DELETE
  row_id      UUID,
  user_id     UUID,
  old_data    JSONB,
  new_data    JSONB,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS on audit_log yet — Phase 2 adds org-scoped policies
CREATE INDEX idx_audit_table   ON public.audit_log(table_name, changed_at DESC);
CREATE INDEX idx_audit_user    ON public.audit_log(user_id);
CREATE INDEX idx_audit_row     ON public.audit_log(row_id);

-- ---------------------------------------------------------------------------
-- 1.13  Enable realtime on new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.task_attachments    REPLICA IDENTITY FULL;
ALTER TABLE public.workflow_events     REPLICA IDENTITY FULL;
ALTER TABLE public.workflow_executions REPLICA IDENTITY FULL;
ALTER TABLE public.organizations       REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.task_attachments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_events;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_executions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ---------------------------------------------------------------------------
-- 1.14  Postgres trigger: enqueue workflow events on task changes
--        (instead of pg_net HTTP calls)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_workflow_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workflow_events (event_type, payload)
  VALUES (
    CASE TG_OP
      WHEN 'INSERT' THEN 'task.created'
      WHEN 'UPDATE' THEN 'task.updated'
      WHEN 'DELETE' THEN 'task.deleted'
    END,
    jsonb_build_object(
      'record',     CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END,
      'old_record',  CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      'table',       TG_TABLE_NAME,
      'operation',   TG_OP
    )
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_task_workflow_event
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_workflow_event();
