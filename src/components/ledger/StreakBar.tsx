'use client'
import dayjs from 'dayjs'
import { ChevronRight } from 'lucide-react'
import { currentStreak, daysInMonth } from '@/lib/streak'

interface Props {
  days: Set<string> | null
  onOpenCalendar: () => void
  onBackfillYesterday: () => void
}

/** 记一笔顶部的一行：连续记账天数 / 昨天空着提醒补记 */
export default function StreakBar({ days, onOpenCalendar, onBackfillYesterday }: Props) {
  if (!days) return <div className="h-8" />

  const today = dayjs().format('YYYY-MM-DD')
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  const streak = currentStreak(days, today)
  const monthCount = daysInMonth(days, today.slice(0, 7))
  // 昨天空着、今天也还没记，而且之前有在记 → 提醒补昨天
  const yesterdayEmpty = !days.has(yesterday) && !days.has(today) && days.size > 0

  if (yesterdayEmpty) {
    return (
      <div className="mx-4 mt-2 pl-3 pr-1.5 py-1.5 rounded-xl flex items-center gap-2"
        style={{ background: '#C4A09B14', border: '1px solid #C4A09B30' }}>
        <span className="text-sm leading-none">🌙</span>
        <button onClick={onOpenCalendar} className="flex-1 text-left text-xs" style={{ color: 'var(--color-text)' }}>
          昨天还空着，要补一下吗？
        </button>
        <button
          onClick={onBackfillYesterday}
          className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg text-white"
          style={{ background: 'var(--color-morandi-rose)' }}
        >
          补昨天
        </button>
      </div>
    )
  }

  return (
    <button onClick={onOpenCalendar} className="mx-4 mt-2 px-3 py-1.5 rounded-xl flex items-center gap-2 text-left"
      style={{ background: 'var(--color-card)', width: 'calc(100% - 2rem)' }}>
      <span className="text-sm leading-none">🌸</span>
      <span className="flex-1 text-xs" style={{ color: 'var(--color-text)' }}>
        {streak > 0
          ? <>连续记账 <b style={{ color: 'var(--color-morandi-rose)' }}>{streak}</b> 天</>
          : '今天还没记'}
        <span style={{ color: 'var(--color-text-muted)' }}> · 本月记了 {monthCount} 天</span>
      </span>
      <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
    </button>
  )
}
