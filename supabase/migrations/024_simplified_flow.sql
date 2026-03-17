-- Migration 024: Add ALTERACOES column + fix transitions
-- AJUSTE = mudancas internas (loop com REVISAO INTERNA)
-- ALTERACOES = mudancas do cliente (loop com REVISAO CLIENTE)
--
-- Flow:
--   CHECK IN → PRODUCAO → REVISAO INTERNA ↔ AJUSTE → PRE-ENVIO → REVISAO CLIENTE ↔ ALTERACOES → ENTREGUE → ARQUIVO

-- ===========================================
-- 1. Add ALTERACOES column
-- ===========================================

INSERT INTO colunas (nome, slug, protegida, posicao_fluxo, posicao, cor)
VALUES ('ALTERACOES', 'alteracoes', true, 7, 6, '#F97316')
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome, protegida = EXCLUDED.protegida,
  posicao_fluxo = EXCLUDED.posicao_fluxo, posicao = EXCLUDED.posicao, cor = EXCLUDED.cor;

-- Fix positions
UPDATE colunas SET posicao_fluxo = 1, posicao = 0 WHERE slug = 'check_in';
UPDATE colunas SET posicao_fluxo = 2, posicao = 1 WHERE slug = 'producao';
UPDATE colunas SET posicao_fluxo = 3, posicao = 2 WHERE slug = 'revisao_interna';
UPDATE colunas SET posicao_fluxo = 4, posicao = 3 WHERE slug = 'ajuste';
UPDATE colunas SET posicao_fluxo = 5, posicao = 4 WHERE slug = 'pre_envio';
UPDATE colunas SET posicao_fluxo = 6, posicao = 5 WHERE slug = 'revisao_cliente';
UPDATE colunas SET posicao_fluxo = 7, posicao = 6 WHERE slug = 'alteracoes';
UPDATE colunas SET posicao_fluxo = 8, posicao = 7 WHERE slug = 'entregue';
UPDATE colunas SET posicao_fluxo = 9, posicao = 8 WHERE slug = 'arquivo';

-- ===========================================
-- 2. Replace all transitions
-- ===========================================

DELETE FROM transicoes_permitidas;

INSERT INTO transicoes_permitidas (coluna_origem_slug, coluna_destino_slug, veto_id, requer_role, descricao) VALUES
  -- Forward flow
  ('check_in',         'producao',         'VETO-01', '{editor,admin}',    'Job completo → iniciar producao'),
  ('producao',         'revisao_interna',  'VETO-02', '{editor,admin}',    'Entrega pronta → enviar pra revisao'),
  ('revisao_interna',  'pre_envio',        'VETO-03', '{reviewer,admin}',  'Reviewer aprovou → checagem final'),
  ('pre_envio',        'revisao_cliente',  'VETO-05', '{operator,admin}',  'Checagem OK → enviar pro cliente'),
  ('revisao_cliente',  'entregue',         'VETO-06', '{operator,admin}',  'Cliente aprovou → entregue'),
  ('entregue',         'arquivo',          'NONE',    '{operator,admin}',  'Arquivar job concluido'),

  -- Internal review loop (REVISAO INTERNA ↔ AJUSTE)
  ('revisao_interna',  'ajuste',           'NONE',    '{reviewer,admin}',  'Revisao reprovou → ajuste interno'),
  ('ajuste',           'revisao_interna',  'NONE',    '{editor,admin}',    'Ajuste feito → re-revisao'),

  -- Client review loop (REVISAO CLIENTE ↔ ALTERACOES)
  ('revisao_cliente',  'alteracoes',       'NONE',    '{operator,admin}',  'Cliente pediu mudanca → alteracoes'),
  ('alteracoes',       'revisao_cliente',  'NONE',    '{editor,admin}',    'Alteracao feita → reenviar pro cliente');

-- ===========================================
-- 3. Simplified veto function
-- ===========================================

CREATE OR REPLACE FUNCTION check_veto_conditions()
RETURNS TRIGGER AS $$
DECLARE
  v_origem_slug text;
  v_destino_slug text;
  v_missing text[];
  v_has_files boolean;
  v_has_entregas_done boolean;
