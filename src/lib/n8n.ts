const isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

function getWebhookBaseUrl(): string | null {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) return null
  // N8N_WEBHOOK_URL is the full URL for WF01b (e.g. https://n8n.../webhook/wf01b-drive)
  // We derive other webhook paths by replacing the path
  const url = new URL(webhookUrl)
  return `${url.origin}/webhook`
}

// --- WF01b: Job Drive folders (existing) ---

interface DriveFolderPayload {
  job_id: string
  cliente_id: string
  cliente_nome: string
  campanha: string
  tipo_job: string
}

export async function triggerDriveFolderCreation(payload: DriveFolderPayload): Promise<void> {
  if (isDemoMode) return

  const base = getWebhookBaseUrl()
  if (!base) {
    console.warn('[n8n] N8N_WEBHOOK_URL not configured, skipping Drive folder creation')
    return
  }

  const url = `${base}/wf01b-clicktwo`
  console.log('[n8n] Triggering Drive folder creation:', url, payload)

  // Fire-and-forget: don't await, don't block the response
  // n8n updates Supabase directly (no callback needed)
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      console.log(`[n8n] WF01b response: ${res.status} ${res.statusText}`)
    })
    .catch((err) => {
      console.error('[n8n] Failed to trigger Drive folder creation:', err)
    })
}

// --- WF01c: Client Drive folder (fire-and-forget) ---

interface ClientFolderPayload {
  cliente_id: string
  cliente_nome: string
}

export async function triggerClientFolderCreation(payload: ClientFolderPayload): Promise<void> {
  if (isDemoMode) return

  const base = getWebhookBaseUrl()
  if (!base) {
    console.warn('[n8n] N8N_WEBHOOK_URL not configured, skipping client folder creation')
    return
  }

  // Fire-and-forget: n8n updates Supabase directly (no callback needed)
  fetch(`${base}/wf01c-client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.error('[n8n] Failed to trigger client folder creation:', err)
  })
}

// --- WF01d: List Drive client folders (synchronous) ---

interface DriveFolderInfo {
  name: string
  folder_id: string
  url: string
}

export async function listDriveClientFolders(year?: number): Promise<DriveFolderInfo[]> {
  if (isDemoMode) return []

  const base = getWebhookBaseUrl()
  if (!base) {
    console.warn('[n8n] N8N_WEBHOOK_URL not configured, skipping Drive folder listing')
    return []
  }

  const res = await fetch(`${base}/wf01d-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year: year ?? new Date().getFullYear() }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`[n8n] WF01d failed: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  return data.folders ?? []
}
