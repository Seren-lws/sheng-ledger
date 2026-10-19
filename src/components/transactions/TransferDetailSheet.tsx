'use client'
import { useState } from 'react'
import dayjs from 'dayjs'
import { Trash2, Pencil, Check, ArrowRight, ArrowLeftRight } from 'lucide-react'
import { updateTransfer, deleteTransfer, convert, fmtMoney } from '@/lib/ledger'
import { useAccounts } from '@/hooks/useAccounts'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { useToast } from '@/components/common/Toast'
import type { TransferWithRefs } from '@/lib/types'

interface Props {
  transfer: TransferWithRefs
  onClose: () => void
  onChanged: () => void
}

export default function TransferDetailSheet({ transfer, onClose, onChanged }: Props) {
  const toast = useToast()
  const { accounts } = useAccounts()
  const { rate } = useExchangeRate()
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view')
  const [saving, setSaving] = useState(false)

  const [fromId, setFromId] = useState(transfer.from_account?.id ?? '')
  const [toId, setToId] = useState(transfer.to_account?.id ?? '')
  const [fromAmount, setFromAmount] = useState(String(transfer.from_amount))
  const [toAmount, setToAmount] = useState(String(transfer.to_amount))
  const [note, setNote] = useState(transfer.note ?? '')
  const [date, setDate] = useState(transfer.date)

  const fromAcc = accounts.find(a => a.id === fromId)
  const toAcc = accounts.find(a => a.id === toId)
  const cross = !!fromAcc && !!toAcc && fromAcc.currency !== toAcc.currency

  const fromCur = transfer.from_account?.currency ?? 'JPY'
  const toCur = transfer.to_account?.currency ?? fromCur

  async function handleSave() {
    const fa = parseFloat(fromAmount)
    if (!fromId || !toId || fromId === toId) { toast('选一下从哪个账户转到哪个账户～', { kind: 'error' }); return }
    if (isNaN(fa) || fa <= 0) { toast('金额要大于 0 哦', { kind: 'error' }); return }
    let ta = fa
    if (cross) {
      const typed = parseFloat(toAmount)
      ta = !isNaN(typed) && typed > 0 ? typed : convert(fa, fromAcc!.currency, toAcc!.currency, rate ?? 20)
    }
    setSaving(true)
    const res = await updateTransfer(transfer.id, { fromId, toId, fromAmount: fa, toAmount: ta, note, date })
    setSaving(false)
    if (!res.ok) { toast(res.message, { kind: 'error' }); return }
    onChanged()
  }

  async function handleDelete() {
    setSaving(true)
    const res = await deleteTransfer(transfer.id)
    setSaving(false)
    if (!res.ok) { toast(res.message, { kind: 'error' }); return }
    onChanged()
  }

  const chip = (active: boolean, color: string) => ({
    background: active ? `${color}25` : 'var(--color-border)',
    color: active ? color : 'var(--color-text-muted)',
    border: `1px solid ${active ? color : 'transparent'}`,
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl pb-8 max-h-[90vh] flex flex-col"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="pt-3 pb-2 flex-shrink-0">
          <div className="w-8 h-1 rounded-full mx-auto" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* ── 查看 ── */}
        {mode === 'view' && (
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#94ACBE20', color: 'var(--color-morandi-sky)' }}>
                <ArrowLeftRight size={22} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>转账</p>
                <p className="text-3xl font-light" style={{ color: 'var(--color-morandi-sky)' }}>
                  {fmtMoney(transfer.from_amount, fromCur)}
                </p>
              </div>
            </div>

            {[
              { label: '日期', value: dayjs(transfer.date).format('YYYY年M月D日') },
              { label: '从', value: transfer.from_account?.name ?? '—' },
              { label: '到', value: transfer.to_account?.name ?? '—' },
              ...(fromCur !== toCur ? [{ label: '到账', value: fmtMoney(transfer.to_amount, toCur) + ` ${toCur}` }] : []),
              { label: '备注', value: transfer.note ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start py-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="text-xs w-14 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>{value}</span>
              </div>
            ))}

            <p className="text-[10px] mt-3 text-right" style={{ color: 'var(--color-text-muted)' }}>
              记录于 {dayjs(transfer.created_at).format('M月D日 HH:mm')} · 不算收入也不算支出
            </p>
          </div>
        )}

        {/* ── 编辑 ── */}
        {mode === 'edit' && (
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>从</p>
              <div className="flex flex-wrap gap-2">
                {accounts.map(acc => (
                  <button key={acc.id} onClick={() => setFromId(acc.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium" style={chip(fromId === acc.id, acc.color)}>
                    {acc.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight size={18} style={{ color: 'var(--color-text-muted)' }} />
            </div>

            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>到</p>
              <div className="flex flex-wrap gap-2">
                {accounts.filter(a => a.id !== fromId).map(acc => (
                  <button key={acc.id} onClick={() => setToId(acc.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium" style={chip(toId === acc.id, acc.color)}>
                    {acc.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                转出金额{fromAcc ? `（${fromAcc.currency}）` : ''}
              </p>
              <input
                type="number" inputMode="decimal" value={fromAmount}
                onChange={e => setFromAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-base font-semibold outline-none"
                style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            {cross && (
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  实际到账（{toAcc!.currency}）
                </p>
                <input
                  type="number" inputMode="decimal" value={toAmount}
                  onChange={e => setToAmount(e.target.value)}
                  placeholder={String(convert(parseFloat(fromAmount) || 0, fromAcc!.currency, toAcc!.currency, rate ?? 20))}
                  className="w-full px-4 py-2.5 rounded-xl text-base font-semibold outline-none"
                  style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            )}

            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>备注</p>
              <input
                type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="比如：PayPay 充值"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>日期</p>
              <input
                type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>
        )}

        {/* ── 确认删除 ── */}
        {mode === 'confirm-delete' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3 py-6">
            <span className="text-4xl">🗑️</span>
            <p className="text-sm font-semibold text-center" style={{ color: 'var(--color-text)' }}>
              确认删除这笔转账？
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
              两边账户的余额都会退回去
            </p>
          </div>
        )}

        {/* ── 底部按钮 ── */}
        <div className="px-4 pt-3 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
          {mode === 'view' && (
            <>
              <button
                onClick={() => setMode('confirm-delete')}
                className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-medium flex-shrink-0"
                style={{ background: '#FFE4E1', color: '#C4A09B' }}
              >
                <Trash2 size={15} />
                删除
              </button>
              <button
                onClick={() => setMode('edit')}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-semibold text-white"
                style={{ background: 'var(--color-morandi-sky)' }}
              >
                <Pencil size={15} />
                编辑
              </button>
            </>
          )}
          {mode === 'edit' && (
            <>
              <button
                onClick={() => setMode('view')}
                className="flex-1 py-3 rounded-2xl text-sm font-medium"
                style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-semibold text-white"
                style={{ background: 'var(--color-morandi-sky)', opacity: saving ? 0.7 : 1 }}
              >
                <Check size={15} />
                保存
              </button>
            </>
          )}
          {mode === 'confirm-delete' && (
            <>
              <button
                onClick={() => setMode('view')}
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
