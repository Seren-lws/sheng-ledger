'use client'
import { useState, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'
import type { TransactionType } from '@/lib/types'
import { useCategories } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import { useAccounts } from '@/hooks/useAccounts'
import { useToast } from '@/components/common/Toast'
import TypeToggle from './TypeToggle'
import CategoryPicker from './CategoryPicker'
import AccountSelector from './AccountSelector'
import TagRow from './TagRow'
import TagEditSheet from './TagEditSheet'
import AmountDisplay from './AmountDisplay'
import NumPad from './NumPad'
import DateQuickPicker from './DateQuickPicker'
import DateSheet from './DateSheet'

function evaluate(expr: string): number {
  const clean = expr.replace(/[+\-]$/, '')
  const m = clean.match(/^(\d+\.?\d*)([+\-])(\d+\.?\d*)$/)
  if (m) {
    const a = parseFloat(m[1]), b = parseFloat(m[3])
    const r = m[2] === '+' ? a + b : a - b
    return Math.max(0, r)
  }
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : Math.max(0, n)
}

export default function LedgerForm() {
  const toast = useToast()
  const [type, setType] = useState<TransactionType>('expense')
  const [expression, setExpression] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [accountId, setAccountId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [showDateQuick, setShowDateQuick] = useState(false)
  const [showDateSheet, setShowDateSheet] = useState(false)
  const [showTagEdit, setShowTagEdit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const categories = useCategories(type)
  const { tags, refresh: refreshTags } = useTags()
  const { accounts, refresh: refreshAccounts } = useAccounts()
  const accountInitialized = useRef(false)

  useEffect(() => { setCategoryId(null) }, [type])

  useEffect(() => {
    if (categories.length > 0 && !categoryId) setCategoryId(categories[0].id)
  }, [categories, categoryId])

  useEffect(() => {
    if (accounts.length > 0 && !accountInitialized.current) {
      setAccountId(accounts[0].id)
      accountInitialized.current = true
    }
  }, [accounts])

  const selectedCategory = categories.find(c => c.id === categoryId)
  const selectedAccount = accounts.find(a => a.id === accountId)
  const categoryColor = selectedCategory?.color ?? '#C4A09B'

  const today = dayjs().format('YYYY-MM-DD')
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  const dayBefore = dayjs().subtract(2, 'day').format('YYYY-MM-DD')
  const dateLabel =
    date === today ? '今天'
    : date === yesterday ? '昨天'
    : date === dayBefore ? '前天'
    : dayjs(date).format('M/D')

  function handleKey(key: string) {
    if (key === 'done') { handleSubmit(); return }
    if (key === 'date') { setShowDateQuick(p => !p); return }
    if (key === 'backspace') { setExpression(p => p.slice(0, -1)); return }

    if (key === '+' || key === '-') {
      setExpression(p => {
        if (!p) return p
        if (/[+\-]$/.test(p)) return p.slice(0, -1) + key   // replace trailing op
        if (/\d[+\-]\d/.test(p)) return p                    // already has complete expr
        return p + key
      })
      return
    }

    if (key === '.') {
      setExpression(p => {
        const lastOp = Math.max(p.lastIndexOf('+'), p.lastIndexOf('-'))
        const segment = lastOp >= 0 ? p.slice(lastOp + 1) : p
        if (segment.includes('.')) return p
        if (p === '' || /[+\-]$/.test(p)) return p + '0.'
        return p + '.'
      })
      return
    }

    // digit
    setExpression(p => p.length >= 12 ? p : p + key)
  }

  async function handleSubmit() {
    const amount = evaluate(expression)
    if (amount <= 0 || !categoryId || !accountId || !selectedAccount) return
    setSubmitting(true)
    try {
      const { data: tx, error } = await supabase
        .from('transactions')
        .insert({
          type, amount,
          currency: selectedAccount.currency,
          category_id: categoryId,
          account_id: accountId,
          note: note.trim() || null,
          date,
        })
        .select().single()
      if (error) throw error

      if (selectedTagIds.length > 0) {
        await supabase.from('transaction_tags').insert(
          selectedTagIds.map(tagId => ({ transaction_id: tx.id, tag_id: tagId }))
        )
        for (const tagId of selectedTagIds) {
          const tag = tags.find(t => t.id === tagId)
          if (tag) await supabase.from('tags').update({ use_count: tag.use_count + 1 }).eq('id', tagId)
        }
      }

      const { data: fresh } = await supabase.from('accounts').select('balance').eq('id', accountId).single()
      if (fresh) {
        const delta = type === 'income' ? amount : -amount
        await supabase.from('accounts').update({ balance: Number(fresh.balance) + delta }).eq('id', accountId)
      }

      setSuccess(true)
      toast('记好啦！')
      setTimeout(() => {
        setSuccess(false)
        setExpression('')
        setSelectedTagIds([])
        setNote('')
        setDate(dayjs().format('YYYY-MM-DD'))
        refreshAccounts()
        refreshTags()
      }, 700)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* ── 上方可滚动区域 ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* 支出 / 收入 切换 */}
        <TypeToggle value={type} onChange={setType} />

        {/* 分类横滑 */}
        <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

        {/* 分隔线 */}
        <div className="mx-4 my-2.5" style={{ height: '1px', background: 'var(--color-border)' }} />

        {/* 账户行 */}
        <div className="flex items-center min-h-9 px-4 gap-2">
          <span className="text-xs flex-shrink-0 w-7" style={{ color: 'var(--color-text-muted)' }}>账户</span>
          <div className="flex-1 overflow-x-auto no-scrollbar">
            <AccountSelector accounts={accounts} selectedId={accountId} onSelect={setAccountId} />
          </div>
        </div>

        {/* 标签行 */}
        <div className="flex items-start px-4 gap-2 py-1.5">
          <span className="text-xs flex-shrink-0 w-7 pt-1.5" style={{ color: 'var(--color-text-muted)' }}>标签</span>
          <div className="flex-1">
            <TagRow
              tags={tags}
              selectedIds={selectedTagIds}
              categoryColor={categoryColor}
              onToggle={id => setSelectedTagIds(p =>
                p.includes(id) ? p.filter(x => x !== id) : [...p, id]
              )}
              onEdit={() => setShowTagEdit(true)}
            />
          </div>
        </div>

        {/* 备注行 */}
        <div className="flex items-center px-4 gap-2 py-1.5">
          <span className="text-xs flex-shrink-0 w-7" style={{ color: 'var(--color-text-muted)' }}>备注</span>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="添加备注..."
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--color-text)' }}
          />
        </div>

        {/* 底部留白 */}
        <div className="h-2" />
      </div>

      {/* ── 金额大字显示 ── */}
      <AmountDisplay
        expression={expression}
        currency={selectedAccount?.currency ?? 'JPY'}
        categoryColor={categoryColor}
      />

      {/* ── 日期快选（条件显示） ── */}
      {showDateQuick && (
        <DateQuickPicker
          value={date}
          onChange={setDate}
          onOpenCalendar={() => setShowDateSheet(true)}
          onClose={() => setShowDateQuick(false)}
        />
      )}

      {/* ── 数字键盘 ── */}
      <NumPad
        onKey={handleKey}
        categoryColor={categoryColor}
        submitting={submitting}
        success={success}
        dateLabel={dateLabel}
      />

      {/* ── 弹层 ── */}
      {showDateSheet && (
        <DateSheet value={date} onChange={setDate} onClose={() => setShowDateSheet(false)} />
      )}
      {showTagEdit && (
        <TagEditSheet
          tags={tags}
          onRefresh={refreshTags}
          onClose={() => setShowTagEdit(false)}
        />
      )}
    </div>
  )
}
