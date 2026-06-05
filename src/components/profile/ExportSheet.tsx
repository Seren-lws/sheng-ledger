'use client'
import { useState } from 'react'
import dayjs from 'dayjs'
import { X, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props {
  onClose: () => void
}

const RANGES = [
  { key: 'this',  label: '本月' },
  { key: 'last',  label: '上月' },
  { key: '3m',    label: '最近3个月' },
  { key: 'all',   label: '全部' },
] as const

export default function ExportSheet({ onClose }: Props) {
  const [range, setRange] = useState<string>('this')
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)

    let start: string | null = null
    let end: string | null = null
    const now = dayjs()

    if (range === 'this') {
      start = now.startOf('month').format('YYYY-MM-DD')
      end = now.endOf('month').format('YYYY-MM-DD')
    } else if (range === 'last') {
      const lm = now.subtract(1, 'month')
      start = lm.startOf('month').format('YYYY-MM-DD')
      end = lm.endOf('month').format('YYYY-MM-DD')
    } else if (range === '3m') {
      start = now.subtract(2, 'month').startOf('month').format('YYYY-MM-DD')
      end = now.endOf('month').format('YYYY-MM-DD')
    }

    let q = supabase
      .from('transactions')
      .select(`
        date, type, amount, currency, note,
        category:categories(name),
        account:accounts(name),
        transaction_tags(tags(name))
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (start && end) q = q.gte('date', start).lte('date', end)

    const { data } = await q

    // 组装 CSV
    const BOM = '﻿'
    const header = '日期,类型,分类,标签,金额,币种,支付账户,备注'
    const rows = (data ?? []).map((tx: any) => {
      const cat = Array.isArray(tx.category) ? tx.category[0]?.name : tx.category?.name
      const acc = Array.isArray(tx.account) ? tx.account[0]?.name : tx.account?.name
      const tags = (tx.transaction_tags ?? [])
        .map((tt: any) => tt.tags?.name).filter(Boolean).join('、')
      const type = tx.type === 'expense' ? '支出' : '收入'
      const note = (tx.note ?? '').replace(/,/g, '，')   // 避免逗号破坏 CSV
      return `${tx.date},${type},${cat ?? ''},${tags},${tx.amount},${tx.currency},${acc ?? ''},${note}`
    })

    const csv = BOM + header + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    // 触发下载
    const a = document.createElement('a')
    a.href = url
    const monthLabel = range === 'this' ? now.format('YYYY年M月')
      : range === 'last' ? now.subtract(1, 'month').format('YYYY年M月')
      : range === '3m' ? '近3个月'
      : '全部'
    a.download = `声声记账本_${monthLabel}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setExporting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl pb-8"
        style={{ background: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="w-8 h-1 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3"
            style={{ background: 'var(--color-border)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>导出数据</p>
          <button onClick={onClose}><X size={18} style={{ color: 'var(--color-text-muted)' }} /></button>
        </div>

        <div className="px-5 space-y-4">
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>导出范围</p>
            <div className="flex flex-wrap gap-2">
              {RANGES.map(r => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: range === r.key ? 'var(--color-morandi-rose)' : 'var(--color-border)',
                    color: range === r.key ? 'white' : 'var(--color-text-muted)',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            导出为 CSV 文件，可用 Excel / WPS / Numbers 打开
          </p>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white"
            style={{ background: 'var(--color-morandi-rose)', opacity: exporting ? 0.6 : 1 }}
          >
            <Download size={16} />
            {exporting ? '导出中…' : '导出 CSV'}
          </button>
        </div>
      </div>
    </div>
  )
}
