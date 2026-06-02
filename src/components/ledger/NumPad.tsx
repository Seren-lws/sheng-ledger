'use client'

interface Props {
  onKey: (key: string) => void
}

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'backspace'],
] as const

export default function NumPad({ onKey }: Props) {
  return (
    <div className="px-4 pb-2">
      <div className="grid grid-cols-3 gap-2">
        {ROWS.flat().map((key, i) => (
          <button
            key={i}
            onPointerDown={() => onKey(key)}
            className="h-14 rounded-2xl flex items-center justify-center active:scale-95 transition-transform select-none"
            style={{
              background: key === 'backspace' ? 'var(--color-border)' : 'var(--color-card)',
              color: key === 'backspace' ? 'var(--color-text-muted)' : 'var(--color-text)',
              fontSize: key === 'backspace' ? '18px' : '22px',
              boxShadow: key === 'backspace' ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            {key === 'backspace' ? '⌫' : key}
          </button>
        ))}
      </div>
    </div>
  )
}
