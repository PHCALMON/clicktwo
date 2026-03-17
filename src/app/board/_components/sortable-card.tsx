import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Job, TagJob } from '@/lib/types'
import { KanbanCard } from './kanban-card'

interface SortableCardProps {
  job: Job
  colunaNome?: string
  onClick?: () => void
  onTagsChange?: (jobId: string, tags: TagJob[]) => void
}

export function SortableCard({ job, colunaNome, onClick, onTagsChange }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id })

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
      <KanbanCard job={job} colunaNome={colunaNome} onTagsChange={onTagsChange} />
    </div>
  )
}
