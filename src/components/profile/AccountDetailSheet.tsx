'use client'
import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import { X, Trash2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getCategoryIcon } from '@/lib/category-icons'
import type { Account } from '@/lib/types'

const MORANDI_PALETTE = [
  '#C4A09B', '#C9A88A', '#CBBEA6', '#A3AB8E',
  '#9FB5A3', '#8FB5B0', '#94ACBE', '#ADA8C6', '#B89EB5',
]

interface Props {
  account: Account
  onClose: () => void
  onUpdated: () => void
}

type RawCategory = { name: string; color: string }

type RecentTx = {
  id: string
  type: 'expense' | 'income'
  amount: number
  currency: string
  date: string
  note: string | null
  category: RawCategory | null
}

export default function AccountDetailSheet({ account, onClose, onUpdated }: Props) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view')
  const [name, setName] = useState(account.name)
  const [color, setColor] = useState(account.color)
  const [balance, setBalance] = useState(String(account.balance))
  const [saving, setSaving] = useState(false)
  const [txCount, setTxCount] = useState<number | null>(null)
  const [recentTx, setRecentTx] = useState<RecentTx[]>([])

  const load = useCallback(async () => {
    const [{ count }, { data }] = await Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
      supabase.from('transactions')
        .select('id, type, amount, currency, date, note, category:categories(name,color)')
        .eq('account_id', account.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(8),
    ])
    setTxCount(count ?? 0)
    // Supabase 关联查询可能返回数组（一对多推断），归一化为单对象
    const normalized: RecentTx[] = (data ?? []).map((item: any) => ({
      id: item.id,
      type: item.type as 'expense' | 'income',
      amount: item.amount,
      currency: item.currency,
      date: item.date,
      note: item.note ?? null,
      category: Array.isArray(item.category)
        ? (item.category[0] as RawCategory ?? null)
        : (item.category as RawCategory ?? null),
    }))
    setRecentTx(normalized)
  }, [account.id])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!name.trim()) return
    const b = parseFloat(balance)
    if (isNaN(b)) return
    setSaving(true)
    await supabase.from('accounts').update({ name: name.trim(), color, balance: b }).eq('id', account.id)
    setSaving(false)
    onUpdated()
    onClose()
  }

  async function handleDelete() {
    setSaving(true)
    await supabase.from('accounts').delete().eq('id', account.id)
    setSaving(false)
    onUpdated()
    onClose()
  }

  const fmtAmt = (amt: number, cur: string) =>
    cur === 'JPY' ? `¥${Math.round(amt).toLocaleString()}` : `¥${Number(amt).toFixed(2)}`

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl pb-8 max-h-[88vh] flex flex-col"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 拖动条 + 关闭 */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
          <div className="w-8 h-1 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3"
            style={{ background: 'var(--color-border)' }} />
          <div />
          <button onClick={onClose} className="ml-auto">
            <X size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-5">
          {/* 账户头部 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: `${account.color}20` }}>
              {account.name[0]}
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                {account.name}
              </p>
              <p className="text-2xl font-light" style={{ color: account.color }}>
                {fmtAmt(Number(account.balance), account.currency)}
              </p>
            </div>
          </div>

          {/* 编辑表单 */}
          {mode === 'edit' && (
            <div className="space-y-4 mb-4">
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>账户名</p>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>当前余额（{account.currency}）</p>
                <input
                  type="number"
                  inputMode="decimal"
                  value={balance}
                  onChange={e => setBalance(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-lg font-semibold outline-none"
                  style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>颜色</p>
                <div className="flex gap-2 flex-wrap">
                  {MORANDI_PALETTE.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-full transition-transform active:scale-90"
                      style={{
                        background: c,
                        outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 删除确认 */}
          {mode === 'confirm-delete' && (
            <div className="flex flex-col items-center py-4 gap-2">
              <span className="text-3xl">🗑️</span>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>确认删除账户？</p>
              <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
                此操作不可撤销
              </p>
            </div>
          )}

          {/* 近期流水 */}
          {mode === 'view' && (
            <>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                近期记录 {txCount !== null && `（共 ${txCount} 笔）`}
              </p>
              {recentTx.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                  暂无记录
                </p>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                  {recentTx.map((tx, i) => {
                    const color = tx.category?.color ?? '#C4A09B'
                    const last = i === recentTx.length - 1
                    return (
                      <div key={tx.id} className="flex items-center gap-3 px-3 py-2.5"
                        style={{ borderBottom: last ? 'none' : '1px solid var(--color-border)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${color}20`, color }}>
                          {getCategoryIcon(tx.category?.name, 14)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                            {tx.category?.name ?? '未知'}
                          </p>
                          {tx.note && (
                            <p className="text-[10px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                              {tx.note}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold"
                            style={{ color: tx.type === 'expense' ? 'var(--color-morandi-rose)' : 'var(--color-morandi-mint)' }}>
                            {tx.type === 'expense' ? '-' : '+'}{fmtAmt(tx.amount, tx.currency)}
                          </p>
                          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                            {dayjs(tx.date).format('M/D')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-5 pt-3 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
          {mode === 'view' && (
            <>
              <button
                onClick={() => {
                  if (txCount !== null && txCount > 0) {
                    alert(`该账户还有 ${txCount} 笔记录，无法删除`)
                    return
                  }
                  setMode('confirm-delete')
                }}
                className="flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-medium flex-shrink-0"
                style={{ background: '#FFE4E1', color: '#C4A09B' }}
              >
                <Trash2 size={14} />
                删除
              </button>
              <button
                onClick={() => setMode('edit')}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white"
                style={{ background: 'var(--color-morandi-rose)' }}
              >
                编辑账户
              </button>
            </>
          )}

          {mode === 'edit' && (
            <>
              <button onClick={() => setMode('view')}
                className="flex-1 py-3 rounded-2xl text-sm font-medium"
                style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                取消
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-semibold text-white"
                style={{ background: 'var(--color-morandi-rose)', opacity: saving ? 0.7 : 1 }}>
                <Check size={15} />
                保存
              </button>
            </>
          )}

          {mode === 'confirm-delete' && (
            <>
              <button onClick={() => setMode('view')}
                className="flex-1 py-3 rounded-2xl text-sm font-medium"
                style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                取消
              </button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white"
                style={{ background: '#E88080', opacity: saving ? 0.7 : 1 }}>
                确认删除
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
