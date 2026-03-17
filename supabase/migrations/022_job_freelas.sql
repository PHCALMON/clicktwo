-- Migration 022: Multiple freelancers per job
CREATE TABLE job_freelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  nome text NOT NULL,
  funcao text,
  posicao integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_freelas_job ON job_freelas(job_id);

ALTER TABLE job_freelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON job_freelas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE job_freelas;

-- Migrate existing freela data
INSERT INTO job_freelas (job_id, nome, funcao, posicao)
SELECT id, freela_nome, freela_funcao, 0
FROM jobs
WHERE freela_nome IS NOT NULL AND freela_nome != '';

COMMENT ON TABLE job_freelas IS 'Multiple freelancers per job. Replaces jobs.freela_nome/freela_funcao.';
