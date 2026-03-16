import { redirect } from 'next/navigation'
import { EquipeClient } from './_components/equipe-client'

const ADMIN_EMAILS = ['ph@e2studio.com.br', 'e2@e2studio.com.br']

export default async function EquipePage() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect('/home')
  }

  const { data: membros } = await supabase
    .from('profiles')
    .select('id, nome, email, avatar_url, status, status_texto, status_updated_at, cargo, personalidade, created_at')
    .order('nome')

  return <EquipeClient membros={membros ?? []} />
}
