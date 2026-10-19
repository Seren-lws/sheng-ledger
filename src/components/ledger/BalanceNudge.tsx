'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import dayjs from 'dayjs'
import type { Account } from '@/lib/types'
import { fmtMoney } from '@/lib/ledger'

interface Props {
  accounts: Account[]
  onTransfer: (accountId: string) => void
}

const KEY = 'balance_nudge_dismissed'

/** 某个账户余额变成负数时，提醒一下是不是忘了记充值/转账 */
export default function BalanceNudge({ accounts, onTransfer }: Props) {
  const today = dayjs().format('YYYY-MM-DD')
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as { date: string; ids: string[] }
      if (saved.date === today) setDismissed(saved.ids)
    } catch {}
  }, [today])

  const target = accounts.find(a => Number(a.balance) < 0 && !dismissed.includes(a.id))
  if (!target) return null

  function dismiss() {
    const ids = [...dismissed, target!.id]
    setDismissed(ids)
    try { localStorage.setItem(KEY, JSON.stringify({ date: today, ids })) } catch {}
  }

  return (
    <div
      className="mx-4 mt-2 pl-3 pr-2 py-2.5 rounded-xl flex items-center gap-2"
      style={{ background: '#94ACBE18', border: '1px solid #94ACBE40' }}
    >
      <span className="text-base leading-none">💧</span>
      <p className="flex-1 text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
        {target.name} 余额变成 <b>-{fmtMoney(Math.abs(Number(target.balance)), target.currency)}</b> 了，
        是不是从别的账户充过值？
      </p>
      <button
        onClick={() => onTransfer(target.id)}
        className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white"
        style={{ background: 'var(--color-morandi-sky)' }}
      >
        记转账
      </button>
      <button onClick={dismiss} className="flex-shrink-0 p-1" aria-label="今天先不提醒">
        <X size={14} style={{ color: 'var(--color-text-muted)' }} />
      </button>
    </div>
  )
}
