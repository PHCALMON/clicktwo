import type { Job, Profile } from '@/lib/types'
import { BoardClient } from './_components/board-client'

export default async function BoardPage() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const [colunasRes, jobsRes, clientesRes, membrosRes, userRes] = await Promise.all([
    supabase.from('colunas').select('*').order('posicao'),
    supabase.from('jobs').select('*, cliente:clientes(*), entregas(*)').order('posicao'),
    supabase.from('clientes').select('*').order('nome'),
    supabase.from('profiles').select('id, nome, email, avatar_url, status, status_texto, status_updated_at').order('nome'),
    supabase.auth.getUser(),
  ])

  return (
    <BoardClient
      colunas={colunasRes.data ?? []}
      jobs={(jobsRes.data ?? []) as Job[]}
      clientes={clientesRes.data ?? []}
      membros={(membrosRes.data ?? []) as Profile[]}
      currentUserId={userRes.data?.user?.id ?? ''}
    />
  )
}
