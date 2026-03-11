import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { nome, drive_folder_url } = body

  if (!nome?.trim()) {
    return NextResponse.json({ error: 'Nome is required' }, { status: 400 })
  }

  const updateData: { nome: string; drive_folder_url?: string | null } = { nome: nome.trim() }
  if (drive_folder_url !== undefined) {
    updateData.drive_folder_url = drive_folder_url?.trim() || null
  }

  const { data: cliente, error: updateError } = await supabase
    .from('clientes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(cliente)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Check if client has linked jobs
  const { count } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cliente tem ${count} job(s) vinculado(s). Remova os jobs antes de excluir.` },
      { status: 409 },
    )
  }

  const { error: deleteError } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
