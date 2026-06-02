'use client'
import type { Currency } from '@/lib/types'

interface Props {
  expression: string
  currency: Currency
  selectedTagIds: string[]
  tagNames: Record<string, string>
  categoryColor?: string
  onAddTag: () => void
  onRemoveTag: (id: string) => void
}

export default function AmountDisplay({
  expression, currency, selectedTagIds, tagNames, categoryColor = '#C4A09B', onAddTag, onRemoveTag,
}: Props) {
  return (
    <div className="px-4 pt-4 pb-2 text-center">
      {/* 大金额 */}
      <div className="flex items-baseline justify-center gap-1 mb-4">
        <span className="text-2xl font-light" style={{ color: 'var(--color-text-muted)' }}>¥</span>
        <span
          className="text-6xl font-light tracking-tight"
          style={{ color: expression ? 'var(--color-text)' : 'var(--color-text-muted)' }}
        >
          {expression || '0'}
        </span>
        {/* 光标 */}
        <span
          className="inline-block w-[2px] h-10 rounded-full self-center animate-pulse"
          style={{ background: categoryColor, opacity: 0.8 }}
        />
      </div>

      {/* 标签行 */}
      <div className="flex items-center justify-center flex-wrap gap-1.5 min-h-7">
        {selectedTagIds.map(id => (
          <button
            key={id}
            onClick={() => onRemoveTag(id)}
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: `${categoryColor}20`, color: categoryColor }}
          >
            {tagNames[id]} ×
          </button>
        ))}
        <button
          onClick={onAddTag}
          className="px-2.5 py-1 rounded-full text-xs"
          style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          + 标签
        </button>
      </div>

      {currency && (
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-muted)' }}>{currency}</p>
      )}
    </div>
  )
}
