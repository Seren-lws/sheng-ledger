import { useState, useEffect, useCallback } from 'react'
import { fetchRecordDays } from '@/lib/streak'

/** 记过账的日期集合（连续天数、打卡日历用） */
export function useRecordDays() {
  const [days, setDays] = useState<Set<string> | null>(null)

  const refresh = useCallback(async () => {
    const d = await fetchRecordDays()
    setDays(d)
    return d
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { days, refresh }
}
