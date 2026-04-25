-- =============================================================================
-- Phase 3: Optimistic Locking via version column
-- =============================================================================
-- The tasks.version column was added in Phase 1 (default 1).
-- This trigger rejects updates where the caller's version doesn't match,
-- and auto-increments on success.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.tasks_version_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only enforce when caller explicitly sets version (optimistic lock)
  -- If version is unchanged from OLD, it means caller sent the correct version
  IF NEW.version IS DISTINCT FROM OLD.version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT: expected version %, got %', OLD.version, NEW.version
      USING ERRCODE = '40001';  -- serialization_failure
  END IF;

  -- Auto-increment version
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

-- Must fire BEFORE the existing updated_at trigger
CREATE TRIGGER trg_tasks_version
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_version_check();
