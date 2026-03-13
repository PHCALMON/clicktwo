import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ReorderItem {
  id: string
  coluna_id: string
  posicao: number
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { jobs } = body as { jobs: ReorderItem[] }

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return NextResponse.json({ error: 'jobs array required' }, { status: 400 })
  }

  const results = await Promise.all(
    jobs.map((item) =>
      supabase
        .from('jobs')
        .update({ coluna_id: item.coluna_id, posicao: item.posicao })
        .eq('id', item.id)
    )
  )

  const failed = results.filter((r) => r.error)
  if (failed.length > 0) {
    return NextResponse.json({ error: 'Some updates failed', details: failed.map((f) => f.error?.message) }, { status: 500 })
  }

  return NextResponse.json({ ok: true, updated: jobs.length })
}
