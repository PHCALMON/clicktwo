-- Migration 027: Simplify entrega transition vetos
-- Now that entregas ARE the board cards, vetos should be simpler.
-- Job-level checks (assignee, drive, briefing) stay on job creation.
-- Entrega-level checks focus on the actual deliverable state.

CREATE OR REPLACE FUNCTION validate_entrega_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_transicao RECORD;
  v_user_roles text[];
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

  -- ===== CHECK IN → PRODUCAO =====
  -- No veto — entrega just starts production

  -- ===== PRODUCAO → REVISAO INTERNA =====
  IF OLD.status_slug = 'producao' AND NEW.status_slug = 'revisao_interna' THEN
    IF NOT NEW.concluida THEN
      RAISE EXCEPTION 'Marque a entrega como concluida antes de enviar pra revisao.'
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== REVISAO INTERNA → PRE-ENVIO =====
  IF OLD.status_slug = 'revisao_interna' AND NEW.status_slug = 'pre_envio' THEN
    IF NOT NEW.aprovado_interno THEN
      RAISE EXCEPTION 'Entrega precisa ser aprovada pelo reviewer.'
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== REVISAO INTERNA → AJUSTE =====
  IF OLD.status_slug = 'revisao_interna' AND NEW.status_slug = 'ajuste' THEN
    NEW.aprovado_interno := false;
    NEW.aprovado_interno_por := NULL;
    NEW.revisao_count := COALESCE(NEW.revisao_count, 0) + 1;
  END IF;

  -- ===== PRE-ENVIO → REVISAO CLIENTE =====
  IF OLD.status_slug = 'pre_envio' AND NEW.status_slug = 'revisao_cliente' THEN
    IF NOT NEW.checagem_final THEN
      RAISE EXCEPTION 'Marque a checagem final antes de enviar pro cliente.'
        USING ERRCODE = 'P0010';
    END IF;
    IF NEW.link_entrega_cliente IS NULL OR NEW.link_entrega_cliente = '' THEN
      RAISE EXCEPTION 'Adicione o link de entrega para o cliente.'
        USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- ===== REVISAO CLIENTE → ENTREGUE =====
  IF OLD.status_slug = 'revisao_cliente' AND NEW.status_slug = 'entregue' THEN
    IF NOT NEW.aprovado_cliente THEN
      RAISE EXCEPTION 'Registre a aprovacao do cliente.'
        USING ERRCODE = 'P0010';
    END IF;
    NEW.data_aprovacao_cliente := COALESCE(NEW.data_aprovacao_cliente, now());
  END IF;

  -- ===== REVISAO CLIENTE → ALTERACOES =====
  IF OLD.status_slug = 'revisao_cliente' AND NEW.status_slug = 'alteracoes' THEN
    NEW.aprovado_cliente := false;
    NEW.data_aprovacao_cliente := NULL;
    NEW.revisao_cliente_count := COALESCE(NEW.revisao_cliente_count, 0) + 1;
  END IF;

  -- ===== ALTERACOES → REVISAO CLIENTE =====
  IF OLD.status_slug = 'alteracoes' AND NEW.status_slug = 'revisao_cliente' THEN
    NEW.checagem_final := false;
  END IF;

  -- Update timestamp
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
