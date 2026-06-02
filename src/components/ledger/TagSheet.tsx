'use client'
import type { Tag } from '@/lib/types'

interface Props {
  tags: Tag[]
  selectedIds: string[]
  categoryColor?: string
  onToggle: (id: string) => void
  onClose: () => void
}

export default function TagSheet({ tags, selectedIds, categoryColor = '#C4A09B', onToggle, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl p-4 pb-8"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-8 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--color-border)' }} />
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>选择标签</p>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => {
            const active = selectedIds.includes(tag.id)
            return (
              <button
                key={tag.id}
                onClick={() => onToggle(tag.id)}
                className="px-3 py-1.5 rounded-full text-sm transition-all"
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
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-2xl text-sm font-medium"
          style={{ background: categoryColor, color: 'white' }}
        >
          确定
        </button>
      </div>
    </div>
  )
}
