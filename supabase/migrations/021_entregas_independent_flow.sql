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
