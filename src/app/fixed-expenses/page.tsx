'use client'
import { useState, useEffect, useMemo } from 'react'
import dayjs from 'dayjs'
import { Plus, ArrowLeft, Calendar, Building2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useFixedExpenses, type FixedExpenseWithAccount } from '@/hooks/useFixedExpenses'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import ExchangeRateBanner from '@/components/common/ExchangeRateBanner'
import FixedExpenseSheet from '@/components/fixed-expenses/FixedExpenseSheet'

const MORANDI_COLORS = [
  '#C4A09B', '#C9A88A', '#CBBEA6', '#A3AB8E',
  '#9FB5A3', '#8FB5B0', '#94ACBE', '#ADA8C6', '#B89EB5',
]

function fmtAmount(amount: number, currency: string) {
  return currency === 'JPY'
    ? `¥${Math.round(amount).toLocaleString()}`
    : `¥${Number(amount).toFixed(2)}`
}

type ViewMode = 'date' | 'account'

export default function FixedExpensesPage() {
  const { items, loading, refresh } = useFixedExpenses()
  const { rate } = useExchangeRate()
  const [viewMode, setViewMode] = useState<ViewMode>('date')
  const [editing, setEditing] = useState<FixedExpenseWithAccount | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  // 本月总支出（计算占比用）
  const [monthlyExpense, setMonthlyExpense] = useState<number | null>(null)
  useEffect(() => {
    const start = dayjs().startOf('month').format('YYYY-MM-DD')
    const end = dayjs().endOf('month').format('YYYY-MM-DD')
    supabase
      .from('transactions')
      .select('amount, currency')
      .eq('type', 'expense')
      .gte('date', start)
      .lte('date', end)
      .then(({ data }) => {
        if (!data) { setMonthlyExpense(0); return }
        const safeRate = rate ?? 20
        const total = data.reduce((s: number, t: any) => {
          const amt = Number(t.amount)
          return s + (t.currency === 'CNY' ? amt * safeRate : amt)
        }, 0)
        setMonthlyExpense(total)
      })
  }, [rate])

  // 固定支出月总额（统一折算 JPY）
  const safeRate = rate ?? 20
  const fixedTotalJpy = useMemo(() =>
    items.reduce((s, it) => s + (it.currency === 'CNY' ? Number(it.amount) * safeRate : Number(it.amount)), 0),
    [items, safeRate]
  )

  // 占比
  const ratio = monthlyExpense && monthlyExpense > 0
    ? Math.min(fixedTotalJpy / monthlyExpense, 1)
    : null

  // 按支付渠道分组
  const groupedByAccount = useMemo(() => {
    const map = new Map<string, { name: string; color: string; items: FixedExpenseWithAccount[]; total: number }>()
    for (const it of items) {
      const key = it.account?.name ?? '未知'
      if (!map.has(key)) {
        map.set(key, { name: key, color: it.account?.color ?? '#C4A09B', items: [], total: 0 })
      }
      const g = map.get(key)!
      g.items.push(it)
      g.total += it.currency === 'CNY' ? Number(it.amount) * safeRate : Number(it.amount)
    }
    return Array.from(map.values())
  }, [items, safeRate])

  // 各项占比（比例条用）
  const itemShares = useMemo(() => {
    if (fixedTotalJpy <= 0) return []
    return items.map((it, i) => {
      const jpyAmt = it.currency === 'CNY' ? Number(it.amount) * safeRate : Number(it.amount)
      return {
        name: it.name,
        ratio: jpyAmt / fixedTotalJpy,
        color: MORANDI_COLORS[i % MORANDI_COLORS.length],
        jpyAmt,
      }
    })
  }, [items, fixedTotalJpy, safeRate])

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <ExchangeRateBanner />

      {/* ── 顶部导航 ── */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 flex-shrink-0">
        <Link href="/profile" className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--color-border)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--color-text-muted)' }} />
        </Link>
        <p className="text-base font-semibold flex-1" style={{ color: 'var(--color-text)' }}>固定支出</p>
        {/* 视图切换 */}
        <div className="flex p-0.5 rounded-lg" style={{ background: 'var(--color-border)' }}>
          <button
            onClick={() => setViewMode('date')}
            className="w-8 h-7 rounded-md flex items-center justify-center transition-colors"
            style={{
              background: viewMode === 'date' ? 'var(--color-card)' : 'transparent',
              color: viewMode === 'date' ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
          >
            <Calendar size={13} />
          </button>
          <button
            onClick={() => setViewMode('account')}
            className="w-8 h-7 rounded-md flex items-center justify-center transition-colors"
            style={{
              background: viewMode === 'account' ? 'var(--color-card)' : 'transparent',
              color: viewMode === 'account' ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
          >
            <Building2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-28">

        {/* ── 汇总卡片 ── */}
        <div className="px-4 mt-2 mb-4">
          <div className="rounded-2xl px-5 py-4" style={{ background: 'var(--color-card)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>每月固定支出</p>
            <p className="text-3xl font-light tracking-tight mb-3" style={{ color: 'var(--color-text)' }}>
              ¥{Math.round(fixedTotalJpy).toLocaleString()}
              <span className="text-sm font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>JPY/月</span>
            </p>

            {/* 占比进度条 */}
            {ratio !== null ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    占本月总支出
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--color-morandi-rose)' }}>
                    {(ratio * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${ratio * 100}%`, background: 'var(--color-morandi-rose)' }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                📊 记账数据积累中，有更多支出记录后展示占比
              </p>
            )}
          </div>
        </div>

        {/* ── 列表 ── */}
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>加载中…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <span className="text-4xl">📌</span>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>还没有固定支出</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              添加房租、订阅等每月固定开销
            </p>
          </div>
        ) : viewMode === 'date' ? (
          /* ─── 按日期视图 ─── */
          <div className="px-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)' }}>
              {items.map((item, i) => {
                const color = MORANDI_COLORS[i % MORANDI_COLORS.length]
                const last = i === items.length - 1
                return (
                  <button
                    key={item.id}
                    onClick={() => setEditing(item)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:opacity-60 transition-opacity"
                    style={{ borderBottom: last ? 'none' : '1px solid var(--color-border)' }}
                  >
                    {/* 彩色圆点 */}
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />

                    {/* 名称 + 账户 + 日期 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-text)' }}>
                        {item.name}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {item.account?.name ?? '—'} · 每月{item.day_of_month}日
                      </p>
                    </div>

                    {/* 金额 */}
                    <p className="text-[15px] font-semibold flex-shrink-0" style={{ color }}>
                      {fmtAmount(item.amount, item.currency)}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          /* ─── 按渠道视图 ─── */
          <div className="px-4 space-y-3">
            {groupedByAccount.map(group => (
              <div key={group.name}>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: group.color }} />
                    <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                      {group.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: group.color }}>
                    ¥{Math.round(group.total).toLocaleString()}
                  </span>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)' }}>
                  {group.items.map((item, j) => {
                    const last = j === group.items.length - 1
                    return (
                      <button
                        key={item.id}
                        onClick={() => setEditing(item)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left active:opacity-60 transition-opacity"
                        style={{ borderBottom: last ? 'none' : '1px solid var(--color-border)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{item.name}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            每月{item.day_of_month}日
                            {item.note && ` · ${item.note}`}
                          </p>
                        </div>
                        <p className="text-sm font-semibold flex-shrink-0" style={{ color: group.color }}>
                          {fmtAmount(item.amount, item.currency)}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 各项占比分析 ── */}
        {items.length > 0 && itemShares.length > 0 && (
          <div className="px-4 mt-5">
            <p className="text-xs font-semibold mb-2 ml-1" style={{ color: 'var(--color-text-muted)' }}>
              支出构成
            </p>

            {/* 横向比例条 */}
            <div className="h-5 rounded-full overflow-hidden flex" style={{ background: 'var(--color-border)' }}>
              {itemShares.map((sh, i) => (
                <div
                  key={i}
                  className="h-full transition-all"
                  style={{ width: `${sh.ratio * 100}%`, background: sh.color, minWidth: sh.ratio > 0 ? '2px' : 0 }}
                />
              ))}
            </div>

            {/* 图例 */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
              {itemShares.map((sh, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: sh.color }} />
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    {sh.name}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text)' }}>
                    {(sh.ratio * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>

            {/* 按渠道小计 */}
            {groupedByAccount.length > 1 && (
              <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: 'var(--color-card)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>按渠道小计</p>
                {groupedByAccount.map(g => (
                  <div key={g.name} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: g.color }} />
                      <span className="text-xs" style={{ color: 'var(--color-text)' }}>{g.name}</span>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: g.color }}>
                      ¥{Math.round(g.total).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 添加按钮 ── */}
        <div className="px-4 mt-5">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white active:opacity-80 transition-opacity"
            style={{ background: 'var(--color-morandi-rose)' }}
          >
            <Plus size={16} />
            添加固定支出
          </button>
        </div>
      </div>

      {/* ── 弹层 ── */}
      {showAdd && (
        <FixedExpenseSheet
          onClose={() => setShowAdd(false)}
          onSaved={refresh}
        />
      )}
      {editing && (
        <FixedExpenseSheet
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
