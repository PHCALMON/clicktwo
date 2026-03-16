import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const allowedFields = ['drive_folder_url', 'coluna_id', 'posicao', 'prioridade', 'tags', 'freela_nome', 'freela_funcao', 'data_entrega', 'hora_entrega_cliente', 'margem_horas', 'campanha', 'em_producao_por', 'assignee_id', 'briefing_texto', 'link_entrega_cliente', 'aprovado_interno', 'checagem_final', 'aprovado_cliente']
  const updateData: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) {
      updateData[key] = body[key]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // When setting em_producao_por, clear it from other jobs of the same user
  if (updateData.em_producao_por) {
    const userId = updateData.em_producao_por as string
    await supabase
      .from('jobs')
      .update({ em_producao_por: null })
      .eq('em_producao_por', userId)
      .neq('id', params.id)
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .update(updateData)
    .eq('id', params.id)
    .select('*, cliente:clientes(*)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(job)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
