'use client'
import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import {
  ChevronLeft, ChevronRight, MoreHorizontal,
  Utensils, Bus, ShoppingBag, Home, Gamepad2,
  Stethoscope, Package, Bot,
  Briefcase, BookOpen, PenLine, Sparkles, Gift,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ICON_MAP: Record<string, React.ReactNode> = {
  '餐饮':      <Utensils size={16} />,
  '交通':      <Bus size={16} />,
  '购物':      <ShoppingBag size={16} />,
  '住房':      <Home size={16} />,
  '娱乐':      <Gamepad2 size={16} />,
  '医疗':      <Stethoscope size={16} />,
  '日用':      <Package size={16} />,
  'AI':        <Bot size={16} />,
  '其他':      <MoreHorizontal size={16} />,
  '工资':      <Briefcase size={16} />,
  '日语课时费': <BookOpen size={16} />,
  '写作收入':  <PenLine size={16} />,
  '采耳收入':  <Sparkles size={16} />,
  '礼物':      <Gift size={16} />,
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

type TxRow = {
  id: string
  type: 'expense' | 'income'
  amount: number
  currency: string
  note: string | null
  date: string
  category: { name: string; color: string } | null
  account: { name: string; currency: string } | null
}

function formatAmount(amount: number, currency: string) {
  if (currency === 'JPY') return `¥${Math.round(amount).toLocaleString()}`
  return `¥${Number(amount).toFixed(2)}`
}

export default function TransactionsPage() {
  const [month, setMonth] = useState(dayjs().startOf('month'))
  const [rows, setRows] = useState<TxRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const start = month.format('YYYY-MM-DD')
    const end   = month.endOf('month').format('YYYY-MM-DD')
    const { data } = await supabase
      .from('transactions')
      .select('id, type, amount, currency, note, date, category:categories(name,color), account:accounts(name,currency)')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setRows((data ?? []) as TxRow[])
    setLoading(false)
  }, [month])

  useEffect(() => { fetch() }, [fetch])

  // 按日期分组
  const grouped = rows.reduce<Record<string, TxRow[]>>((acc, tx) => {
    ;(acc[tx.date] ??= []).push(tx)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  // 月汇总（只算 JPY，CNY 单独列）
  const jpyExpense = rows.filter(t => t.type === 'expense' && t.currency === 'JPY').reduce((s, t) => s + Number(t.amount), 0)
  const jpyIncome  = rows.filter(t => t.type === 'income'  && t.currency === 'JPY').reduce((s, t) => s + Number(t.amount), 0)
  const cnyExpense = rows.filter(t => t.type === 'expense' && t.currency === 'CNY').reduce((s, t) => s + Number(t.amount), 0)
  const cnyIncome  = rows.filter(t => t.type === 'income'  && t.currency === 'CNY').reduce((s, t) => s + Number(t.amount), 0)
  const hasCny = cnyExpense + cnyIncome > 0

  const today = dayjs().format('YYYY-MM-DD')
  const isCurrentMonth = month.isSame(dayjs().startOf('month'))

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* ── 顶部：月份导航 + 汇总 ── */}
      <div
        className="flex-shrink-0 px-4 pt-4 pb-3"
        style={{ background: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}
      >
        {/* 月份切换 */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setMonth(m => m.subtract(1, 'month'))}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-border)' }}
          >
            <ChevronLeft size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {month.format('YYYY年M月')}
          </span>
          <button
            onClick={() => setMonth(m => m.add(1, 'month'))}
            disabled={isCurrentMonth}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity"
            style={{ background: 'var(--color-border)', opacity: isCurrentMonth ? 0.3 : 1 }}
          >
            <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* 收支汇总 */}
        <div className="flex gap-3">
          <div className="flex-1 px-3 py-2 rounded-xl" style={{ background: 'var(--color-bg)' }}>
            <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>支出</p>
            <p className="text-base font-semibold" style={{ color: 'var(--color-morandi-rose)' }}>
              ¥{Math.round(jpyExpense).toLocaleString()}
            </p>
            {hasCny && cnyExpense > 0 && (
              <p className="text-[10px]" style={{ color: 'var(--color-morandi-rose)', opacity: 0.7 }}>
                +¥{cnyExpense.toFixed(0)} CNY
              </p>
            )}
          </div>
          <div className="flex-1 px-3 py-2 rounded-xl" style={{ background: 'var(--color-bg)' }}>
            <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>收入</p>
            <p className="text-base font-semibold" style={{ color: 'var(--color-morandi-mint)' }}>
              ¥{Math.round(jpyIncome).toLocaleString()}
            </p>
            {hasCny && cnyIncome > 0 && (
              <p className="text-[10px]" style={{ color: 'var(--color-morandi-mint)', opacity: 0.7 }}>
                +¥{cnyIncome.toFixed(0)} CNY
              </p>
            )}
          </div>
          <div className="flex-1 px-3 py-2 rounded-xl" style={{ background: 'var(--color-bg)' }}>
            <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>结余</p>
            <p
              className="text-base font-semibold"
              style={{ color: jpyIncome - jpyExpense >= 0 ? 'var(--color-text)' : 'var(--color-morandi-rose)' }}
            >
              ¥{Math.round(jpyIncome - jpyExpense).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── 交易列表 ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>加载中…</p>
          </div>
        ) : dates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <span className="text-4xl">🌸</span>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>这个月还没有记录</p>
          </div>
        ) : (
          dates.map(date => {
            const d = dayjs(date)
            const isToday = date === today
            return (
              <div key={date} className="mb-2">
                {/* 日期标题 */}
                <div className="flex items-center gap-2 px-4 pt-4 pb-1.5">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                    {d.format('M月D日')} 周{WEEKDAYS[d.day()]}
                  </span>
                  {isToday && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--color-morandi-rose)', color: 'white' }}
                    >
                      今天
                    </span>
                  )}
                </div>

                {/* 当日账单卡片 */}
                <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)' }}>
                  {grouped[date].map((tx, i) => {
                    const cat = tx.category
                    const color = cat?.color ?? '#C4A09B'
                    const icon = ICON_MAP[cat?.name ?? ''] ?? <MoreHorizontal size={16} />
                    const isExpense = tx.type === 'expense'
                    const currency = tx.account?.currency ?? tx.currency
                    const last = i === grouped[date].length - 1

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 px-4 py-3"
                        style={{ borderBottom: last ? 'none' : '1px solid var(--color-border)' }}
                      >
                        {/* 分类图标 */}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${color}20`, color }}
                        >
                          {icon}
                        </div>

                        {/* 分类 + 备注 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-text)' }}>
                            {cat?.name ?? '未知'}
                          </p>
                          {tx.note && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                              {tx.note}
                            </p>
                          )}
                        </div>

                        {/* 金额 */}
                        <p
                          className="text-[15px] font-semibold flex-shrink-0"
                          style={{ color: isExpense ? 'var(--color-morandi-rose)' : 'var(--color-morandi-mint)' }}
                        >
                          {isExpense ? '-' : '+'}{formatAmount(tx.amount, currency)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
