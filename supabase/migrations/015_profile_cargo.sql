-- Cargo/badge do membro da equipe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cargo text;

-- Index para queries por cargo
CREATE INDEX IF NOT EXISTS idx_profiles_cargo ON profiles(cargo);
