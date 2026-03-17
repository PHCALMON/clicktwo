'use client'

import { useState, useMemo } from 'react'
import type { Job, TagJob } from '@/lib/types'
import { TAGS } from '@/lib/constants'
import { calcJobPrioridade } from '@/lib/priority'
import { TagBadge } from './tag-badge'
import { ClientLogo } from '@/components/ui/client-logo'

interface KanbanCardProps {
  job: Job
  onTagsChange?: (jobId: string, tags: TagJob[]) => void
}

export function KanbanCard({ job, onTagsChange }: KanbanCardProps) {
  const [showPicker, setShowPicker] = useState(false)

  const prio = useMemo(
    () => calcJobPrioridade(job.data_entrega, job.entregas, job.hora_entrega_cliente, job.margem_horas),
    [job.data_entrega, job.entregas, job.hora_entrega_cliente, job.margem_horas],
  )

  function toggleTag(tag: TagJob) {
    if (!onTagsChange) return
    const next = job.tags.includes(tag)
      ? job.tags.filter((t) => t !== tag)
      : [...job.tags, tag]
    onTagsChange(job.id, next)
  }

  return (
    <div data-card className="relative bg-bg-card border border-border rounded-lg overflow-hidden shadow-card hover:shadow-card-hover hover:border-border-hover hover:-translate-y-px transition-all duration-150 cursor-pointer group">
      {/* Accent bar left */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: prio.color }}
      />

      <div className="pl-3 pr-3 pt-2.5 pb-2.5">
        {/* Client row */}
        {job.cliente && (
          <div className="flex items-center gap-2 mb-1.5">
            <ClientLogo nome={job.cliente.nome} dominio={job.cliente.dominio} cor={job.cliente.cor} size="sm" />
            <span className="text-[11px] font-semibold text-text-secondary truncate">{job.cliente.nome}</span>
            {job.drive_folder_url && (
              <a
                href={job.drive_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-text-muted hover:text-accent transition-colors flex-shrink-0"
                title="Google Drive"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Title */}
        <p className="text-sm font-semibold text-text-primary mb-1.5 group-hover:text-accent transition-colors leading-tight">
          {job.campanha}
        </p>

        {/* Em Producao badge */}
        {job.em_producao_por && (
          <div className="flex items-center gap-1.5 mb-1.5 px-1.5 py-0.5 bg-emerald-500/10 rounded text-[11px]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-emerald-400 font-medium">Produzindo</span>
          </div>
        )}

        {/* Freela badge */}
        {job.freela_nome && (
          <div className="flex items-center gap-1.5 mb-1.5 px-1.5 py-0.5 bg-fig-orange/10 rounded text-[11px]">
            <span className="text-fig-orange font-medium">{job.freela_nome}</span>
            {job.freela_funcao && (
              <span className="text-text-muted">&middot; {job.freela_funcao}</span>
            )}
          </div>
        )}

        {/* Priority + countdown + entregas */}
        <div
          className="flex items-center justify-between mb-1.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 text-[11px]">
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
          </div>
          {prio.entregasTotal > 0 && (
            <span className="text-text-muted text-[10px]">
              {prio.entregasConcluidas}/{prio.entregasTotal}
            </span>
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
      </div>
    </div>
  )
}
