import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'

type MonthSummary = {
  month: string          // 'YYYY-MM'
  income: number         // JPY
  expense: number        // JPY
  net: number            // income - expense
  savingsRate: number    // net / income (0~1), 0 if no income
}

export type SavingsData = {
  loading: boolean

  // 本月
  currentMonth: MonthSummary
  lastMonth: MonthSummary

  // 资产构成
  totalAssets: number           // JPY
  monthlyFixed: number          // JPY — 固定支出合计
  estimatedLiving: number       // JPY — 预估生活费
  freeBalance: number           // JPY — 可自由存款

  // 趋势（近6月）
  trend: MonthSummary[]

  // 统计
  avg3MonthNet: number
  avg3MonthRate: number
  consecutivePositive: number
  growthPct: number | null      // 3个月前的 freeBalance 对比

  dataMonths: number            // 有数据的月份数
  rate: number                  // cny_to_jpy
}

async function fetchRate(): Promise<number> {
  const { data } = await supabase
    .from('exchange_rates')
    .select('cny_to_jpy')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.cny_to_jpy ?? 20
}

function toJpy(amount: number, currency: string, rate: number): number {
  return currency === 'CNY' ? Number(amount) * rate : Number(amount)
}

async function getMonthSummary(
  start: string, end: string, rate: number
): Promise<Omit<MonthSummary, 'month'>> {
  const { data } = await supabase
    .from('transactions')
    .select('type, amount, currency')
    .gte('date', start)
    .lte('date', end)

  let income = 0, expense = 0
  for (const t of data ?? []) {
    const jpy = toJpy(t.amount, t.currency, rate)
    if (t.type === 'income') income += jpy; else expense += jpy
  }
  const net = income - expense
  return { income, expense, net, savingsRate: income > 0 ? net / income : 0 }
}

export function useSavingsData() {
  const [data, setData] = useState<SavingsData | null>(null)

  const load = useCallback(async () => {
    const rate = await fetchRate()
    const now = dayjs()

    // ── 近 6 个月数据 ──
    const months: MonthSummary[] = []
    for (let i = 5; i >= 0; i--) {
      const m = now.subtract(i, 'month')
      const key = m.format('YYYY-MM')
      const start = m.startOf('month').format('YYYY-MM-DD')
      const end = m.endOf('month').format('YYYY-MM-DD')
      const s = await getMonthSummary(start, end, rate)
      months.push({ month: key, ...s })
    }

    const currentMonth = months[months.length - 1]
    const lastMonth = months[months.length - 2]

    // ── 总资产 ──
    const { data: accData } = await supabase.from('accounts').select('balance, currency')
    const totalAssets = (accData ?? []).reduce(
      (s: number, a: any) => s + toJpy(a.balance, a.currency, rate), 0
    )

    // ── 固定支出月总额 ──
    const { data: fxData } = await supabase.from('fixed_expenses').select('amount, currency')
    const monthlyFixed = (fxData ?? []).reduce(
      (s: number, f: any) => s + toJpy(f.amount, f.currency, rate), 0
    )

    // ── 预估生活费（近 3 个月非固定支出月均） ──
    const recentMonths = months.slice(-3)
    const dataMonths = recentMonths.filter(m => m.expense > 0).length
    const totalLiving = recentMonths.reduce((s, m) => s + Math.max(0, m.expense - monthlyFixed), 0)
    const estimatedLiving = dataMonths > 0 ? totalLiving / dataMonths : 0

    // ── 可自由存款 ──
    const freeBalance = Math.max(0, totalAssets - monthlyFixed - estimatedLiving)

    // ── 统计 ──
    const recent3 = months.slice(-3)
    const avg3MonthNet = recent3.reduce((s, m) => s + m.net, 0) / Math.max(recent3.length, 1)
    const rates3 = recent3.filter(m => m.income > 0)
    const avg3MonthRate = rates3.length > 0
      ? rates3.reduce((s, m) => s + m.savingsRate, 0) / rates3.length
      : 0

    // 连续正存款月数（从当月往回数）
    let consecutivePositive = 0
    for (let i = months.length - 1; i >= 0; i--) {
      if (months[i].net > 0) consecutivePositive++; else break
    }

    // 3个月增长率（粗略：用3个月前的 totalAssets - 3*monthlyFixed - estimatedLiving 对比）
    // 简化为净存款累计
    const net3Sum = recent3.reduce((s, m) => s + m.net, 0)
    const oldFree = freeBalance - net3Sum
    const growthPct = oldFree > 0 ? (freeBalance - oldFree) / oldFree : null

    setData({
      loading: false,
      currentMonth,
      lastMonth,
      totalAssets,
      monthlyFixed,
      estimatedLiving,
      freeBalance,
      trend: months,
      avg3MonthNet,
      avg3MonthRate,
      consecutivePositive,
      growthPct,
      dataMonths,
      rate,
    })
  }, [])

  useEffect(() => { load() }, [load])

  return { data, refresh: load }
}
