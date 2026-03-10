-- Migration: Add freela_nome and freela_funcao to jobs
-- When a job is assigned to a freelancer, store their name and role on the card

ALTER TABLE jobs ADD COLUMN freela_nome text;
ALTER TABLE jobs ADD COLUMN freela_funcao text;
