'use client'
import { useState, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'
import type { TransactionType } from '@/lib/types'
import { useCategories } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import { useAccounts } from '@/hooks/useAccounts'
import TypeToggle from './TypeToggle'
import AmountDisplay from './AmountDisplay'
import CategoryPicker from './CategoryPicker'
import TagPicker from './TagPicker'
import MetaRow from './MetaRow'
import NumPad from './NumPad'
import DateSheet from './DateSheet'
import AccountSheet from './AccountSheet'

function evaluate(expr: string): number {
  const clean = expr.replace(/[+\-]$/, '')
  if (!clean) return 0
  const m = clean.match(/^(\d+\.?\d*)([\+\-])(\d+\.?\d*)$/)
  if (m) {
    const a = parseFloat(m[1]), b = parseFloat(m[3])
    return Math.max(0, m[2] === '+' ? a + b : a - b)
  }
  return Math.max(0, parseFloat(clean) || 0)
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
  const [showAccountSheet, setShowAccountSheet] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const categories = useCategories(type)
  const { tags, refresh: refreshTags } = useTags()
  const { accounts, refresh: refreshAccounts } = useAccounts()

  const accountInitialized = useRef(false)

  // 切换收支类型时重置分类
  useEffect(() => {
    setCategoryId(null)
  }, [type])

  // 分类加载后自动选第一个
  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id)
    }
  }, [categories, categoryId])

  // 账户加载后只初始化一次
  useEffect(() => {
    if (accounts.length > 0 && !accountInitialized.current) {
      setAccountId(accounts[0].id)
      accountInitialized.current = true
    }
  }, [accounts])

  const selectedCategory = categories.find(c => c.id === categoryId)
  const selectedAccount = accounts.find(a => a.id === accountId)

  function handleKey(key: string) {
    if (key === 'date') { setShowDateSheet(true); return }
    if (key === 'done') { handleSubmit(); return }

    if (key === 'backspace') {
      setExpression(p => p.slice(0, -1))
      return
    }
    if (key === '+' || key === '-') {
      setExpression(p => {
        if (!p) return p
        if (/[+\-]$/.test(p)) return p.slice(0, -1) + key
        return p + key
      })
      return
    }
    if (key === '.') {
      setExpression(p => {
        const parts = p.split(/[+\-]/)
        if (parts[parts.length - 1].includes('.')) return p
        return (p === '' ? '0' : p) + '.'
      })
      return
    }
    // 数字
    setExpression(p => (p.length >= 14 ? p : p + key))
  }

  async function handleSubmit() {
    const amount = evaluate(expression)
    if (amount <= 0 || !categoryId || !accountId || !selectedAccount) return

    setSubmitting(true)
    try {
      // 如有运算符先展示结算结果
      if (/\d[+\-]\d/.test(expression)) {
        setExpression(String(amount))
        await new Promise(r => setTimeout(r, 150))
      }

      const { data: tx, error } = await supabase
        .from('transactions')
        .insert({
          type,
          amount,
          currency: selectedAccount.currency,
          category_id: categoryId,
          account_id: accountId,
          note: note.trim() || null,
          date,
        })
        .select()
        .single()

      if (error) throw error

      // 关联标签
      if (selectedTagIds.length > 0) {
        await supabase.from('transaction_tags').insert(
          selectedTagIds.map(tagId => ({ transaction_id: tx.id, tag_id: tagId }))
        )
        // 递增标签使用次数
        for (const tagId of selectedTagIds) {
          const tag = tags.find(t => t.id === tagId)
          if (tag) {
            await supabase.from('tags').update({ use_count: tag.use_count + 1 }).eq('id', tagId)
          }
        }
      }

      // 刷新账户余额（用最新值避免脏读）
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

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <TypeToggle value={type} onChange={setType} />

      <div className="flex-1 overflow-y-auto">
        <AmountDisplay expression={expression} currency={selectedAccount?.currency ?? 'JPY'} />
        <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
        <TagPicker
          tags={tags}
          selectedIds={selectedTagIds}
          categoryColor={selectedCategory?.color}
          onToggle={id =>
            setSelectedTagIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
          }
        />
        <MetaRow
          account={selectedAccount}
          note={note}
          date={date}
          onAccountClick={() => setShowAccountSheet(true)}
          onNoteChange={setNote}
          onDateClick={() => setShowDateSheet(true)}
        />
      </div>

      <NumPad onKey={handleKey} submitting={submitting} success={success} />

      {showDateSheet && (
        <DateSheet value={date} onChange={setDate} onClose={() => setShowDateSheet(false)} />
      )}
      {showAccountSheet && (
        <AccountSheet
          accounts={accounts}
          selectedId={accountId}
          onSelect={acc => setAccountId(acc.id)}
          onClose={() => setShowAccountSheet(false)}
        />
      )}
    </div>
  )
}
