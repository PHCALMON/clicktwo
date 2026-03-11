import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { StatusMembro } from '@/lib/types'

const VALID_STATUSES: StatusMembro[] = ['livre', 'estudando', 'producao', 'ajuda', 'ausente']

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { status } = body as { status: StatusMembro }

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Status invalido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ status, status_updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('id, nome, email, avatar_url, status, status_updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
