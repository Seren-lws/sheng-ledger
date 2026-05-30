'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PlusCircle, List, PiggyBank, BarChart2, User } from 'lucide-react'

const tabs = [
  { href: '/',             icon: PlusCircle, label: '记一笔' },
  { href: '/transactions', icon: List,       label: '明细'   },
  { href: '/savings',      icon: PiggyBank,  label: '存钱'   },
  { href: '/analysis',     icon: BarChart2,  label: '分析'   },
  { href: '/profile',      icon: User,       label: '我的'   },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50"
      style={{
        background: 'var(--color-card)',
        borderTop: '1px solid var(--color-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1 transition-opacity"
              style={{ color: active ? 'var(--color-morandi-rose)' : 'var(--color-text-muted)' }}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
