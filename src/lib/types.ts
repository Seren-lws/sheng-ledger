export type Currency = 'JPY' | 'CNY'
export type TransactionType = 'income' | 'expense'

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
  category: { id: string; name: string; color: string } | null
  account: { id: string; name: string; currency: Currency; color: string } | null
  tags: { id: string; name: string }[]
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
