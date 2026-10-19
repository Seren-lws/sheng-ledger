'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { generateFixedExpenses } from '@/lib/ledger'
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

    // 固定支出自动记账：数据库按「哪一项 + 哪个月」只记一次，没打开 app 的月份也会补上
    generateFixedExpenses(dayjs().format('YYYY-MM-DD'))
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
