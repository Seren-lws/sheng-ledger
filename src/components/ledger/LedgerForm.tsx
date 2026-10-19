'use client'
import { useState, useEffect, useRef } from 'react'
import dayjs from 'dayjs'
import { ArrowUpDown } from 'lucide-react'
import type { LedgerMode, TransactionType } from '@/lib/types'
import { createTransaction, createTransfer, fetchTransfers, convert } from '@/lib/ledger'
import { useCategories } from '@/hooks/useCategories'
import { useTags } from '@/hooks/useTags'
import { useAccounts } from '@/hooks/useAccounts'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { useToast } from '@/components/common/Toast'
import TypeToggle from './TypeToggle'
import CategoryPicker from './CategoryPicker'
import AccountSelector from './AccountSelector'
import TagRow from './TagRow'
import TagEditSheet from './TagEditSheet'
import AmountDisplay from './AmountDisplay'
import NumPad from './NumPad'
import DateQuickPicker from './DateQuickPicker'
import DateSheet from './DateSheet'
import SmartInput from './SmartInput'
import BalanceNudge from './BalanceNudge'
import StreakBar from './StreakBar'
import RecordCalendarSheet from './RecordCalendarSheet'
import ExchangeRateBanner from '@/components/common/ExchangeRateBanner'
import { useRecordDays } from '@/hooks/useRecordDays'
import { buildFeedback, fetchDayStats, type DayStats } from '@/lib/feedback'
import { toJpy } from '@/lib/ledger'

const TRANSFER_COLOR = '#94ACBE'

function evaluate(expr: string): number {
  const clean = expr.replace(/[+\-]$/, '')
  const m = clean.match(/^(\d+\.?\d*)([+\-])(\d+\.?\d*)$/)
  if (m) {
    const a = parseFloat(m[1]), b = parseFloat(m[3])
    const r = m[2] === '+' ? a + b : a - b
    return Math.max(0, r)
  }
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : Math.max(0, n)
}

