import ExchangeRateBanner from '@/components/common/ExchangeRateBanner'

export default function SavingsPage() {
  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <ExchangeRateBanner />
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <span className="text-4xl">🐷</span>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>存钱目标 — 即将上线</p>
      </div>
    </div>
  )
}
