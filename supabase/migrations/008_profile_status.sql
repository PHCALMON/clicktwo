-- 008: Add status field to profiles for team availability
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'livre'
  CHECK (status IN ('livre', 'estudando', 'producao', 'ajuda', 'ausente'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_updated_at timestamptz NOT NULL DEFAULT now();
