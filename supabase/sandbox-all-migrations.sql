-- ============================================
-- MIGRATION: 001_initial_schema.sql
-- ============================================

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


-- ============================================
-- MIGRATION: 002_update_tipo_job.sql
-- ============================================

-- Migration: Update tipo_job values for ClickTwo WF01b integration
-- Old values: motion_graphics, edicao_video, ajuste, mix, outro
-- New values: publicidade, institucional, social, ia_varejo

-- Step 1: Map existing jobs to new types
UPDATE jobs SET tipo_job = CASE
  WHEN tipo_job IN ('motion_graphics', 'edicao_video') THEN 'publicidade'
  WHEN tipo_job = 'ajuste' THEN 'institucional'
  WHEN tipo_job = 'mix' THEN 'social'
  WHEN tipo_job = 'outro' THEN 'varejo'
  ELSE 'publicidade'
END;

-- Step 2: Drop old constraint and add new one
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_tipo_job_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_tipo_job_check
  CHECK (tipo_job IN ('publicidade', 'institucional', 'social', 'ia', 'varejo'));


-- ============================================
-- MIGRATION: 003_jobs_freela_fields.sql
-- ============================================

-- Migration: Add freela_nome and freela_funcao to jobs
-- When a job is assigned to a freelancer, store their name and role on the card

ALTER TABLE jobs ADD COLUMN freela_nome text;
ALTER TABLE jobs ADD COLUMN freela_funcao text;


-- ============================================
-- MIGRATION: 004_clientes_drive_folder.sql
-- ============================================

-- Migration: Add drive_folder_url to clientes
-- Stores the Google Drive folder link for each client (e.g. JOBS 2026/CLIENTE/)

ALTER TABLE clientes ADD COLUMN drive_folder_url text;


-- ============================================
-- MIGRATION: 005_clientes_realtime.sql
-- ============================================

-- Add clientes table to Supabase Realtime publication
-- This enables live updates when drive_folder_url is set by n8n callback
ALTER PUBLICATION supabase_realtime ADD TABLE clientes;


-- ============================================
-- MIGRATION: 006_profiles_notificacoes.sql
-- ============================================

-- ClickTwo v6 — Profiles + Notificacoes (Mentions)

-- Profiles: lightweight mirror of auth.users for team member listing
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'mencao',
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  comentario_id uuid REFERENCES comentarios(id) ON DELETE CASCADE,
  autor_nome text,
  job_campanha text,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_notificacoes" ON notificacoes
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_notificacoes_user ON notificacoes(user_id, lida);
CREATE INDEX idx_notificacoes_created ON notificacoes(created_at DESC);

-- Add mencoes field to comentarios
ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS mencoes uuid[] DEFAULT '{}';

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;


-- ============================================
-- MIGRATION: 007_entregas.sql
-- ============================================

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


-- ============================================
-- MIGRATION: 008_profile_status.sql
-- ============================================

