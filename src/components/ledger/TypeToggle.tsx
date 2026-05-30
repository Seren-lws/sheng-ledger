'use client'
import type { TransactionType } from '@/lib/types'

interface Props {
  value: TransactionType
  onChange: (v: TransactionType) => void
}

export default function TypeToggle({ value, onChange }: Props) {
  return (
    <div className="flex" style={{ borderBottom: '1px solid var(--color-border)' }}>
      {(['expense', 'income'] as const).map(t => {
        const active = value === t
        const activeColor = t === 'expense' ? 'var(--color-morandi-rose)' : 'var(--color-morandi-mint)'
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className="flex-1 py-3 text-sm font-medium transition-colors"
            style={{
              color: active ? activeColor : 'var(--color-text-muted)',
              borderBottom: `2px solid ${active ? activeColor : 'transparent'}`,
            }}
          >
            {t === 'expense' ? '支出' : '收入'}
          </button>
        )
      })}
    </div>
  )
}
