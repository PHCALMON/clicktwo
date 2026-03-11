'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tarefa, Profile } from '@/lib/types'

interface TasksPanelContentProps {
  visible: boolean
  onCountChange: (count: number) => void
}

export function TasksPanelContent({ visible, onCountChange }: TasksPanelContentProps) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [membros, setMembros] = useState<Profile[]>([])
  const [activeTab, setActiveTab] = useState<'minhas' | 'criadas'>('minhas')
  const [newTitulo, setNewTitulo] = useState('')
  const [newAtribuido, setNewAtribuido] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  const pendingCount = useMemo(
    () => tarefas.filter((t) => t.atribuido_a === currentUserId && !t.concluida).length,
    [tarefas, currentUserId]
  )

  // Report count
  useEffect(() => {
    onCountChange(pendingCount)
  }, [pendingCount, onCountChange])

  // Load data on mount
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) setCurrentUserId(user.id)

        const [tarefasRes, membrosRes] = await Promise.all([
          fetch('/api/tarefas'),
          fetch('/api/membros'),
        ])
        if (tarefasRes.ok) setTarefas(await tarefasRes.json())
        if (membrosRes.ok) setMembros(await membrosRes.json())
      } catch (err) {
        console.error('[TasksPanel] Load error:', err)
      }
    }
    load()
  }, [])

  // Realtime
  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    const channel = supabase
      .channel('my-tasks')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tarefas' }, (payload) => {
        const t = payload.new as Tarefa
        if (t.criado_por === currentUserId || t.atribuido_a === currentUserId) {
          setTarefas((prev) => prev.some((x) => x.id === t.id) ? prev : [t, ...prev])
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tarefas' }, (payload) => {
        const t = payload.new as Tarefa
        setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...t } : x)))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tarefas' }, (payload) => {
        const old = payload.old as { id: string }
        setTarefas((prev) => prev.filter((x) => x.id !== old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  const toggleConcluida = useCallback(async (id: string, concluida: boolean) => {
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, concluida } : t)))
    await fetch(`/api/tarefas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concluida }),
    })
  }, [])

  const deleteTarefa = useCallback(async (id: string) => {
    setTarefas((prev) => prev.filter((t) => t.id !== id))
    await fetch(`/api/tarefas/${id}`, { method: 'DELETE' })
  }, [])

  const createTarefa = useCallback(async () => {
    if (!newTitulo.trim() || !newAtribuido) return
    const res = await fetch('/api/tarefas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: newTitulo.trim(), atribuido_a: newAtribuido }),
    })
    if (res.ok) {
      const created = await res.json()
      setTarefas((prev) => prev.some((t) => t.id === created.id) ? prev : [created, ...prev])
      setNewTitulo('')
    }
  }, [newTitulo, newAtribuido])

  const filteredTarefas = useMemo(() => {
    if (activeTab === 'minhas') return tarefas.filter((t) => t.atribuido_a === currentUserId)
    return tarefas.filter((t) => t.criado_por === currentUserId)
  }, [tarefas, activeTab, currentUserId])

  const getMemberName = useCallback((id: string) => {
    return membros.find((m) => m.id === id)?.nome?.split(' ')[0] ?? '?'
  }, [membros])

  const getMemberInitial = useCallback((id: string) => {
    return membros.find((m) => m.id === id)?.nome?.charAt(0)?.toUpperCase() ?? '?'
  }, [membros])

  if (!visible) return null

  return (
    <div className="fixed bottom-[60px] right-4 z-40 w-96 bg-bg-elevated border border-border rounded-xl shadow-elevated overflow-hidden">
      {/* Header with tabs */}
      <div className="flex items-center border-b border-border">
        <button
          onClick={() => setActiveTab('minhas')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'minhas' ? 'text-accent border-b-2 border-accent' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Minhas
        </button>
        <button
          onClick={() => setActiveTab('criadas')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'criadas' ? 'text-accent border-b-2 border-accent' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Criadas
        </button>
      </div>

      {/* Tasks list */}
      <div className="max-h-72 overflow-y-auto">
        {filteredTarefas.length === 0 ? (
          <p className="p-4 text-sm text-text-muted text-center">Nenhuma tarefa</p>
        ) : (
          filteredTarefas.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2 px-4 py-2.5 border-b border-border/50 group transition-colors hover:bg-bg-tertiary ${
                t.concluida ? 'opacity-50' : ''
              }`}
            >
              <button
                onClick={() => toggleConcluida(t.id, !t.concluida)}
                className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                  t.concluida ? 'bg-accent border-accent text-bg-primary' : 'border-text-muted hover:border-accent'
                }`}
              >
                {t.concluida && (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${t.concluida ? 'line-through text-text-muted' : 'text-text-primary'}`}>{t.titulo}</p>
                <span className="text-[10px] text-text-muted">
                  {activeTab === 'minhas' ? `de ${getMemberName(t.criado_por)}` : `para ${getMemberName(t.atribuido_a)}`}
                  {' \u00B7 '}{formatTimeAgo(t.created_at)}
                </span>
              </div>
              <span
                className="w-6 h-6 rounded-full bg-bg-tertiary text-text-secondary text-[10px] font-bold flex items-center justify-center shrink-0"
                title={activeTab === 'minhas' ? getMemberName(t.criado_por) : getMemberName(t.atribuido_a)}
              >
                {activeTab === 'minhas' ? getMemberInitial(t.criado_por) : getMemberInitial(t.atribuido_a)}
              </span>
              <button
                onClick={() => deleteTarefa(t.id)}
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all shrink-0"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create form */}
      <div className="border-t border-border p-3 flex items-center gap-2">
        <input
          type="text"
          placeholder="Nova tarefa..."
          value={newTitulo}
          onChange={(e) => setNewTitulo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createTarefa()}
          className="flex-1 bg-bg-primary border border-border rounded-md px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
        />
        <select
          value={newAtribuido}
          onChange={(e) => setNewAtribuido(e.target.value)}
          className="bg-bg-primary border border-border rounded-md px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent max-w-[100px]"
        >
          <option value="">Para...</option>
          {membros.map((m) => (
            <option key={m.id} value={m.id}>{m.nome?.split(' ')[0]}</option>
          ))}
        </select>
        <button
          onClick={createTarefa}
          disabled={!newTitulo.trim() || !newAtribuido}
          className="px-3 py-1.5 bg-accent text-bg-primary text-sm font-semibold rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}
