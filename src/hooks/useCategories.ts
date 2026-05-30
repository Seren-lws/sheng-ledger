import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Category } from '@/lib/types'

export function useCategories(type: 'income' | 'expense') {
  const [categories, setCategories] = useState<Category[]>([])
  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .eq('type', type)
      .order('sort_order')
      .then(({ data }) => { if (data) setCategories(data) })
  }, [type])
  return categories
}
