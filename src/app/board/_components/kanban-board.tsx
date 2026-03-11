'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Coluna, Job, TagJob, Prioridade } from '@/lib/types'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'

interface KanbanBoardProps {
  colunas: Coluna[]
  jobs: Job[]
  onJobMove?: (jobId: string, newColunaId: string, newPosicao: number) => void
  onJobsReorder?: (updatedJobs: Job[]) => void
  onJobClick?: (job: Job) => void
  onTagsChange?: (jobId: string, tags: TagJob[]) => void
  onPriorityChange?: (jobId: string, prioridade: Prioridade) => void
  onAddColumn?: (nome: string, cor: string | null) => void
}

export function KanbanBoard({ colunas, jobs, onJobMove, onJobsReorder, onJobClick, onTagsChange, onPriorityChange, onAddColumn }: KanbanBoardProps) {
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [showNewColumn, setShowNewColumn] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColColor, setNewColColor] = useState('')

  const sortedColunas = [...colunas].sort((a, b) => a.posicao - b.posicao)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const getJobsForColumn = useCallback(
    (colunaId: string): Job[] =>
      jobs
        .filter((job) => job.coluna_id === colunaId)
        .sort((a, b) => a.posicao - b.posicao),
    [jobs]
  )

  function reorder(updatedJobs: Job[]) {
    onJobsReorder?.(updatedJobs)
  }

  function handleDragStart(event: DragStartEvent) {
    const job = jobs.find((j) => j.id === event.active.id)
    if (job) setActiveJob(job)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeJobId = active.id as string
    const overId = over.id as string

    const activeJobData = jobs.find((j) => j.id === activeJobId)
    if (!activeJobData) return

    const isOverColumn = colunas.some((c) => c.id === overId)
    if (isOverColumn && activeJobData.coluna_id !== overId) {
      reorder(
        jobs.map((j) =>
          j.id === activeJobId
            ? { ...j, coluna_id: overId, posicao: getJobsForColumn(overId).length }
            : j
        )
      )
      return
    }

    const overJob = jobs.find((j) => j.id === overId)
    if (overJob && activeJobData.coluna_id !== overJob.coluna_id) {
      reorder(
        jobs.map((j) =>
          j.id === activeJobId
            ? { ...j, coluna_id: overJob.coluna_id, posicao: overJob.posicao }
            : j
        )
      )
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveJob(null)

    if (!over) return

    const activeJobId = active.id as string
    const overId = over.id as string

    const movedJob = jobs.find((j) => j.id === activeJobId)
    if (!movedJob) return

    let targetColunaId = movedJob.coluna_id
    let targetPosicao = movedJob.posicao

    const isOverColumn = colunas.some((c) => c.id === overId)
    if (isOverColumn) {
      targetColunaId = overId
      targetPosicao = getJobsForColumn(overId).filter((j) => j.id !== activeJobId).length
    } else {
      const overJob = jobs.find((j) => j.id === overId)
      if (overJob) {
        targetColunaId = overJob.coluna_id
        targetPosicao = overJob.posicao
      }
    }

    const updated = jobs.map((j) =>
      j.id === activeJobId
        ? { ...j, coluna_id: targetColunaId, posicao: targetPosicao }
        : j
    )

    const columnJobs = updated
      .filter((j) => j.coluna_id === targetColunaId)
      .sort((a, b) => {
        if (a.id === activeJobId) return targetPosicao - b.posicao
        if (b.id === activeJobId) return a.posicao - targetPosicao
        return a.posicao - b.posicao
      })

    const reindexed = updated.map((j) => {
      const idx = columnJobs.findIndex((cj) => cj.id === j.id)
      if (idx !== -1) return { ...j, posicao: idx }
      return j
    })

    reorder(reindexed)
    onJobMove?.(activeJobId, targetColunaId, targetPosicao)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-6 pb-8">
        {sortedColunas.map((coluna) => (
          <KanbanColumn
            key={coluna.id}
            coluna={coluna}
            jobs={getJobsForColumn(coluna.id)}
            onJobClick={onJobClick}
            onTagsChange={onTagsChange}
            onPriorityChange={onPriorityChange}
          />
        ))}

        <div className="flex-shrink-0 w-72">
          {showNewColumn ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!newColName.trim()) return
                onAddColumn?.(newColName.trim(), newColColor || null)
                setNewColName('')
                setNewColColor('')
                setShowNewColumn(false)
              }}
              className="border border-border rounded-lg p-3 space-y-2 bg-bg-elevated shadow-card"
            >
              <input
                type="text"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Nome da coluna"
                autoFocus
                className="w-full px-2 py-1.5 bg-bg-card border border-border rounded text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted">Cor</label>
                <div className="flex gap-1">
                  {['', '#3B82F6', '#F59E0B', '#22C55E', '#EF4444', '#8B5CF6'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-colors ${
                        newColColor === c ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c || '#555' }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-accent text-bg-primary text-xs font-semibold rounded hover:bg-accent-hover transition-colors"
                >
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewColumn(false); setNewColName(''); setNewColColor('') }}
                  className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowNewColumn(true)}
              className="w-full py-3 border border-dashed border-border rounded-lg text-text-muted text-sm hover:border-accent hover:text-accent transition-colors"
            >
              + Coluna
            </button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeJob && (
          <div className="rotate-3 opacity-90">
            <KanbanCard job={activeJob} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
