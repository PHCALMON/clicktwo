-- Migration 025: VETO-03 checks entregas approval instead of job-level flag
-- revisao_interna → pre_envio requires ALL entregas aprovado_interno = true

CREATE OR REPLACE FUNCTION check_veto_conditions()
RETURNS TRIGGER AS $$
DECLARE
  v_origem_slug text;
  v_destino_slug text;
  v_missing text[];
  v_has_files boolean;
  v_has_entregas_done boolean;
  v_total_entregas integer;
  v_entregas_aprovadas integer;
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
  -- All entregas must be approved by reviewer
  IF v_origem_slug = 'revisao_interna' AND v_destino_slug = 'pre_envio' THEN
    SELECT count(*), count(*) FILTER (WHERE aprovado_interno = true)
    INTO v_total_entregas, v_entregas_aprovadas
    FROM entregas WHERE job_id = NEW.id;

    IF v_total_entregas = 0 THEN
      v_missing := array_append(v_missing, 'pelo menos 1 entrega');
    ELSIF v_entregas_aprovadas < v_total_entregas THEN
      v_missing := array_append(v_missing, v_entregas_aprovadas || '/' || v_total_entregas || ' entregas aprovadas (faltam ' || (v_total_entregas - v_entregas_aprovadas) || ')');
    END IF;
    IF array_length(v_missing, 1) > 0 THEN
      RAISE EXCEPTION 'VETO-03: Revisao incompleta. %', array_to_string(v_missing, ', ') USING ERRCODE = 'P0010';
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
