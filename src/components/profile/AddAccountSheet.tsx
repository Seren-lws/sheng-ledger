'use client'
import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Currency } from '@/lib/types'

const MORANDI_PALETTE = [
  '#C4A09B', '#C9A88A', '#CBBEA6', '#A3AB8E',
  '#9FB5A3', '#8FB5B0', '#94ACBE', '#ADA8C6', '#B89EB5',
]

interface Props {
  onClose: () => void
  onAdded: () => void
}

export default function AddAccountSheet({ onClose, onAdded }: Props) {
  const [name, setName]         = useState('')
  const [currency, setCurrency] = useState<Currency>('JPY')
  const [balance, setBalance]   = useState('0')
  const [color, setColor]       = useState(MORANDI_PALETTE[0])
  const [saving, setSaving]     = useState(false)

  async function handleAdd() {
    const n = parseFloat(balance)
    if (!name.trim() || isNaN(n)) return
    setSaving(true)

    // 获取当前最大 sort_order
    const { data: existing } = await supabase
      .from('accounts')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = ((existing?.[0]?.sort_order as number | undefined) ?? 0) + 1

    await supabase.from('accounts').insert({
      name: name.trim(),
      currency,
      balance: n,
      color,
      sort_order: nextOrder,
    })

    setSaving(false)
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl pb-8"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="w-8 h-1 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3"
            style={{ background: 'var(--color-border)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>添加账户</p>
          <button onClick={onClose}>
            <X size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        <div className="px-5 space-y-4">
          {/* 账户名 */}
          <div>
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>账户名</p>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如：みずほ銀行"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>

          {/* 币种 */}
          <div>
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>币种</p>
            <div className="flex gap-2">
              {(['JPY', 'CNY'] as Currency[]).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    background: currency === c ? 'var(--color-morandi-rose)' : 'var(--color-border)',
                    color: currency === c ? 'white' : 'var(--color-text-muted)',
                  }}
                >
                  {c === 'JPY' ? '🇯🇵 JPY 日元' : '🇨🇳 CNY 人民币'}
                </button>
              ))}
            </div>
          </div>

          {/* 初始余额 */}
          <div>
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>初始余额</p>
            <input
              type="number"
              inputMode="decimal"
              value={balance}
              onChange={e => setBalance(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-base font-semibold outline-none"
              style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>

          {/* 颜色 */}
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>账户颜色</p>
            <div className="flex gap-2.5 flex-wrap">
              {MORANDI_PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-9 h-9 rounded-full transition-transform active:scale-90"
                  style={{
                    background: c,
                    outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>

            {/* 预览 */}
            <div className="mt-3 px-4 py-3 rounded-xl flex items-center gap-3"
              style={{ background: `${color}15`, border: `1.5px solid ${color}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                style={{ background: `${color}20` }}>
                {name ? name[0] : '?'}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {name || '账户名'}
                </p>
                <p className="text-xs" style={{ color }}>
                  {currency === 'JPY' ? `¥${parseFloat(balance || '0').toLocaleString()}` : `¥${parseFloat(balance || '0').toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 确认按钮 */}
        <div className="px-5 mt-5">
          <button
            onClick={handleAdd}
            disabled={!name.trim() || saving}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: 'var(--color-morandi-rose)',
              opacity: !name.trim() || saving ? 0.5 : 1,
            }}
          >
            <Check size={16} />
            添加账户
          </button>
        </div>
      </div>
    </div>
  )
}
