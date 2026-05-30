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

export interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  currency: Currency
  deadline?: string
}
