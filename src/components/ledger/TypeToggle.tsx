'use client'
import type { LedgerMode } from '@/lib/types'

interface Props {
  value: LedgerMode
  onChange: (v: LedgerMode) => void
}

const OPTIONS: { mode: LedgerMode; label: string; color: string }[] = [
  { mode: 'expense',  label: '支出', color: 'var(--color-morandi-rose)' },
  { mode: 'income',   label: '收入', color: 'var(--color-morandi-mint)' },
  { mode: 'transfer', label: '转账', color: 'var(--color-morandi-sky)' },
]

export default function TypeToggle({ value, onChange }: Props) {
  return (
    <div className="px-4 pt-3 pb-2">
      <div className="flex p-1 rounded-2xl" style={{ background: 'var(--color-border)' }}>
        {OPTIONS.map(({ mode, label, color }) => {
          const active = value === mode
          return (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? color : 'transparent',
                color: active ? 'white' : 'var(--color-text-muted)',
                boxShadow: active ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
