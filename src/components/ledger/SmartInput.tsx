'use client'
import { Sparkles, Loader2 } from 'lucide-react'
import { useState } from 'react'
import dayjs from 'dayjs'
import type { Tag, Category, Account, TransactionType } from '@/lib/types'

interface ParseResult {
  amount?: string
  type?: TransactionType
  categoryId?: string
  tagIds?: string[]
  accountId?: string
  note?: string
  date?: string
}

interface Props {
  tags: Tag[]
  categories: Category[]
  accounts: Account[]
  onParsed: (result: ParseResult) => void
}

export default function SmartInput({ tags, categories, accounts, onParsed }: Props) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const input = text.trim()
    if (!input) return

    setLoading(true)
    try {
      const res = await fetch('/api/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: input,
          today: dayjs().format('YYYY-MM-DD'),
          categories: categories.map(c => ({ id: c.id, name: c.name, type: c.type })),
          tags: tags.map(t => ({ id: t.id, name: t.name })),
          accounts: accounts.map(a => ({ id: a.id, name: a.name, currency: a.currency })),
        }),
      })

      if (!res.ok) throw new Error()

      const data = await res.json()
      const result: ParseResult = {}

      if (data.amount != null) result.amount = String(data.amount)
      if (data.type) result.type = data.type
      if (data.categoryId) result.categoryId = data.categoryId
      if (data.tagIds?.length > 0) result.tagIds = data.tagIds
      if (data.accountId) result.accountId = data.accountId
      if (data.note) result.note = data.note
      if (data.date) result.date = data.date

      onParsed(result)
      setText('')
    } catch {
      // fallback: do nothing, user can still manually input
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 pt-1 pb-2">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
        style={{
          background: focused ? '#EDE8E3' : 'var(--color-border)',
          border: `1px solid ${focused ? 'var(--color-morandi-rose)' : 'transparent'}`,
        }}
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-morandi-lavender)', flexShrink: 0 }} />
        ) : (
          <Sparkles size={13} style={{ color: 'var(--color-morandi-lavender)', flexShrink: 0 }} />
        )}
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit() } }}
          placeholder={loading ? '识别中...' : 'AI 快记：「paypay 全家买了饭团咖啡 350」'}
          disabled={loading}
          className="flex-1 text-xs bg-transparent outline-none"
          style={{ color: 'var(--color-text)' }}
        />
      </div>
    </div>
  )
}
