'use client'
import { Calendar, Plus, Minus, Check } from 'lucide-react'

interface Props {
  onKey: (key: string) => void
  categoryColor?: string
  submitting?: boolean
  success?: boolean
  dateLabel?: string
}

const ROWS = [
  ['7', '8', '9', 'date'],
  ['4', '5', '6', '+'],
  ['1', '2', '3', '-'],
  ['.', '0', 'backspace', 'done'],
] as const

function KeyLabel({ k, dateLabel }: { k: string; dateLabel?: string }) {
  if (k === 'date') return (
    <div className="flex flex-col items-center gap-0.5 leading-none">
      <Calendar size={14} />
      <span style={{ fontSize: '10px' }}>{dateLabel ?? '今天'}</span>
    </div>
  )
  if (k === '+') return <Plus size={18} />
  if (k === '-') return <Minus size={18} />
  if (k === 'backspace') return <span style={{ fontSize: '20px' }}>⌫</span>
  return <>{k}</>
}

export default function NumPad({
  onKey,
  categoryColor = '#C4A09B',
  submitting = false,
  success = false,
  dateLabel,
}: Props) {
  return (
    <div
      className="flex-shrink-0 grid grid-cols-4 gap-1.5 p-3 pb-[calc(0.75rem+56px)]"
      style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
    >
      {ROWS.flat().map((key, i) => {
        const isDone = key === 'done'
        const isFn = ['date', '+', '-'].includes(key)
        return (
          <button
            key={i}
            onPointerDown={() => onKey(key)}
            disabled={isDone && submitting}
            className="h-14 rounded-2xl flex items-center justify-center font-medium active:scale-95 transition-transform select-none"
            style={{
              background: isDone
                ? success ? 'var(--color-morandi-mint)' : categoryColor
                : isFn || key === 'backspace'
                  ? 'var(--color-border)'
                  : 'var(--color-card)',
              color: isDone ? 'white' : isFn ? 'var(--color-text-muted)' : 'var(--color-text)',
              fontSize: isDone ? '14px' : '22px',
              fontWeight: isDone ? 600 : 400,
              boxShadow: (!isDone && !isFn && key !== 'backspace') ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {isDone
              ? success ? <Check size={20} /> : '完成'
              : <KeyLabel k={key} dateLabel={dateLabel} />}
          </button>
        )
      })}
    </div>
  )
}
