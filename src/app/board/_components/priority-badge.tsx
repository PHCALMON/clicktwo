import { calcPrioridade } from '@/lib/priority'

export function PriorityBadge({ dataEntrega }: { dataEntrega: string | null }) {
  const prio = calcPrioridade(dataEntrega)

  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span
        className={`w-2 h-2 rounded-full${prio.pulse ? ' animate-pulse' : ''}`}
        style={{ backgroundColor: prio.color }}
      />
      <span className="text-text-secondary">{prio.label}</span>
      {prio.countdown && (
        <span className="font-mono font-semibold text-[10px]" style={{ color: prio.color }}>
          {prio.countdown}
        </span>
      )}
    </span>
  )
}
