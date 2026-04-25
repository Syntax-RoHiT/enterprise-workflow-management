-- =============================================================================
-- Phase 2: RBAC + Row Level Security
-- =============================================================================
-- Creates: user_org_role() helper, user_in_org() helper
-- Updates: RLS policies on all tables for org-scoped multi-tenant access
-- Viewer = read-only; Member = CRUD own; Admin = full control
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 2.1  Helper: get a user's highest role within an organization
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_org_role(_user_id UUID, _org_id UUID)
RETURNS public.app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tm.role
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.user_id = _user_id
    AND t.organization_id = _org_id
  ORDER BY
    CASE tm.role
      WHEN 'admin'  THEN 1
      WHEN 'member' THEN 2
      WHEN 'viewer' THEN 3
    END
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 2.2  Helper: check if user belongs to an organization (any role)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_in_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = _user_id
      AND t.organization_id = _org_id
  );
$$;

-- ---------------------------------------------------------------------------
-- 2.3  Organizations policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Org members can view their orgs"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.user_in_org(auth.uid(), id));

CREATE POLICY "Org admins can update org"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.user_org_role(auth.uid(), id) = 'admin');

-- Allow any authenticated user to create an org (they become admin via app logic)
CREATE POLICY "Authenticated users can create orgs"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Org admins can delete org"
  ON public.organizations FOR DELETE TO authenticated
  USING (public.user_org_role(auth.uid(), id) = 'admin');

-- ---------------------------------------------------------------------------
-- 2.4  Teams policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Org members can view teams"
  ON public.teams FOR SELECT TO authenticated
  USING (public.user_in_org(auth.uid(), organization_id));

CREATE POLICY "Org admins can create teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (public.user_org_role(auth.uid(), organization_id) = 'admin');

CREATE POLICY "Org admins can update teams"
  ON public.teams FOR UPDATE TO authenticated
  USING (public.user_org_role(auth.uid(), organization_id) = 'admin');

CREATE POLICY "Org admins can delete teams"
  ON public.teams FOR DELETE TO authenticated
  USING (public.user_org_role(auth.uid(), organization_id) = 'admin');

-- ---------------------------------------------------------------------------
-- 2.5  Team members policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Org members can view team members"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND public.user_in_org(auth.uid(), t.organization_id)
    )
  );

CREATE POLICY "Org admins can manage team members"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND public.user_org_role(auth.uid(), t.organization_id) = 'admin'
    )
  );

CREATE POLICY "Org admins can update team members"
  ON public.team_members FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND public.user_org_role(auth.uid(), t.organization_id) = 'admin'
    )
  );

CREATE POLICY "Org admins can remove team members"
  ON public.team_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND public.user_org_role(auth.uid(), t.organization_id) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 2.6  Tasks policies — org-scoped
--       Drop old policies and replace with org-scoped versions.
--       Tasks without organization_id (legacy) remain accessible to creator.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tasks viewable by authenticated"     ON public.tasks;
DROP POLICY IF EXISTS "Authenticated create tasks"          ON public.tasks;
DROP POLICY IF EXISTS "Creator/assignee/admin update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Creator/admin delete tasks"          ON public.tasks;

-- SELECT: org members OR legacy tasks owned by user
CREATE POLICY "Tasks viewable by org members"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND public.user_in_org(auth.uid(), organization_id))
    OR
    (organization_id IS NULL AND (created_by = auth.uid() OR assignee_id = auth.uid()))
  );

-- INSERT: org member/admin (not viewer), or legacy (no org)
CREATE POLICY "Org members can create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      organization_id IS NULL
      OR public.user_org_role(auth.uid(), organization_id) IN ('admin', 'member')
    )
  );

-- UPDATE: creator, assignee, or org admin — viewers excluded
CREATE POLICY "Task update by contributor or admin"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assignee_id
    OR (organization_id IS NOT NULL AND public.user_org_role(auth.uid(), organization_id) = 'admin')
    OR (organization_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  );

-- DELETE: creator or org admin
CREATE POLICY "Task delete by creator or admin"
  ON public.tasks FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by
    OR (organization_id IS NOT NULL AND public.user_org_role(auth.uid(), organization_id) = 'admin')
    OR (organization_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  );

