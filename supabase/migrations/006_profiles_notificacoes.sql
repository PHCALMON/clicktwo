-- ClickTwo v6 — Profiles + Notificacoes (Mentions)

-- Profiles: lightweight mirror of auth.users for team member listing
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'mencao',
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  comentario_id uuid REFERENCES comentarios(id) ON DELETE CASCADE,
  autor_nome text,
  job_campanha text,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own_notificacoes" ON notificacoes
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_notificacoes_user ON notificacoes(user_id, lida);
CREATE INDEX idx_notificacoes_created ON notificacoes(created_at DESC);

-- Add mencoes field to comentarios
ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS mencoes uuid[] DEFAULT '{}';

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
