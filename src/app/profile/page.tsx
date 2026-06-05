'use client'
import { useAccounts } from '@/hooks/useAccounts'
import type { Account } from '@/lib/types'

const ACCOUNT_ICONS: Record<string, string> = {
  'みずほ銀行': '🏦',
  'PayPay':    '📱',
  '现金-日元':  '💴',
  '微信钱包':   '💚',
  '支付宝':    '💙',
}

function AccountCard({ acc }: { acc: Account }) {
  const icon = ACCOUNT_ICONS[acc.name] ?? acc.name[0]
  const balance = Number(acc.balance)
  const formatted = acc.currency === 'JPY'
    ? `¥${Math.round(balance).toLocaleString()}`
    : `¥${balance.toFixed(2)}`

  return (
    <div
      className="flex items-center gap-3 px-4 py-4 rounded-2xl"
      style={{ background: 'var(--color-card)' }}
    >
      {/* 图标圈 */}
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${acc.color}18` }}
      >
        {icon}
      </div>

      {/* 账户名 + 币种 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-text)' }}>
          {acc.name}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          {acc.currency}
        </p>
      </div>

      {/* 余额 */}
      <p className="text-base font-semibold flex-shrink-0" style={{ color: acc.color }}>
        {formatted}
      </p>
    </div>
  )
}

export default function ProfilePage() {
  const { accounts } = useAccounts()

  const jpyAccounts = accounts.filter(a => a.currency === 'JPY')
  const cnyAccounts = accounts.filter(a => a.currency === 'CNY')
  const jpyTotal = jpyAccounts.reduce((s, a) => s + Number(a.balance), 0)
  const cnyTotal = cnyAccounts.reduce((s, a) => s + Number(a.balance), 0)

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-20" style={{ background: 'var(--color-bg)' }}>

      {/* ── 净资产卡片 ── */}
      <div
        className="mx-4 mt-4 px-5 py-5 rounded-3xl"
        style={{ background: 'var(--color-morandi-rose)', color: 'white' }}
      >
        <p className="text-xs opacity-75 mb-1">JPY 总余额</p>
        <p className="text-4xl font-light tracking-tight leading-none">
          ¥{Math.round(jpyTotal).toLocaleString()}
        </p>
        {cnyTotal > 0 && (
          <p className="text-xs opacity-75 mt-2">
            + ¥{cnyTotal.toFixed(2)} CNY
          </p>
        )}
      </div>

      {/* ── JPY 账户 ── */}
      {jpyAccounts.length > 0 && (
        <div className="px-4 mt-5">
          <p className="text-xs font-semibold mb-2 ml-1" style={{ color: 'var(--color-text-muted)' }}>
            日元账户
          </p>
          <div className="flex flex-col gap-2">
            {jpyAccounts.map(acc => <AccountCard key={acc.id} acc={acc} />)}
          </div>
        </div>
      )}

      {/* ── CNY 账户 ── */}
      {cnyAccounts.length > 0 && (
        <div className="px-4 mt-5">
          <p className="text-xs font-semibold mb-2 ml-1" style={{ color: 'var(--color-text-muted)' }}>
            人民币账户
          </p>
          <div className="flex flex-col gap-2">
            {cnyAccounts.map(acc => <AccountCard key={acc.id} acc={acc} />)}
          </div>
        </div>
      )}

      {/* ── 关于 ── */}
      <div className="px-4 mt-6">
        <div
          className="px-4 py-3 rounded-2xl flex items-center justify-between"
          style={{ background: 'var(--color-card)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>晚声记账本</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              记得快 · 看得清 · AI 帮你算
            </p>
          </div>
          <span className="text-2xl">🌸</span>
        </div>
      </div>
    </div>
  )
}
