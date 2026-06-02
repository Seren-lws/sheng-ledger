'use client'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { Tag, Category } from '@/lib/types'

interface Props {
  tags: Tag[]
  categories: Category[]
  onParsed: (result: { amount: string; tagIds: string[]; categoryId?: string }) => void
}

function parse(text: string, tags: Tag[], categories: Category[]) {
  const numbers = text.match(/\d+\.?\d*/g) || []
  const amount = numbers[numbers.length - 1] || ''
  const tagIds = tags.filter(t => text.includes(t.name)).map(t => t.id)
  // 简单关键词→分类映射
  const keywordMap: Record<string, string> = {
    '全家': '餐饮', 'ファミマ': '餐饮', '罗森': '餐饮', 'Lawson': '餐饮',
    '电车': '交通', '地铁': '交通', 'Suica': '交通',
    '亚马逊': '购物', 'Amazon': '购物',
  }
  let categoryId: string | undefined
  for (const [kw, catName] of Object.entries(keywordMap)) {
    if (text.includes(kw)) {
      categoryId = categories.find(c => c.name === catName)?.id
      if (categoryId) break
    }
  }
  return { amount, tagIds, categoryId }
}

export default function SmartInput({ tags, categories, onParsed }: Props) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)

  function handleSubmit() {
    if (!text.trim()) return
    onParsed(parse(text, tags, categories))
    setText('')
  }

  return (
    <div className="px-4 pt-4 pb-2">
      <p className="text-[11px] text-center mb-2 font-medium tracking-widest"
        style={{ color: 'var(--color-text-muted)' }}>快捷输入</p>
      <div
        className="flex items-center gap-2 px-4 py-3 rounded-2xl transition-all"
        style={{
          background: focused ? '#EDE8E3' : 'var(--color-border)',
          border: `1.5px solid ${focused ? 'var(--color-morandi-rose)' : 'transparent'}`,
        }}
      >
        <Sparkles size={16} style={{ color: 'var(--color-morandi-lavender)', flexShrink: 0 }} />
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); handleSubmit() }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder='试试「全家 饭团 咖啡 350」'
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: 'var(--color-text)' }}
        />
      </div>
      <p className="text-[11px] text-center mt-3 mb-1" style={{ color: 'var(--color-text-muted)' }}>
        或手动记
      </p>
    </div>
  )
}
