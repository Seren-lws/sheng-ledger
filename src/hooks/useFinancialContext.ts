import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'

type CategorySum = { name: string; color: string; amount: number }

export type FinancialContext = {
  loading: boolean
  month: string                   // 'YYYY-MM'
  monthlyIncome: number           // JPY
  monthlyExpense: number
  netSavings: number
  savingsRate: number             // 0~1
  totalAssets: number
  freeAssets: number
  fixedExpenseTotal: number
  avg3MonthSavings: number
  expenseByCategory: CategorySum[]
  incomeByCategory: CategorySum[]
  // 趋势（近6月）
  trend: { month: string; income: number; expense: number }[]
  // 账户使用统计
  accountStats: { name: string; color: string; count: number; total: number }[]
  // 上月对比
  lastMonthIncome: number
  lastMonthExpense: number
  rate: number
}

function toJpy(amount: number, currency: string, rate: number): number {
  return currency === 'CNY' ? Number(amount) * rate : Number(amount)
}

export function useFinancialContext(targetMonth?: dayjs.Dayjs) {
  const [data, setData] = useState<FinancialContext | null>(null)

  const load = useCallback(async () => {
    // rate
    const { data: rateRow } = await supabase
      .from('exchange_rates').select('cny_to_jpy')
      .order('updated_at', { ascending: false }).limit(1).maybeSingle()
    const rate = rateRow?.cny_to_jpy ?? 20

    const base = targetMonth ?? dayjs()
    const monthKey = base.format('YYYY-MM')
    const start = base.startOf('month').format('YYYY-MM-DD')
    const end = base.endOf('month').format('YYYY-MM-DD')

    // ── 当月交易 ──
    const { data: txs } = await supabase
      .from('transactions')
      .select('type, amount, currency, account_id, category:categories(name,color), account:accounts(name,color)')
      .gte('date', start).lte('date', end)

    let monthlyIncome = 0, monthlyExpense = 0
    const expMap = new Map<string, CategorySum>()
    const incMap = new Map<string, CategorySum>()
    const accMap = new Map<string, { name: string; color: string; count: number; total: number }>()

    for (const t of txs ?? []) {
      const jpy = toJpy(t.amount, t.currency, rate)
      const cat = Array.isArray(t.category) ? t.category[0] : t.category
      const acc = Array.isArray(t.account) ? t.account[0] : t.account
      const catName = (cat as any)?.name ?? '其他'
      const catColor = (cat as any)?.color ?? '#B89EB5'
      const accName = (acc as any)?.name ?? '未知'
      const accColor = (acc as any)?.color ?? '#C4A09B'

      if (t.type === 'income') {
        monthlyIncome += jpy
        const e = incMap.get(catName) ?? { name: catName, color: catColor, amount: 0 }
        e.color = catColor; e.amount += jpy; incMap.set(catName, e)
      } else {
        monthlyExpense += jpy
        const e = expMap.get(catName) ?? { name: catName, color: catColor, amount: 0 }
        e.color = catColor; e.amount += jpy; expMap.set(catName, e)
      }

      const a = accMap.get(accName) ?? { name: accName, color: accColor, count: 0, total: 0 }
      a.count++; a.total += jpy; accMap.set(accName, a)
    }

    const netSavings = monthlyIncome - monthlyExpense
    const savingsRate = monthlyIncome > 0 ? netSavings / monthlyIncome : 0

    // ── 上月 ──
    const lastM = base.subtract(1, 'month')
    const lStart = lastM.startOf('month').format('YYYY-MM-DD')
    const lEnd = lastM.endOf('month').format('YYYY-MM-DD')
    const { data: lastTxs } = await supabase
      .from('transactions').select('type, amount, currency')
      .gte('date', lStart).lte('date', lEnd)
    let lastMonthIncome = 0, lastMonthExpense = 0
    for (const t of lastTxs ?? []) {
      const jpy = toJpy(t.amount, t.currency, rate)
      if (t.type === 'income') lastMonthIncome += jpy; else lastMonthExpense += jpy
    }

    // ── 近6月趋势 ──
    const trend: { month: string; income: number; expense: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const m = base.subtract(i, 'month')
      const s = m.startOf('month').format('YYYY-MM-DD')
      const e = m.endOf('month').format('YYYY-MM-DD')
      const { data: mt } = await supabase
        .from('transactions').select('type, amount, currency')
        .gte('date', s).lte('date', e)
      let inc = 0, exp = 0
      for (const t of mt ?? []) {
        const jpy = toJpy(t.amount, t.currency, rate)
        if (t.type === 'income') inc += jpy; else exp += jpy
      }
      trend.push({ month: m.format('YYYY-MM'), income: inc, expense: exp })
    }

    // ── 总资产 ──
    const { data: accRows } = await supabase.from('accounts').select('balance, currency')
    const totalAssets = (accRows ?? []).reduce(
      (s: number, a: any) => s + toJpy(a.balance, a.currency, rate), 0)

    // ── 固定支出 ──
    const { data: fxRows } = await supabase.from('fixed_expenses').select('amount, currency')
    const fixedExpenseTotal = (fxRows ?? []).reduce(
      (s: number, f: any) => s + toJpy(f.amount, f.currency, rate), 0)

    // ── 预估生活费 + 可自由存款 ──
    const recent3 = trend.slice(-3)
    const dataMonths = recent3.filter(m => m.expense > 0).length
    const living = dataMonths > 0
      ? recent3.reduce((s, m) => s + Math.max(0, m.expense - fixedExpenseTotal), 0) / dataMonths
      : 0
    const freeAssets = Math.max(0, totalAssets - fixedExpenseTotal - living)

    // ── 近3月月均存款 ──
    const avg3MonthSavings = recent3.reduce((s, m) => s + (m.income - m.expense), 0) / Math.max(recent3.length, 1)

    // sort categories
    const expenseByCategory = Array.from(expMap.values()).sort((a, b) => b.amount - a.amount)
    const incomeByCategory = Array.from(incMap.values()).sort((a, b) => b.amount - a.amount)
    const accountStats = Array.from(accMap.values()).sort((a, b) => b.total - a.total)

    setData({
      loading: false,
      month: monthKey,
      monthlyIncome, monthlyExpense, netSavings, savingsRate,
      totalAssets, freeAssets, fixedExpenseTotal, avg3MonthSavings,
      expenseByCategory, incomeByCategory,
      trend, accountStats,
      lastMonthIncome, lastMonthExpense,
      rate,
    })
  }, [targetMonth])

  useEffect(() => { load() }, [load])
  return { data, refresh: load }
}
