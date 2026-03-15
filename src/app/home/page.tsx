import type { Job, Profile } from '@/lib/types'
import { HomeClient } from './_components/home-client'

const isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

export default async function HomePage() {
  let jobs: Job[] = []
  let membros: Profile[] = []
  let currentUser: Profile | null = null

  if (!isDemoMode) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const [jobsRes, membrosRes, userRes] = await Promise.all([
      supabase.from('jobs').select('*, cliente:clientes(*), entregas(*)').order('posicao'),
      supabase.from('profiles').select('id, nome, email, avatar_url, status, status_texto, status_updated_at, cargo').order('nome'),
      supabase.auth.getUser(),
    ])

    jobs = (jobsRes.data ?? []) as Job[]
    membros = (membrosRes.data ?? []) as Profile[]
    const userId = userRes.data?.user?.id ?? ''
    currentUser = membros.find((m) => m.id === userId) ?? null
  } else {
    currentUser = {
      id: 'demo',
      nome: 'Pedro',
      email: 'pedro@e2.com',
      avatar_url: null,
      status: 'livre',
      status_texto: null,
      status_updated_at: new Date().toISOString(),
      cargo: null,
      personalidade: null,
      created_at: new Date().toISOString(),
    }
  }

  return <HomeClient jobs={jobs} membros={membros} currentUser={currentUser} />
}
