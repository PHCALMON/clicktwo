import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: entregas, error } = await supabase
    .from('entregas')
    .select('*')
    .eq('job_id', params.id)
    .order('posicao', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(entregas)
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { nome, tag, data_entrega, hora_entrega_cliente, margem_horas } = body

  if (!nome?.trim()) {
    return NextResponse.json({ error: 'Nome is required' }, { status: 400 })
  }

  // Get next position
  const { count } = await supabase
    .from('entregas')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', params.id)

  const { data: entrega, error: insertError } = await supabase
    .from('entregas')
    .insert({
      job_id: params.id,
      nome: nome.trim(),
      tag: tag || null,
      data_entrega: data_entrega || null,
      hora_entrega_cliente: hora_entrega_cliente || null,
      margem_horas: margem_horas !== undefined ? margem_horas : 4,
      posicao: count ?? 0,
    })
    .select('*')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(entrega, { status: 201 })
}

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
  const { entrega_id, concluida, nome, tag, data_entrega, hora_entrega_cliente, margem_horas, produzindo_por, aprovado_interno, aprovado_interno_por } = body

  if (!entrega_id) {
    return NextResponse.json({ error: 'entrega_id required' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (typeof concluida === 'boolean') updateData.concluida = concluida
  if (nome !== undefined) updateData.nome = nome.trim()
  if (tag !== undefined) updateData.tag = tag || null
  if (data_entrega !== undefined) updateData.data_entrega = data_entrega || null
  if (hora_entrega_cliente !== undefined) updateData.hora_entrega_cliente = hora_entrega_cliente || null
  if (margem_horas !== undefined) updateData.margem_horas = margem_horas
  if (produzindo_por !== undefined) updateData.produzindo_por = produzindo_por
  if (typeof aprovado_interno === 'boolean') updateData.aprovado_interno = aprovado_interno
  if (aprovado_interno_por !== undefined) updateData.aprovado_interno_por = aprovado_interno_por

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data: entrega, error: updateError } = await supabase
    .from('entregas')
    .update(updateData)
    .eq('id', entrega_id)
    .eq('job_id', params.id)
    .select('*')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(entrega)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const entregaId = searchParams.get('entrega_id')

  if (!entregaId) {
    return NextResponse.json({ error: 'entrega_id required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('entregas')
    .delete()
    .eq('id', entregaId)
    .eq('job_id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
