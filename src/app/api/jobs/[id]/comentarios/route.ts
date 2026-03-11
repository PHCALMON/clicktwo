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

  const { data: comentarios, error } = await supabase
    .from('comentarios')
    .select('*, autor:profiles!autor_id(id, nome, email, avatar_url)')
    .eq('job_id', params.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(comentarios)
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
    .select('*, autor:profiles!autor_id(id, nome, email, avatar_url)')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Create notifications for mentioned users
  if (mencoes && mencoes.length > 0) {
    // Get author profile for notification
    const { data: autorProfile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', user.id)
      .single()

    // Get job info for notification context
    const { data: job } = await supabase
      .from('jobs')
      .select('campanha')
      .eq('id', params.id)
      .single()

    const notificacoes = mencoes
      .filter((uid: string) => uid !== user.id) // Don't notify yourself
      .map((uid: string) => ({
        user_id: uid,
        tipo: 'mencao',
        job_id: params.id,
        comentario_id: comentario.id,
        autor_nome: autorProfile?.nome ?? user.email,
        job_campanha: job?.campanha ?? null,
      }))

    if (notificacoes.length > 0) {
      await supabase.from('notificacoes').insert(notificacoes)
    }
  }

  return NextResponse.json(comentario, { status: 201 })
}
