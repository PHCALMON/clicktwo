import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Coluna, EntregaWithJob, TagJob } from '@/lib/types'
import { SortableCard } from './sortable-card'

interface KanbanColumnProps {
  coluna: Coluna
  entregas: EntregaWithJob[]
  onEntregaClick?: (entrega: EntregaWithJob) => void
  onTagsChange?: (entregaId: string, tags: TagJob[]) => void
}

export function KanbanColumn({ coluna, entregas, onEntregaClick, onTagsChange }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id })

  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {coluna.cor && (
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: coluna.cor }}
            />
          )}
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
            {coluna.nome}
          </h3>
          <span className="text-xs text-text-muted bg-bg-elevated px-1.5 py-0.5 rounded">
            {entregas.length}
          </span>
        </div>
      </div>

      <SortableContext items={entregas.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`space-y-2 min-h-[200px] p-1 rounded-lg transition-colors ${
            isOver ? 'bg-accent-muted' : ''
          }`}
          style={{
            borderTop: coluna.cor ? `2px solid ${coluna.cor}` : '2px solid #4A90D9',
          }}
        >
          {entregas.map((entrega) => (
            <SortableCard key={entrega.id} entrega={entrega} onClick={() => onEntregaClick?.(entrega)} onTagsChange={onTagsChange} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
