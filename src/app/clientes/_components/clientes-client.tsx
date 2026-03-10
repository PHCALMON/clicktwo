'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Cliente } from '@/lib/types'
import { useRealtime } from '@/lib/hooks/use-realtime'

interface ClientesClientProps {
  initialClientes: Cliente[]
}

const isDemoMode = typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

export function ClientesClient({ initialClientes }: ClientesClientProps) {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>(initialClientes)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  // Realtime: auto-sync when clientes change in Supabase
  const realtimeCallbacks = useMemo(() => ({
    onClienteChange: (payload: { eventType: string; new: Cliente; old: Cliente }) => {
      if (payload.eventType === 'INSERT') {
        setClientes((prev) => [...prev, payload.new].sort((a, b) => a.nome.localeCompare(b.nome)))
      } else if (payload.eventType === 'UPDATE') {
        setClientes((prev) => prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c)))
      } else if (payload.eventType === 'DELETE') {
        setClientes((prev) => prev.filter((c) => c.id !== payload.old.id))
      }
    },
  }), [])

  useRealtime(realtimeCallbacks)

  function handleAdd() {
    setEditingId(null)
    setNome('')
    setError(null)
    setShowForm(true)
  }

  function handleEdit(cliente: Cliente) {
    setEditingId(cliente.id)
    setNome(cliente.nome)
    setError(null)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return

    if (isDemoMode) {
      if (editingId) {
        setClientes((prev) =>
          prev.map((c) => (c.id === editingId ? { ...c, nome: nome.trim() } : c))
        )
      } else {
        const newCliente: Cliente = {
          id: `c${Date.now()}`,
          nome: nome.trim(),
          drive_folder_url: null,
          created_at: new Date().toISOString(),
        }
        setClientes((prev) => [...prev, newCliente].sort((a, b) => a.nome.localeCompare(b.nome)))
      }
      setShowForm(false)
      setNome('')
      setEditingId(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      if (editingId) {
        const res = await fetch(`/api/clientes/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: nome.trim() }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Erro ao editar cliente')
          return
        }
        const updated = await res.json()
        setClientes((prev) =>
          prev.map((c) => (c.id === editingId ? updated : c)).sort((a, b) => a.nome.localeCompare(b.nome))
        )
      } else {
        const res = await fetch('/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: nome.trim() }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Erro ao criar cliente')
          return
        }
        const created = await res.json()
        setClientes((prev) => [...prev, created].sort((a, b) => a.nome.localeCompare(b.nome)))
      }
      setShowForm(false)
      setNome('')
      setEditingId(null)
      router.refresh()
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  function handleCancel() {
    setShowForm(false)
    setNome('')
    setEditingId(null)
    setError(null)
  }

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncResult(null)
    setError(null)
    try {
      const res = await fetch('/api/sync/drive-clients', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erro ao sincronizar')
        return
      }
      const result = await res.json()
      setSyncResult(
        `${result.new_clients} novo(s), ${result.already_exists} existente(s), ${result.folders_found} pasta(s) no Drive`
      )
      router.refresh()
    } catch {
      setError('Erro de conexão ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }, [router])

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary">Clientes</h2>
        <div className="flex gap-2">
          {!isDemoMode && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 text-sm font-semibold rounded-md border border-border text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors disabled:opacity-50"
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar Drive'}
            </button>
          )}
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-accent text-bg-primary text-sm font-semibold rounded-md hover:bg-accent-hover transition-colors"
          >
            + Novo Cliente
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-md text-sm text-accent">
          {syncResult}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-bg-elevated border border-border rounded-lg">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {editingId ? 'Editar Cliente' : 'Novo Cliente'}
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do cliente..."
              autoFocus
              required
              className="flex-1 px-3 py-2 bg-bg-card border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-accent text-bg-primary text-sm font-semibold rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {loading ? '...' : editingId ? 'Salvar' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-1">
        {clientes.length === 0 && (
          <p className="text-sm text-text-muted py-8 text-center">Nenhum cliente cadastrado.</p>
        )}
        {clientes.map((cliente) => (
          <div
            key={cliente.id}
            className="flex items-center justify-between px-4 py-3 bg-bg-card border border-border rounded-md shadow-card hover:shadow-card-hover hover:border-border-hover hover:-translate-y-px transition-all duration-150 group"
          >
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">{cliente.nome}</p>
                <p className="text-xs text-text-muted">
                  Desde {new Date(cliente.created_at).toLocaleDateString('pt-BR', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {cliente.drive_folder_url && (
                <a
                  href={cliente.drive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                  title="Abrir pasta no Drive"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  Drive
                </a>
              )}
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleEdit(cliente)}
                className="text-xs text-text-secondary hover:text-accent transition-colors"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
