'use client'
import type { Category } from '@/lib/types'

interface Props {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  return (
    <div className="px-4 py-2">
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map(cat => {
          const active = cat.id === selectedId
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all"
              style={{
                background: active ? `${cat.color}22` : 'var(--color-card)',
                border: `1.5px solid ${active ? cat.color : 'transparent'}`,
                boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <div className="w-6 h-6 rounded-full" style={{ background: cat.color }} />
              <span
                className="text-[11px] whitespace-nowrap"
                style={{
                  color: active ? cat.color : 'var(--color-text-muted)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {cat.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
