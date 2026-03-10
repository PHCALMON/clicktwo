import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  // Authenticate via shared secret (same pattern as jobs/drive-callback)
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { cliente_id, drive_folder_url } = await request.json()

  if (!cliente_id || !drive_folder_url) {
    return NextResponse.json({ error: 'Missing cliente_id or drive_folder_url' }, { status: 400 })
  }

  // Use service role to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { error: updateError } = await supabase
    .from('clientes')
    .update({ drive_folder_url })
    .eq('id', cliente_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Realtime will propagate the update to the browser automatically
  return NextResponse.json({ ok: true })
}
