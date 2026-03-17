-- NoiseCancel v2 — Seed Data
-- Columns + clients only. Jobs/entregas created by seed-reset.sh after user exists.

-- ===========================================
-- 1. COLUNAS (fases do fluxo v2)
-- ===========================================

DELETE FROM colunas WHERE slug IS NULL OR slug NOT IN (
  'check_in', 'producao', 'revisao_interna', 'ajuste',
  'pre_envio', 'revisao_cliente', 'alteracoes', 'entregue', 'arquivo'
);

INSERT INTO colunas (nome, slug, protegida, posicao_fluxo, posicao, cor) VALUES
  ('CHECK IN',         'check_in',         true, 1, 0, NULL),
  ('PRODUCAO',         'producao',         true, 2, 1, '#3B82F6'),
  ('REVISAO INTERNA',  'revisao_interna',  true, 3, 2, '#8B5CF6'),
  ('AJUSTE',           'ajuste',           true, 4, 3, '#F59E0B'),
  ('PRE-ENVIO',        'pre_envio',        true, 5, 4, '#06B6D4'),
  ('REVISAO CLIENTE',  'revisao_cliente',  true, 6, 5, '#EC4899'),
  ('ALTERACOES',       'alteracoes',       true, 7, 6, '#F97316'),
  ('ENTREGUE',         'entregue',         true, 8, 7, '#22C55E'),
  ('ARQUIVO',          'arquivo',          true, 9, 8, '#71717A')
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  protegida = EXCLUDED.protegida,
  posicao_fluxo = EXCLUDED.posicao_fluxo,
  posicao = EXCLUDED.posicao,
  cor = EXCLUDED.cor;

-- ===========================================
-- 2. CLIENTES
-- ===========================================

INSERT INTO clientes (id, nome, dominio, cor) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Coca Cola', 'cocacola.com.br', '#EF4444'),
  ('c2222222-2222-2222-2222-222222222222', 'Nike', 'nike.com.br', '#3B82F6'),
  ('c3333333-3333-3333-3333-333333333333', 'Natura', 'natura.com.br', '#22C55E')
ON CONFLICT (id) DO NOTHING;
