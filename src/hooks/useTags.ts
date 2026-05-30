import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tag } from '@/lib/types'

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('use_count', { ascending: false })
    if (data) setTags(data)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { tags, refresh }
}
