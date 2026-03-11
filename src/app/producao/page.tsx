import type { Job } from '@/lib/types'
import { ProducaoClient } from './_components/producao-client'

export default async function ProducaoPage() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const [colunasRes, jobsRes, clientesRes] = await Promise.all([
    supabase.from('colunas').select('*').order('posicao'),
    supabase.from('jobs').select('*, cliente:clientes(*)').order('created_at', { ascending: false }),
    supabase.from('clientes').select('*').order('nome'),
  ])

  const colunas = colunasRes.data ?? []
  const jobs = (jobsRes.data ?? []) as Job[]
  const clientes = clientesRes.data ?? []

  return <ProducaoClient colunas={colunas} jobs={jobs} clientes={clientes} />
}
