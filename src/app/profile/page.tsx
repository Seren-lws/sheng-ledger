'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, Pencil, Check } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import type { Account } from '@/lib/types'
import ExchangeRateBanner from '@/components/common/ExchangeRateBanner'
import ExportSheet from '@/components/profile/ExportSheet'
import ReminderSetting from '@/components/profile/ReminderSetting'
import AccountDetailSheet from '@/components/profile/AccountDetailSheet'
import AddAccountSheet from '@/components/profile/AddAccountSheet'
import CategoryManageSheet from '@/components/profile/CategoryManageSheet'
import TagManageSheet from '@/components/profile/TagManageSheet'

const ACCOUNT_ICONS: Record<string, string> = {
  'みずほ銀行': '🏦', 'PayPay': '📱', '现金-日元': '💴',
  '微信钱包': '💚', '支付宝': '💙',
}

const MENU_ITEMS = [
  { icon: '📌', label: '固定支出管理', href: '/fixed-expenses', action: null },
  { icon: '🗂️', label: '分类管理', href: null, action: 'category' },
  { icon: '🏷️', label: '标签管理', href: null, action: 'tag' },
  { icon: '📤', label: '数据导出', href: null, action: 'export' },
] as const

export default function ProfilePage() {
  const { accounts, refresh: refreshAccounts } = useAccounts()
  const { rate, updateRate } = useExchangeRate()

  const [baseCurrency, setBaseCurrency] = useState<'JPY' | 'CNY'>('JPY')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showCategory, setShowCategory] = useState(false)
  const [showTag, setShowTag] = useState(false)

  // 汇率编辑
  const [editingRate, setEditingRate] = useState(false)
  const [rateDraft, setRateDraft] = useState('')

  function startEditRate() {
    setRateDraft(displayRate ?? '')   // 以「100 JPY = X CNY」格式预填
    setEditingRate(true)
  }
  // 显示格式：100 JPY = X CNY；存储格式：cny_to_jpy
  const displayRate = rate ? (100 / rate).toFixed(2) : null

  async function saveRate() {
    const n = parseFloat(rateDraft)
    if (!isNaN(n) && n > 0) await updateRate(100 / n)   // 反算 cny_to_jpy
    setEditingRate(false)
  }

  // 资产计算
  const jpyAccounts = accounts.filter(a => a.currency === 'JPY')
  const cnyAccounts = accounts.filter(a => a.currency === 'CNY')
  const jpySum = jpyAccounts.reduce((s, a) => s + Number(a.balance), 0)
  const cnySum = cnyAccounts.reduce((s, a) => s + Number(a.balance), 0)
  const safeRate = rate ?? 1

  const totalInBase = baseCurrency === 'JPY'
    ? jpySum + cnySum * safeRate
    : jpySum / safeRate + cnySum

  const baseLabel = baseCurrency === 'JPY' ? '¥' : '¥'
  const totalFormatted = baseCurrency === 'JPY'
    ? `¥${Math.round(totalInBase).toLocaleString()}`
    : `¥${totalInBase.toFixed(2)}`

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <ExchangeRateBanner />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-28">

        {/* ── 资产总览卡片 ── */}
        <div
          className="mx-4 mt-4 px-5 py-5 rounded-3xl"
          style={{ background: 'var(--color-morandi-rose)', color: 'white' }}
        >
          {/* 标题行 + 切换按钮 */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs opacity-75">总资产</p>
            <button
              onClick={() => setBaseCurrency(c => c === 'JPY' ? 'CNY' : 'JPY')}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.25)' }}
            >
              {baseCurrency === 'JPY' ? 'JPY → CNY' : 'CNY → JPY'}
            </button>
          </div>

          {/* 总额 */}
          <p className="text-4xl font-light tracking-tight leading-none mb-3">
            {totalFormatted}
            <span className="text-sm font-normal opacity-70 ml-2">{baseCurrency}</span>
          </p>

          {/* 分币种小计 */}
          <div className="flex gap-5 text-xs opacity-80">
            <span>🇯🇵 ¥{Math.round(jpySum).toLocaleString()} JPY</span>
            {cnySum > 0 && <span>🇨🇳 ¥{cnySum.toFixed(2)} CNY</span>}
          </div>
        </div>

        {/* ── 账户列表 ── */}
        <div className="px-4 mt-5">
          <p className="text-xs font-semibold mb-2 ml-1" style={{ color: 'var(--color-text-muted)' }}>账户</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)' }}>
            {accounts.map((acc, i) => {
              const icon = ACCOUNT_ICONS[acc.name] ?? acc.name[0]
              const fmtBalance = acc.currency === 'JPY'
                ? `¥${Math.round(Number(acc.balance)).toLocaleString()}`
                : `¥${Number(acc.balance).toFixed(2)}`
              return (
                <button
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 transition-opacity active:opacity-60"
                  style={{ borderBottom: i < accounts.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: `${acc.color}18` }}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{acc.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{acc.currency}</p>
                  </div>
                  <p className="text-base font-semibold flex-shrink-0" style={{ color: acc.color }}>
                    {fmtBalance}
                  </p>
                  <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              )
            })}

            {/* 添加账户 */}
            <button
              onClick={() => setShowAddAccount(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 transition-opacity active:opacity-60"
              style={{ borderTop: accounts.length > 0 ? '1px solid var(--color-border)' : 'none' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--color-border)' }}>
                <Plus size={18} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>添加账户</p>
            </button>
          </div>
        </div>

        {/* ── 汇率设置 ── */}
        <div className="px-4 mt-5">
          <p className="text-xs font-semibold mb-2 ml-1" style={{ color: 'var(--color-text-muted)' }}>汇率设置</p>
          <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--color-card)' }}>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              100 JPY = ? CNY（用于换算总资产）
            </p>
            <div className="flex items-center gap-3">
              {editingRate ? (
                <>
                  <span className="text-base font-medium flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>100 JPY =</span>
                  <input
                    autoFocus
                    type="number"
                    inputMode="decimal"
                    value={rateDraft}
                    onChange={e => setRateDraft(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveRate()}
                    onBlur={saveRate}
                    className="flex-1 px-4 py-2.5 rounded-xl text-lg font-semibold outline-none"
                    style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
                  />
                  <span className="text-base font-medium" style={{ color: 'var(--color-text-muted)' }}>CNY</span>
                  <button
                    onClick={saveRate}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: 'var(--color-morandi-rose)' }}
                  >
                    <Check size={16} />
                  </button>
                </>
              ) : (
                <>
                  <p className="flex-1 text-2xl font-light" style={{ color: 'var(--color-text)' }}>
                    <span className="text-sm font-normal mr-1" style={{ color: 'var(--color-text-muted)' }}>100 JPY =</span>
                    {displayRate ?? '—'}
                    <span className="text-base font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>CNY</span>
                  </p>
                  <button
                    onClick={startEditRate}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm flex-shrink-0"
                    style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    <Pencil size={13} />
                    修改
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── 记账提醒 ── */}
        <div className="px-4 mt-5">
          <p className="text-xs font-semibold mb-2 ml-1" style={{ color: 'var(--color-text-muted)' }}>提醒</p>
          <div className="rounded-2xl px-4 py-3.5" style={{ background: 'var(--color-card)' }}>
            <ReminderSetting />
          </div>
        </div>

        {/* ── 更多功能 ── */}
        <div className="px-4 mt-5">
          <p className="text-xs font-semibold mb-2 ml-1" style={{ color: 'var(--color-text-muted)' }}>更多功能</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)' }}>
            {MENU_ITEMS.map((item, i) => {
              const isActive = !!item.href || !!item.action
              const inner = (
                <>
                  <span className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
                    style={{ background: 'var(--color-bg)' }}>{item.icon}</span>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--color-text)' }}>{item.label}</span>
                  {!isActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
                      即将上线
                    </span>
                  )}
                  <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                </>
              )
              const cls = "flex items-center gap-3 px-4 py-3.5 w-full"
              const sty = {
                borderBottom: i < MENU_ITEMS.length - 1 ? '1px solid var(--color-border)' : 'none',
                opacity: isActive ? 1 : 0.45,
              }
              if (item.href) return (
                <Link key={item.label} href={item.href} className={cls} style={sty}>{inner}</Link>
              )
              if (item.action === 'export') return (
                <button key={item.label} onClick={() => setShowExport(true)} className={cls} style={sty}>{inner}</button>
              )
              if (item.action === 'category') return (
                <button key={item.label} onClick={() => setShowCategory(true)} className={cls} style={sty}>{inner}</button>
              )
              if (item.action === 'tag') return (
                <button key={item.label} onClick={() => setShowTag(true)} className={cls} style={sty}>{inner}</button>
              )
              return null
            })}
          </div>
        </div>

        {/* ── App 签名 ── */}
        <div className="px-4 mt-6 mb-2">
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

      {/* ── 弹层 ── */}
      {selectedAccount && (
        <AccountDetailSheet
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onUpdated={() => { refreshAccounts(); setSelectedAccount(null) }}
        />
      )}
      {showAddAccount && (
        <AddAccountSheet
          onClose={() => setShowAddAccount(false)}
          onAdded={() => { refreshAccounts(); setShowAddAccount(false) }}
        />
      )}
      {showExport && (
        <ExportSheet onClose={() => setShowExport(false)} />
      )}
      {showCategory && (
        <CategoryManageSheet onClose={() => setShowCategory(false)} />
      )}
      {showTag && (
        <TagManageSheet onClose={() => setShowTag(false)} />
      )}
    </div>
  )
}
