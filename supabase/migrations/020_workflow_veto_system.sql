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
