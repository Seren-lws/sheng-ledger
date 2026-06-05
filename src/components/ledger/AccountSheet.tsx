'use client'
import type { Account } from '@/lib/types'

interface Props {
  accounts: Account[]
  selectedId: string | null
  onSelect: (account: Account) => void
  onClose: () => void
}

export default function AccountSheet({ accounts, selectedId, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl p-4 pb-6"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs font-medium mb-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
          选择账户
        </p>
        <div className="space-y-2">
          {accounts.map(acc => {
            const active = acc.id === selectedId
            return (
              <button
                key={acc.id}
                onClick={() => { onSelect(acc); onClose() }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all"
                style={{
                  background: active ? `${acc.color}15` : 'var(--color-border)',
                  border: `1.5px solid ${active ? acc.color : 'transparent'}`,
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: acc.color }}
                >
                  {acc.name[0]}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{acc.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {acc.currency} · {Number(acc.balance).toLocaleString()}
                  </p>
                </div>
                {active && (
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ background: acc.color }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
