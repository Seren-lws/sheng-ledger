import type { Currency } from '@/lib/types'

interface Props {
  expression: string
  currency: Currency
}

function getResult(expr: string): number | null {
  const clean = expr.replace(/[+\-]$/, '')
  const m = clean.match(/^(\d+\.?\d*)([\+\-])(\d+\.?\d*)$/)
  if (!m) return null
  const a = parseFloat(m[1]), b = parseFloat(m[3])
  return m[2] === '+' ? a + b : a - b
}

export default function AmountDisplay({ expression, currency }: Props) {
  const hasOp = /\d[+\-]\d/.test(expression)
  const result = hasOp ? getResult(expression) : null

  return (
    <div className="px-5 pt-4 pb-2 text-right">
      {result !== null && (
        <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
          = {currency === 'JPY'
            ? Math.round(result).toLocaleString('ja-JP')
            : result.toFixed(2)}
        </p>
      )}
      <div
        className="text-5xl font-light tracking-tight leading-none"
        style={{ color: expression ? 'var(--color-text)' : 'var(--color-text-muted)' }}
      >
        <span className="text-3xl">¥</span>
        {expression || '0'}
      </div>
      <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
        {currency}
      </p>
    </div>
  )
}
