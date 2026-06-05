'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getCategoryIcon } from '@/lib/category-icons'
import { DEFAULT_TX_FILTER } from '@/lib/types'
import type { TxWithRefs, TxFilter } from '@/lib/types'
import ExchangeRateBanner from '@/components/common/ExchangeRateBanner'
import FilterPanel from '@/components/transactions/FilterPanel'
import TxDetailSheet from '@/components/transactions/TxDetailSheet'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function fmtAmount(amount: number, currency: string) {
  return currency === 'JPY'
    ? `¥${Math.round(amount).toLocaleString()}`
    : `¥${Number(amount).toFixed(2)}`
}

// 计算本次请求的起止日
function getRange(month: dayjs.Dayjs, filter: TxFilter) {
  if (filter.dateMode === 'week') {
    return { start: dayjs().subtract(6, 'day').format('YYYY-MM-DD'), end: dayjs().format('YYYY-MM-DD') }
  }
  if (filter.dateMode === 'custom' && filter.customStart && filter.customEnd) {
    return { start: filter.customStart, end: filter.customEnd }
  }
  // 'month' — customStart='last' 表示上月
  const m = filter.customStart === 'last' ? month.subtract(1, 'month') : month
  return { start: m.startOf('month').format('YYYY-MM-DD'), end: m.endOf('month').format('YYYY-MM-DD') }
}

