/**
 * 所有会动到账户余额的操作都走这里。
 * 每个操作在数据库里一步完成：账和余额要么一起改好，要么都不改。
 */
import { supabase } from './supabase'
import type { Currency, TransactionType, TransferWithRefs } from './types'

export type LedgerResult = { ok: true; id?: string } | { ok: false; message: string }

function toResult(error: { message?: string } | null, id?: string): LedgerResult {
  if (!error) return { ok: true, id }
  const raw = error.message ?? ''
  const offline = /fetch|network|load failed/i.test(raw)
  return {
    ok: false,
    message: offline ? '网络好像不太好，没存上，再试一次吧' : `没存上：${raw || '出了点小问题'}`,
  }
}

type TxInput = {
  type: TransactionType
  amount: number
  categoryId: string
  accountId: string
  note: string
  date: string
  tagIds: string[]
}

export async function createTransaction(tx: TxInput): Promise<LedgerResult> {
  const { data, error } = await supabase.rpc('create_transaction', {
    p_type: tx.type, p_amount: tx.amount, p_category_id: tx.categoryId,
    p_account_id: tx.accountId, p_note: tx.note, p_date: tx.date, p_tag_ids: tx.tagIds,
  })
  return toResult(error, data ?? undefined)
}

export async function updateTransaction(id: string, tx: TxInput): Promise<LedgerResult> {
  const { error } = await supabase.rpc('update_transaction', {
    p_id: id, p_type: tx.type, p_amount: tx.amount, p_category_id: tx.categoryId,
    p_account_id: tx.accountId, p_note: tx.note, p_date: tx.date, p_tag_ids: tx.tagIds,
  })
  return toResult(error)
}

export async function deleteTransaction(id: string): Promise<LedgerResult> {
  const { error } = await supabase.rpc('delete_transaction', { p_id: id })
  return toResult(error)
}

type TransferInput = {
  fromId: string
  toId: string
  fromAmount: number
  toAmount: number
  note: string
  date: string
}

export async function createTransfer(t: TransferInput): Promise<LedgerResult> {
  const { data, error } = await supabase.rpc('create_transfer', {
    p_from: t.fromId, p_to: t.toId, p_from_amount: t.fromAmount, p_to_amount: t.toAmount,
    p_note: t.note, p_date: t.date,
  })
  return toResult(error, data ?? undefined)
}

export async function updateTransfer(id: string, t: TransferInput): Promise<LedgerResult> {
  const { error } = await supabase.rpc('update_transfer', {
    p_id: id, p_from: t.fromId, p_to: t.toId, p_from_amount: t.fromAmount, p_to_amount: t.toAmount,
    p_note: t.note, p_date: t.date,
  })
  return toResult(error)
}

export async function deleteTransfer(id: string): Promise<LedgerResult> {
  const { error } = await supabase.rpc('delete_transfer', { p_id: id })
  return toResult(error)
}

/** 到了扣款日的固定支出自动记一笔（重复调用也只会记一次） */
export async function generateFixedExpenses(today: string) {
  await supabase.rpc('generate_fixed_expenses', { p_today: today })
}

// ── 转账查询 ──

const TRANSFER_SELECT = `
  id, from_amount, to_amount, note, date, created_at,
  from_account:accounts!transfers_from_account_id_fkey(id, name, currency, color),
  to_account:accounts!transfers_to_account_id_fkey(id, name, currency, color)
`

function normalizeTransfer(row: any): TransferWithRefs {
  const one = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null)
  return { ...row, from_account: one(row.from_account), to_account: one(row.to_account) }
}

export async function fetchTransfers(opts: {
  start?: string
  end?: string
  accountId?: string | null
  limit?: number
}): Promise<TransferWithRefs[]> {
  let q = supabase
    .from('transfers')
    .select(TRANSFER_SELECT)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (opts.start) q = q.gte('date', opts.start)
  if (opts.end) q = q.lte('date', opts.end)
  if (opts.accountId) q = q.or(`from_account_id.eq.${opts.accountId},to_account_id.eq.${opts.accountId}`)
  if (opts.limit) q = q.limit(opts.limit)
  const { data } = await q
  return (data ?? []).map(normalizeTransfer)
}

// ── 金额小工具 ──

/** rate = 1 CNY 对应多少 JPY */
export function toJpy(amount: number, currency: string, rate: number) {
  return currency === 'CNY' ? Number(amount) * rate : Number(amount)
}

/** 按当前汇率把一个币种的金额换成另一个币种（日元取整，人民币留两位） */
export function convert(amount: number, from: Currency, to: Currency, rate: number) {
  if (from === to) return amount
  return from === 'JPY' ? Math.round((amount / rate) * 100) / 100 : Math.round(amount * rate)
}

export function fmtMoney(amount: number, currency: string) {
  return currency === 'JPY'
    ? `¥${Math.round(Number(amount)).toLocaleString()}`
    : `¥${Number(amount).toFixed(2)}`
}
