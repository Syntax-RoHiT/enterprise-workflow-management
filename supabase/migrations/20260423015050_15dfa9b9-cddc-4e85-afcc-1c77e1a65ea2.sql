CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by authenticated"
  ON public.task_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated create comments"
  ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Author/admin update comments"
  ON public.task_comments FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Author/admin delete comments"
  ON public.task_comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_task_comments_updated
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_task_comments_task ON public.task_comments(task_id, created_at DESC);

ALTER TABLE public.task_comments REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.activity REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;