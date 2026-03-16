'use client'

import { useState, useMemo } from 'react'
import type { EntregaWithJob, TagJob } from '@/lib/types'
import { TAGS } from '@/lib/constants'
import { calcPrioridade } from '@/lib/priority'
import { TagBadge } from './tag-badge'
import { ClientLogo } from '@/components/ui/client-logo'

interface KanbanCardProps {
  entrega: EntregaWithJob
  onTagsChange?: (entregaId: string, tags: TagJob[]) => void
}

export function KanbanCard({ entrega, onTagsChange }: KanbanCardProps) {
  const [showPicker, setShowPicker] = useState(false)

  const job = entrega.job
  const cliente = job?.cliente

  const prio = useMemo(
    () => calcPrioridade(entrega.data_entrega, entrega.hora_entrega_cliente, entrega.margem_horas),
    [entrega.data_entrega, entrega.hora_entrega_cliente, entrega.margem_horas],
  )

  // Entrega has a single tag, represent as array for picker
  const currentTags: TagJob[] = entrega.tag ? [entrega.tag] : []

  function toggleTag(tag: TagJob) {
    if (!onTagsChange) return
    const next = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag]
    onTagsChange(entrega.id, next)
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
        {cliente && (
          <div className="flex items-center gap-2 mb-1.5">
            <ClientLogo nome={cliente.nome} dominio={cliente.dominio} cor={cliente.cor} size="sm" />
            <span className="text-[11px] text-text-muted truncate">{cliente.nome}</span>
            {job?.drive_folder_url && (
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

        {/* Campaign name (bold) */}
        {job?.campanha && (
          <p className="text-sm font-bold text-text-primary leading-tight group-hover:text-accent transition-colors">
            {job.campanha}
          </p>
        )}

        {/* Entrega name (same weight, secondary color) */}
        <p className="text-sm font-bold text-text-secondary mb-1.5 leading-tight">
          {entrega.nome}
        </p>

        {/* Produzindo badge */}
        {entrega.produzindo_por && (
          <div className="flex items-center gap-1.5 mb-1.5 px-1.5 py-0.5 bg-emerald-500/10 rounded text-[11px]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-emerald-400 font-medium">Produzindo</span>
          </div>
        )}

        {/* Priority + countdown */}
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
          {entrega.aprovado_interno && (
            <span className="text-emerald-400 text-[10px] font-medium">Aprovado</span>
          )}
        </div>

        {/* Tag */}
        <div
          className="relative"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 flex-wrap">
            {currentTags.map((tag) => (
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
                    const active = currentTags.includes(value)
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
