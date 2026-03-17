-- Migration 026: Make executado_por nullable in log tables
-- Prevents trigger failure when auth.uid() is null (service role, system operations)

ALTER TABLE job_transitions_log ALTER COLUMN executado_por DROP NOT NULL;
ALTER TABLE entrega_transitions_log ALTER COLUMN executado_por DROP NOT NULL;
