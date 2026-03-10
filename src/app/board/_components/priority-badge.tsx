import { PRIORIDADES } from '@/lib/constants'
import type { Prioridade } from '@/lib/types'

export function PriorityBadge({ prioridade }: { prioridade: Prioridade }) {
  const config = PRIORIDADES[prioridade]

  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      <span className="text-text-secondary">{config.label}</span>
    </span>
  )
}
