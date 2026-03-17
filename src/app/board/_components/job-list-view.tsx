'use client'

import { useMemo } from 'react'
import type { Coluna, Job } from '@/lib/types'
import { TAGS } from '@/lib/constants'
import { calcJobPrioridade } from '@/lib/priority'

interface JobListViewProps {
  colunas: Coluna[]
  jobs: Job[]
  onJobClick: (job: Job) => void
}

export function JobListView({ colunas, jobs, onJobClick }: JobListViewProps) {
  const colunasMap = useMemo(() => {
    const map: Record<string, Coluna> = {}
    for (const c of colunas) map[c.id] = c
    return map
  }, [colunas])

  return (
    <div className="px-6 py-4 overflow-auto flex-1">
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-elevated border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Produzindo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Cliente</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Job</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Campanha</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Prioridade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Entrega</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Tags</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-text-muted">
                  Nenhum job encontrado.
                </td>
              </tr>
            )}
            {jobs.map((job) => {
              const coluna = colunasMap[job.coluna_id]
              const COLUNAS_ENTREGUES = ['CLIENTE/AGÊNCIA', 'CLIENTE', 'ENTREGUE', 'ARQUIVO']
              const isEntregue = coluna ? COLUNAS_ENTREGUES.some((c) => coluna.nome.toUpperCase().includes(c)) : false
              const rawPrio = calcJobPrioridade(job.data_entrega, job.entregas, job.hora_entrega_cliente, job.margem_horas)
              const prioConfig = isEntregue
                ? { ...rawPrio, level: 'sem_urgencia' as const, label: 'Entregue', color: '#22C55E', countdown: null, pulse: false }
                : rawPrio
              const formattedDate = job.data_entrega
                ? new Date(job.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : ''

              return (
                <tr
                  key={job.id}
                  onClick={() => onJobClick(job)}
                  className="border-b border-border last:border-b-0 hover:bg-bg-elevated/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: coluna?.cor || '#52525B' }}
                    >
                      {coluna?.nome || '—'}
                    </span>
                  </td>

                  <td className="px-4 py-2.5">
                    <span className="text-sm font-medium text-text-primary">
                      {job.cliente?.nome || '—'}
                    </span>
                  </td>

                  <td className="px-4 py-2.5 text-center">
                    {job.drive_folder_url ? (
                      <a
                        href={job.drive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center text-accent hover:text-accent-hover transition-colors"
                        title="Abrir pasta no Drive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-text-muted text-xs">—</span>
                    )}
                  </td>

                  <td className="px-4 py-2.5">
                    <span className="text-sm text-text-primary">{job.campanha}</span>
                  </td>

                  <td className="px-4 py-2.5">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: prioConfig.color }}
                    >
                      {prioConfig.label.toUpperCase()}
                    </span>
                  </td>

                  <td className="px-4 py-2.5">
                    <span className="text-sm text-text-secondary">{formattedDate}</span>
                  </td>

                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {job.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: TAGS[tag]?.color || '#52525B' }}
                        >
                          {(TAGS[tag]?.label || tag).toUpperCase()}
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

      <p className="text-xs text-text-muted mt-3">{jobs.length} job(s)</p>
    </div>
  )
}
