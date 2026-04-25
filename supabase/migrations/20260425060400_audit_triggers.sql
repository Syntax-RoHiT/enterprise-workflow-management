-- =============================================================================
-- Phase 5: Audit Logging Triggers
-- =============================================================================
-- Generic audit trigger that captures INSERT/UPDATE/DELETE on key tables.
-- Stores user_id from auth.uid(), before/after state as JSONB.
-- Replaces frontend logActivity() calls.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id UUID;
  _row_id  UUID;
BEGIN
  -- Get current user (may be NULL for service-role calls)
  BEGIN
    _user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    _user_id := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    _row_id := OLD.id;
    INSERT INTO public.audit_log(table_name, operation, row_id, user_id, old_data)
    VALUES (TG_TABLE_NAME, 'DELETE', _row_id, _user_id, to_jsonb(OLD));
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    _row_id := NEW.id;
    INSERT INTO public.audit_log(table_name, operation, row_id, user_id, old_data, new_data)
    VALUES (TG_TABLE_NAME, 'UPDATE', _row_id, _user_id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    _row_id := NEW.id;
    INSERT INTO public.audit_log(table_name, operation, row_id, user_id, new_data)
    VALUES (TG_TABLE_NAME, 'INSERT', _row_id, _user_id, to_jsonb(NEW));
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Attach to key tables
CREATE TRIGGER audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_workflows
  AFTER INSERT OR UPDATE OR DELETE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_task_comments
  AFTER INSERT OR UPDATE OR DELETE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_task_attachments
  AFTER INSERT OR UPDATE OR DELETE ON public.task_attachments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_organizations
  AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_teams
  AFTER INSERT OR UPDATE OR DELETE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_team_members
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
