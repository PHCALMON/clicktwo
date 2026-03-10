import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  // Authenticate via shared secret
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { job_id, drive_folder_url, cliente_id, cliente_drive_folder_url } = await request.json()

  if (!job_id || !drive_folder_url) {
    return NextResponse.json({ error: 'Missing job_id or drive_folder_url' }, { status: 400 })
  }

  // Use service role to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Update job with Drive folder
  const { error: jobError } = await supabase
    .from('jobs')
    .update({ drive_folder_url })
    .eq('id', job_id)

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 })
  }

  // Update client Drive folder (only if not already set or if provided)
  if (cliente_id && cliente_drive_folder_url) {
    await supabase
      .from('clientes')
      .update({ drive_folder_url: cliente_drive_folder_url })
      .eq('id', cliente_id)
      .is('drive_folder_url', null)
  }

  // Realtime will propagate the update to the browser automatically
  return NextResponse.json({ ok: true })
}
