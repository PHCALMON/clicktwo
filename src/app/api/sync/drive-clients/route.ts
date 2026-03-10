import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listDriveClientFolders } from '@/lib/n8n'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Optional: accept year from body
  let year: number | undefined
  try {
    const body = await request.json().catch(() => ({}))
    if (body.year) year = body.year
  } catch {
    // no body, use default (current year)
  }

  // 1. Get folders from Drive via n8n (synchronous call)
  let folders
  try {
    folders = await listDriveClientFolders(year)
  } catch (err) {
    return NextResponse.json(
      { error: `Falha ao listar pastas do Drive: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 502 },
    )
  }

  if (!folders.length) {
    return NextResponse.json({
      synced: 0,
      already_exists: 0,
      folders_found: 0,
      new_clients: 0,
    })
  }

  // 2. Get existing clients from Supabase
  const { data: existingClientes, error: fetchError } = await supabase
    .from('clientes')
    .select('id, nome, drive_folder_url')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  // 3. Diff by name (case-insensitive, trimmed)
  const existingMap = new Map(
    (existingClientes ?? []).map((c) => [c.nome.trim().toLowerCase(), c])
  )

  let newClients = 0
  let alreadyExists = 0
  let synced = 0

  for (const folder of folders) {
    const normalizedName = folder.name.trim().toLowerCase()
    const existing = existingMap.get(normalizedName)

    if (existing) {
      alreadyExists++
      // Update drive_folder_url if not set
      if (!existing.drive_folder_url && folder.url) {
        await supabase
          .from('clientes')
          .update({ drive_folder_url: folder.url })
          .eq('id', existing.id)
        synced++
      }
    } else {
      // Insert new client with drive_folder_url
      const { error: insertError } = await supabase
        .from('clientes')
        .insert({
          nome: folder.name.trim(),
          drive_folder_url: folder.url || null,
        })

      if (!insertError) {
        newClients++
        synced++
      }
    }
  }

  return NextResponse.json({
    synced,
    already_exists: alreadyExists,
    folders_found: folders.length,
    new_clients: newClients,
  })
}
