'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getCategoryIcon } from '@/lib/category-icons'
import type { TxFilter, Category, Tag, Account, TransactionType } from '@/lib/types'

interface Props {
  filter: TxFilter
  onApply: (f: TxFilter) => void
  onClose: () => void
}

export default function FilterPanel({ filter, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<TxFilter>(filter)
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('tags').select('*').order('use_count', { ascending: false }),
      supabase.from('accounts').select('*').order('sort_order'),
    ]).then(([{ data: cats }, { data: tgs }, { data: accs }]) => {
      setCategories((cats ?? []) as Category[])
      setTags((tgs ?? []) as Tag[])
      setAccounts((accs ?? []) as Account[])
    })
  }, [])

  function toggleCategory(id: string) {
    setDraft(d => ({
      ...d,
      categoryIds: d.categoryIds.includes(id)
        ? d.categoryIds.filter(x => x !== id)
        : [...d.categoryIds, id],
    }))
  }
  function toggleTag(id: string) {
    setDraft(d => ({
      ...d,
      tagIds: d.tagIds.includes(id)
        ? d.tagIds.filter(x => x !== id)
        : [...d.tagIds, id],
    }))
  }

  // 日期快选
  const DATE_OPTS = [
    { key: 'month',  label: '本月' },
    { key: 'last',   label: '上月' },
    { key: 'week',   label: '最近7天' },
    { key: 'custom', label: '自定义' },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl pb-8 max-h-[85vh] flex flex-col"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 拖动条 + 标题 */}
        <div className="px-4 pt-3 pb-3 flex-shrink-0">
          <div className="w-8 h-1 rounded-full mx-auto mb-3" style={{ background: 'var(--color-border)' }} />
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>筛选</p>
            <button onClick={onClose}>
              <X size={18} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">

          {/* 类型 */}
          <section>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>类型</p>
            <div className="flex gap-2">
              {(['all', 'expense', 'income'] as const).map(t => {
                const labels = { all: '全部', expense: '支出', income: '收入' }
                const active = draft.type === t
                return (
                  <button
                    key={t}
                    onClick={() => setDraft(d => ({ ...d, type: t }))}
                    className="px-4 py-1.5 rounded-xl text-xs font-medium transition-colors"
                    style={{
                      background: active ? 'var(--color-morandi-rose)' : 'var(--color-border)',
                      color: active ? 'white' : 'var(--color-text-muted)',
                    }}
                  >
                    {labels[t]}
                  </button>
                )
              })}
            </div>
          </section>

          {/* 分类 */}
          {categories.length > 0 && (
            <section>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>分类（可多选）</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => {
                  const active = draft.categoryIds.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                      style={{
                        background: active ? `${cat.color}25` : 'var(--color-border)',
                        color: active ? cat.color : 'var(--color-text-muted)',
                        border: `1px solid ${active ? cat.color : 'transparent'}`,
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        {getCategoryIcon(cat.name, 12)}
                      </span>
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* 标签 */}
          {tags.length > 0 && (
            <section>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>标签（可多选）</p>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => {
                  const active = draft.tagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                      style={{
                        background: active ? 'var(--color-morandi-rose)' : 'var(--color-border)',
                        color: active ? 'white' : 'var(--color-text-muted)',
                      }}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* 账户 */}
          {accounts.length > 0 && (
            <section>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>账户（单选）</p>
              <div className="flex flex-wrap gap-2">
                {accounts.map(acc => {
                  const active = draft.accountId === acc.id
                  return (
                    <button
                      key={acc.id}
                      onClick={() => setDraft(d => ({ ...d, accountId: active ? null : acc.id }))}
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
            </section>
          )}

          {/* 日期范围 */}
          <section>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>日期范围</p>
            <div className="flex gap-2 flex-wrap">
              {DATE_OPTS.map(opt => {
                const active = draft.dateMode === opt.key || (opt.key === 'last' && draft.dateMode === 'month')
                // 特殊处理：本月/上月都是 'month' mode，用 customStart 区分
                const isLast = opt.key === 'last'
                const isActive = isLast
                  ? (draft.dateMode === 'month' && draft.customStart === 'last')
                  : draft.dateMode === opt.key && draft.customStart !== 'last'
                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      if (opt.key === 'last') {
                        setDraft(d => ({ ...d, dateMode: 'month', customStart: 'last', customEnd: '' }))
                      } else if (opt.key === 'month') {
                        setDraft(d => ({ ...d, dateMode: 'month', customStart: '', customEnd: '' }))
                      } else {
                        setDraft(d => ({ ...d, dateMode: opt.key as TxFilter['dateMode'], customStart: '', customEnd: '' }))
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                    style={{
                      background: isActive ? 'var(--color-morandi-rose)' : 'var(--color-border)',
                      color: isActive ? 'white' : 'var(--color-text-muted)',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {/* 自定义日期 */}
            {draft.dateMode === 'custom' && (
              <div className="flex gap-2 mt-2">
                <input
                  type="date"
                  value={draft.customStart}
                  onChange={e => setDraft(d => ({ ...d, customStart: e.target.value }))}
                  className="flex-1 text-xs px-3 py-2 rounded-xl outline-none"
                  style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-xs self-center" style={{ color: 'var(--color-text-muted)' }}>至</span>
                <input
                  type="date"
                  value={draft.customEnd}
                  onChange={e => setDraft(d => ({ ...d, customEnd: e.target.value }))}
                  className="flex-1 text-xs px-3 py-2 rounded-xl outline-none"
                  style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            )}
          </section>
        </div>

        {/* 底部按钮 */}
        <div className="px-4 pt-3 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={() => setDraft({ search: draft.search, type: 'all', categoryIds: [], tagIds: [], accountId: null, dateMode: 'month', customStart: '', customEnd: '' })}
            className="flex-1 py-3 rounded-2xl text-sm font-medium"
            style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            清除全部
          </button>
          <button
            onClick={() => { onApply(draft); onClose() }}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-white"
            style={{ background: 'var(--color-morandi-rose)' }}
          >
            应用筛选
          </button>
        </div>
      </div>
    </div>
  )
}
