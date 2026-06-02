'use client'
import {
  Utensils, Bus, ShoppingBag, Home, Gamepad2,
  Stethoscope, Package, Bot, MoreHorizontal,
  Briefcase, BookOpen, PenLine, Sparkles, Gift,
} from 'lucide-react'
import type { Category } from '@/lib/types'

const ICON_MAP: Record<string, React.ReactNode> = {
  '餐饮': <Utensils size={20} />,
  '交通': <Bus size={20} />,
  '购物': <ShoppingBag size={20} />,
  '住房': <Home size={20} />,
  '娱乐': <Gamepad2 size={20} />,
  '医疗': <Stethoscope size={20} />,
  '日用': <Package size={20} />,
  'AI':   <Bot size={20} />,
  '其他': <MoreHorizontal size={20} />,
  '工资':      <Briefcase size={20} />,
  '日语课时费': <BookOpen size={20} />,
  '写作收入':  <PenLine size={20} />,
  '采耳收入':  <Sparkles size={20} />,
  '礼物':      <Gift size={20} />,
}

interface Props {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  return (
    <div className="px-4 pb-2">
      <div className="grid grid-cols-4 gap-2">
        {categories.map(cat => {
          const active = cat.id === selectedId
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all"
              style={{
                background: active ? `${cat.color}18` : 'var(--color-card)',
                border: `1.5px solid ${active ? cat.color : 'transparent'}`,
                boxShadow: active ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                color: active ? cat.color : 'var(--color-text-muted)',
              }}
            >
              <div style={{ color: active ? cat.color : '#B0A9A9' }}>
                {ICON_MAP[cat.name] ?? <MoreHorizontal size={20} />}
              </div>
              <span className="text-[11px] font-medium">{cat.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
