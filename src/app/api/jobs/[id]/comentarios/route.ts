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

  // Fetch comments
  const { data: comentarios, error } = await supabase
    .from('comentarios')
    .select('*')
    .eq('job_id', params.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch profiles for all unique autor_ids
  const autorIds = Array.from(new Set(comentarios.map((c: { autor_id: string }) => c.autor_id)))
  let profilesMap: Record<string, { id: string; nome: string; email: string; avatar_url: string | null }> = {}

  if (autorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome, email, avatar_url')
      .in('id', autorIds)

    if (profiles) {
      profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
    }
  }

  // Attach autor to each comment
  const result = comentarios.map((c: { autor_id: string }) => ({
    ...c,
    autor: profilesMap[c.autor_id] ?? null,
  }))

  return NextResponse.json(result)
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
  const { texto, mencoes } = body

  if (!texto?.trim()) {
    return NextResponse.json({ error: 'Texto is required' }, { status: 400 })
  }

  // Insert comment
  const { data: comentario, error: insertError } = await supabase
    .from('comentarios')
    .insert({
      job_id: params.id,
      autor_id: user.id,
      texto: texto.trim(),
      mencoes: mencoes || [],
    })
    .select('*')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Attach autor profile
  const { data: autorProfile } = await supabase
    .from('profiles')
    .select('id, nome, email, avatar_url')
    .eq('id', user.id)
    .single()

  const result = { ...comentario, autor: autorProfile }

  // Create notifications for mentioned users
  console.log('[comentarios] mencoes recebidas:', mencoes, '| autor:', user.id)

  if (mencoes && mencoes.length > 0) {
    const { data: job } = await supabase
      .from('jobs')
      .select('campanha')
      .eq('id', params.id)
      .single()

    const notificacoes = mencoes
      .filter((uid: string) => uid !== user.id)
      .map((uid: string) => ({
        user_id: uid,
        tipo: 'mencao',
        job_id: params.id,
        comentario_id: comentario.id,
        autor_nome: autorProfile?.nome ?? user.email,
        job_campanha: job?.campanha ?? null,
      }))

    console.log('[comentarios] notificacoes a inserir:', JSON.stringify(notificacoes))

    if (notificacoes.length > 0) {
      const { data: notifData, error: notifError } = await supabase.from('notificacoes').insert(notificacoes).select()
      if (notifError) {
        console.error('[comentarios] ERRO ao criar notificacoes:', notifError.message, notifError.details, notifError.hint)
      } else {
        console.log('[comentarios] Notificacoes criadas OK:', notifData?.length)
      }
    } else {
      console.log('[comentarios] Nenhuma notificacao (auto-mencao filtrada)')
    }
  } else {
    console.log('[comentarios] Sem mencoes no body')
  }

  return NextResponse.json(result, { status: 201 })
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
  const { comentario_id, resolvido } = body

  if (!comentario_id || typeof resolvido !== 'boolean') {
    return NextResponse.json({ error: 'comentario_id and resolvido required' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('comentarios')
    .update({ resolvido })
    .eq('id', comentario_id)
    .eq('job_id', params.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
