/**
 * 连续记账天数 / 打卡日历用的小工具。
 * 「记过账的一天」= 那天有自己记的收支或转账（固定支出自动记的不算）。
 */
import dayjs from 'dayjs'
import { supabase } from './supabase'

/** 今天在日本的日期（服务器在 UTC，也要按东京时间算） */
export function tokyoToday(now = new Date()) {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })   // 'YYYY-MM-DD'
}

/** 东京时间的「HH:mm」 */
export function tokyoTime(now = new Date()) {
  return now.toLocaleTimeString('sv-SE', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })
}

export function isAutoFixed(t: { note?: string | null; fixed_expense_id?: string | null }) {
  return !!t.fixed_expense_id || (t.note ?? '').startsWith('[固定支出]')
}

/** 拉取最近 ~400 天里「自己记过账」的日期 */
export async function fetchRecordDays(): Promise<Set<string>> {
  const since = dayjs().subtract(400, 'day').format('YYYY-MM-DD')
  const [{ data: txs }, { data: trs }] = await Promise.all([
    supabase.from('transactions').select('date, note, fixed_expense_id').gte('date', since),
    supabase.from('transfers').select('date').gte('date', since),
  ])
  const days = new Set<string>()
  for (const t of txs ?? []) if (!isAutoFixed(t)) days.add(t.date)
  for (const t of trs ?? []) days.add(t.date)
  return days
}

/**
 * 连续记账天数：今天记了就从今天往回数；今天还没记就从昨天往回数（今天还没结束，不算断）
 */
export function currentStreak(days: Set<string>, today: string) {
  let d = dayjs(today)
  if (!days.has(today)) d = d.subtract(1, 'day')
  let n = 0
  while (days.has(d.format('YYYY-MM-DD'))) { n++; d = d.subtract(1, 'day') }
  return n
}

/** 最近一次记账是几天前（从没记过返回 null） */
export function daysSinceLast(days: Set<string>, today: string) {
  let d = dayjs(today)
  for (let i = 0; i < 400; i++) {
    if (days.has(d.format('YYYY-MM-DD'))) return i
    d = d.subtract(1, 'day')
  }
  return null
}

/** 某个月里记过账的天数 */
export function daysInMonth(days: Set<string>, month: string /* 'YYYY-MM' */) {
  let n = 0
  for (const d of days) if (d.startsWith(month)) n++
  return n
}

/** 某个月里最长连续记账天数 */
export function longestInMonth(days: Set<string>, month: string) {
  const start = dayjs(`${month}-01`)
  const total = start.daysInMonth()
  let best = 0, run = 0
  for (let i = 0; i < total; i++) {
    if (days.has(start.add(i, 'day').format('YYYY-MM-DD'))) { run++; best = Math.max(best, run) } else run = 0
  }
  return best
}

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 100, 150, 200, 365]
export const COUNT_MILESTONES = [100, 200, 300, 500, 800, 1000, 1500, 2000, 3000]
