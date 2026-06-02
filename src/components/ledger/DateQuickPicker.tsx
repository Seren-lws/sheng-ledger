'use client'
import dayjs from 'dayjs'

interface Props {
  value: string
  onChange: (date: string) => void
  onOpenCalendar: () => void
  onClose: () => void
}

export default function DateQuickPicker({ value, onChange, onOpenCalendar, onClose }: Props) {
  const options = [
    { label: '今天', date: dayjs().format('YYYY-MM-DD') },
    { label: '昨天', date: dayjs().subtract(1, 'day').format('YYYY-MM-DD') },
    { label: '前天', date: dayjs().subtract(2, 'day').format('YYYY-MM-DD') },
  ]

  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5"
      style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-card)' }}
    >
      {options.map(({ label, date }) => (
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
      <button
        onClick={() => { onOpenCalendar(); onClose() }}
        className="flex-1 py-2 rounded-xl text-sm"
        style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        选日期
      </button>
    </div>
  )
}