BEGIN
  IF OLD.coluna_id = NEW.coluna_id THEN
    RETURN NEW;
  END IF;

  SELECT slug INTO v_origem_slug FROM colunas WHERE id = OLD.coluna_id;
  SELECT slug INTO v_destino_slug FROM colunas WHERE id = NEW.coluna_id;

  IF v_origem_slug IS NULL OR v_destino_slug IS NULL THEN
    RETURN NEW;
  END IF;

  v_missing := '{}';

  -- ===== VETO-01: CHECK IN → PRODUCAO =====
  IF v_origem_slug = 'check_in' AND v_destino_slug = 'producao' THEN
    IF NEW.cliente_id IS NULL THEN v_missing := array_append(v_missing, 'cliente'); END IF;
    IF NEW.campanha IS NULL OR NEW.campanha = '' THEN v_missing := array_append(v_missing, 'campanha'); END IF;
    IF NEW.tipo_job IS NULL THEN v_missing := array_append(v_missing, 'tipo_job'); END IF;
    IF NEW.data_entrega IS NULL THEN v_missing := array_append(v_missing, 'data_entrega'); END IF;
    IF NEW.assignee_id IS NULL THEN v_missing := array_append(v_missing, 'responsavel'); END IF;
    IF NEW.drive_folder_url IS NULL OR NEW.drive_folder_url = '' THEN v_missing := array_append(v_missing, 'pasta do Drive'); END IF;
    SELECT EXISTS(SELECT 1 FROM arquivos WHERE job_id = NEW.id) INTO v_has_files;
    IF NOT v_has_files AND (NEW.briefing_texto IS NULL OR NEW.briefing_texto = '') THEN
      v_missing := array_append(v_missing, 'briefing (arquivo ou texto)');
    END IF;
    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'VETO-01: Job incompleto. Preencha: %', array_to_string(v_missing, ', ') USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO-02: PRODUCAO → REVISAO INTERNA =====
  IF v_origem_slug = 'producao' AND v_destino_slug = 'revisao_interna' THEN
    SELECT EXISTS(SELECT 1 FROM arquivos WHERE job_id = NEW.id) INTO v_has_files;
    SELECT EXISTS(SELECT 1 FROM entregas WHERE job_id = NEW.id AND concluida = true) INTO v_has_entregas_done;
    IF NOT v_has_files AND NOT v_has_entregas_done THEN
      v_missing := array_append(v_missing, 'arquivo ou entrega concluida');
    END IF;
    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'VETO-02: Entrega incompleta. Resolva: %', array_to_string(v_missing, ', ') USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO-03: REVISAO INTERNA → PRE-ENVIO =====
  IF v_origem_slug = 'revisao_interna' AND v_destino_slug = 'pre_envio' THEN
    IF NOT NEW.aprovado_interno THEN
      v_missing := array_append(v_missing, 'aprovacao do reviewer');
    END IF;
    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'VETO-03: Revisao nao aprovada. Resolva: %', array_to_string(v_missing, ', ') USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== REVISAO INTERNA → AJUSTE (reprove) =====
  IF v_origem_slug = 'revisao_interna' AND v_destino_slug = 'ajuste' THEN
    NEW.aprovado_interno := false;
    NEW.aprovado_interno_por := NULL;
    NEW.revisao_count := COALESCE(NEW.revisao_count, 0) + 1;
  END IF;

  -- ===== VETO-05: PRE-ENVIO → REVISAO CLIENTE =====
  IF v_origem_slug = 'pre_envio' AND v_destino_slug = 'revisao_cliente' THEN
    IF NOT NEW.checagem_final THEN v_missing := array_append(v_missing, 'checagem final'); END IF;
    IF NEW.link_entrega_cliente IS NULL OR NEW.link_entrega_cliente = '' THEN
      v_missing := array_append(v_missing, 'link de entrega para o cliente');
    END IF;
    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'VETO-05: Checagem incompleta. Resolva: %', array_to_string(v_missing, ', ') USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== VETO-06: REVISAO CLIENTE → ENTREGUE =====
  IF v_origem_slug = 'revisao_cliente' AND v_destino_slug = 'entregue' THEN
    IF NOT NEW.aprovado_cliente THEN v_missing := array_append(v_missing, 'aprovacao do cliente'); END IF;
    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'VETO-06: Cliente nao aprovou. Resolva: %', array_to_string(v_missing, ', ') USING ERRCODE = 'P0010';
    END IF;
    NEW.data_aprovacao_cliente := COALESCE(NEW.data_aprovacao_cliente, now());
  END IF;

  -- ===== REVISAO CLIENTE → ALTERACOES =====
  IF v_origem_slug = 'revisao_cliente' AND v_destino_slug = 'alteracoes' THEN
    NEW.aprovado_cliente := false;
    NEW.data_aprovacao_cliente := NULL;
    NEW.revisao_cliente_count := COALESCE(NEW.revisao_cliente_count, 0) + 1;
  END IF;

  -- ===== ALTERACOES → REVISAO CLIENTE =====
  IF v_origem_slug = 'alteracoes' AND v_destino_slug = 'revisao_cliente' THEN
    NEW.checagem_final := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
