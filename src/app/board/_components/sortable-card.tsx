import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Job, TagJob, Prioridade } from '@/lib/types'
import { KanbanCard } from './kanban-card'

interface SortableCardProps {
  job: Job
  onClick?: () => void
  onTagsChange?: (jobId: string, tags: TagJob[]) => void
  onPriorityChange?: (jobId: string, prioridade: Prioridade) => void
}

export function SortableCard({ job, onClick, onTagsChange, onPriorityChange }: SortableCardProps) {
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
      <KanbanCard job={job} onTagsChange={onTagsChange} onPriorityChange={onPriorityChange} />
    </div>
  )
}
