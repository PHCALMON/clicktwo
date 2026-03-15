import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PersonalidadeResult } from '@/lib/types'

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as PersonalidadeResult

  if (!body.tipo || !body.arquetipo || !body.categoria || !body.scores) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ personalidade: body })
    .eq('id', user.id)
    .select('id, nome, email, avatar_url, status, status_texto, status_updated_at, cargo, personalidade')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
