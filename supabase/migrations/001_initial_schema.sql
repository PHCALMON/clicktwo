-- ClickTwo v1 — Initial Schema
-- E2 Studio Production Management

-- ===========================================
-- TABLES
-- ===========================================

CREATE TABLE colunas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text,
  posicao integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id),
  campanha text NOT NULL,
  tipo_job text NOT NULL CHECK (tipo_job IN ('motion_graphics', 'edicao_video', 'ajuste', 'mix', 'outro')),
  coluna_id uuid NOT NULL REFERENCES colunas(id),
  posicao integer NOT NULL DEFAULT 0,
  data_entrega date,
  prioridade text NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('urgente', 'alta', 'normal')),
  tags text[] NOT NULL DEFAULT '{}',
  drive_folder_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES auth.users(id),
  texto text NOT NULL,
  resolvido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  nome text NOT NULL,
  storage_path text NOT NULL,
  drive_url text,
  tamanho bigint,
  tipo_mime text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================
-- INDEXES
-- ===========================================

CREATE INDEX idx_jobs_coluna ON jobs(coluna_id);
CREATE INDEX idx_jobs_cliente ON jobs(cliente_id);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);
CREATE INDEX idx_comentarios_job ON comentarios(job_id);
CREATE INDEX idx_arquivos_job ON arquivos(job_id);
CREATE INDEX idx_colunas_posicao ON colunas(posicao);
CREATE INDEX idx_jobs_posicao ON jobs(coluna_id, posicao);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE colunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON colunas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON comentarios
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON arquivos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===========================================
-- REALTIME
-- ===========================================

ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE colunas;
ALTER PUBLICATION supabase_realtime ADD TABLE comentarios;
