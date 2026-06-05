'use client'
import { useState } from 'react'
import { Pencil, Check } from 'lucide-react'
import { useExchangeRate } from '@/hooks/useExchangeRate'

/**
 * 显示格式：100 JPY = X CNY（比「1 CNY = X JPY」对日常生活更直觉）
 * 内部存储依然是 cny_to_jpy；换算关系：displayValue = 100 / rate
 */
export default function ExchangeRateBanner() {
  const { rate, updateRate } = useExchangeRate()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (rate === null) return null

  // 100 JPY 对应多少 CNY，保留 2 位
  const displayValue = (100 / rate).toFixed(2)

  function startEdit() {
    setDraft(displayValue)
    setEditing(true)
  }

  async function save() {
    const n = parseFloat(draft)
    if (!isNaN(n) && n > 0) await updateRate(100 / n)   // 反算 cny_to_jpy
    setEditing(false)
  }

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-1.5 flex-shrink-0"
      style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}
    >
      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>100 JPY =</span>

      {editing ? (
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          onBlur={save}
          className="w-14 text-[12px] text-center font-semibold bg-transparent outline-none border-b"
          style={{ color: 'var(--color-text)', borderColor: 'var(--color-morandi-rose)' }}
        />
      ) : (
        <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text)' }}>
          {displayValue} CNY
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
