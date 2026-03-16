import { redirect } from 'next/navigation'
import { SquadTestClient } from './_components/squad-test-client'

const ADMIN_EMAILS = ['ph@e2studio.com.br', 'e2@e2studio.com.br']

export default async function SquadTestPage() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect('/home')
  }

  const { data: membros } = await supabase
    .from('profiles')
    .select('id, nome, email, avatar_url, cargo, personalidade, status, status_texto, status_updated_at, created_at')
    .order('nome')

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, cliente:clientes(*), entregas(*)')
    .order('posicao')

  return <SquadTestClient membros={membros ?? []} jobs={jobs ?? []} />
}
