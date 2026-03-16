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
import type { Coluna, EntregaWithJob, TagJob } from '@/lib/types'
import { KanbanColumn } from './kanban-column'
import { KanbanCard } from './kanban-card'

interface KanbanBoardProps {
  colunas: Coluna[]
  entregas: EntregaWithJob[]
  onEntregasReorder?: (updatedEntregas: EntregaWithJob[]) => void
  onBatchReorder?: (items: { id: string; status_slug: string; posicao: number }[]) => void
  onEntregaClick?: (entrega: EntregaWithJob) => void
  onTagsChange?: (entregaId: string, tags: TagJob[]) => void
  onAddColumn?: (nome: string, cor: string | null) => void
}

export function KanbanBoard({ colunas, entregas, onEntregasReorder, onBatchReorder, onEntregaClick, onTagsChange, onAddColumn }: KanbanBoardProps) {
  const [activeEntrega, setActiveEntrega] = useState<EntregaWithJob | null>(null)
  const [showNewColumn, setShowNewColumn] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColColor, setNewColColor] = useState('')

  const sortedColunas = [...colunas].sort((a, b) => a.posicao - b.posicao)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const getEntregasForColumn = useCallback(
    (slug: string | null): EntregaWithJob[] => {
      if (!slug) return []
      return entregas
        .filter((e) => e.status_slug === slug)
        .sort((a, b) => a.posicao - b.posicao)
    },
    [entregas]
  )

  function reorder(updatedEntregas: EntregaWithJob[]) {
    onEntregasReorder?.(updatedEntregas)
  }

  function handleDragStart(event: DragStartEvent) {
    const entrega = entregas.find((e) => e.id === event.active.id)
    if (entrega) setActiveEntrega(entrega)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeEntregaData = entregas.find((e) => e.id === activeId)
    if (!activeEntregaData) return

    // Check if dropped over a column (by column ID)
    const overColuna = colunas.find((c) => c.id === overId)
    if (overColuna && overColuna.slug && activeEntregaData.status_slug !== overColuna.slug) {
      reorder(
        entregas.map((e) =>
          e.id === activeId
            ? { ...e, status_slug: overColuna.slug!, posicao: getEntregasForColumn(overColuna.slug).length }
            : e
        )
      )
      return
    }

    // Check if dropped over another entrega
    const overEntrega = entregas.find((e) => e.id === overId)
    if (overEntrega && activeEntregaData.status_slug !== overEntrega.status_slug) {
      reorder(
        entregas.map((e) =>
          e.id === activeId
            ? { ...e, status_slug: overEntrega.status_slug, posicao: overEntrega.posicao }
            : e
        )
      )
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveEntrega(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const movedEntrega = entregas.find((e) => e.id === activeId)
    if (!movedEntrega) return

    const sourceSlug = movedEntrega.status_slug
    let targetSlug = movedEntrega.status_slug
    let targetPosicao = movedEntrega.posicao

    const overColuna = colunas.find((c) => c.id === overId)
    if (overColuna && overColuna.slug) {
      targetSlug = overColuna.slug
      targetPosicao = getEntregasForColumn(overColuna.slug).filter((e) => e.id !== activeId).length
    } else {
      const overEntrega = entregas.find((e) => e.id === overId)
      if (overEntrega) {
        targetSlug = overEntrega.status_slug
        targetPosicao = overEntrega.posicao
      }
    }

    const updated = entregas.map((e) =>
      e.id === activeId
        ? { ...e, status_slug: targetSlug, posicao: targetPosicao }
        : e
    )

    const columnEntregas = updated
      .filter((e) => e.status_slug === targetSlug)
      .sort((a, b) => {
        if (a.id === activeId) return targetPosicao - b.posicao
        if (b.id === activeId) return a.posicao - targetPosicao
        return a.posicao - b.posicao
      })

    const reindexed = updated.map((e) => {
      const idx = columnEntregas.findIndex((ce) => ce.id === e.id)
      if (idx !== -1) return { ...e, posicao: idx }
      return e
    })

    reorder(reindexed)

    // Build batch reorder payload: all cards in affected columns
    const affectedSlugs = new Set([sourceSlug, targetSlug])
    const batchItems = reindexed
      .filter((e) => affectedSlugs.has(e.status_slug))
      .map((e) => ({ id: e.id, status_slug: e.status_slug, posicao: e.posicao }))

    onBatchReorder?.(batchItems)
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
            entregas={getEntregasForColumn(coluna.slug)}
            onEntregaClick={onEntregaClick}
            onTagsChange={onTagsChange}
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
        {activeEntrega && (
          <div className="rotate-3 opacity-90">
            <KanbanCard entrega={activeEntrega} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
