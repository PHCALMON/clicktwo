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

    if (notificacoes.length > 0) {
      await supabase.from('notificacoes').insert(notificacoes)
    }
  }

  return NextResponse.json(result, { status: 201 })
}
