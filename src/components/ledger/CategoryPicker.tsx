'use client'
import {
  Utensils, Bus, ShoppingBag, Home, Gamepad2,
  Stethoscope, Package, Bot, MoreHorizontal,
  Briefcase, BookOpen, PenLine, Sparkles, Gift,
} from 'lucide-react'
import type { Category } from '@/lib/types'

// 图标统一用莫兰迪色，不用彩色 emoji
const ICON_MAP: Record<string, React.ReactNode> = {
  '餐饮':      <Utensils size={22} />,
  '交通':      <Bus size={22} />,
  '购物':      <ShoppingBag size={22} />,
  '住房':      <Home size={22} />,
  '娱乐':      <Gamepad2 size={22} />,
  '医疗':      <Stethoscope size={22} />,
  '日用':      <Package size={22} />,
  'AI':        <Bot size={22} />,
  '其他':      <MoreHorizontal size={22} />,
  '工资':      <Briefcase size={22} />,
  '日语课时费': <BookOpen size={22} />,
  '写作收入':  <PenLine size={22} />,
  '采耳收入':  <Sparkles size={22} />,
  '礼物':      <Gift size={22} />,
}

interface Props {
  categories: Category[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  return (
    <div className="px-4 pb-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map(cat => {
          const active = cat.id === selectedId
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="flex-shrink-0 flex flex-col items-center gap-2 w-[68px] py-3 rounded-2xl transition-all"
              style={{
                background: active ? `${cat.color}20` : 'var(--color-card)',
                border: `1.5px solid ${active ? cat.color : 'transparent'}`,
                boxShadow: active ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              {/* 图标容器：莫兰迪底色 + 同色图标 */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `${cat.color}${active ? '35' : '20'}`,
                  color: cat.color,
                }}
              >
                {ICON_MAP[cat.name] ?? <MoreHorizontal size={22} />}
              </div>
              <span
                className="text-[11px] font-medium leading-none"
                style={{ color: active ? cat.color : 'var(--color-text-muted)' }}
              >
                {cat.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
