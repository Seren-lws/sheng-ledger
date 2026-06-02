'use client'
import type { TransactionType } from '@/lib/types'

interface Props {
  value: TransactionType
  onChange: (v: TransactionType) => void
}

export default function TypeToggle({ value, onChange }: Props) {
  return (
    <div className="px-4 pt-3 pb-2">
      <div className="flex p-1 rounded-2xl" style={{ background: 'var(--color-border)' }}>
        {(['expense', 'income'] as const).map(t => {
          const active = value === t
          const color = t === 'expense' ? 'var(--color-morandi-rose)' : 'var(--color-morandi-mint)'
          return (
            <button
              key={t}
              onClick={() => onChange(t)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? color : 'transparent',
                color: active ? 'white' : 'var(--color-text-muted)',
                boxShadow: active ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
              }}
            >
              {t === 'expense' ? '支出' : '收入'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
