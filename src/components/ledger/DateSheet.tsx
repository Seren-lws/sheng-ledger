'use client'
import { useState } from 'react'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  value: string
  onChange: (date: string) => void
  onClose: () => void
}

export default function DateSheet({ value, onChange, onClose }: Props) {
  const [viewMonth, setViewMonth] = useState(dayjs(value))
  const today = dayjs()

  const quickDates = [
    { label: '今天',  date: today.format('YYYY-MM-DD') },
    { label: '昨天',  date: today.subtract(1, 'day').format('YYYY-MM-DD') },
    { label: '前天',  date: today.subtract(2, 'day').format('YYYY-MM-DD') },
  ]

  const firstDayOfWeek = viewMonth.startOf('month').day()
  const daysInMonth = viewMonth.daysInMonth()
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl p-4 pb-6"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 快捷日期 */}
        <div className="flex gap-2 mb-4">
          {quickDates.map(({ label, date }) => (
            <button
              key={label}
              onClick={() => { onChange(date); onClose() }}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: value === date ? 'var(--color-morandi-rose)' : 'var(--color-border)',
                color: value === date ? 'white' : 'var(--color-text)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 月份导航 */}
        <div className="flex items-center justify-between mb-2 px-1">
          <button
            onClick={() => setViewMonth(m => m.subtract(1, 'month'))}
            className="p-1 rounded-lg"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium">{viewMonth.format('YYYY年M月')}</span>
          <button
            onClick={() => setViewMonth(m => m.add(1, 'month'))}
            className="p-1 rounded-lg"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* 星期头 */}
        <div className="grid grid-cols-7 mb-1">
          {['日','一','二','三','四','五','六'].map(d => (
            <div key={d} className="text-center text-[11px] py-1" style={{ color: 'var(--color-text-muted)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* 日期格子 */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={`p${i}`} />
            const dateStr = viewMonth.date(day).format('YYYY-MM-DD')
            const isSelected = dateStr === value
            const isToday = dateStr === today.format('YYYY-MM-DD')
            return (
              <button
                key={day}
                onClick={() => { onChange(dateStr); onClose() }}
                className="aspect-square flex items-center justify-center text-sm rounded-full mx-auto w-9 h-9"
                style={{
                  background: isSelected ? 'var(--color-morandi-rose)' : 'transparent',
                  color: isSelected ? 'white' : isToday ? 'var(--color-morandi-rose)' : 'var(--color-text)',
                  fontWeight: isToday || isSelected ? 600 : 400,
                }}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
