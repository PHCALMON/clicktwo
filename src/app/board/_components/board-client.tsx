'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { Coluna, Job, Cliente, TagJob, Profile, StatusMembro } from '@/lib/types'
import { useRealtime } from '@/lib/hooks/use-realtime'
import { ClientLogo } from '@/components/ui/client-logo'
import { KanbanBoard } from './kanban-board'
import { JobListView } from './job-list-view'
import { NewJobModal } from './new-job-modal'
import { JobDetailModal } from './job-detail-modal'
import { TeamStatusBar } from './team-status-bar'

interface BoardClientProps {
  colunas: Coluna[]
  jobs: Job[]
  clientes: Cliente[]
  membros: Profile[]
  currentUserId: string
}

export function BoardClient({ colunas: initialColunas, jobs: initialJobs, clientes: initialClientes, membros: initialMembros, currentUserId }: BoardClientProps) {
  const [colunas, setColunas] = useState<Coluna[]>(initialColunas)
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [clientesList, setClientesList] = useState<Cliente[]>(initialClientes)
  const [membrosList, setMembrosList] = useState<Profile[]>(initialMembros)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showNewJob, setShowNewJob] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null)

  // Drag-to-scroll for kanban
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    function onMouseDown(e: MouseEvent) {
      // Only grab on background clicks (not on cards, buttons, inputs)
      const target = e.target as HTMLElement
      const isInteractive = target.closest('button, a, input, select, textarea, [draggable="true"], [data-card]')
      if (isInteractive) return

      isDragging.current = true
      startX.current = e.pageX - el!.offsetLeft
      scrollLeft.current = el!.scrollLeft
      el!.style.cursor = 'grabbing'
      el!.style.userSelect = 'none'
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return
      e.preventDefault()
      const x = e.pageX - el!.offsetLeft
      const walk = (x - startX.current) * 1.5
      el!.scrollLeft = scrollLeft.current - walk
    }

    function onMouseUp() {
      if (!isDragging.current) return
      isDragging.current = false
      el!.style.cursor = 'grab'
      el!.style.removeProperty('user-select')
    }

    el.style.cursor = 'grab'
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [viewMode])

  // Listen for open-job events from notifications panel
  useEffect(() => {
    function handleOpenJob(e: Event) {
      const { jobId } = (e as CustomEvent).detail
      const job = jobs.find((j) => j.id === jobId)
      if (job) setSelectedJob(job)
    }
    window.addEventListener('open-job', handleOpenJob)
    return () => window.removeEventListener('open-job', handleOpenJob)
  }, [jobs])

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
        setJobs((prev) => prev.map((j) => (j.id === payload.new.id ? { ...j, ...payload.new, cliente: j.cliente, entregas: j.entregas } : j)))
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
    onProfileChange: (payload: { eventType: string; new: Profile; old: Profile }) => {
      if (payload.eventType === 'UPDATE') {
        setMembrosList((prev) => prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m)))
      }
    },
  }), [])

  useRealtime(realtimeCallbacks)

  const isDemoMode = typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

  const handleBatchReorder = useCallback(async (items: { id: string; coluna_id: string; posicao: number }[]) => {
    if (isDemoMode) return
    await fetch('/api/jobs/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobs: items }),
    })
  }, [isDemoMode])

  const handleJobsReorder = useCallback((updatedJobs: Job[]) => {
    setJobs(updatedJobs)
  }, [])

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
        hora_entrega_cliente: jobData.hora_entrega_cliente ?? null,
        margem_horas: jobData.margem_horas ?? 4,
        prioridade: jobData.prioridade ?? 'normal',
        tags: jobData.tags ?? [],
        em_producao_por: null,
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

  const handleTagsChange = useCallback(async (jobId: string, tags: TagJob[]) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, tags } : j)))
    if (!isDemoMode) {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      })
    }
  }, [isDemoMode])


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

  const handleStatusChange = useCallback(async (status: StatusMembro, texto?: string) => {
    // Optimistic update
    setMembrosList((prev) => prev.map((m) => (m.id === currentUserId ? { ...m, status, status_texto: texto ?? m.status_texto } : m)))
    if (!isDemoMode) {
      await fetch('/api/membros/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, texto }),
      })
    }
  }, [isDemoMode, currentUserId])

  const handleEmProducaoToggle = useCallback(async (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId)
    if (!job) return

    const isCurrentlyActive = job.em_producao_por === currentUserId
    const newValue = isCurrentlyActive ? null : currentUserId

    // Optimistic: clear from all jobs of this user, then set the new one
    setJobs((prev) => prev.map((j) => {
      if (j.em_producao_por === currentUserId) return { ...j, em_producao_por: null }
      if (j.id === jobId && !isCurrentlyActive) return { ...j, em_producao_por: currentUserId }
      return j
    }))

    if (!isDemoMode) {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ em_producao_por: newValue }),
      })
    }
  }, [isDemoMode, currentUserId, jobs])

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

  const jobCountByCliente = useMemo(() => {
    const map = new Map<string, number>()
    for (const job of jobs) {
      map.set(job.cliente_id, (map.get(job.cliente_id) ?? 0) + 1)
    }
    return map
  }, [jobs])

  return (
    <>
      {/* Topbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-text-primary">Board</h2>
          <div className="flex bg-bg-elevated border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Lista
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowNewJob(true)}
          className="px-3.5 py-1.5 bg-accent text-white text-sm font-semibold rounded-md hover:bg-accent-hover transition-colors"
        >
          + Novo Job
        </button>
      </div>

      {/* Team bar */}
      {membrosList.length > 0 && (
        <TeamStatusBar
          membros={membrosList}
          jobs={jobs}
          currentUserId={currentUserId}
          onStatusChange={handleStatusChange}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Client sidebar — redesigned with icons */}
        <aside className="w-52 shrink-0 border-r border-border bg-bg-secondary overflow-y-auto px-2 py-3">
          <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-widest px-2 mb-2">Clientes</h3>

          <button
            onClick={() => setSelectedClienteId(null)}
            className={`w-full flex items-center gap-2.5 text-sm px-2 py-2 rounded-lg transition-colors ${
              selectedClienteId === null
                ? 'bg-accent/10 text-accent font-semibold'
                : 'text-text-primary hover:bg-bg-tertiary'
            }`}
          >
            <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-accent">*</span>
            </div>
            <span>Todos</span>
          </button>

          {clientesList.map((cliente) => {
            const isActive = selectedClienteId === cliente.id
            const count = jobCountByCliente.get(cliente.id) ?? 0
            return (
              <button
                key={cliente.id}
                onClick={() => setSelectedClienteId(cliente.id)}
                className={`w-full flex items-center gap-2.5 text-sm px-2 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                <ClientLogo nome={cliente.nome} dominio={cliente.dominio} cor={cliente.cor} size="md" />
                <span className="truncate flex-1 text-left">{cliente.nome}</span>
                {count > 0 && (
                  <span className="text-[10px] text-text-muted font-medium">{count}</span>
                )}
              </button>
            )
          })}
        </aside>

        {/* Board or List */}
        {viewMode === 'kanban' ? (
          <div ref={scrollRef} className="flex-1 overflow-auto">
            <KanbanBoard
              colunas={colunas}
              jobs={filteredJobs}
              onJobsReorder={handleJobsReorder}
              onBatchReorder={handleBatchReorder}
              onJobClick={handleJobClick}
              onTagsChange={handleTagsChange}
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
          onNewCliente={async (nome: string, cor?: string) => {
            const res = await fetch('/api/clientes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nome, cor }),
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
          currentUserId={currentUserId}
          onClose={() => setSelectedJob(null)}
          onUpdate={handleJobUpdate}
          onDelete={handleDeleteJob}
          onEmProducaoToggle={handleEmProducaoToggle}
        />
      )}
    </>
  )
}
