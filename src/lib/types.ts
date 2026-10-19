export type Currency = 'JPY' | 'CNY'
export type TransactionType = 'income' | 'expense'
/** 记一笔页面的三种模式 */
export type LedgerMode = TransactionType | 'transfer'

export interface Account {
  id: string
  name: string
  currency: Currency
  balance: number
  color: string
  created_at: string
}

export interface Category {
  id: string
  name: string
  type: TransactionType
  color: string
  icon?: string
}

export interface Tag {
  id: string
  name: string
  use_count: number
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  currency: Currency
  category_id: string
  category?: Category
  account_id: string
  account?: Account
  tag_ids: string[]
  tags?: Tag[]
  note?: string
  date: string
  created_at: string
}

export interface FixedExpense {
  id: string
  name: string
  amount: number
  currency: Currency
  account_id: string
  account?: Account
  day_of_month: number
  note?: string
}

export interface ExchangeRate {
  cny_to_jpy: number
  updated_at: string
}

/** Transaction with joined category, account, tags — used in 明细 page */
export type TxWithRefs = {
  id: string
  type: TransactionType
  amount: number
  currency: Currency
  note: string | null
  date: string
  created_at: string
  rate: number | null   // 记账当时的汇率（1 CNY = ? JPY）
  category: { id: string; name: string; color: string } | null
  account: { id: string; name: string; currency: Currency; color: string } | null
  tags: { id: string; name: string }[]
}

type AccountRef = { id: string; name: string; currency: Currency; color: string }

/** 账户间转账 — 不算收入也不算支出 */
export type TransferWithRefs = {
  id: string
  from_amount: number   // 转出账户的币种
  to_amount: number     // 转入账户的币种
  note: string | null
  date: string
  created_at: string
  from_account: AccountRef | null
  to_account: AccountRef | null
}

export interface TxFilter {
  search: string
  type: 'all' | TransactionType
  categoryIds: string[]
  tagIds: string[]
  accountId: string | null
  dateMode: 'month' | 'week' | 'custom'
  customStart: string
  customEnd: string
}

export const DEFAULT_TX_FILTER: TxFilter = {
  search: '',
  type: 'all',
  categoryIds: [],
  tagIds: [],
  accountId: null,
  dateMode: 'month',
  customStart: '',
  customEnd: '',
}

export interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  currency: Currency
  deadline?: string
}
