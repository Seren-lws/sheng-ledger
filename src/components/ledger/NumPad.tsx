'use client'
import { Calendar, Plus, Minus, Check } from 'lucide-react'

interface Props {
  onKey: (key: string) => void
  submitting: boolean
  success: boolean
}

const ROWS = [
  ['7', '8', '9', 'date'],
  ['4', '5', '6', '+'],
  ['1', '2', '3', '-'],
  ['.', '0', 'backspace', 'done'],
] as const

function KeyLabel({ k }: { k: string }) {
  if (k === 'date') return <Calendar size={17} />
  if (k === '+') return <Plus size={18} />
  if (k === '-') return <Minus size={18} />
  if (k === 'backspace') return <span className="text-xl">⌫</span>
  return <>{k}</>
}

export default function NumPad({ onKey, submitting, success }: Props) {
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
                ? success ? 'var(--color-morandi-mint)' : 'var(--color-morandi-rose)'
                : isFn || key === 'backspace'
                  ? 'var(--color-border)'
                  : 'var(--color-card)',
              color: isDone ? 'white' : isFn ? 'var(--color-text-muted)' : 'var(--color-text)',
              fontSize: isDone ? '14px' : '20px',
              fontWeight: isDone ? 600 : 400,
              boxShadow: isDone || isFn ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            {isDone
              ? success ? <Check size={20} /> : '完成'
              : <KeyLabel k={key} />}
          </button>
        )
      })}
    </div>
  )
}
