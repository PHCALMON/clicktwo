'use client'

import { useState } from 'react'
import type { Job, TagJob, Prioridade } from '@/lib/types'
import { TAGS, PRIORIDADES } from '@/lib/constants'
import { TagBadge } from './tag-badge'

interface KanbanCardProps {
  job: Job
  onTagsChange?: (jobId: string, tags: TagJob[]) => void
  onPriorityChange?: (jobId: string, prioridade: Prioridade) => void
}

export function KanbanCard({ job, onTagsChange, onPriorityChange }: KanbanCardProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)

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
    <div className="bg-bg-card border border-border rounded-md p-3 shadow-card hover:shadow-card-hover hover:border-border-hover hover:-translate-y-px transition-all duration-150 cursor-pointer group">
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

      <div
        className="flex items-center justify-between mb-2"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            onClick={() => onPriorityChange && setShowPriorityPicker((v) => !v)}
            className={`flex items-center gap-1.5 text-xs ${onPriorityChange ? 'cursor-pointer hover:opacity-80' : ''}`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: PRIORIDADES[job.prioridade].color }}
            />
            <span className="text-text-secondary">{PRIORIDADES[job.prioridade].label}</span>
          </button>

          {showPriorityPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPriorityPicker(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 bg-bg-elevated border border-border rounded-md shadow-dropdown p-1 w-32">
                {(Object.entries(PRIORIDADES) as [Prioridade, { label: string; color: string }][]).map(
                  ([value, config]) => (
                    <button
                      key={value}
                      onClick={() => {
                        onPriorityChange?.(job.id, value)
                        setShowPriorityPicker(false)
                      }}
                      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-left transition-colors ${
                        job.prioridade === value ? 'bg-bg-card' : 'hover:bg-bg-card'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className={job.prioridade === value ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                        {config.label}
                      </span>
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
        {formattedDate && (
          <span className="text-xs text-text-muted">{formattedDate}</span>
        )}
      </div>

      {/* Tags — click area stops propagation to avoid opening detail modal */}
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
            <div className="absolute left-0 top-full mt-1 z-50 bg-bg-elevated border border-border rounded-md shadow-dropdown p-2 w-48">
              {(Object.entries(TAGS) as [TagJob, { label: string; color: string }][]).map(
                ([value, config]) => {
                  const active = job.tags.includes(value)
                  return (
                    <button
                      key={value}
                      onClick={() => toggleTag(value)}
                      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-left transition-colors ${
                        active ? 'bg-bg-card' : 'hover:bg-bg-card'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
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
