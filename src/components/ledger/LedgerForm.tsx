'use client'
import { useState, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { Check, Calendar, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { TransactionType } from '@/lib/types'
import { useCategories } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import { useAccounts } from '@/hooks/useAccounts'
import SmartInput from './SmartInput'
import TypeToggle from './TypeToggle'
import CategoryPicker from './CategoryPicker'
import AmountDisplay from './AmountDisplay'
import NumPad from './NumPad'
import AccountSelector from './AccountSelector'
import DateSheet from './DateSheet'
import TagSheet from './TagSheet'

function evaluate(expr: string): number {
  const n = parseFloat(expr.replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : Math.max(0, n)
}

function StepLabel({ n, label, right }: { n: number; label: string; right?: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <div className="flex items-center gap-2">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: 'var(--color-morandi-rose)' }}
        >
          {n}
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      {right && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{right}</span>}
    </div>
  )
}

export default function LedgerForm() {
  const [type, setType] = useState<TransactionType>('expense')
  const [expression, setExpression] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [accountId, setAccountId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [showDateSheet, setShowDateSheet] = useState(false)
  const [showTagSheet, setShowTagSheet] = useState(false)
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
  const tagNameMap = Object.fromEntries(tags.map(t => [t.id, t.name]))

  // 账户余额 5/30 风格
  const balanceLabel = selectedAccount
    ? `${Number(selectedAccount.balance).toLocaleString()} ${selectedAccount.currency}`
    : ''

  function handleKey(key: string) {
    if (key === 'backspace') { setExpression(p => p.slice(0, -1)); return }
    if (key === '.') {
      setExpression(p => p.includes('.') ? p : (p === '' ? '0.' : p + '.'))
      return
    }
    setExpression(p => p.length >= 10 ? p : p + key)
  }

  function handleSmartParsed(result: { amount: string; tagIds: string[]; categoryId?: string }) {
    if (result.amount) setExpression(result.amount)
    if (result.tagIds.length) setSelectedTagIds(result.tagIds)
    if (result.categoryId) setCategoryId(result.categoryId)
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

  const today = dayjs().format('YYYY-MM-DD')
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  const dateLabel = date === today ? '今天' : date === yesterday ? '昨天' : dayjs(date).format('M月D日')

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      {/* 可滚动区域 */}
      <div className="flex-1 overflow-y-auto pb-24">
        <SmartInput tags={tags} categories={categories} onParsed={handleSmartParsed} />

        <TypeToggle value={type} onChange={setType} />

        {/* ① 分类 */}
        <StepLabel n={1} label="选分类" />
        <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

        {/* ② 金额 + 标签 */}
        <StepLabel n={2} label="输金额·加标签" />
        <AmountDisplay
          expression={expression}
          currency={selectedAccount?.currency ?? 'JPY'}
          selectedTagIds={selectedTagIds}
          tagNames={tagNameMap}
          categoryColor={selectedCategory?.color}
          onAddTag={() => setShowTagSheet(true)}
          onRemoveTag={id => setSelectedTagIds(p => p.filter(x => x !== id))}
        />
        <NumPad onKey={handleKey} />

        {/* ③ 账户 */}
        <StepLabel n={3} label="选账户" right={balanceLabel} />
        <AccountSelector accounts={accounts} selectedId={accountId} onSelect={setAccountId} />

        {/* 备注 + 日期 */}
        <div className="px-4 pt-3 pb-1 flex gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <FileText size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="备注（可选）"
              className="flex-1 text-xs bg-transparent outline-none"
              style={{ color: 'var(--color-text)' }}
            />
          </div>
          <button
            onClick={() => setShowDateSheet(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs flex-shrink-0"
            style={{ background: 'var(--color-card)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          >
            <Calendar size={13} />
            {dateLabel}
          </button>
        </div>
      </div>

      {/* 固定底部：记一笔按钮，在 BottomNav 上方 */}
      <div
        className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-md px-4 py-2"
        style={{ background: 'linear-gradient(to top, var(--color-bg) 70%, transparent)' }}
      >
        <button
          onClick={handleSubmit}
          disabled={submitting || evaluate(expression) <= 0}
          className="w-full h-14 rounded-2xl text-white font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{
            background: success
              ? 'var(--color-morandi-mint)'
              : evaluate(expression) > 0
                ? selectedCategory?.color ?? 'var(--color-morandi-rose)'
                : 'var(--color-border)',
            color: evaluate(expression) > 0 ? 'white' : 'var(--color-text-muted)',
          }}
        >
          {success ? <><Check size={18} /> 已记录</> : '记一笔'}
        </button>
      </div>

      {showDateSheet && (
        <DateSheet value={date} onChange={setDate} onClose={() => setShowDateSheet(false)} />
      )}
      {showTagSheet && (
        <TagSheet
          tags={tags}
          selectedIds={selectedTagIds}
          categoryColor={selectedCategory?.color}
          onToggle={id => setSelectedTagIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
          onClose={() => setShowTagSheet(false)}
        />
      )}
    </div>
  )
}
