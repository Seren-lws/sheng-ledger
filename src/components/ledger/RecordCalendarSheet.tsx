'use client'
import { useState } from 'react'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { currentStreak, daysInMonth, longestInMonth } from '@/lib/streak'

interface Props {
  days: Set<string>
  onPick: (date: string) => void   // 点某一天 → 切到那天补记
  onClose: () => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** 打卡小日历：记过的日子开一朵花，点空着的那天去补记 */
export default function RecordCalendarSheet({ days, onPick, onClose }: Props) {
  const today = dayjs().format('YYYY-MM-DD')
  const [month, setMonth] = useState(dayjs().startOf('month'))
  const monthKey = month.format('YYYY-MM')
  const isThisMonth = monthKey === today.slice(0, 7)

  const blanks = month.day()   // 1 号前面空几格
  const total = month.daysInMonth()
  const cells: (string | null)[] = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: total }, (_, i) => month.add(i, 'day').format('YYYY-MM-DD')),
  ]

  const count = daysInMonth(days, monthKey)
  const longest = longestInMonth(days, monthKey)
  const streak = currentStreak(days, today)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl px-5 pt-4 pb-[calc(2rem+env(safe-area-inset-bottom))]"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>记账打卡</p>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-muted)' }} /></button>
        </div>

        {/* 小结 */}
        <div className="flex gap-2 mb-4">
          {[
            { label: '现在连续', value: `${streak} 天` },
            { label: isThisMonth ? '本月记了' : `${month.month() + 1}月记了`, value: `${count} 天` },
            { label: '这个月最长连续', value: `${longest} 天` },
          ].map(s => (
            <div key={s.label} className="flex-1 px-3 py-2 rounded-xl" style={{ background: 'var(--color-bg)' }}>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{s.label}</p>
              <p className="text-base font-semibold" style={{ color: 'var(--color-morandi-rose)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* 月份切换 */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setMonth(m => m.subtract(1, 'month'))}
            className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--color-border)' }}>
            <ChevronLeft size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{month.format('YYYY年M月')}</span>
          <button onClick={() => !isThisMonth && setMonth(m => m.add(1, 'month'))}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-border)', opacity: isThisMonth ? 0.3 : 1 }}>
            <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* 日历 */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map(w => (
            <span key={w} className="text-[10px] py-1" style={{ color: 'var(--color-text-muted)' }}>{w}</span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} />
            const recorded = days.has(d)
            const future = d > today
            const isToday = d === today
            return (
              <button
                key={d}
                disabled={future}
                onClick={() => onPick(d)}
                className="aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5"
                style={{
                  background: recorded ? '#C4A09B18' : 'transparent',
                  border: isToday ? '1.5px solid var(--color-morandi-rose)' : '1.5px solid transparent',
                  opacity: future ? 0.3 : 1,
                }}
              >
                <span className="text-[11px] leading-none" style={{ color: recorded ? 'var(--color-morandi-rose)' : 'var(--color-text-muted)' }}>
                  {Number(d.slice(8))}
                </span>
                <span className="text-sm leading-none h-4">{recorded ? '🌸' : ''}</span>
              </button>
            )
          })}
        </div>

        <p className="text-[11px] text-center mt-3" style={{ color: 'var(--color-text-muted)' }}>
          点空着的那天，就能直接补记那天的账
        </p>
      </div>
    </div>
  )
}
