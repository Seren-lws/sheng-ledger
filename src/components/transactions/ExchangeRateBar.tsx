'use client'
import { useState } from 'react'
import { Pencil, Check } from 'lucide-react'
import { useExchangeRate } from '@/hooks/useExchangeRate'

export default function ExchangeRateBar() {
  const { rate, updateRate } = useExchangeRate()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEdit() {
    setDraft(rate?.toString() ?? '')
    setEditing(true)
  }

  async function save() {
    const n = parseFloat(draft)
    if (!isNaN(n) && n > 0) await updateRate(n)
    setEditing(false)
  }

  if (rate === null) return null

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-1.5"
      style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}
    >
      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        1 CNY =
      </span>

      {editing ? (
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          onBlur={save}
          className="w-16 text-[12px] text-center font-semibold bg-transparent outline-none border-b"
          style={{ color: 'var(--color-text)', borderColor: 'var(--color-morandi-rose)' }}
        />
      ) : (
        <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
          {rate} JPY
        </span>
      )}

      <button
        onClick={editing ? save : startEdit}
        className="w-5 h-5 rounded-full flex items-center justify-center"
        style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        {editing ? <Check size={10} /> : <Pencil size={10} />}
      </button>
    </div>
  )
}
