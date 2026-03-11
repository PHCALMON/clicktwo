'use client'

import { useState, useMemo } from 'react'
import type { Coluna, Job, Cliente } from '@/lib/types'
import { PRIORIDADES, TAGS } from '@/lib/constants'
import { useRealtime } from '@/lib/hooks/use-realtime'

interface ProducaoClientProps {
  colunas: Coluna[]
  jobs: Job[]
  clientes: Cliente[]
}

export function ProducaoClient({ colunas, jobs: initialJobs, clientes: initialClientes }: ProducaoClientProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [clientesList, setClientesList] = useState<Cliente[]>(initialClientes)
  const [filterCliente, setFilterCliente] = useState<string>('')
  const [filterColuna, setFilterColuna] = useState<string>('')

  const colunasMap = useMemo(() => {
    const map: Record<string, Coluna> = {}
    for (const c of colunas) map[c.id] = c
    return map
  }, [colunas])

  const filteredJobs = useMemo(() => {
    let result = jobs
    if (filterCliente) result = result.filter((j) => j.cliente_id === filterCliente)
    if (filterColuna) result = result.filter((j) => j.coluna_id === filterColuna)
    return result
  }, [jobs, filterCliente, filterColuna])

  const realtimeCallbacks = useMemo(() => ({
    onJobChange: (payload: { eventType: string; new: Job; old: Job }) => {
      if (payload.eventType === 'INSERT') {
        const jobWithCliente = { ...payload.new, cliente: undefined as Cliente | undefined }
        setClientesList((prev) => {
          jobWithCliente.cliente = prev.find((c) => c.id === payload.new.cliente_id)
          return prev
        })
        setJobs((prev) => {
          if (prev.some((j) => j.id === payload.new.id)) return prev
          return [jobWithCliente, ...prev]
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
      }
    },
  }), [])

  useRealtime(realtimeCallbacks)

  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text-primary">Producao</h2>
        <div className="flex gap-3">
          <select
            value={filterCliente}
            onChange={(e) => setFilterCliente(e.target.value)}
            className="px-3 py-1.5 bg-bg-card border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">Todos os clientes</option>
            {clientesList.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <select
            value={filterColuna}
            onChange={(e) => setFilterColuna(e.target.value)}
            className="px-3 py-1.5 bg-bg-card border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">Todas as colunas</option>
            {colunas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-elevated border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Produzindo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Cliente</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Job</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Campanha</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Tarefa</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Prioridade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Entrega</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Tags</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-text-muted">
                  Nenhum job encontrado.
                </td>
              </tr>
            )}
            {filteredJobs.map((job) => {
              const coluna = colunasMap[job.coluna_id]
              const prioConfig = PRIORIDADES[job.prioridade]
              const formattedDate = job.data_entrega
                ? new Date(job.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : ''

              return (
                <tr key={job.id} className="border-b border-border last:border-b-0 hover:bg-bg-elevated/50 transition-colors">
                  {/* Produzindo (coluna) */}
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: coluna?.cor || '#52525B' }}
                    >
                      {coluna?.nome || '—'}
                    </span>
                  </td>

                  {/* Cliente */}
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-medium text-text-primary">
                      {job.cliente?.nome || '—'}
                    </span>
                  </td>

                  {/* Job (icone Drive) */}
                  <td className="px-4 py-2.5 text-center">
                    {job.drive_folder_url ? (
                      <a
                        href={job.drive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center text-accent hover:text-accent-hover transition-colors"
                        title="Abrir pasta no Drive"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-text-muted text-xs">—</span>
                    )}
                  </td>

                  {/* Campanha */}
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-text-primary">{job.campanha}</span>
                  </td>

                  {/* Tarefa (vazio) */}
                  <td className="px-4 py-2.5">
                    <span className="text-text-muted text-xs">—</span>
                  </td>

                  {/* Prioridade */}
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: prioConfig.color }}
                    >
                      {prioConfig.label.toUpperCase()}
                    </span>
                  </td>

                  {/* Data Entrega */}
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-text-secondary">{formattedDate}</span>
                  </td>

                  {/* Tags */}
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: TAGS[tag].color }}
                        >
                          {TAGS[tag].label.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-muted mt-3">{filteredJobs.length} job(s)</p>
    </div>
  )
}
