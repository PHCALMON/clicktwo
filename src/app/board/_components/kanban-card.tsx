'use client'

import { useState, useMemo } from 'react'
import type { Job, TagJob } from '@/lib/types'
import { TAGS } from '@/lib/constants'
import { calcJobPrioridade } from '@/lib/priority'
import { TagBadge } from './tag-badge'

// Colunas onde o job ja foi entregue — sem badge de atrasado
const COLUNAS_ENTREGUES = ['CLIENTE/AGÊNCIA', 'CLIENTE', 'ENTREGUE', 'ARQUIVO']

interface KanbanCardProps {
  job: Job
  colunaNome?: string
  onTagsChange?: (jobId: string, tags: TagJob[]) => void
}

export function KanbanCard({ job, colunaNome, onTagsChange }: KanbanCardProps) {
  const [showPicker, setShowPicker] = useState(false)

  const rawPrio = useMemo(
    () => calcJobPrioridade(job.data_entrega, job.entregas, job.hora_entrega_cliente, job.margem_horas),
    [job.data_entrega, job.entregas, job.hora_entrega_cliente, job.margem_horas],
  )

  // Se job ta em coluna de entrega, neutraliza prioridade
  const isEntregue = colunaNome ? COLUNAS_ENTREGUES.some((c) => colunaNome.toUpperCase().includes(c)) : false
  const prio = isEntregue
    ? { ...rawPrio, level: 'sem_urgencia' as const, label: 'Entregue', color: '#22C55E', countdown: null, pulse: false }
    : rawPrio

  const formattedDate = job.data_entrega
    ? new Date(job.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
      })
    : null

  function toggleTag(tag: TagJob) {
    if (!onTagsChange) return
    const next = job.tags.includes(tag)
      ? job.tags.filter((t) => t !== tag)
      : [...job.tags, tag]
    onTagsChange(job.id, next)
  }

  return (
    <div data-card className="bg-bg-card border border-border rounded-md p-3 shadow-card hover:shadow-card-hover hover:border-border-hover hover:-translate-y-px transition-all duration-150 cursor-pointer group">
      <p className="text-sm font-semibold text-text-primary mb-2 group-hover:text-accent transition-colors">
        {job.campanha}
      </p>

      {job.cliente && (
        <p className="text-xs font-bold text-text-secondary mb-2">{job.cliente.nome}</p>
      )}

      {job.freela_nome && (
        <div className="flex items-center gap-1.5 mb-2 px-1.5 py-1 bg-amber-500/10 rounded text-xs">
          <span className="text-amber-400 font-medium">{job.freela_nome}</span>
          {job.freela_funcao && (
            <span className="text-text-muted">&middot; {job.freela_funcao}</span>
          )}
        </div>
      )}

      {/* Em Producao badge */}
      {job.em_producao_por && (
        <div className="flex items-center gap-1.5 mb-2 px-1.5 py-1 bg-emerald-500/10 rounded text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-emerald-400 font-medium">Produzindo</span>
        </div>
      )}

      <div
        className="flex items-center justify-between mb-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0${prio.pulse ? ' animate-pulse' : ''}`}
            style={{ backgroundColor: prio.color }}
          />
          <span className="text-text-secondary">{prio.label}</span>
          {prio.countdown && (
            <span
              className="font-mono font-semibold text-[10px]"
              style={{ color: prio.color }}
            >
              {prio.countdown}
            </span>
          )}
          {prio.entregasTotal > 0 && (
            <span className="text-text-muted text-[10px]">
              &middot; {prio.entregasConcluidas}/{prio.entregasTotal} entregas
            </span>
          )}
        </div>
        {formattedDate && (
          <span className="text-xs text-text-muted">{formattedDate}</span>
        )}
      </div>

      {/* Tags */}
      <div
        className="relative"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 flex-wrap">
          {job.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {onTagsChange && (
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="inline-flex items-center justify-center w-5 h-5 rounded-sm text-xs text-text-muted hover:text-accent hover:bg-bg-elevated transition-colors"
              title="Editar tags"
            >
              +
            </button>
          )}
        </div>

        {showPicker && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
            <div className="absolute left-0 bottom-full mb-1 z-50 bg-bg-elevated border border-border rounded-md shadow-dropdown p-1.5 w-44 max-h-56 overflow-y-auto">
              {(Object.entries(TAGS) as [TagJob, { label: string; color: string }][]).map(
                ([value, config]) => {
                  const active = job.tags.includes(value)
                  return (
                    <button
                      key={value}
                      onClick={() => toggleTag(value)}
                      className={`flex items-center gap-1.5 w-full px-2 py-1 rounded text-[11px] text-left transition-colors ${
                        active ? 'bg-bg-card' : 'hover:bg-bg-card'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className={active ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                        {config.label}
                      </span>
                      {active && (
                        <span className="ml-auto text-accent text-[10px]">&#10003;</span>
                      )}
                    </button>
                  )
                }
              )}
            </div>
          </>
        )}
      </div>

      {/* Drive link */}
      {job.drive_folder_url && (
        <div className="flex justify-end mt-1" onClick={(e) => e.stopPropagation()}>
          <a
            href={job.drive_folder_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-accent transition-colors flex-shrink-0"
            title="Google Drive"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.71 3.5L1.15 15l4.58 7.5h13.54l4.58-7.5L17.29 3.5H7.71zm-.2 1.5h3.56l-5.38 9.17L4.2 11.5 7.51 5zm4.54 0h3.5L19.8 11.5l-1.49 2.67L12.05 5zm4.72 1.32l3.12 5.35-3.13 5.33H17l3.07-5.33L16.97 6.32zM5.49 6.32L8.62 11.67l-3.13 5.33H3.93l3.12-5.33L5.49 6.32zM6.9 15.5h10.2l-1.73 3H8.63l-1.73-3z"/>
            </svg>
          </a>
        </div>
      )}
    </div>
  )
}
