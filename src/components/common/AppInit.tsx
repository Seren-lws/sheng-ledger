'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import dayjs from 'dayjs'

/**
 * 全局初始化：
 * 1. 注册 Service Worker
 * 2. 账户排序（一次性）
 * 3. 固定支出自动生成交易记录
 */
export default function AppInit() {
  useEffect(() => {
    // Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // 账户排序（按偏好顺序）
    reorderAccounts()

    // 固定支出自动记账
    autoGenerateFixedExpenses()
  }, [])

  return null
}

/** 按名称关键词给账户排序 */
async function reorderAccounts() {
  const done = localStorage.getItem('accounts_reordered_v1')
  if (done) return

  const { data: accounts } = await supabase.from('accounts').select('id, name').order('sort_order')
  if (!accounts || accounts.length === 0) return

  // 偏好排序：包含关键词的排前面
  const priority = ['paypay', '微信', 'みずほ', '銀行', '银行', '現金', '现金', '支付宝']

  const sorted = [...accounts].sort((a, b) => {
    const aIdx = priority.findIndex(kw => a.name.toLowerCase().includes(kw.toLowerCase()))
    const bIdx = priority.findIndex(kw => b.name.toLowerCase().includes(kw.toLowerCase()))
    const aP = aIdx >= 0 ? aIdx : 99
    const bP = bIdx >= 0 ? bIdx : 99
    return aP - bP
  })

  for (let i = 0; i < sorted.length; i++) {
    await supabase.from('accounts').update({ sort_order: i + 1 }).eq('id', sorted[i].id)
  }

  localStorage.setItem('accounts_reordered_v1', '1')
}

/** 固定支出到了扣款日自动生成交易记录 */
async function autoGenerateFixedExpenses() {
  const today = dayjs()
  const todayDate = today.date()
  const monthStart = today.startOf('month').format('YYYY-MM-DD')
  const monthEnd = today.endOf('month').format('YYYY-MM-DD')

  // 拿所有固定支出
  const { data: fixedList } = await supabase
    .from('fixed_expenses')
    .select('id, name, amount, currency, account_id, day_of_month')
  if (!fixedList || fixedList.length === 0) return

  // 找到或创建「固定支出」分类
  let { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('name', '固定支出')
    .eq('type', 'expense')
    .maybeSingle()

  if (!cat) {
    const { data: newCat } = await supabase
      .from('categories')
      .insert({ name: '固定支出', type: 'expense', color: '#C9A88A', sort_order: 99 })
      .select('id')
      .single()
    cat = newCat
  }
  if (!cat) return

  // 查本月已有的自动生成记录
  const { data: existing } = await supabase
    .from('transactions')
    .select('note')
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .like('note', '[固定支出]%')

  const existingNotes = new Set((existing ?? []).map((t: { note: string }) => t.note))

  for (const fx of fixedList) {
    // 还没到扣款日就跳过
    if (todayDate < fx.day_of_month) continue

    const noteTag = `[固定支出] ${fx.name}`
    if (existingNotes.has(noteTag)) continue

    // 计算实际扣款日期（如果 day_of_month > 当月天数，用月末）
    const lastDay = today.endOf('month').date()
    const actualDay = Math.min(fx.day_of_month, lastDay)
    const txDate = today.format(`YYYY-MM-${String(actualDay).padStart(2, '0')}`)

    // 创建交易
    await supabase.from('transactions').insert({
      type: 'expense',
      amount: fx.amount,
      currency: fx.currency,
      category_id: cat.id,
      account_id: fx.account_id,
      note: noteTag,
      date: txDate,
    })

    // 扣减账户余额
    const { data: acc } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', fx.account_id)
      .single()
    if (acc) {
      await supabase
        .from('accounts')
        .update({ balance: Number(acc.balance) - fx.amount })
        .eq('id', fx.account_id)
    }
  }
}
