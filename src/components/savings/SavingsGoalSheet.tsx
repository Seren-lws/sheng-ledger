'use client'
import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Currency } from '@/lib/types'

type GoalRow = {
  id: string
  name: string
  target_amount: number
  currency: Currency
  deadline: string | null
}

interface Props {
  goal?: GoalRow | null
  onClose: () => void
  onSaved: () => void
}

export default function SavingsGoalSheet({ goal, onClose, onSaved }: Props) {
  const [name, setName]         = useState(goal?.name ?? '')
  const [amount, setAmount]     = useState(goal ? String(goal.target_amount) : '')
  const [currency, setCurrency] = useState<Currency>(goal?.currency ?? 'JPY')
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [saving, setSaving]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    const n = parseFloat(amount)
    if (!name.trim() || isNaN(n) || n <= 0) return
    setSaving(true)
    const payload = {
      name: name.trim(),
      target_amount: n,
      currency,
      deadline: deadline || null,
    }
    if (goal) {
      await supabase.from('savings_goals').update(payload).eq('id', goal.id)
    } else {
      await supabase.from('savings_goals').insert(payload)
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  async function handleDelete() {
    if (!goal) return
    setSaving(true)
    await supabase.from('savings_goals').delete().eq('id', goal.id)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl pb-8 max-h-[85vh] flex flex-col"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
          <div className="w-8 h-1 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3"
            style={{ background: 'var(--color-border)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {goal ? '编辑目标' : '设定存钱目标'}
          </p>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-muted)' }} /></button>
        </div>

        {confirmDelete ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
            <span className="text-3xl">🗑️</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>删除「{goal?.name}」？</p>
            <div className="flex gap-3 mt-2 w-full px-8">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-medium"
                style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                取消
              </button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white"
                style={{ background: '#E88080', opacity: saving ? 0.7 : 1 }}>
                确认删除
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>目标名称</p>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="如：紧急备用金、旅行基金"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--color-border)', color: 'var(--color-text)' }} />
            </div>
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>目标金额</p>
              <div className="flex gap-2">
                <input type="number" inputMode="decimal" value={amount}
                  onChange={e => setAmount(e.target.value)} placeholder="0"
                  className="flex-1 px-4 py-2.5 rounded-xl text-lg font-semibold outline-none"
                  style={{ background: 'var(--color-border)', color: 'var(--color-text)' }} />
                <div className="flex p-0.5 rounded-xl self-stretch" style={{ background: 'var(--color-border)' }}>
                  {(['JPY', 'CNY'] as Currency[]).map(c => (
                    <button key={c} onClick={() => setCurrency(c)}
                      className="px-3 rounded-lg text-xs font-medium transition-colors"
                      style={{
                        background: currency === c ? 'var(--color-card)' : 'transparent',
                        color: currency === c ? 'var(--color-text)' : 'var(--color-text-muted)',
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>截止日期（可选）</p>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--color-border)', color: 'var(--color-text)' }} />
            </div>
          </div>
        )}

        {!confirmDelete && (
          <div className="px-5 pt-3 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
            {goal && (
              <button onClick={() => setConfirmDelete(true)}
                className="px-4 py-3 rounded-2xl text-sm font-medium flex-shrink-0"
                style={{ background: '#FFE4E1', color: '#C4A09B' }}>
                删除
              </button>
            )}
            <button onClick={handleSave} disabled={!name.trim() || !amount || saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-semibold text-white"
              style={{ background: 'var(--color-morandi-rose)', opacity: !name.trim() || !amount || saving ? 0.5 : 1 }}>
              <Check size={15} />{goal ? '保存' : '设定目标'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
