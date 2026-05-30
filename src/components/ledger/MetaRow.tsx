'use client'
import dayjs from 'dayjs'
import { Wallet, FileText, Calendar } from 'lucide-react'
import type { Account } from '@/lib/types'

interface Props {
  account?: Account
  note: string
  date: string
  onAccountClick: () => void
  onNoteChange: (v: string) => void
  onDateClick: () => void
}

export default function MetaRow({ account, note, date, onAccountClick, onNoteChange, onDateClick }: Props) {
  const today = dayjs().format('YYYY-MM-DD')
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  const dateLabel =
    date === today ? '今天'
    : date === yesterday ? '昨天'
    : dayjs(date).format('M月D日')

  return (
    <div className="px-4 pb-4 flex gap-2">
      <button
        onClick={onAccountClick}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs flex-shrink-0"
        style={{
          background: account ? `${account.color}20` : 'var(--color-border)',
          color: account ? account.color : 'var(--color-text-muted)',
          border: `1px solid ${account ? account.color + '40' : 'transparent'}`,
        }}
      >
        <Wallet size={13} />
        <span className="font-medium">{account?.name ?? '选择账户'}</span>
      </button>

      <div
        className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl min-w-0"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <FileText size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="备注"
          className="flex-1 text-xs bg-transparent outline-none min-w-0"
          style={{ color: 'var(--color-text)' }}
        />
      </div>

      <button
        onClick={onDateClick}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs flex-shrink-0"
        style={{ background: 'var(--color-card)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
      >
        <Calendar size={13} />
        <span>{dateLabel}</span>
      </button>
    </div>
  )
}
