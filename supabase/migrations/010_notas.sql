-- 010: Personal notes (Apple Notes style)
CREATE TABLE notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL DEFAULT 'Sem titulo',
  conteudo text NOT NULL DEFAULT '',
  posicao integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notas_user ON notas(user_id);

ALTER TABLE notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_notas" ON notas
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
