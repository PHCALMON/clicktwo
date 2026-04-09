import { ClientesClient } from './_components/clientes-client'

export default async function ClientesPage() {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data } = await supabase.from('clientes').select('*').order('nome')

  return <ClientesClient initialClientes={data ?? []} />
}
