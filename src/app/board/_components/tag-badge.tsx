import { TAGS } from '@/lib/constants'
import type { TagJob } from '@/lib/types'

export function TagBadge({ tag }: { tag: TagJob }) {
  const config = TAGS[tag]
  if (!config) return null

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium"
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  )
}
