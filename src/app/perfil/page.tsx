import { PerfilClient } from './_components/perfil-client'

export default async function PerfilPage() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nome, email, avatar_url, status, status_texto, status_updated_at, cargo, personalidade, created_at')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return <PerfilClient profile={profile} />
}