export default function LedgerForm() {
  const toast = useToast()
  const [mode, setMode] = useState<LedgerMode>('expense')
  const type: TransactionType = mode === 'income' ? 'income' : 'expense'
  const isTransfer = mode === 'transfer'

  const [expression, setExpression] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [accountId, setAccountId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [showDateQuick, setShowDateQuick] = useState(false)
  const [showDateSheet, setShowDateSheet] = useState(false)
  const [showTagEdit, setShowTagEdit] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // 转账
  const [fromId, setFromId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [toAmountDraft, setToAmountDraft] = useState('')   // 跨币种时手动填的到账金额，空着就按汇率算

  const categories = useCategories(type)
  const { tags, refresh: refreshTags } = useTags()
  const { accounts, refresh: refreshAccounts } = useAccounts()
  const { rate } = useExchangeRate()
  const { days: recordDays, refresh: refreshRecordDays } = useRecordDays()
  const accountInitialized = useRef(false)

  // 当前日期那天的笔数 / 花费，提前备好，存完马上就能说「今天第几笔」
  const [dayStats, setDayStats] = useState<DayStats | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchDayStats(date, rate ?? 20).then(s => { if (!cancelled) setDayStats(s) }).catch(() => {})
    return () => { cancelled = true }
  }, [date, rate])

  useEffect(() => { setCategoryId(null) }, [type])

  useEffect(() => {
    if (categories.length > 0 && !categoryId) setCategoryId(categories[0].id)
  }, [categories, categoryId])

  useEffect(() => {
    if (accounts.length > 0 && !accountInitialized.current) {
      setAccountId(accounts[0].id)
      accountInitialized.current = true
    }
  }, [accounts])

  // 从「我的 → 账户转账」进来时直接打开转账；从「补记昨天」的通知进来时日期切到昨天
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'transfer') startTransfer(params.get('to'))
    const d = params.get('date')
    if (d === 'yesterday') setDate(dayjs().subtract(1, 'day').format('YYYY-MM-DD'))
    else if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDate(d)
    if (params.toString()) window.history.replaceState(null, '', '/')
  }, [])

  // 进入转账模式时，自动填上最可能的「从 → 到」（参考上一次转账）
  useEffect(() => {
    if (!isTransfer || accounts.length < 2 || fromId) return
    let cancelled = false
    fetchTransfers({ limit: 20 }).then(recent => {
      if (cancelled) return
      const hit = toId ? recent.find(t => t.to_account?.id === toId) : recent[0]
      let to = toId ?? hit?.to_account?.id ?? null
      let from = hit?.from_account?.id ?? null
      if (!from || from === to) {
        const toCur = accounts.find(a => a.id === to)?.currency
        const sameCur = accounts.filter(a => a.id !== to && (!toCur || a.currency === toCur))
        from = (sameCur.find(a => /銀行|银行|bank/i.test(a.name)) ?? sameCur[0] ?? accounts.find(a => a.id !== to))?.id ?? null
      }
      if (!to || to === from) to = accounts.find(a => a.id !== from)?.id ?? null
      setFromId(from)
      setToId(to)
    })
    return () => { cancelled = true }
  }, [isTransfer, accounts, fromId, toId])

  function startTransfer(to: string | null) {
    setMode('transfer')
    setFromId(null)
    setToId(to)
    setToAmountDraft('')
  }

  const selectedCategory = categories.find(c => c.id === categoryId)
  const selectedAccount = accounts.find(a => a.id === accountId)
  const fromAcc = accounts.find(a => a.id === fromId)
  const toAcc = accounts.find(a => a.id === toId)
  const crossCurrency = !!fromAcc && !!toAcc && fromAcc.currency !== toAcc.currency
  const color = isTransfer ? TRANSFER_COLOR : selectedCategory?.color ?? '#C4A09B'
  const displayCurrency = (isTransfer ? fromAcc?.currency : selectedAccount?.currency) ?? 'JPY'
  const autoToAmount = fromAcc && toAcc ? convert(evaluate(expression), fromAcc.currency, toAcc.currency, rate ?? 20) : 0

  const today = dayjs().format('YYYY-MM-DD')
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  const dayBefore = dayjs().subtract(2, 'day').format('YYYY-MM-DD')
  const dateLabel =
    date === today ? '今天'
    : date === yesterday ? '昨天'
    : date === dayBefore ? '前天'
    : dayjs(date).format('M/D')

  function handleKey(key: string) {
    if (key === 'done') { handleSubmit(); return }
    if (key === 'date') { setShowDateQuick(p => !p); return }
    if (key === 'backspace') { setExpression(p => p.slice(0, -1)); return }

    if (key === '+' || key === '-') {
      setExpression(p => {
        if (!p) return p
        if (/[+\-]$/.test(p)) return p.slice(0, -1) + key   // replace trailing op
        if (/\d[+\-]\d/.test(p)) return p                    // already has complete expr
        return p + key
      })
      return
    }

    if (key === '.') {
      setExpression(p => {
        const lastOp = Math.max(p.lastIndexOf('+'), p.lastIndexOf('-'))
        const segment = lastOp >= 0 ? p.slice(lastOp + 1) : p
        if (segment.includes('.')) return p
        if (p === '' || /[+\-]$/.test(p)) return p + '0.'
        return p + '.'
      })
      return
    }

    // digit
    setExpression(p => p.length >= 12 ? p : p + key)
  }

  /** 存好之后：用提前备好的当天数据算出「今天第几笔 / 有没有里程碑」，马上弹出庆祝 */
  function celebrate(amount: number) {
    setSuccess(true)
    // 把刚记的这一笔加进当天数据（转账不算笔数和花费）
    const after: DayStats | null = dayStats && dayStats.date === date
      ? isTransfer ? dayStats : {
          date,
          count: dayStats.count + 1,
          spentJpy: dayStats.spentJpy + (mode === 'expense' ? toJpy(amount, selectedAccount?.currency ?? 'JPY', rate ?? 20) : 0),
          total: dayStats.total + 1,
        }
      : null
    const fb = buildFeedback({ mode, date, daysBefore: recordDays ?? new Set(), after })
    toast(fb.text, { kind: fb.kind, sub: fb.sub })
    if (after) setDayStats(after)
    refreshRecordDays()
    setTimeout(() => {
      setSuccess(false)
      setExpression('')
      setSelectedTagIds([])
      setNote('')
      setToAmountDraft('')
      setDate(dayjs().format('YYYY-MM-DD'))
      refreshAccounts()
      refreshTags()
    }, 700)
  }

  async function handleSubmit() {
    if (submitting || success) return   // 刚存好、还在庆祝时再点不会重复记
    const amount = evaluate(expression)
    if (amount <= 0) { toast('先输一下金额～', { kind: 'error' }); return }

    if (isTransfer) {
      if (!fromAcc || !toAcc || fromAcc.id === toAcc.id) {
        toast('选一下从哪个账户转到哪个账户～', { kind: 'error' })
        return
      }
      const typed = parseFloat(toAmountDraft)
      const toAmount = crossCurrency ? (typed > 0 ? typed : autoToAmount) : amount
      setSubmitting(true)
      const res = await createTransfer({ fromId: fromAcc.id, toId: toAcc.id, fromAmount: amount, toAmount, note, date })
      setSubmitting(false)
      if (!res.ok) { toast(res.message, { kind: 'error' }); return }
      celebrate(amount)
      return
    }

    if (!categoryId || !accountId) { toast('选一下分类和账户～', { kind: 'error' }); return }
    setSubmitting(true)
    const res = await createTransaction({
      type, amount, categoryId, accountId, note, date, tagIds: selectedTagIds,
    })
    setSubmitting(false)
    if (!res.ok) { toast(res.message, { kind: 'error' }); return }
    celebrate(amount)
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* ── 上方可滚动区域 ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* 汇率横幅 */}
        <ExchangeRateBanner />

        {/* 有账户余额变负时提醒记转账 */}
        {!isTransfer && <BalanceNudge accounts={accounts} onTransfer={startTransfer} />}

        {/* 连续记账天数 / 昨天空着提醒补记 */}
        <StreakBar
          days={recordDays}
          onOpenCalendar={() => setShowCalendar(true)}
          onBackfillYesterday={() => setDate(dayjs().subtract(1, 'day').format('YYYY-MM-DD'))}
        />

        {/* 支出 / 收入 / 转账 切换 */}
        <TypeToggle value={mode} onChange={setMode} />

        {isTransfer ? (
          <>
            {/* 从 */}
            <div className="flex items-center min-h-9 px-4 gap-2 pt-1">
              <span className="text-xs flex-shrink-0 w-7" style={{ color: 'var(--color-text-muted)' }}>从</span>
              <div className="flex-1 overflow-x-auto no-scrollbar">
                <AccountSelector
                  accounts={accounts}
                  selectedId={fromId}
                  onSelect={id => { setFromId(id); if (id === toId) setToId(null) }}
                />
              </div>
            </div>

            {/* 对调 */}
            <div className="flex px-4 py-1">
              <button
                onClick={() => { setFromId(toId); setToId(fromId); setToAmountDraft('') }}
                className="ml-9 flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg"
                style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                <ArrowUpDown size={12} />
                对调
              </button>
            </div>

            {/* 到 */}
            <div className="flex items-center min-h-9 px-4 gap-2">
              <span className="text-xs flex-shrink-0 w-7" style={{ color: 'var(--color-text-muted)' }}>到</span>
              <div className="flex-1 overflow-x-auto no-scrollbar">
                <AccountSelector
                  accounts={accounts.filter(a => a.id !== fromId)}
                  selectedId={toId}
                  onSelect={setToId}
                />
              </div>
            </div>

            {/* 跨币种：实际到账 */}
            {crossCurrency && (
              <div className="flex items-center px-4 gap-2 pt-2.5">
                <span className="text-xs flex-shrink-0 w-7" style={{ color: 'var(--color-text-muted)' }}>到账</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={toAmountDraft}
                  onChange={e => setToAmountDraft(e.target.value)}
                  placeholder={autoToAmount > 0
                    ? `按汇率约 ${autoToAmount.toLocaleString()}，实际不一样可以改`
                    : '不填就按汇率自动算'}
                  className="flex-1 text-sm px-3 py-1.5 rounded-lg outline-none"
                  style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
                />
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{toAcc!.currency}</span>
              </div>
            )}

            <div className="mx-4 my-2.5" style={{ height: '1px', background: 'var(--color-border)' }} />
          </>
        ) : (
          <>
            {/* AI 智能输入 */}
            <SmartInput
              tags={tags}
              categories={categories}
              accounts={accounts}
              onParsed={({ amount, type: parsedType, tagIds, categoryId: cid, accountId: aid, note: parsedNote, date: parsedDate }) => {
                if (amount) setExpression(amount)
                if (parsedType) setMode(parsedType)
                if (tagIds && tagIds.length > 0) setSelectedTagIds(tagIds)
                if (cid) setCategoryId(cid)
                if (aid) setAccountId(aid)
                if (parsedNote) setNote(parsedNote)
                if (parsedDate) setDate(parsedDate)
              }}
            />

            {/* 分类横滑 */}
            <CategoryPicker categories={categories} selectedId={categoryId} onSelect={setCategoryId} />

            {/* 分隔线 */}
            <div className="mx-4 my-2.5" style={{ height: '1px', background: 'var(--color-border)' }} />

            {/* 账户行 */}
            <div className="flex items-center min-h-9 px-4 gap-2">
              <span className="text-xs flex-shrink-0 w-7" style={{ color: 'var(--color-text-muted)' }}>账户</span>
              <div className="flex-1 overflow-x-auto no-scrollbar">
                <AccountSelector accounts={accounts} selectedId={accountId} onSelect={setAccountId} />
              </div>
            </div>

            {/* 标签行 */}
            <div className="flex items-start px-4 gap-2 py-1.5">
              <span className="text-xs flex-shrink-0 w-7 pt-1.5" style={{ color: 'var(--color-text-muted)' }}>标签</span>
              <div className="flex-1">
                <TagRow
                  tags={tags}
                  selectedIds={selectedTagIds}
                  categoryColor={color}
                  onToggle={id => setSelectedTagIds(p =>
                    p.includes(id) ? p.filter(x => x !== id) : [...p, id]
                  )}
                  onEdit={() => setShowTagEdit(true)}
                />
              </div>
            </div>
          </>
        )}

        {/* 备注行 */}
        <div className="flex items-center px-4 gap-2 py-1.5">
          <span className="text-xs flex-shrink-0 w-7" style={{ color: 'var(--color-text-muted)' }}>备注</span>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={isTransfer ? '比如：PayPay 充值' : '添加备注...'}
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: 'var(--color-text)' }}
          />
        </div>

        {/* 底部留白 */}
        <div className="h-2" />
      </div>

      {/* ── 金额大字显示 ── */}
      <AmountDisplay
        expression={expression}
        currency={displayCurrency}
        categoryColor={color}
      />

      {/* ── 日期快选（条件显示） ── */}
      {showDateQuick && (
        <DateQuickPicker
          value={date}
          onChange={setDate}
          onOpenCalendar={() => setShowDateSheet(true)}
          onClose={() => setShowDateQuick(false)}
        />
      )}

      {/* ── 数字键盘 ── */}
      <NumPad
        onKey={handleKey}
        categoryColor={color}
        submitting={submitting}
        success={success}
        dateLabel={dateLabel}
      />

      {/* ── 弹层 ── */}
      {showDateSheet && (
        <DateSheet value={date} onChange={setDate} onClose={() => setShowDateSheet(false)} />
      )}
      {showCalendar && recordDays && (
        <RecordCalendarSheet
          days={recordDays}
          onPick={d => { setDate(d); setShowCalendar(false) }}
          onClose={() => setShowCalendar(false)}
        />
      )}
      {showTagEdit && (
        <TagEditSheet
          tags={tags}
          onRefresh={refreshTags}
          onClose={() => setShowTagEdit(false)}
        />
      )}
    </div>
  )
}
