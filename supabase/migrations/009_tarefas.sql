-- 009: Quick tasks between team members
CREATE TABLE tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  criado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  atribuido_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concluida boolean NOT NULL DEFAULT false,
  data_limite date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tarefas_atribuido ON tarefas(atribuido_a, concluida);
CREATE INDEX idx_tarefas_criado_por ON tarefas(criado_por);

ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON tarefas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE tarefas;