-- 008: Add status field to profiles for team availability
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'livre'
  CHECK (status IN ('livre', 'estudando', 'producao', 'ajuda', 'ausente'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_updated_at timestamptz NOT NULL DEFAULT now();


-- ============================================
-- MIGRATION: 009_tarefas.sql
-- ============================================

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


-- ============================================
-- MIGRATION: 010_notas.sql
-- ============================================

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


-- ============================================
-- MIGRATION: 011_job_em_producao.sql
-- ============================================

-- Feature: "Em Producao" indicator per member
-- Each member can mark ONE job as actively being worked on
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS em_producao_por uuid REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_jobs_em_producao ON jobs(em_producao_por);


-- ============================================
-- MIGRATION: 012_profile_status_texto.sql
-- ============================================

-- Feature: Free text for "Estudando" status (what the person is studying)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_texto text;


-- ============================================
-- MIGRATION: 013_entrega_data_entrega.sql
-- ============================================

-- Add data_entrega to entregas table for per-deliverable priority tracking
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS data_entrega date;


-- ============================================
-- MIGRATION: 014_deadline_hora_margem.sql
-- ============================================

-- Add time + margin fields to jobs and entregas for internal deadline calculation
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hora_entrega_cliente time;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS margem_horas integer DEFAULT 4;

ALTER TABLE entregas ADD COLUMN IF NOT EXISTS hora_entrega_cliente time;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS margem_horas integer DEFAULT 4;


-- ============================================
-- MIGRATION: 015_profile_cargo.sql
-- ============================================

-- Cargo/badge do membro da equipe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cargo text;

-- Index para queries por cargo
CREATE INDEX IF NOT EXISTS idx_profiles_cargo ON profiles(cargo);


-- ============================================
-- MIGRATION: 016_clientes_dominio.sql
-- ============================================

-- Add dominio field for Clearbit logo integration
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dominio text;


-- ============================================
-- MIGRATION: 017_clientes_cor.sql
-- ============================================

-- Add cor field for manual client brand color
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cor text;


-- ============================================
-- MIGRATION: 018_profile_personalidade.sql
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personalidade jsonb;


-- ============================================
-- MIGRATION: 019_cargo_array.sql
-- ============================================

-- Convert cargo from text to text[] to support multiple roles
ALTER TABLE profiles ALTER COLUMN cargo TYPE text[] USING CASE WHEN cargo IS NULL THEN NULL ELSE ARRAY[cargo] END;


-- ============================================
-- MIGRATION: 020_workflow_veto_system.sql
-- ============================================

-- =====================================================================
-- Migration 020: Workflow Veto System (Pedro Valerio Process Redesign)
-- NoiseCancel v2 — Process-Enforced Kanban
-- Date: 2026-03-16
-- Doc: docs/architecture/noiscancel-workflow-redesign.md
--
-- WHAT THIS DOES:
--   1. Adds slug + protegida to colunas (semantic column identity)
--   2. Adds workflow fields to jobs (approvals, counters, briefing)
--   3. Adds roles[] to profiles (multi-role system)
--   4. Creates transition_matrix (allowed moves)
--   5. Creates job_transitions_log (audit trail)
--   6. Creates revisoes (revision classification)
--   7. Creates trigger: validate_job_transition (blocks illegal moves)
--   8. Creates trigger: log_job_transition (audit every move)
--   9. Creates trigger: check_veto_conditions (per-transition validation)
--
-- WHAT THIS DOES NOT DO:
--   - Does NOT delete or rename existing columns
--   - Does NOT change existing data
--   - Does NOT break current ClickTwo functionality
--   - Veto system is OPT-IN: only activates when colunas have slugs
-- =====================================================================

-- ===========================================
-- 1. COLUNAS: Add workflow metadata
-- ===========================================

ALTER TABLE colunas ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE colunas ADD COLUMN IF NOT EXISTS protegida boolean NOT NULL DEFAULT false;
ALTER TABLE colunas ADD COLUMN IF NOT EXISTS posicao_fluxo integer;

COMMENT ON COLUMN colunas.slug IS 'Semantic identifier for workflow transitions (e.g. check_in, producao)';
COMMENT ON COLUMN colunas.protegida IS 'Protected columns cannot be deleted or reordered by users';
COMMENT ON COLUMN colunas.posicao_fluxo IS 'Position in the workflow graph (1-8), NULL for custom columns';

-- ===========================================
-- 2. JOBS: Add workflow fields
-- ===========================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS briefing_texto text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS aprovado_interno boolean NOT NULL DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS aprovado_interno_por uuid REFERENCES auth.users(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS checagem_final boolean NOT NULL DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS checagem_final_por uuid REFERENCES auth.users(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS link_entrega_cliente text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS aprovado_cliente boolean NOT NULL DEFAULT false;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS data_aprovacao_cliente timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS revisao_count integer NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS revisao_cliente_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_jobs_assignee ON jobs(assignee_id);

COMMENT ON COLUMN jobs.aprovado_interno IS 'Reviewer (Vidal/Rapha) approved for client delivery';
COMMENT ON COLUMN jobs.checagem_final IS 'Operator (Julia/Dudu) confirmed pre-send check';
COMMENT ON COLUMN jobs.revisao_count IS 'Times job went back from internal review to ajuste';
COMMENT ON COLUMN jobs.revisao_cliente_count IS 'Times job went back from client review to ajuste';

-- ===========================================
-- 3. PROFILES: Add multi-role system
-- ===========================================

-- profiles.cargo already exists as text[] (migration 015 + 019)
-- Add a roles column specifically for workflow permissions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{editor}';

COMMENT ON COLUMN profiles.roles IS 'Workflow roles: admin, operator, editor, reviewer. Users can have multiple.';

-- ===========================================
-- 4. TRANSITION MATRIX
-- ===========================================

CREATE TABLE IF NOT EXISTS transicoes_permitidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coluna_origem_slug text NOT NULL,
  coluna_destino_slug text NOT NULL,
  veto_id text NOT NULL,
  requer_role text[] NOT NULL,
  descricao text,
  UNIQUE(coluna_origem_slug, coluna_destino_slug)
);

ALTER TABLE transicoes_permitidas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON transicoes_permitidas
  FOR SELECT TO authenticated USING (true);

-- Seed: allowed transitions
INSERT INTO transicoes_permitidas (coluna_origem_slug, coluna_destino_slug, veto_id, requer_role, descricao) VALUES
  ('check_in',        'producao',        'VETO-01', '{operator,admin}',           'Briefing completo → inicia producao'),
  ('producao',        'revisao_interna', 'VETO-02', '{editor,admin}',             'Entrega pronta → vai pra revisao'),
  ('revisao_interna', 'pre_envio',       'VETO-03', '{reviewer,admin}',           'Reviewer aprovou → checagem final'),
  ('revisao_interna', 'ajuste',          'VETO-04', '{reviewer,admin}',           'Reviewer pediu ajustes'),
  ('ajuste',          'revisao_interna', 'VETO-05', '{editor,admin}',             'Ajuste feito → re-revisao'),
  ('pre_envio',       'revisao_cliente', 'VETO-06', '{operator,admin}',           'Checagem final OK → envia pro cliente'),
  ('revisao_cliente', 'entregue',        'VETO-07', '{operator,admin}',           'Cliente aprovou'),
  ('revisao_cliente', 'ajuste',          'VETO-08', '{operator,admin}',           'Cliente pediu mudancas'),
  ('entregue',        'arquivo',         'NONE',    '{admin}',                     'Arquivar job finalizado')
ON CONFLICT (coluna_origem_slug, coluna_destino_slug) DO NOTHING;

-- ===========================================
-- 5. AUDIT TRAIL
-- ===========================================

CREATE TABLE IF NOT EXISTS job_transitions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  coluna_origem_slug text NOT NULL,
  coluna_destino_slug text NOT NULL,
  veto_id text,
  executado_por uuid NOT NULL REFERENCES auth.users(id),
  executado_por_nome text,
  veto_bypass boolean NOT NULL DEFAULT false,
  bypass_motivo text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transitions_job ON job_transitions_log(job_id);
CREATE INDEX IF NOT EXISTS idx_transitions_created ON job_transitions_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transitions_user ON job_transitions_log(executado_por);

ALTER TABLE job_transitions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON job_transitions_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON job_transitions_log
  FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE job_transitions_log;

-- ===========================================
-- 6. REVISOES (Revision Classification)
-- ===========================================

CREATE TABLE IF NOT EXISTS revisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  origem text NOT NULL CHECK (origem IN ('CLIENTE', 'E2_CRIATIVO', 'E2_TECNICO', 'BRIEFING_INCOMPLETO')),
  tipo text NOT NULL CHECK (tipo IN ('ESCOPO', 'EXTRA', 'CORRECAO_INTERNA')),
  descricao text NOT NULL,
  registrado_por uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revisoes_job ON revisoes(job_id);
CREATE INDEX IF NOT EXISTS idx_revisoes_tipo ON revisoes(tipo);
CREATE INDEX IF NOT EXISTS idx_revisoes_origem ON revisoes(origem);

ALTER TABLE revisoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON revisoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE revisoes;

COMMENT ON TABLE revisoes IS 'Classification of every revision. Julia/Dudu classify when job goes back from client review.';

-- ===========================================
-- 7. VIEWS: Revision Analytics
-- ===========================================

CREATE OR REPLACE VIEW v_revisao_stats AS
SELECT
  j.id AS job_id,
  j.campanha,
  c.nome AS cliente_nome,
  j.revisao_count,
  j.revisao_cliente_count,
  j.revisao_count + j.revisao_cliente_count AS total_revisoes,
  (SELECT count(*) FROM revisoes r WHERE r.job_id = j.id AND r.tipo = 'EXTRA') AS extras_count,
  (SELECT count(*) FROM revisoes r WHERE r.job_id = j.id AND r.tipo = 'ESCOPO') AS escopo_count,
  (SELECT count(*) FROM revisoes r WHERE r.job_id = j.id AND r.tipo = 'CORRECAO_INTERNA') AS correcao_count
FROM jobs j
LEFT JOIN clientes c ON c.id = j.cliente_id;

CREATE OR REPLACE VIEW v_cliente_rework AS
SELECT
  c.id AS cliente_id,
  c.nome AS cliente_nome,
  count(DISTINCT j.id) AS total_jobs,
  sum(j.revisao_cliente_count) AS total_revisoes_cliente,
  ROUND(AVG(j.revisao_cliente_count)::numeric, 1) AS media_revisoes_por_job,
  (SELECT count(*) FROM revisoes r
   JOIN jobs j2 ON j2.id = r.job_id
   WHERE j2.cliente_id = c.id AND r.tipo = 'EXTRA') AS total_extras,
  (SELECT count(*) FROM revisoes r
   JOIN jobs j2 ON j2.id = r.job_id
   WHERE j2.cliente_id = c.id AND r.origem = 'BRIEFING_INCOMPLETO') AS total_briefing_incompleto
FROM clientes c
LEFT JOIN jobs j ON j.cliente_id = c.id
GROUP BY c.id, c.nome;

-- ===========================================
-- 8. FUNCTION: Validate Transition
-- ===========================================

CREATE OR REPLACE FUNCTION validate_job_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_origem_slug text;
  v_destino_slug text;
  v_transicao RECORD;
  v_user_roles text[];
BEGIN
  -- Skip if column didn't change
  IF OLD.coluna_id = NEW.coluna_id THEN
    RETURN NEW;
  END IF;

  -- Get slugs (NULL = column has no slug = legacy mode, skip validation)
  SELECT slug INTO v_origem_slug FROM colunas WHERE id = OLD.coluna_id;
  SELECT slug INTO v_destino_slug FROM colunas WHERE id = NEW.coluna_id;

  -- GRACEFUL DEGRADATION: if either column has no slug, skip validation
  -- This allows existing ClickTwo columns to work without slugs
  IF v_origem_slug IS NULL OR v_destino_slug IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check transition is allowed
  SELECT * INTO v_transicao
  FROM transicoes_permitidas
  WHERE coluna_origem_slug = v_origem_slug
    AND coluna_destino_slug = v_destino_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transicao nao permitida: % -> %. Consulte o fluxo de trabalho.', v_origem_slug, v_destino_slug
      USING ERRCODE = 'P0001';
  END IF;

  -- Check user role
  SELECT roles INTO v_user_roles FROM profiles WHERE id = auth.uid();
  IF v_user_roles IS NULL THEN
    v_user_roles := '{editor}'; -- default role
  END IF;

  IF NOT (v_user_roles && v_transicao.requer_role) THEN
    RAISE EXCEPTION 'Sem permissao para esta transicao. Requer role: %', array_to_string(v_transicao.requer_role, ', ')
      USING ERRCODE = 'P0002';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validate_job_transition
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION validate_job_transition();

-- ===========================================
-- 9. FUNCTION: Veto Conditions
-- ===========================================

CREATE OR REPLACE FUNCTION check_veto_conditions()
RETURNS TRIGGER AS $$
DECLARE
  v_origem_slug text;
  v_destino_slug text;
  v_missing text[];
  v_has_files boolean;
  v_has_entregas_done boolean;
  v_has_open_comments boolean;
  v_has_reviewer_comments boolean;
  v_has_revisao_record boolean;
BEGIN
  IF OLD.coluna_id = NEW.coluna_id THEN
    RETURN NEW;
  END IF;

  SELECT slug INTO v_origem_slug FROM colunas WHERE id = OLD.coluna_id;
  SELECT slug INTO v_destino_slug FROM colunas WHERE id = NEW.coluna_id;

  -- Skip if no slugs (legacy mode)
  IF v_origem_slug IS NULL OR v_destino_slug IS NULL THEN
    RETURN NEW;
  END IF;

  v_missing := '{}';

  -- ===== VETO-01: CHECK IN → PRODUCAO =====
  IF v_origem_slug = 'check_in' AND v_destino_slug = 'producao' THEN
    IF NEW.cliente_id IS NULL THEN
      v_missing := array_append(v_missing, 'cliente');
    END IF;
    IF NEW.campanha IS NULL OR NEW.campanha = '' THEN
      v_missing := array_append(v_missing, 'campanha');
    END IF;
    IF NEW.tipo_job IS NULL THEN
      v_missing := array_append(v_missing, 'tipo_job');
    END IF;
    IF NEW.data_entrega IS NULL THEN
      v_missing := array_append(v_missing, 'data_entrega');
    END IF;
    IF NEW.assignee_id IS NULL THEN
      v_missing := array_append(v_missing, 'assignee');
    END IF;
    IF NEW.drive_folder_url IS NULL OR NEW.drive_folder_url = '' THEN
      v_missing := array_append(v_missing, 'drive_folder_url');
    END IF;
    -- Check for briefing (file or text)
    SELECT EXISTS(SELECT 1 FROM arquivos WHERE job_id = NEW.id) INTO v_has_files;
    IF NOT v_has_files AND (NEW.briefing_texto IS NULL OR NEW.briefing_texto = '') THEN
      v_missing := array_append(v_missing, 'briefing (arquivo ou texto)');
    END IF;

    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'VETO-01: Job incompleto. Preencha: %', array_to_string(v_missing, ', ')
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO-02: PRODUCAO → REVISAO INTERNA =====
  -- NOTE: With migration 021 (entregas independent flow), individual entregas
  -- have their own status. Job-level move to revisao_interna is now driven
  -- by sync_job_status_from_entregas() trigger. This veto is kept as fallback
  -- for manual job moves (admin override).
  IF v_origem_slug = 'producao' AND v_destino_slug = 'revisao_interna' THEN
    -- Must have at least 1 file
    SELECT EXISTS(SELECT 1 FROM arquivos WHERE job_id = NEW.id) INTO v_has_files;
    IF NOT v_has_files THEN
      v_missing := array_append(v_missing, 'arquivo de entrega');
    END IF;

    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'VETO-02: Entrega incompleta. Resolva: %', array_to_string(v_missing, ', ')
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO-03: REVISAO INTERNA → PRE-ENVIO =====
  IF v_origem_slug = 'revisao_interna' AND v_destino_slug = 'pre_envio' THEN
    IF NOT NEW.aprovado_interno THEN
      v_missing := array_append(v_missing, 'aprovacao do reviewer');
    END IF;
    -- No open comments from reviewer
    SELECT EXISTS(
      SELECT 1 FROM comentarios cm
      JOIN profiles p ON p.id = cm.autor_id
      WHERE cm.job_id = NEW.id AND cm.resolvido = false
        AND p.roles && '{reviewer,admin}'::text[]
    ) INTO v_has_open_comments;
    IF v_has_open_comments THEN
      v_missing := array_append(v_missing, 'comentarios abertos do reviewer');
    END IF;

    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'VETO-03: Revisao interna nao aprovada. Resolva: %', array_to_string(v_missing, ', ')
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO-04: REVISAO INTERNA → AJUSTE =====
  IF v_origem_slug = 'revisao_interna' AND v_destino_slug = 'ajuste' THEN
    SELECT EXISTS(
      SELECT 1 FROM comentarios cm
      JOIN profiles p ON p.id = cm.autor_id
      WHERE cm.job_id = NEW.id
        AND p.roles && '{reviewer,admin}'::text[]
        AND cm.created_at > COALESCE(
          (SELECT MAX(created_at) FROM job_transitions_log
           WHERE job_id = NEW.id AND coluna_destino_slug = 'revisao_interna'),
          '1970-01-01'::timestamptz
        )
    ) INTO v_has_reviewer_comments;
    IF NOT v_has_reviewer_comments THEN
      RAISE EXCEPTION 'VETO-04: Adicione comentarios descrevendo os ajustes necessarios antes de mover.'
        USING ERRCODE = 'P0010';
    END IF;

    -- Reset aprovado_interno for next round
    NEW.aprovado_interno := false;
    NEW.aprovado_interno_por := NULL;
    NEW.revisao_count := COALESCE(NEW.revisao_count, 0) + 1;
  END IF;

  -- ===== VETO-05: AJUSTE → REVISAO INTERNA =====
  IF v_origem_slug = 'ajuste' AND v_destino_slug = 'revisao_interna' THEN
    -- All comments that triggered the ajuste must be resolved
    SELECT EXISTS(
      SELECT 1 FROM comentarios
      WHERE job_id = NEW.id AND resolvido = false
    ) INTO v_has_open_comments;
    IF v_has_open_comments THEN
      RAISE EXCEPTION 'VETO-05: Resolva todos os comentarios pendentes antes de reenviar para revisao.'
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO-06: PRE-ENVIO → REVISAO CLIENTE =====
  IF v_origem_slug = 'pre_envio' AND v_destino_slug = 'revisao_cliente' THEN
    IF NOT NEW.checagem_final THEN
      v_missing := array_append(v_missing, 'checagem final');
    END IF;
    IF NEW.link_entrega_cliente IS NULL OR NEW.link_entrega_cliente = '' THEN
      v_missing := array_append(v_missing, 'link de entrega para o cliente');
    END IF;

    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'VETO-06: Checagem final incompleta. Resolva: %', array_to_string(v_missing, ', ')
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO-07: REVISAO CLIENTE → ENTREGUE =====
  IF v_origem_slug = 'revisao_cliente' AND v_destino_slug = 'entregue' THEN
    IF NOT NEW.aprovado_cliente THEN
      v_missing := array_append(v_missing, 'aprovacao do cliente');
    END IF;
    IF NEW.data_aprovacao_cliente IS NULL THEN
      v_missing := array_append(v_missing, 'data da aprovacao');
    END IF;

    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'VETO-07: Registre a aprovacao do cliente. Falta: %', array_to_string(v_missing, ', ')
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO-08: REVISAO CLIENTE → AJUSTE =====
  IF v_origem_slug = 'revisao_cliente' AND v_destino_slug = 'ajuste' THEN
    -- Must have a revisao record (classified by Julia/Dudu)
    -- This is checked at application level since it requires a separate INSERT
    -- The frontend must create the revisao BEFORE moving the card

    -- Reset flags for new round
    NEW.aprovado_interno := false;
    NEW.aprovado_interno_por := NULL;
    NEW.checagem_final := false;
    NEW.checagem_final_por := NULL;
    NEW.aprovado_cliente := false;
    NEW.data_aprovacao_cliente := NULL;
    NEW.revisao_cliente_count := COALESCE(NEW.revisao_cliente_count, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_veto_conditions
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION check_veto_conditions();

-- ===========================================
-- 10. FUNCTION: Log Transitions
-- ===========================================

CREATE OR REPLACE FUNCTION log_job_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_origem_slug text;
  v_destino_slug text;
  v_nome text;
  v_veto_id text;
BEGIN
  IF OLD.coluna_id = NEW.coluna_id THEN
    RETURN NEW;
  END IF;

  SELECT slug INTO v_origem_slug FROM colunas WHERE id = OLD.coluna_id;
  SELECT slug INTO v_destino_slug FROM colunas WHERE id = NEW.coluna_id;

  -- Skip logging for legacy columns without slugs
  IF v_origem_slug IS NULL OR v_destino_slug IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_nome FROM profiles WHERE id = auth.uid();
  SELECT veto_id INTO v_veto_id FROM transicoes_permitidas
    WHERE coluna_origem_slug = v_origem_slug AND coluna_destino_slug = v_destino_slug;

  INSERT INTO job_transitions_log
    (job_id, coluna_origem_slug, coluna_destino_slug, veto_id, executado_por, executado_por_nome)
  VALUES
    (NEW.id, v_origem_slug, v_destino_slug, v_veto_id, auth.uid(), v_nome);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_job_transition
  AFTER UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION log_job_transition();

-- ===========================================
-- 11. SEED: Workflow columns (update existing)
-- ===========================================

-- Map existing columns to slugs where possible
-- This is idempotent — only updates if slug is NULL
UPDATE colunas SET slug = 'check_in', protegida = true, posicao_fluxo = 1
  WHERE nome ILIKE '%check%in%' AND slug IS NULL;
UPDATE colunas SET slug = 'revisao_interna', protegida = true, posicao_fluxo = 3
  WHERE nome ILIKE '%revis%' AND nome NOT ILIKE '%cliente%' AND slug IS NULL;
UPDATE colunas SET slug = 'revisao_cliente', protegida = true, posicao_fluxo = 6
  WHERE nome ILIKE '%cliente%ag%' AND slug IS NULL;

-- Insert new workflow columns that don't exist yet
INSERT INTO colunas (nome, slug, protegida, posicao_fluxo, posicao, cor)
SELECT * FROM (VALUES
  ('PRODUCAO', 'producao', true, 2, 100, NULL),
  ('AJUSTE', 'ajuste', true, 4, 103, '#F59E0B'),
  ('PRE-ENVIO', 'pre_envio', true, 5, 104, NULL),
  ('ENTREGUE', 'entregue', true, 7, 106, '#22C55E'),
  ('ARQUIVO', 'arquivo', true, 8, 107, '#71717A')
) AS v(nome, slug, protegida, posicao_fluxo, posicao, cor)
WHERE NOT EXISTS (SELECT 1 FROM colunas WHERE slug = v.slug);

-- ===========================================
-- 12. SEED: Default roles for existing team
-- ===========================================

-- Update roles for known team members (by email)
-- This is safe: only sets roles if currently default
UPDATE profiles SET roles = '{admin}'
  WHERE email = 'ph@e2studio.com.br';
UPDATE profiles SET roles = '{admin,operator}'
  WHERE email = 'julia@e2studio.com.br';
UPDATE profiles SET roles = '{admin,editor,reviewer}'
  WHERE email ILIKE '%raphalucas%';
UPDATE profiles SET roles = '{editor,reviewer}'
  WHERE email ILIKE '%vidal%' OR email ILIKE '%diego%';
UPDATE profiles SET roles = '{operator}'
  WHERE email ILIKE '%dudu%';
UPDATE profiles SET roles = '{editor}'
  WHERE email IN ('pedro.freitas@e2studio.com.br', 'jota.della@e2studio.com.br')
    OR email ILIKE '%caio%' OR email ILIKE '%joao%';

-- ===========================================
-- DONE
-- ===========================================

COMMENT ON FUNCTION validate_job_transition IS 'Master gate: blocks any column move not in transicoes_permitidas. Graceful degradation: skips if columns have no slug.';
COMMENT ON FUNCTION check_veto_conditions IS 'Per-transition validation: checks specific conditions for each allowed move (VETO-01 through VETO-08).';
COMMENT ON FUNCTION log_job_transition IS 'Audit trail: logs every column transition with user, timestamp, and veto context.';


-- ============================================
-- MIGRATION: 021_entregas_independent_flow.sql
-- ============================================

-- =====================================================================
-- Migration 021: Entregas com Fluxo Independente (Opcao C)
-- Cada entrega dentro de um job tem seu proprio status no fluxo.
-- O card do job eh o "container", entregas caminham pelo fluxo.
-- Date: 2026-03-16
-- =====================================================================

-- ===========================================
-- 1. ENTREGAS: Add workflow fields
-- ===========================================

ALTER TABLE entregas ADD COLUMN IF NOT EXISTS status_slug text NOT NULL DEFAULT 'check_in';
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id);
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS aprovado_interno boolean NOT NULL DEFAULT false;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS aprovado_interno_por uuid REFERENCES auth.users(id);
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS checagem_final boolean NOT NULL DEFAULT false;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS aprovado_cliente boolean NOT NULL DEFAULT false;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS data_aprovacao_cliente timestamptz;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS link_entrega_cliente text;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS revisao_count integer NOT NULL DEFAULT 0;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS revisao_cliente_count integer NOT NULL DEFAULT 0;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_entregas_status ON entregas(status_slug);
CREATE INDEX IF NOT EXISTS idx_entregas_assignee ON entregas(assignee_id);

COMMENT ON COLUMN entregas.status_slug IS 'Current phase: check_in, producao, revisao_interna, ajuste, pre_envio, revisao_cliente, entregue, arquivo';

-- ===========================================
-- 2. ENTREGA TRANSITIONS LOG
-- ===========================================

CREATE TABLE IF NOT EXISTS entrega_transitions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status_origem text NOT NULL,
  status_destino text NOT NULL,
  veto_id text,
  executado_por uuid NOT NULL REFERENCES auth.users(id),
  executado_por_nome text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entrega_trans_entrega ON entrega_transitions_log(entrega_id);
CREATE INDEX IF NOT EXISTS idx_entrega_trans_job ON entrega_transitions_log(job_id);

ALTER TABLE entrega_transitions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON entrega_transitions_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON entrega_transitions_log
  FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE entrega_transitions_log;

-- ===========================================
-- 3. ENTREGA REVISOES (per-entrega revision tracking)
-- ===========================================

-- Add optional entrega_id to revisoes table (from migration 020)
-- A revisao can be about the whole job OR a specific entrega
ALTER TABLE revisoes ADD COLUMN IF NOT EXISTS entrega_id uuid REFERENCES entregas(id) ON DELETE CASCADE;

-- ===========================================
-- 4. FUNCTION: Validate Entrega Transition
-- ===========================================

CREATE OR REPLACE FUNCTION validate_entrega_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_transicao RECORD;
  v_user_roles text[];
  v_job_id uuid;
  v_has_files boolean;
  v_has_open_comments boolean;
  v_missing text[];
BEGIN
  -- Skip if status didn't change
  IF OLD.status_slug = NEW.status_slug THEN
    RETURN NEW;
  END IF;

  -- Check transition is allowed
  SELECT * INTO v_transicao
  FROM transicoes_permitidas
  WHERE coluna_origem_slug = OLD.status_slug
    AND coluna_destino_slug = NEW.status_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transicao de entrega nao permitida: % -> %', OLD.status_slug, NEW.status_slug
      USING ERRCODE = 'P0001';
  END IF;

  -- Check user role
  SELECT roles INTO v_user_roles FROM profiles WHERE id = auth.uid();
  IF v_user_roles IS NULL THEN
    v_user_roles := '{editor}';
  END IF;

  IF NOT (v_user_roles && v_transicao.requer_role) THEN
    RAISE EXCEPTION 'Sem permissao para mover esta entrega. Requer: %', array_to_string(v_transicao.requer_role, ', ')
      USING ERRCODE = 'P0002';
  END IF;

  v_missing := '{}';

  -- ===== VETO: CHECK IN → PRODUCAO =====
  IF OLD.status_slug = 'check_in' AND NEW.status_slug = 'producao' THEN
    IF NEW.assignee_id IS NULL THEN
      v_missing := array_append(v_missing, 'responsavel da entrega');
    END IF;
    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'Entrega incompleta. Preencha: %', array_to_string(v_missing, ', ')
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO: PRODUCAO → REVISAO INTERNA =====
  IF OLD.status_slug = 'producao' AND NEW.status_slug = 'revisao_interna' THEN
    -- Must have at least 1 file linked to this entrega or to the job
    SELECT EXISTS(
      SELECT 1 FROM arquivos WHERE job_id = NEW.job_id
    ) INTO v_has_files;
    IF NOT v_has_files THEN
      RAISE EXCEPTION 'Anexe pelo menos 1 arquivo antes de enviar pra revisao.'
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO: REVISAO INTERNA → PRE-ENVIO =====
  IF OLD.status_slug = 'revisao_interna' AND NEW.status_slug = 'pre_envio' THEN
    IF NOT NEW.aprovado_interno THEN
      RAISE EXCEPTION 'Reviewer precisa aprovar antes de enviar.'
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO: REVISAO INTERNA → AJUSTE =====
  IF OLD.status_slug = 'revisao_interna' AND NEW.status_slug = 'ajuste' THEN
    NEW.aprovado_interno := false;
    NEW.aprovado_interno_por := NULL;
    NEW.revisao_count := COALESCE(NEW.revisao_count, 0) + 1;
  END IF;

  -- ===== VETO: AJUSTE → REVISAO INTERNA =====
  IF OLD.status_slug = 'ajuste' AND NEW.status_slug = 'revisao_interna' THEN
    -- Comments resolved check happens at job level
    NULL;
  END IF;

  -- ===== VETO: PRE-ENVIO → REVISAO CLIENTE =====
  IF OLD.status_slug = 'pre_envio' AND NEW.status_slug = 'revisao_cliente' THEN
    IF NOT NEW.checagem_final THEN
      v_missing := array_append(v_missing, 'checagem final');
    END IF;
    IF NEW.link_entrega_cliente IS NULL OR NEW.link_entrega_cliente = '' THEN
      v_missing := array_append(v_missing, 'link de entrega');
    END IF;
    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'Checagem incompleta. Falta: %', array_to_string(v_missing, ', ')
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO: REVISAO CLIENTE → ENTREGUE =====
  IF OLD.status_slug = 'revisao_cliente' AND NEW.status_slug = 'entregue' THEN
    IF NOT NEW.aprovado_cliente THEN
      RAISE EXCEPTION 'Registre a aprovacao do cliente.'
        USING ERRCODE = 'P0010';
    END IF;
    NEW.data_aprovacao_cliente := COALESCE(NEW.data_aprovacao_cliente, now());
  END IF;

  -- ===== VETO: REVISAO CLIENTE → AJUSTE =====
  IF OLD.status_slug = 'revisao_cliente' AND NEW.status_slug = 'ajuste' THEN
    NEW.aprovado_interno := false;
    NEW.aprovado_interno_por := NULL;
    NEW.checagem_final := false;
    NEW.aprovado_cliente := false;
    NEW.data_aprovacao_cliente := NULL;
    NEW.revisao_cliente_count := COALESCE(NEW.revisao_cliente_count, 0) + 1;
  END IF;

  -- Update timestamp
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_validate_entrega_transition
  BEFORE UPDATE ON entregas
  FOR EACH ROW
  EXECUTE FUNCTION validate_entrega_transition();

-- ===========================================
-- 5. FUNCTION: Log Entrega Transition
-- ===========================================

CREATE OR REPLACE FUNCTION log_entrega_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_nome text;
  v_veto_id text;
BEGIN
  IF OLD.status_slug = NEW.status_slug THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_nome FROM profiles WHERE id = auth.uid();
  SELECT veto_id INTO v_veto_id FROM transicoes_permitidas
    WHERE coluna_origem_slug = OLD.status_slug AND coluna_destino_slug = NEW.status_slug;

  INSERT INTO entrega_transitions_log
    (entrega_id, job_id, status_origem, status_destino, veto_id, executado_por, executado_por_nome)
  VALUES
    (NEW.id, NEW.job_id, OLD.status_slug, NEW.status_slug, v_veto_id, auth.uid(), v_nome);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_entrega_transition
  AFTER UPDATE ON entregas
  FOR EACH ROW
  EXECUTE FUNCTION log_entrega_transition();

-- ===========================================
-- 6. FUNCTION: Auto-update job status from entregas
-- ===========================================

-- Job card position follows the MOST ADVANCED entrega
-- Job is ENTREGUE only when ALL entregas are ENTREGUE
CREATE OR REPLACE FUNCTION sync_job_status_from_entregas()
RETURNS TRIGGER AS $$
DECLARE
  v_job RECORD;
  v_total integer;
  v_entregues integer;
  v_most_advanced text;
  v_most_advanced_pos integer;
  v_least_advanced text;
  v_least_advanced_pos integer;
  v_target_coluna_id uuid;
  v_status_positions jsonb := '{
    "check_in": 1,
    "producao": 2,
    "revisao_interna": 3,
    "ajuste": 3,
    "pre_envio": 4,
    "revisao_cliente": 5,
    "entregue": 6,
    "arquivo": 7
  }'::jsonb;
BEGIN
  IF OLD.status_slug = NEW.status_slug THEN
    RETURN NEW;
  END IF;

  -- Count entregas
  SELECT count(*), count(*) FILTER (WHERE status_slug = 'entregue')
  INTO v_total, v_entregues
  FROM entregas WHERE job_id = NEW.job_id;

  -- If ALL entregas are entregue, move job to entregue
  IF v_total > 0 AND v_entregues = v_total THEN
    SELECT id INTO v_target_coluna_id FROM colunas WHERE slug = 'entregue';
    IF v_target_coluna_id IS NOT NULL THEN
      UPDATE jobs SET
        coluna_id = v_target_coluna_id,
        aprovado_cliente = true,
        data_aprovacao_cliente = now()
      WHERE id = NEW.job_id
        AND coluna_id != v_target_coluna_id;
    END IF;
  ELSE
    -- Move job to the phase of the least advanced entrega (conservative)
    -- This ensures the job card reflects "where work still needs to happen"
    SELECT e.status_slug INTO v_least_advanced
    FROM entregas e
    WHERE e.job_id = NEW.job_id
      AND e.status_slug != 'entregue'
      AND e.status_slug != 'arquivo'
    ORDER BY (v_status_positions->>e.status_slug)::integer ASC
    LIMIT 1;

    IF v_least_advanced IS NOT NULL THEN
      -- Map entrega status to job column
      -- entregas in producao/ajuste → job stays in producao
      -- entregas in revisao_interna → job moves to revisao_interna
      -- etc.
      DECLARE v_mapped_slug text;
      BEGIN
        v_mapped_slug := CASE v_least_advanced
          WHEN 'ajuste' THEN 'producao' -- ajuste maps to producao for job card
          ELSE v_least_advanced
        END;

        SELECT id INTO v_target_coluna_id FROM colunas WHERE slug = v_mapped_slug;
        IF v_target_coluna_id IS NOT NULL THEN
          UPDATE jobs SET coluna_id = v_target_coluna_id
          WHERE id = NEW.job_id
            AND coluna_id != v_target_coluna_id;
        END IF;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_job_status
  AFTER UPDATE ON entregas
  FOR EACH ROW
  EXECUTE FUNCTION sync_job_status_from_entregas();

-- ===========================================
-- 7. VIEW: Job progress summary
-- ===========================================

CREATE OR REPLACE VIEW v_job_entregas_progress AS
SELECT
  j.id AS job_id,
  j.campanha,
  c.nome AS cliente_nome,
  count(e.id) AS total_entregas,
  count(e.id) FILTER (WHERE e.status_slug = 'entregue') AS entregas_entregues,
  count(e.id) FILTER (WHERE e.status_slug = 'producao') AS entregas_em_producao,
  count(e.id) FILTER (WHERE e.status_slug IN ('revisao_interna', 'pre_envio')) AS entregas_em_revisao,
  count(e.id) FILTER (WHERE e.status_slug = 'ajuste') AS entregas_em_ajuste,
  count(e.id) FILTER (WHERE e.status_slug = 'revisao_cliente') AS entregas_com_cliente,
  CASE
    WHEN count(e.id) = 0 THEN 0
    ELSE ROUND((count(e.id) FILTER (WHERE e.status_slug = 'entregue')::numeric / count(e.id)) * 100)
  END AS progresso_percent
FROM jobs j
LEFT JOIN clientes c ON c.id = j.cliente_id
LEFT JOIN entregas e ON e.job_id = j.id
GROUP BY j.id, j.campanha, c.nome;

-- ===========================================
-- 8. Migrate existing entregas
-- ===========================================

-- Existing entregas that are concluida = true → status 'entregue'
-- Existing entregas that are concluida = false → status 'producao'
UPDATE entregas SET status_slug = 'entregue' WHERE concluida = true AND status_slug = 'check_in';
UPDATE entregas SET status_slug = 'producao' WHERE concluida = false AND status_slug = 'check_in';

-- ===========================================
-- DONE
-- ===========================================

COMMENT ON FUNCTION validate_entrega_transition IS 'Veto system for individual entregas. Same rules as job transitions but at entrega level.';
COMMENT ON FUNCTION sync_job_status_from_entregas IS 'Auto-moves job card based on entrega progress. Job follows least advanced entrega. All entregue = job entregue.';
COMMENT ON VIEW v_job_entregas_progress IS 'Summary of entrega progress per job: total, by status, percentage complete.';


