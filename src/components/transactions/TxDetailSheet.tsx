'use client'
import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { X, Trash2, Pencil, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getCategoryIcon } from '@/lib/category-icons'
import type { TxWithRefs, Category, Account, Tag, TransactionType, Currency } from '@/lib/types'

interface Props {
  tx: TxWithRefs
  onClose: () => void
  onDeleted: () => void
  onSaved: () => void
}

type EditState = {
  type: TransactionType
  amount: string
  categoryId: string
  accountId: string
  tagIds: string[]
  note: string
  date: string
}

export default function TxDetailSheet({ tx, onClose, onDeleted, onSaved }: Props) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view')
  const [saving, setSaving] = useState(false)

  // Edit state
  const [edit, setEdit] = useState<EditState>({
    type: tx.type,
    amount: String(tx.amount),
    categoryId: tx.category?.id ?? '',
    accountId: tx.account?.id ?? '',
    tagIds: tx.tags.map(t => t.id),
    note: tx.note ?? '',
    date: tx.date,
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [tags, setTags] = useState<Tag[]>([])

  useEffect(() => {
    if (mode !== 'edit') return
    Promise.all([
      supabase.from('categories').select('*').eq('type', edit.type).order('sort_order'),
      supabase.from('accounts').select('*').order('sort_order'),
      supabase.from('tags').select('*').order('use_count', { ascending: false }),
    ]).then(([{ data: cats }, { data: accs }, { data: tgs }]) => {
      setCategories((cats ?? []) as Category[])
      setAccounts((accs ?? []) as Account[])
      setTags((tgs ?? []) as Tag[])
    })
  }, [mode, edit.type])

  // ── 删除 ──
  async function handleDelete() {
    setSaving(true)
    try {
      // 回滚账户余额
      if (tx.account) {
        const { data: acc } = await supabase.from('accounts').select('balance').eq('id', tx.account.id).single()
        if (acc) {
          const rollback = tx.type === 'expense' ? Number(tx.amount) : -Number(tx.amount)
          await supabase.from('accounts').update({ balance: Number(acc.balance) + rollback }).eq('id', tx.account.id)
        }
      }
      await supabase.from('transactions').delete().eq('id', tx.id)
      onDeleted()
    } finally {
      setSaving(false)
    }
  }

  // ── 保存编辑 ──
  async function handleSave() {
    const newAmount = parseFloat(edit.amount)
    if (isNaN(newAmount) || newAmount <= 0 || !edit.categoryId || !edit.accountId) return
    setSaving(true)

    try {
      const oldAccountId = tx.account?.id
      const newAccountId = edit.accountId
      const changed = oldAccountId !== newAccountId || Number(tx.amount) !== newAmount || tx.type !== edit.type

      // 1. 回滚旧账户
      if (changed && oldAccountId) {
        const { data: oldAcc } = await supabase.from('accounts').select('balance').eq('id', oldAccountId).single()
        if (oldAcc) {
          const rollback = tx.type === 'expense' ? Number(tx.amount) : -Number(tx.amount)
          await supabase.from('accounts').update({ balance: Number(oldAcc.balance) + rollback }).eq('id', oldAccountId)
        }
      }

      // 2. 应用新账户
      if (changed) {
        const { data: newAcc } = await supabase.from('accounts').select('balance').eq('id', newAccountId).single()
        if (newAcc) {
          const delta = edit.type === 'expense' ? -newAmount : newAmount
          await supabase.from('accounts').update({ balance: Number(newAcc.balance) + delta }).eq('id', newAccountId)
        }
      }

      // 3. 更新 transaction
      await supabase.from('transactions').update({
        type: edit.type,
        amount: newAmount,
        category_id: edit.categoryId,
        account_id: edit.accountId,
        note: edit.note.trim() || null,
        date: edit.date,
      }).eq('id', tx.id)

      // 4. 更新标签
      await supabase.from('transaction_tags').delete().eq('transaction_id', tx.id)
      if (edit.tagIds.length > 0) {
        await supabase.from('transaction_tags').insert(
          edit.tagIds.map(tagId => ({ transaction_id: tx.id, tag_id: tagId }))
        )
      }

      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const color = tx.category?.color ?? '#C4A09B'
  const isExpense = tx.type === 'expense'
  const amountFormatted = tx.account?.currency === 'JPY'
    ? `¥${Math.round(Number(tx.amount)).toLocaleString()}`
    : `¥${Number(tx.amount).toFixed(2)}`

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl pb-8 max-h-[90vh] flex flex-col"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 拖动条 */}
        <div className="pt-3 pb-2 flex-shrink-0">
          <div className="w-8 h-1 rounded-full mx-auto" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* ── 查看模式 ── */}
        {mode === 'view' && (
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {/* 金额 + 分类 */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}20`, color }}>
                {getCategoryIcon(tx.category?.name, 22)}
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tx.category?.name ?? '未知'}</p>
                <p className="text-3xl font-light" style={{ color: isExpense ? 'var(--color-morandi-rose)' : 'var(--color-morandi-mint)' }}>
                  {isExpense ? '-' : '+'}{amountFormatted}
                </p>
              </div>
            </div>

            {/* 详情字段 */}
            {[
              { label: '日期', value: dayjs(tx.date).format('YYYY年M月D日') },
              { label: '账户', value: tx.account?.name ?? '—' },
              { label: '备注', value: tx.note ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start py-2.5"
                style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="text-xs w-14 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>{value}</span>
              </div>
            ))}

            {/* 标签 */}
            {tx.tags.length > 0 && (
              <div className="flex items-start py-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <span className="text-xs w-14 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>标签</span>
                <div className="flex flex-wrap gap-1">
                  {tx.tags.map(t => (
                    <span key={t.id} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] mt-3 text-right" style={{ color: 'var(--color-text-muted)' }}>
              记录于 {dayjs(tx.created_at).format('M月D日 HH:mm')}
            </p>
          </div>
        )}

        {/* ── 编辑模式 ── */}
        {mode === 'edit' && (
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
            {/* 类型 */}
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>类型</p>
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button key={t}
                    onClick={() => setEdit(e => ({ ...e, type: t, categoryId: '' }))}
                    className="flex-1 py-2 rounded-xl text-sm font-medium"
                    style={{
                      background: edit.type === t ? 'var(--color-morandi-rose)' : 'var(--color-border)',
                      color: edit.type === t ? 'white' : 'var(--color-text-muted)',
                    }}>
                    {t === 'expense' ? '支出' : '收入'}
                  </button>
                ))}
              </div>
            </div>

            {/* 金额 */}
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>金额</p>
              <input
                type="number"
                inputMode="decimal"
                value={edit.amount}
                onChange={e => setEdit(d => ({ ...d, amount: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-base font-semibold outline-none"
                style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            {/* 分类 */}
            {categories.length > 0 && (
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>分类</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => {
                    const active = edit.categoryId === cat.id
                    return (
                      <button key={cat.id}
                        onClick={() => setEdit(d => ({ ...d, categoryId: cat.id }))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                        style={{
                          background: active ? `${cat.color}25` : 'var(--color-border)',
                          color: active ? cat.color : 'var(--color-text-muted)',
                          border: `1px solid ${active ? cat.color : 'transparent'}`,
                        }}>
                        {getCategoryIcon(cat.name, 12)}
                        {cat.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 账户 */}
            {accounts.length > 0 && (
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>账户</p>
                <div className="flex flex-wrap gap-2">
                  {accounts.map(acc => {
                    const active = edit.accountId === acc.id
                    return (
                      <button key={acc.id}
                        onClick={() => setEdit(d => ({ ...d, accountId: acc.id }))}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium"
                        style={{
                          background: active ? `${acc.color}25` : 'var(--color-border)',
                          color: active ? acc.color : 'var(--color-text-muted)',
                          border: `1px solid ${active ? acc.color : 'transparent'}`,
                        }}>
                        {acc.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 标签 */}
            {tags.length > 0 && (
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>标签</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => {
                    const active = edit.tagIds.includes(tag.id)
                    return (
                      <button key={tag.id}
                        onClick={() => setEdit(d => ({
                          ...d,
                          tagIds: active ? d.tagIds.filter(x => x !== tag.id) : [...d.tagIds, tag.id],
                        }))}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium"
                        style={{
                          background: active ? 'var(--color-morandi-rose)' : 'var(--color-border)',
                          color: active ? 'white' : 'var(--color-text-muted)',
                        }}>
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 备注 */}
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>备注</p>
              <input
                type="text"
                value={edit.note}
                onChange={e => setEdit(d => ({ ...d, note: e.target.value }))}
                placeholder="添加备注..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>

            {/* 日期 */}
            <div>
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>日期</p>
              <input
                type="date"
                value={edit.date}
                onChange={e => setEdit(d => ({ ...d, date: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>
        )}

        {/* ── 确认删除 ── */}
        {mode === 'confirm-delete' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
            <span className="text-4xl">🗑️</span>
            <p className="text-sm font-semibold text-center" style={{ color: 'var(--color-text)' }}>
              确认删除这条记录？
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
              账户余额会同步回滚，操作不可撤销
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
                style={{ background: 'var(--color-morandi-rose)' }}
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
                style={{ background: 'var(--color-morandi-rose)', opacity: saving ? 0.7 : 1 }}
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
