'use client'

import { useState, useCallback, useMemo } from 'react'
import type { Coluna, Job, Cliente, TagJob, Prioridade } from '@/lib/types'
import { useRealtime } from '@/lib/hooks/use-realtime'
import { KanbanBoard } from './kanban-board'
import { JobListView } from './job-list-view'
import { NewJobModal } from './new-job-modal'
import { JobDetailModal } from './job-detail-modal'

interface BoardClientProps {
  colunas: Coluna[]
  jobs: Job[]
  clientes: Cliente[]
}

export function BoardClient({ colunas: initialColunas, jobs: initialJobs, clientes: initialClientes }: BoardClientProps) {
  const [colunas, setColunas] = useState<Coluna[]>(initialColunas)
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [clientesList, setClientesList] = useState<Cliente[]>(initialClientes)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showNewJob, setShowNewJob] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null)

  const filteredJobs = useMemo(() => {
    if (!selectedClienteId) return jobs
    return jobs.filter((j) => j.cliente_id === selectedClienteId)
  }, [jobs, selectedClienteId])

  // Realtime: auto-sync when Supabase is connected
  const realtimeCallbacks = useMemo(() => ({
    onJobChange: (payload: { eventType: string; new: Job; old: Job }) => {
      console.log('[Realtime] Job event:', payload.eventType, payload.new?.id, 'drive_folder_url:', payload.new?.drive_folder_url)
      if (payload.eventType === 'INSERT') {
        // Realtime doesn't include joins — attach cliente from local list
        const jobWithCliente = {
          ...payload.new,
          cliente: undefined as Cliente | undefined,
        }
        setClientesList((prev) => {
          jobWithCliente.cliente = prev.find((c) => c.id === payload.new.cliente_id)
          return prev
        })
        setJobs((prev) => {
          // Deduplicate: skip if already in state
          if (prev.some((j) => j.id === payload.new.id)) return prev
          return [...prev, jobWithCliente]
        })
      } else if (payload.eventType === 'UPDATE') {
        setJobs((prev) => prev.map((j) => (j.id === payload.new.id ? { ...j, ...payload.new, cliente: j.cliente } : j)))
      } else if (payload.eventType === 'DELETE') {
        setJobs((prev) => prev.filter((j) => j.id !== payload.old.id))
      }
    },
    onClienteChange: (payload: { eventType: string; new: Cliente; old: Cliente }) => {
      if (payload.eventType === 'INSERT') {
        setClientesList((prev) => [...prev, payload.new].sort((a, b) => a.nome.localeCompare(b.nome)))
      } else if (payload.eventType === 'UPDATE') {
        setClientesList((prev) => prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c)))
      } else if (payload.eventType === 'DELETE') {
        setClientesList((prev) => prev.filter((c) => c.id !== payload.old.id))
      }
    },
  }), [])

  useRealtime(realtimeCallbacks)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleJobMove = useCallback((jobId: string, newColunaId: string, newPosicao: number) => {
    // TODO: call Supabase to persist the move
  }, [])

  const handleJobsReorder = useCallback((updatedJobs: Job[]) => {
    setJobs(updatedJobs)
  }, [])

  const isDemoMode = typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

  const handleNewJob = useCallback(async (jobData: Partial<Job>) => {
    if (isDemoMode) {
      const newJob: Job = {
        id: `j${Date.now()}`,
        cliente_id: jobData.cliente_id ?? '',
        campanha: jobData.campanha ?? '',
        tipo_job: jobData.tipo_job ?? 'publicidade',
        coluna_id: jobData.coluna_id ?? colunas[0]?.id ?? '',
        posicao: jobs.filter((j) => j.coluna_id === jobData.coluna_id).length,
        data_entrega: jobData.data_entrega ?? null,
        prioridade: jobData.prioridade ?? 'normal',
        tags: jobData.tags ?? [],
        drive_folder_url: null,
        freela_nome: null,
        freela_funcao: null,
        created_at: new Date().toISOString(),
        created_by: 'demo',
        cliente: clientesList.find((c) => c.id === jobData.cliente_id),
      }
      setJobs((prev) => [...prev, newJob])
    } else {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      })
      if (res.ok) {
        // Add immediately from API response (Realtime INSERT will be deduplicated)
        const created = await res.json()
        setJobs((prev) => {
          if (prev.some((j) => j.id === created.id)) return prev
          return [...prev, created]
        })
      } else {
        console.error('Failed to create job:', await res.text())
      }
    }
    setShowNewJob(false)
  }, [isDemoMode, colunas, jobs, clientesList])

  const handleJobClick = useCallback((job: Job) => {
    setSelectedJob(job)
  }, [])

  const handleJobUpdate = useCallback((updatedJob: Job) => {
    setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)))
    setSelectedJob(updatedJob)
  }, [])

  const handleTagsChange = useCallback((jobId: string, tags: TagJob[]) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, tags } : j)))
  }, [])

  const handlePriorityChange = useCallback((jobId: string, prioridade: Prioridade) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, prioridade } : j)))
  }, [])

  const handleDeleteJob = useCallback(async (jobId: string) => {
    if (isDemoMode) {
      setJobs((prev) => prev.filter((j) => j.id !== jobId))
    } else {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' })
      if (!res.ok) {
        console.error('Failed to delete job:', await res.text())
      }
    }
    setSelectedJob(null)
  }, [isDemoMode])

  const handleAddColumn = useCallback((nome: string, cor: string | null) => {
    const maxPos = Math.max(...colunas.map((c) => c.posicao), -1)
    const newColuna: Coluna = {
      id: `col-${Date.now()}`,
      nome: nome.toUpperCase(),
      cor,
      posicao: maxPos + 1,
      created_at: new Date().toISOString(),
    }
    setColunas((prev) => [...prev, newColuna])
  }, [colunas])

  return (
    <>
      <div className="flex items-center justify-between px-6 pt-5 pb-2">
        <h2 className="text-xl font-bold text-text-primary">Board</h2>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-bg-elevated border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-accent text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Kanban"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="12" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title="Lista"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => setShowNewJob(true)}
            className="px-4 py-2 bg-accent text-bg-primary text-sm font-semibold rounded-md hover:bg-accent-hover transition-colors"
          >
            + Novo Job
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar de Clientes */}
        <aside className="w-48 shrink-0 border-r border-border bg-bg-secondary overflow-y-auto px-2 py-3 shadow-card">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mb-2">Clientes</h3>
          <button
            onClick={() => setSelectedClienteId(null)}
            className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
              selectedClienteId === null
                ? 'bg-accent/15 text-accent font-semibold'
                : 'text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            Todos
          </button>
          {clientesList.map((cliente) => (
            <div key={cliente.id} className="flex items-center gap-1">
              <button
                onClick={() => setSelectedClienteId(cliente.id)}
                className={`flex-1 text-left text-sm px-2 py-1.5 rounded-md transition-colors truncate ${
                  selectedClienteId === cliente.id
                    ? 'bg-accent/15 text-accent font-semibold'
                    : 'text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                {cliente.nome}
              </button>
              {cliente.drive_folder_url && (
                <a
                  href={cliente.drive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir pasta no Drive"
                  className="shrink-0 p-1 text-text-secondary hover:text-accent transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </aside>

        {/* Board or List */}
        {viewMode === 'kanban' ? (
          <div className="flex-1 overflow-x-auto">
            <KanbanBoard
              colunas={colunas}
              jobs={filteredJobs}
              onJobMove={handleJobMove}
              onJobsReorder={handleJobsReorder}
              onJobClick={handleJobClick}
              onTagsChange={handleTagsChange}
              onPriorityChange={handlePriorityChange}
              onAddColumn={handleAddColumn}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <JobListView
              colunas={colunas}
              jobs={filteredJobs}
              onJobClick={handleJobClick}
            />
          </div>
        )}
      </div>

      {showNewJob && (
        <NewJobModal
          colunas={colunas}
          clientes={clientesList}
          onClose={() => setShowNewJob(false)}
          onSubmit={handleNewJob}
          onNewCliente={async (nome: string) => {
            const res = await fetch('/api/clientes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nome }),
            })
            if (!res.ok) return null
            const created = await res.json()
            setClientesList((prev) => [...prev, created].sort((a, b) => a.nome.localeCompare(b.nome)))
            return created as Cliente
          }}
        />
      )}

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          colunas={colunas}
          onClose={() => setSelectedJob(null)}
          onUpdate={handleJobUpdate}
          onDelete={handleDeleteJob}
        />
      )}
    </>
  )
}
