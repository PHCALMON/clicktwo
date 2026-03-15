import type { Cliente } from '@/lib/types'
import { ClientesClient } from './_components/clientes-client'

const isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

const DEMO_CLIENTES: Cliente[] = [
  { id: 'c1', nome: 'Banco XP', dominio: null, cor: '#FF8C00', drive_folder_url: null, created_at: '2026-01-15T10:00:00Z' },
  { id: 'c2', nome: 'Natura', dominio: null, cor: '#14AE5C', drive_folder_url: null, created_at: '2026-01-20T10:00:00Z' },
  { id: 'c3', nome: 'Itaú', dominio: null, cor: '#4A90D9', drive_folder_url: null, created_at: '2026-02-01T10:00:00Z' },
  { id: 'c4', nome: 'Ambev', dominio: null, cor: '#EF4444', drive_folder_url: null, created_at: '2026-02-10T10:00:00Z' },
  { id: 'c5', nome: 'Magazine Luiza', dominio: null, cor: '#E84393', drive_folder_url: null, created_at: '2026-02-15T10:00:00Z' },
]

export default async function ClientesPage() {
  let clientes = DEMO_CLIENTES

  if (!isDemoMode) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data } = await supabase.from('clientes').select('*').order('nome')
    clientes = data ?? DEMO_CLIENTES
  }

  return <ClientesClient initialClientes={clientes} />
}
