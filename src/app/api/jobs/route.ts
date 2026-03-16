import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { triggerDriveFolderCreation } from '@/lib/n8n'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { cliente_id, campanha, tipo_job, coluna_id, data_entrega, hora_entrega_cliente, margem_horas, prioridade, tags } = body

  if (!cliente_id || !campanha || !tipo_job || !coluna_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get max position in target column
  const { data: maxPosData } = await supabase
    .from('jobs')
    .select('posicao')
    .eq('coluna_id', coluna_id)
    .order('posicao', { ascending: false })
    .limit(1)

  const nextPosicao = (maxPosData?.[0]?.posicao ?? -1) + 1

  const { data: job, error: insertError } = await supabase
    .from('jobs')
    .insert({
      cliente_id,
      campanha,
      tipo_job,
      coluna_id,
      posicao: nextPosicao,
      data_entrega: data_entrega || null,
      hora_entrega_cliente: hora_entrega_cliente || null,
      margem_horas: margem_horas !== undefined ? margem_horas : 4,
      prioridade: prioridade || 'normal',
      tags: tags || [],
      created_by: user.id,
    })
    .select('*, cliente:clientes(*)')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Fire-and-forget: trigger n8n to create Drive folders
  const clienteNome = job.cliente?.nome ?? ''
  triggerDriveFolderCreation({
    job_id: job.id,
    cliente_id: job.cliente_id,
    cliente_nome: clienteNome,
    campanha: job.campanha,
    tipo_job: job.tipo_job,
  })

  return NextResponse.json(job, { status: 201 })
}