-- ---------------------------------------------------------------------------
-- 2.7  Task comments — org-scoped via task
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Comments viewable by authenticated"  ON public.task_comments;
DROP POLICY IF EXISTS "Authenticated create comments"       ON public.task_comments;
DROP POLICY IF EXISTS "Author/admin update comments"        ON public.task_comments;
DROP POLICY IF EXISTS "Author/admin delete comments"        ON public.task_comments;

CREATE POLICY "Comments viewable by task org members"
  ON public.task_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_comments.task_id
        AND (
          (t.organization_id IS NOT NULL AND public.user_in_org(auth.uid(), t.organization_id))
          OR (t.organization_id IS NULL AND (t.created_by = auth.uid() OR t.assignee_id = auth.uid()))
        )
    )
  );

CREATE POLICY "Org members can create comments"
  ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_comments.task_id
        AND (
          t.organization_id IS NULL
          OR public.user_org_role(auth.uid(), t.organization_id) IN ('admin', 'member')
        )
    )
  );

CREATE POLICY "Comment author or admin can update"
  ON public.task_comments FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Comment author or admin can delete"
  ON public.task_comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 2.8  Task attachments — org-scoped via task
-- ---------------------------------------------------------------------------
CREATE POLICY "Attachments viewable by task org members"
  ON public.task_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_attachments.task_id
        AND (
          (t.organization_id IS NOT NULL AND public.user_in_org(auth.uid(), t.organization_id))
          OR (t.organization_id IS NULL AND (t.created_by = auth.uid() OR t.assignee_id = auth.uid()))
        )
    )
  );

CREATE POLICY "Org members can upload attachments"
  ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_attachments.task_id
        AND (
          t.organization_id IS NULL
          OR public.user_org_role(auth.uid(), t.organization_id) IN ('admin', 'member')
        )
    )
  );

CREATE POLICY "Uploader or admin can delete attachments"
  ON public.task_attachments FOR DELETE TO authenticated
  USING (
    auth.uid() = uploaded_by
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_attachments.task_id
        AND t.organization_id IS NOT NULL
        AND public.user_org_role(auth.uid(), t.organization_id) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 2.9  Workflows — org-scoped
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Workflows viewable by authenticated"  ON public.workflows;
DROP POLICY IF EXISTS "Authenticated create workflows"       ON public.workflows;
DROP POLICY IF EXISTS "Creator/admin update workflows"       ON public.workflows;
DROP POLICY IF EXISTS "Creator/admin delete workflows"       ON public.workflows;

CREATE POLICY "Workflows viewable by org members"
  ON public.workflows FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND public.user_in_org(auth.uid(), organization_id))
    OR (organization_id IS NULL AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Org members can create workflows"
  ON public.workflows FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      organization_id IS NULL
      OR public.user_org_role(auth.uid(), organization_id) IN ('admin', 'member')
    )
  );

CREATE POLICY "Workflow creator or admin can update"
  ON public.workflows FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR (organization_id IS NOT NULL AND public.user_org_role(auth.uid(), organization_id) = 'admin')
    OR (organization_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Workflow creator or admin can delete"
  ON public.workflows FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by
    OR (organization_id IS NOT NULL AND public.user_org_role(auth.uid(), organization_id) = 'admin')
    OR (organization_id IS NULL AND public.has_role(auth.uid(), 'admin'))
  );

-- ---------------------------------------------------------------------------
-- 2.10  Workflow events — service-level only (Edge Function uses service_role)
-- ---------------------------------------------------------------------------
CREATE POLICY "No direct user access to workflow events"
  ON public.workflow_events FOR SELECT TO authenticated
  USING (false);

-- ---------------------------------------------------------------------------
-- 2.11  Workflow executions — org-scoped via workflow
-- ---------------------------------------------------------------------------
CREATE POLICY "Executions viewable by workflow org members"
  ON public.workflow_executions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = workflow_executions.workflow_id
        AND (
          (w.organization_id IS NOT NULL AND public.user_in_org(auth.uid(), w.organization_id))
          OR (w.organization_id IS NULL AND (w.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 2.12  Audit log — admin only
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies — only triggers write to audit_log
