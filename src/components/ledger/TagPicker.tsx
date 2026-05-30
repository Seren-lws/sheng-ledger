'use client'
import type { Tag } from '@/lib/types'

interface Props {
  tags: Tag[]
  selectedIds: string[]
  categoryColor?: string
  onToggle: (id: string) => void
}

export default function TagPicker({ tags, selectedIds, categoryColor = '#C4A09B', onToggle }: Props) {
  if (tags.length === 0) return null
  return (
    <div className="px-4 pb-3">
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => {
          const active = selectedIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              onClick={() => onToggle(tag.id)}
              className="px-3 py-1 rounded-full text-xs transition-all"
              style={{
                background: active ? `${categoryColor}20` : 'var(--color-border)',
                color: active ? categoryColor : 'var(--color-text-muted)',
                border: `1px solid ${active ? categoryColor : 'transparent'}`,
                fontWeight: active ? 600 : 400,
              }}
            >
              {tag.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
