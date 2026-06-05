'use client'
import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/lib/types'
import type { FixedExpenseWithAccount } from '@/hooks/useFixedExpenses'

interface Props {
  item?: FixedExpenseWithAccount | null   // null = 新增
  onClose: () => void
  onSaved: () => void
}

export default function FixedExpenseSheet({ item, onClose, onSaved }: Props) {
  const [name, setName]               = useState(item?.name ?? '')
  const [amount, setAmount]           = useState(item ? String(item.amount) : '')
  const [accountId, setAccountId]     = useState(item?.account_id ?? '')
  const [dayOfMonth, setDayOfMonth]   = useState(item?.day_of_month ?? 1)
  const [note, setNote]               = useState(item?.note ?? '')
  const [accounts, setAccounts]       = useState<Account[]>([])
  const [saving, setSaving]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    supabase.from('accounts').select('*').order('sort_order')
      .then(({ data }) => {
        const accs = (data ?? []) as Account[]
        setAccounts(accs)
        if (!accountId && accs.length > 0) setAccountId(accs[0].id)
      })
  }, [])

  const selectedAccount = accounts.find(a => a.id === accountId)
  const currency = selectedAccount?.currency ?? 'JPY'

  async function handleSave() {
    const n = parseFloat(amount)
    if (!name.trim() || isNaN(n) || n <= 0 || !accountId) return
    setSaving(true)

    const payload = {
      name: name.trim(),
      amount: n,
      currency,
      account_id: accountId,
      day_of_month: dayOfMonth,
      note: note.trim() || null,
    }

    if (item) {
      await supabase.from('fixed_expenses').update(payload).eq('id', item.id)
    } else {
      await supabase.from('fixed_expenses').insert(payload)
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  async function handleDelete() {
    if (!item) return
    setSaving(true)
    await supabase.from('fixed_expenses').delete().eq('id', item.id)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl pb-8 max-h-[90vh] flex flex-col"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
          <div className="w-8 h-1 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3"
            style={{ background: 'var(--color-border)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {item ? '编辑固定支出' : '添加固定支出'}
          </p>
          <button onClick={onClose}>
            <X size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {confirmDelete ? (
          /* 删除确认 */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
            <span className="text-3xl">🗑️</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
              确认删除「{item?.name}」？
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              删除后不可恢复
            </p>
            <div className="flex gap-3 mt-2 w-full px-8">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-medium"
                style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white"
                style={{ background: '#E88080', opacity: saving ? 0.7 : 1 }}
              >
                确认删除
              </button>
            </div>
          </div>
        ) : (
          /* 表单 */
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
            {/* 名称 */}
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>名称</p>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="如：房租、Spotify"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            {/* 金额 */}
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>金额</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 px-4 py-2.5 rounded-xl text-lg font-semibold outline-none"
                  style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-sm font-medium px-2" style={{ color: 'var(--color-text-muted)' }}>
                  {currency}
                </span>
              </div>
            </div>

            {/* 支付账户 */}
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>支付账户</p>
              <div className="flex flex-wrap gap-2">
                {accounts.map(acc => {
                  const active = acc.id === accountId
                  return (
                    <button
                      key={acc.id}
                      onClick={() => setAccountId(acc.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                      style={{
                        background: active ? `${acc.color}25` : 'var(--color-border)',
                        color: active ? acc.color : 'var(--color-text-muted)',
                        border: `1px solid ${active ? acc.color : 'transparent'}`,
                      }}
                    >
                      {acc.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 每月扣款日 */}
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>每月扣款日</p>
              <div className="flex flex-wrap gap-1.5">
                {[1, 5, 10, 15, 20, 25, 27].map(d => {
                  const active = d === dayOfMonth
                  return (
                    <button
                      key={d}
                      onClick={() => setDayOfMonth(d)}
                      className="w-10 h-10 rounded-xl text-xs font-medium transition-colors"
                      style={{
                        background: active ? 'var(--color-morandi-rose)' : 'var(--color-border)',
                        color: active ? 'white' : 'var(--color-text-muted)',
                      }}
                    >
                      {d}日
                    </button>
                  )
                })}
                {/* 自定义输入 */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={e => {
                      const v = parseInt(e.target.value)
                      if (v >= 1 && v <= 31) setDayOfMonth(v)
                    }}
                    className="w-12 h-10 rounded-xl text-center text-xs font-medium outline-none"
                    style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>日</span>
                </div>
              </div>
            </div>

            {/* 备注 */}
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>备注（可选）</p>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="添加备注..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        {!confirmDelete && (
          <div className="px-5 pt-3 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
            {item && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-3 rounded-2xl text-sm font-medium flex-shrink-0"
                style={{ background: '#FFE4E1', color: '#C4A09B' }}
              >
                删除
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!name.trim() || !amount || saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-semibold text-white transition-opacity"
              style={{
                background: 'var(--color-morandi-rose)',
                opacity: !name.trim() || !amount || saving ? 0.5 : 1,
              }}
            >
              <Check size={15} />
              {item ? '保存修改' : '添加'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
