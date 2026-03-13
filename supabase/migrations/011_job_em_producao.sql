-- Feature: "Em Producao" indicator per member
-- Each member can mark ONE job as actively being worked on
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS em_producao_por uuid REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_jobs_em_producao ON jobs(em_producao_por);
