import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { EntregaWithJob, TagJob } from '@/lib/types'
import { KanbanCard } from './kanban-card'

interface SortableCardProps {
  entrega: EntregaWithJob
  onClick?: () => void
  onTagsChange?: (entregaId: string, tags: TagJob[]) => void
}

export function SortableCard({ entrega, onClick, onTagsChange }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entrega.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <KanbanCard entrega={entrega} onTagsChange={onTagsChange} />
    </div>
  )
}
