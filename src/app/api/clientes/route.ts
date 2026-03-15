import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { triggerClientFolderCreation } from '@/lib/n8n'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nome')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { nome, cor } = body

  if (!nome?.trim()) {
    return NextResponse.json({ error: 'Nome is required' }, { status: 400 })
  }

  const insertData: Record<string, string> = { nome: nome.trim() }
  if (cor?.trim()) insertData.cor = cor.trim()

  const { data: cliente, error: insertError } = await supabase
    .from('clientes')
    .insert(insertData)
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Fire-and-forget: trigger n8n to create Drive folder for this client
  triggerClientFolderCreation({
    cliente_id: cliente.id,
    cliente_nome: cliente.nome,
  })

  return NextResponse.json(cliente, { status: 201 })
}
