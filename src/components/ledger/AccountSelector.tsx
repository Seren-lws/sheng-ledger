'use client'
import type { Account } from '@/lib/types'

interface Props {
  accounts: Account[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const ACCOUNT_ICONS: Record<string, string> = {
  'みずほ銀行': '🏦', 'PayPay': '📱', '现金-日元': '💴',
  '微信钱包': '💚', '支付宝': '💙',
}

export default function AccountSelector({ accounts, selectedId, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
      {accounts.map(acc => {
        const active = acc.id === selectedId
        return (
          <button
            key={acc.id}
            onClick={() => onSelect(acc.id)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: active ? acc.color : 'var(--color-card)',
              color: active ? 'white' : 'var(--color-text-muted)',
              border: `1.5px solid ${active ? acc.color : 'transparent'}`,
              boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <span className="text-base leading-none">
              {ACCOUNT_ICONS[acc.name] ?? acc.name[0]}
            </span>
            <span>{acc.name}</span>
          </button>
        )
      })}
    </div>
  )
}
