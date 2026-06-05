import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type FixedExpenseWithAccount = {
  id: string
  name: string
  amount: number
  currency: 'JPY' | 'CNY'
  account_id: string
  day_of_month: number
  note: string | null
  account: { id: string; name: string; currency: 'JPY' | 'CNY'; color: string } | null
}

export function useFixedExpenses() {
  const [items, setItems] = useState<FixedExpenseWithAccount[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('fixed_expenses')
      .select('id, name, amount, currency, account_id, day_of_month, note, account:accounts(id,name,currency,color)')
      .order('day_of_month')

    const normalized: FixedExpenseWithAccount[] = (data ?? []).map((item: any) => ({
      ...item,
      note: item.note ?? null,
      account: Array.isArray(item.account) ? (item.account[0] ?? null) : (item.account ?? null),
    }))

    setItems(normalized)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { items, loading, refresh }
}
