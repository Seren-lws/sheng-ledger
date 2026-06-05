import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useExchangeRate() {
  const [rate, setRate] = useState<number | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('exchange_rates')
      .select('cny_to_jpy, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) {
      setRate(data.cny_to_jpy)
      setUpdatedAt(data.updated_at)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function updateRate(newRate: number) {
    await supabase
      .from('exchange_rates')
      .update({ cny_to_jpy: newRate, updated_at: new Date().toISOString() })
      .gte('cny_to_jpy', 0)   // 匹配表里唯一的一行
    setRate(newRate)
  }

  return { rate, updatedAt, updateRate }
}
