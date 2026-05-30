import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account } from '@/lib/types'

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .order('sort_order')
    if (data) setAccounts(data)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { accounts, refresh }
}
