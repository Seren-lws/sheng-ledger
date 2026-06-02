import type { Currency } from '@/lib/types'

interface Props {
  expression: string
  currency: Currency
  categoryColor?: string
}

function getResult(expr: string): string | null {
  const clean = expr.replace(/[+\-]$/, '')
  const m = clean.match(/^(\d+\.?\d*)([\+\-])(\d+\.?\d*)$/)
  if (!m) return null
  const a = parseFloat(m[1]), b = parseFloat(m[3])
  const r = m[2] === '+' ? a + b : a - b
  return Number.isInteger(r) ? String(r) : r.toFixed(2)
}

export default function AmountDisplay({ expression, currency, categoryColor = '#C4A09B' }: Props) {
  const hasOp = /\d[+\-]\d/.test(expression)
  const result = hasOp ? getResult(expression) : null

  return (
    <div className="px-5 py-3">
      {result && (
        <p className="text-right text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
          = {result}
        </p>
      )}
      <div className="flex items-baseline justify-end gap-1">
        <span className="text-2xl font-light" style={{ color: 'var(--color-text-muted)' }}>¥</span>
        <span
          className="text-6xl font-light tracking-tight leading-none"
          style={{ color: expression ? 'var(--color-text)' : 'var(--color-text-muted)' }}
        >
          {expression || '0'}
        </span>
        {/* 跟随分类色的光标 */}
        <span
          className="inline-block w-[2.5px] rounded-full self-end mb-1 animate-pulse"
          style={{ height: '44px', background: categoryColor, opacity: 0.85 }}
        />
      </div>
      <p className="text-right text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
        {currency}
      </p>
    </div>
  )
}
