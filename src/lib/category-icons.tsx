import type { ReactNode } from 'react'
import {
  Utensils, Bus, ShoppingBag, Home, Gamepad2,
  Stethoscope, Package, Bot, MoreHorizontal,
  Briefcase, BookOpen, PenLine, Sparkles, Gift,
} from 'lucide-react'

export function getCategoryIcon(name: string | null | undefined, size = 16): ReactNode {
  const map: Record<string, ReactNode> = {
    '餐饮':      <Utensils size={size} />,
    '交通':      <Bus size={size} />,
    '购物':      <ShoppingBag size={size} />,
    '住房':      <Home size={size} />,
    '娱乐':      <Gamepad2 size={size} />,
    '医疗':      <Stethoscope size={size} />,
    '日用':      <Package size={size} />,
    'AI':        <Bot size={size} />,
    '其他':      <MoreHorizontal size={size} />,
    '工资':      <Briefcase size={size} />,
    '日语课时费': <BookOpen size={size} />,
    '写作收入':  <PenLine size={size} />,
    '采耳收入':  <Sparkles size={size} />,
    '礼物':      <Gift size={size} />,
  }
  return map[name ?? ''] ?? <MoreHorizontal size={size} />
}
