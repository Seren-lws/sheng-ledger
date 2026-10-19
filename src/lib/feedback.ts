/**
 * 记完一笔之后说什么：今天第几笔、今天花了多少；碰到里程碑来一次大庆祝。
 */
import dayjs from 'dayjs'
import { supabase } from './supabase'
import { toJpy } from './ledger'
import { currentStreak, isAutoFixed, STREAK_MILESTONES, COUNT_MILESTONES } from './streak'
import type { LedgerMode } from './types'

export type Feedback = { text: string; sub?: string; kind: 'success' | 'milestone' }

const STREAK_WORDS: Record<number, [string, string]> = {
  3:   ['连续记账 3 天！', '小习惯开始发芽了 🌱'],
  7:   ['连续记账 7 天！', '整整一周，一天都没落下'],
  14:  ['连续两周！', '记账已经变成你生活里的一部分了'],
  21:  ['连续 21 天！', '都说 21 天能养成一个习惯，你做到了'],
  30:  ['连续记账一个月！', '这份认真，值得一场大烟花'],
  50:  ['连续 50 天！', '你比自己以为的更能坚持'],
  100: ['连续 100 天！', '一百天的日子，都被你好好记下来了'],
  365: ['连续记账一整年！', '一年里的每一天都留下了痕迹'],
}

const COUNT_WORDS: Record<number, string> = {
  100: '一百笔了，账本越来越厚啦',
  300: '每一笔都是认真生活的痕迹',
  500: '五百笔，这本账已经很懂你了',
  1000: '一千笔！这是一本真正的生活日记了',
}

export async function recordFeedback(opts: {
  mode: LedgerMode
  date: string
  daysBefore: Set<string>   // 记这笔之前，记过账的日期
  rate: number
}): Promise<Feedback> {
  const { mode, date, daysBefore, rate } = opts
  const today = dayjs().format('YYYY-MM-DD')
  const isToday = date === today
  const dayLabel = isToday ? '今天' : dayjs(date).format('M月D日')

  // 连续天数有没有跨过里程碑
  const daysAfter = new Set(daysBefore).add(date)
  const before = currentStreak(daysBefore, today)
  const after = currentStreak(daysAfter, today)
  const hit = [...STREAK_MILESTONES].reverse().find(m => before < m && m <= after)
  if (hit) {
    const [text, sub] = STREAK_WORDS[hit] ?? [`连续 ${hit} 天！`, '还在一天天往前走，真好']
    return { text, sub, kind: 'milestone' }
  }

  const filledEmptyDay = !daysBefore.has(date)

  if (mode === 'transfer') {
    if (filledEmptyDay && isToday && after >= 2) return { text: '转好啦！', sub: `连续第 ${after} 天 🌸`, kind: 'success' }
    return { text: '转好啦！', kind: 'success' }
  }

  // 这一天自己记的账 + 总笔数
  const [{ data: dayTx }, { count: total }] = await Promise.all([
    supabase.from('transactions').select('type, amount, currency, rate, note, fixed_expense_id').eq('date', date),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).is('fixed_expense_id', null),
  ])
  const mine = (dayTx ?? []).filter(t => !isAutoFixed(t))
  const n = mine.length
  const spent = mine
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + toJpy(t.amount, t.currency, t.rate ?? rate), 0)

  if (total && COUNT_MILESTONES.includes(total)) {
    return { text: `第 ${total} 笔！`, sub: COUNT_WORDS[total] ?? '每一笔都是认真生活的痕迹', kind: 'milestone' }
  }

  // 补上了以前空着的一天
  if (filledEmptyDay && !isToday) {
    return { text: '补上啦！', sub: `${dayLabel}那天也开花了 🌸`, kind: 'success' }
  }

  // 今天的第一笔，接上了连续天数
  if (filledEmptyDay && isToday && after >= 2) {
    return { text: mode === 'income' ? '进账啦！' : '记好啦！', sub: `今天第一笔 · 连续第 ${after} 天 🌸`, kind: 'success' }
  }

  if (mode === 'income') return { text: '进账啦！', sub: `${dayLabel}第 ${n} 笔`, kind: 'success' }
  return {
    text: '记好啦！',
    sub: `${dayLabel}第 ${n} 笔 · ${isToday ? '今天' : '那天'}一共花了 ¥${Math.round(spent).toLocaleString()}`,
    kind: 'success',
  }
}
