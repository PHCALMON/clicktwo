import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ReorderItem {
  id: string
  status_slug: string
  posicao: number
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { entregas } = body as { entregas: ReorderItem[] }

  if (!Array.isArray(entregas) || entregas.length === 0) {
    return NextResponse.json({ error: 'entregas array required' }, { status: 400 })
  }

  const results = await Promise.all(
    entregas.map((item) =>
      supabase
        .from('entregas')
        .update({ status_slug: item.status_slug, posicao: item.posicao })
        .eq('id', item.id)
    )
  )

  const failed = results.filter((r) => r.error)
  if (failed.length > 0) {
    return NextResponse.json({ error: 'Some updates failed', details: failed.map((f) => f.error?.message) }, { status: 500 })
  }

  return NextResponse.json({ ok: true, updated: entregas.length })
}
