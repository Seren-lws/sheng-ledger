'use client'
import { Pencil } from 'lucide-react'
import type { Tag } from '@/lib/types'

interface Props {
  tags: Tag[]
  selectedIds: string[]
  categoryColor?: string
  onToggle: (id: string) => void
  onEdit: () => void
}

export default function TagRow({ tags, selectedIds, categoryColor = '#C4A09B', onToggle, onEdit }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(tag => {
        const active = selectedIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            onClick={() => onToggle(tag.id)}
            className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: active ? `${categoryColor}22` : 'var(--color-border)',
              color: active ? categoryColor : 'var(--color-text-muted)',
              border: `1px solid ${active ? categoryColor : 'transparent'}`,
            }}
          >
            {tag.name}
          </button>
        )
      })}
      <button
        onClick={onEdit}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
        style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        <Pencil size={10} />
        编辑
      </button>
    </div>
  )
}
