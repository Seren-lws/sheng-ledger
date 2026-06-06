'use client'
import { useState } from 'react'
import { X, ArrowRight, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAccounts } from '@/hooks/useAccounts'
import { useExchangeRate } from '@/hooks/useExchangeRate'

interface Props {
  onClose: () => void
  onDone: () => void
}

export default function TransferSheet({ onClose, onDone }: Props) {
  const { accounts } = useAccounts()
  const { rate } = useExchangeRate()
  const [fromId, setFromId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const fromAcc = accounts.find(a => a.id === fromId)
  const toAcc = accounts.find(a => a.id === toId)
  const num = parseFloat(amount)
  const valid = fromId && toId && fromId !== toId && !isNaN(num) && num > 0

  // 跨币种换算
  const isCrossCurrency = fromAcc && toAcc && fromAcc.currency !== toAcc.currency
  const safeRate = rate ?? 20
  const convertedAmount = fromAcc && toAcc
    ? fromAcc.currency === 'JPY' && toAcc.currency === 'CNY'
      ? num / safeRate
      : fromAcc.currency === 'CNY' && toAcc.currency === 'JPY'
        ? num * safeRate
        : num
    : num

  async function handleTransfer() {
    if (!valid || !fromAcc || !toAcc) return
    setSaving(true)

    // 从来源扣钱
    const { data: freshFrom } = await supabase.from('accounts').select('balance').eq('id', fromId).single()
    if (freshFrom) {
      await supabase.from('accounts').update({ balance: Number(freshFrom.balance) - num }).eq('id', fromId)
    }

    // 往目标加钱（跨币种换算）
    const addAmount = isCrossCurrency ? convertedAmount : num
    const { data: freshTo } = await supabase.from('accounts').select('balance').eq('id', toId).single()
    if (freshTo) {
      await supabase.from('accounts').update({ balance: Number(freshTo.balance) + addAmount }).eq('id', toId)
    }

    setSaving(false)
    setSuccess(true)
    setTimeout(() => { onDone(); onClose() }, 800)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl pb-8"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>账户转账</p>
          <button onClick={onClose}>
            <X size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        <div className="px-5 space-y-4">
          {/* 从 → 到 */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>从</p>
              <div className="flex flex-wrap gap-1.5">
                {accounts.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setFromId(a.id)}
                    className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: fromId === a.id ? a.color : 'var(--color-bg)',
                      color: fromId === a.id ? 'white' : 'var(--color-text-muted)',
                    }}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight size={20} style={{ color: 'var(--color-text-muted)' }} />
          </div>

          <div className="flex-1">
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>到</p>
            <div className="flex flex-wrap gap-1.5">
              {accounts.filter(a => a.id !== fromId).map(a => (
                <button
                  key={a.id}
                  onClick={() => setToId(a.id)}
                  className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: toId === a.id ? a.color : 'var(--color-bg)',
                    color: toId === a.id ? 'white' : 'var(--color-text-muted)',
                  }}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          {/* 金额 */}
          <div>
            <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              转账金额{fromAcc ? `（${fromAcc.currency}）` : ''}
            </p>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl text-xl font-semibold outline-none"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
            />
          </div>

          {/* 跨币种提示 */}
          {isCrossCurrency && num > 0 && (
            <p className="text-xs px-1" style={{ color: 'var(--color-morandi-sky)' }}>
              按当前汇率换算：{fromAcc!.currency} {num.toLocaleString()} → {toAcc!.currency} {convertedAmount.toFixed(fromAcc!.currency === 'JPY' ? 2 : 0)}
            </p>
          )}

          {/* 来源余额提示 */}
          {fromAcc && (
            <p className="text-xs px-1" style={{ color: 'var(--color-text-muted)' }}>
              {fromAcc.name} 当前余额：{fromAcc.currency === 'JPY'
                ? `¥${Math.round(Number(fromAcc.balance)).toLocaleString()}`
                : `¥${Number(fromAcc.balance).toFixed(2)}`}
            </p>
          )}
        </div>

        {/* 确认按钮 */}
        <div className="px-5 mt-5">
          <button
            onClick={handleTransfer}
            disabled={!valid || saving}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: success ? 'var(--color-morandi-sage)' : 'var(--color-morandi-rose)',
              opacity: !valid || saving ? 0.4 : 1,
            }}
          >
            {success ? <><Check size={16} /> 转好啦！</> : saving ? '转账中...' : '确认转账'}
          </button>
        </div>
      </div>
    </div>
  )
}
