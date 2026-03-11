import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('tarefas')
    .select('*')
    .or(`criado_por.eq.${user.id},atribuido_a.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { titulo, atribuido_a, data_limite } = body as {
    titulo: string
    atribuido_a: string
    data_limite?: string | null
  }

  if (!titulo?.trim() || !atribuido_a) {
    return NextResponse.json({ error: 'titulo e atribuido_a obrigatorios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tarefas')
    .insert({
      titulo: titulo.trim(),
      criado_por: user.id,
      atribuido_a,
      data_limite: data_limite || null,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
