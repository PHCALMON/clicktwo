-- 007: Entregas (deliverables per job)
CREATE TABLE entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tag text,               -- e.g. 'edicao', 'motion', 'mix' (reuses TagJob values)
  concluida boolean NOT NULL DEFAULT false,
  posicao integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entregas_job ON entregas(job_id);

ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON entregas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE entregas;
