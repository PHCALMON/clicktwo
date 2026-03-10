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