export default function TransactionsPage() {
  const [month, setMonth] = useState(dayjs().startOf('month'))
  const [filter, setFilter] = useState<TxFilter>(DEFAULT_TX_FILTER)
  const [rows, setRows] = useState<TxWithRefs[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [selectedTx, setSelectedTx] = useState<TxWithRefs | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // ── 数据加载 ──
  const loadData = useCallback(async () => {
    setLoading(true)
    const { start, end } = getRange(month, filter)

    let q = supabase
      .from('transactions')
      .select(`
        id, type, amount, currency, note, date, created_at,
        category:categories(id, name, color),
        account:accounts(id, name, currency, color),
        transaction_tags(tags(id, name))
      `)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filter.type !== 'all') q = q.eq('type', filter.type)
    if (filter.categoryIds.length > 0) q = q.in('category_id', filter.categoryIds)
    if (filter.accountId) q = q.eq('account_id', filter.accountId)

    const { data } = await q

    let results: TxWithRefs[] = (data ?? []).map((tx: any) => ({
      ...tx,
      // Supabase join 有时推断为数组，归一化为对象
      category: Array.isArray(tx.category) ? (tx.category[0] ?? null) : tx.category,
      account:  Array.isArray(tx.account)  ? (tx.account[0]  ?? null) : tx.account,
      tags: (tx.transaction_tags ?? []).map((tt: any) => tt.tags).filter(Boolean),
    }))

    // 搜索（备注 + 标签名）
    if (filter.search.trim()) {
      const q2 = filter.search.toLowerCase()
      results = results.filter(tx =>
        tx.note?.toLowerCase().includes(q2) ||
        tx.tags.some((t: any) => t.name.toLowerCase().includes(q2))
      )
    }
    // 标签多选
    if (filter.tagIds.length > 0) {
      results = results.filter(tx =>
        filter.tagIds.some(tid => tx.tags.some((t: any) => t.id === tid))
      )
    }

    setRows(results)
    setLoading(false)
  }, [month, filter])

  useEffect(() => { loadData() }, [loadData])

  // ── 汇总 ──
  const jpyExpense = rows.filter(t => t.type === 'expense' && t.currency === 'JPY').reduce((s, t) => s + Number(t.amount), 0)
  const jpyIncome  = rows.filter(t => t.type === 'income'  && t.currency === 'JPY').reduce((s, t) => s + Number(t.amount), 0)

  // ── 分组 ──
  const grouped = rows.reduce<Record<string, TxWithRefs[]>>((acc, tx) => {
    ;(acc[tx.date] ??= []).push(tx)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  // ── 是否有生效的筛选（排除 search，它单独显示） ──
  const activeFilters: { key: string; label: string }[] = []
  if (filter.type !== 'all') activeFilters.push({ key: 'type', label: filter.type === 'expense' ? '支出' : '收入' })
  if (filter.categoryIds.length > 0) activeFilters.push({ key: 'category', label: `分类 ×${filter.categoryIds.length}` })
  if (filter.tagIds.length > 0) activeFilters.push({ key: 'tag', label: `标签 ×${filter.tagIds.length}` })
  if (filter.accountId) activeFilters.push({ key: 'account', label: '账户已筛' })
  if (filter.dateMode === 'week') activeFilters.push({ key: 'date', label: '最近7天' })
  if (filter.dateMode === 'custom') activeFilters.push({ key: 'date', label: '自定义日期' })
  if (filter.customStart === 'last') activeFilters.push({ key: 'date', label: '上月' })

  function clearFilterKey(key: string) {
    setFilter(f => {
      const next = { ...f }
      if (key === 'type') next.type = 'all'
      if (key === 'category') next.categoryIds = []
      if (key === 'tag') next.tagIds = []
      if (key === 'account') next.accountId = null
      if (key === 'date') { next.dateMode = 'month'; next.customStart = ''; next.customEnd = '' }
      return next
    })
  }

  // 月份导航是否可用（week/custom 时禁用）
  const monthNavEnabled = filter.dateMode === 'month' && filter.customStart !== 'last'
  const today = dayjs().format('YYYY-MM-DD')

  // 当前显示月（上月时 -1）
  const displayMonth = filter.customStart === 'last' ? month.subtract(1, 'month') : month

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* ── 汇率栏 ── */}
      <ExchangeRateBanner />

      {/* ── 月份导航 + 汇总 ── */}
      <div
        className="flex-shrink-0 px-4 pt-3 pb-3"
        style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => monthNavEnabled && setMonth(m => m.subtract(1, 'month'))}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-border)', opacity: monthNavEnabled ? 1 : 0.3 }}
          >
            <ChevronLeft size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>

          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {filter.dateMode === 'week'
              ? '最近 7 天'
              : filter.dateMode === 'custom'
              ? `${filter.customStart} — ${filter.customEnd}`
              : displayMonth.format('YYYY年M月')}
          </span>

          <button
            onClick={() => monthNavEnabled && month.isBefore(dayjs().startOf('month'), 'month') && setMonth(m => m.add(1, 'month'))}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--color-border)',
              opacity: monthNavEnabled && month.isBefore(dayjs().startOf('month'), 'month') ? 1 : 0.3,
            }}
          >
            <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* 收支汇总 */}
        <div className="flex gap-3">
          {[
            { label: '支出', value: jpyExpense, color: 'var(--color-morandi-rose)' },
            { label: '收入', value: jpyIncome,  color: 'var(--color-morandi-mint)' },
            { label: '结余', value: jpyIncome - jpyExpense,
              color: jpyIncome - jpyExpense >= 0 ? 'var(--color-text)' : 'var(--color-morandi-rose)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 px-3 py-2 rounded-xl" style={{ background: 'var(--color-bg)' }}>
              <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
              <p className="text-base font-semibold" style={{ color }}>
                ¥{Math.round(Math.abs(value)).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 搜索 + 筛选 ── */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        <div className="flex gap-2">
          {/* 搜索框 */}
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <Search size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={filter.search}
              onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
              placeholder="搜索备注、标签..."
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: 'var(--color-text)' }}
            />
            {filter.search && (
              <button onClick={() => setFilter(f => ({ ...f, search: '' }))}>
                <X size={13} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            )}
          </div>

          {/* 筛选按钮 */}
          <button
            onClick={() => setShowFilterPanel(true)}
            className="w-11 rounded-xl flex items-center justify-center flex-shrink-0 relative"
            style={{
              background: activeFilters.length > 0 ? 'var(--color-morandi-rose)' : 'var(--color-card)',
              border: `1px solid ${activeFilters.length > 0 ? 'transparent' : 'var(--color-border)'}`,
            }}
          >
            <SlidersHorizontal size={16} style={{ color: activeFilters.length > 0 ? 'white' : 'var(--color-text-muted)' }} />
            {activeFilters.length > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                style={{ background: '#E88080' }}
              >
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>

        {/* 生效筛选 chips */}
        {activeFilters.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {activeFilters.map(af => (
              <button
                key={af.key}
                onClick={() => clearFilterKey(af.key)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                style={{ background: '#C4A09B20', color: 'var(--color-morandi-rose)' }}
              >
                {af.label}
                <X size={10} />
              </button>
            ))}
            <button
              onClick={() => setFilter(DEFAULT_TX_FILTER)}
              className="px-2.5 py-1 rounded-full text-xs"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-border)' }}
            >
              清除全部
            </button>
          </div>
        )}
      </div>

      {/* ── 流水列表 ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>加载中…</p>
          </div>
        ) : dates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <span className="text-4xl">🌸</span>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {filter.search || activeFilters.length > 0 ? '没有符合条件的记录' : '这里还没有记录'}
            </p>
          </div>
        ) : (
          dates.map(date => {
            const d = dayjs(date)
            const isToday = date === today
            const dayRows = grouped[date]

            // 当天小计
            const dayExpense = dayRows.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
            const dayIncome  = dayRows.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)

            return (
              <div key={date} className="mb-2">
                {/* 日期标题 + 当日小计 */}
                <div className="flex items-center justify-between px-4 pt-4 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      {d.format('M月D日')} 周{WEEKDAYS[d.day()]}
                    </span>
                    {isToday && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--color-morandi-rose)', color: 'white' }}>
                        今天
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {dayExpense > 0 && (
                      <span className="text-xs" style={{ color: 'var(--color-morandi-rose)' }}>
                        -{Math.round(dayExpense).toLocaleString()}
                      </span>
                    )}
                    {dayIncome > 0 && (
                      <span className="text-xs" style={{ color: 'var(--color-morandi-mint)' }}>
                        +{Math.round(dayIncome).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* 当日账单卡片 */}
                <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)' }}>
                  {dayRows.map((tx, i) => {
                    const cat = tx.category
                    const color = cat?.color ?? '#C4A09B'
                    const isExpense = tx.type === 'expense'
                    const currency = tx.account?.currency ?? tx.currency
                    const last = i === dayRows.length - 1

                    // 最多显示 2 个标签
                    const visibleTags = tx.tags.slice(0, 2)
                    const extraTags = tx.tags.length - visibleTags.length

                    return (
                      <button
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left active:opacity-70 transition-opacity"
                        style={{ borderBottom: last ? 'none' : '1px solid var(--color-border)' }}
                      >
                        {/* 分类图标 */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${color}20`, color }}>
                          {getCategoryIcon(cat?.name, 16)}
                        </div>

                        {/* 中间：分类名 + 标签 + 备注 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-text)' }}>
                              {cat?.name ?? '未知'}
                            </p>
                            {visibleTags.map(t => (
                              <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full leading-none"
                                style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                                {t.name}
                              </span>
                            ))}
                            {extraTags > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full leading-none"
                                style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                                +{extraTags}
                              </span>
                            )}
                          </div>
                          {tx.note && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                              {tx.note}
                            </p>
                          )}
                        </div>

                        {/* 金额 + 账户 */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-[15px] font-semibold"
                            style={{ color: isExpense ? 'var(--color-morandi-rose)' : 'var(--color-morandi-mint)' }}>
                            {isExpense ? '-' : '+'}{fmtAmount(tx.amount, currency)}
                          </p>
                          {tx.account && (
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                              {tx.account.name}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── 弹层 ── */}
      {showFilterPanel && (
        <FilterPanel
          filter={filter}
          onApply={setFilter}
          onClose={() => setShowFilterPanel(false)}
        />
      )}
      {selectedTx && (
        <TxDetailSheet
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onDeleted={() => { setSelectedTx(null); loadData() }}
          onSaved={() => { setSelectedTx(null); loadData() }}
        />
      )}
    </div>
  )
}
