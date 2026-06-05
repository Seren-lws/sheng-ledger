'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import dayjs from 'dayjs'
import dynamic from 'next/dynamic'
import { ChevronLeft, ChevronRight, Sparkles, Send, X } from 'lucide-react'
import { useFinancialContext, type FinancialContext } from '@/hooks/useFinancialContext'
import ExchangeRateBanner from '@/components/common/ExchangeRateBanner'
import { getCategoryIcon } from '@/lib/category-icons'

// recharts 只在客户端加载
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false })
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false })
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false })
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false })

function fmtJpy(n: number) { return `¥${Math.round(Math.abs(n)).toLocaleString()}` }
function pctChange(now: number, prev: number) {
  if (prev === 0) return null
  return ((now - prev) / prev * 100).toFixed(0)
}

type ChatMsg = { role: 'user' | 'ai'; text: string }

const QUICK_QUESTIONS = [
  '本月消费分析',
  '我的存款率怎么样？',
  '最近哪个分类花太多了？',
  '按目前速度年底能存多少？',
]

export default function AnalysisPage() {
  const [month, setMonth] = useState(dayjs().startOf('month'))
  const { data } = useFinancialContext(month)

  // AI chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // 展开的分类
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const isCurrentMonth = month.isSame(dayjs().startOf('month'))

  // 饼图数据（合并 <3% 为其他）
  const pieData = useMemo(() => {
    if (!data || data.monthlyExpense <= 0) return []
    const threshold = data.monthlyExpense * 0.03
    const main: { name: string; value: number; color: string }[] = []
    let otherSum = 0
    for (const c of data.expenseByCategory) {
      if (c.amount < threshold) { otherSum += c.amount; continue }
      main.push({ name: c.name, value: c.amount, color: c.color })
    }
    if (otherSum > 0) main.push({ name: '其他', value: otherSum, color: '#B89EB5' })
    return main
  }, [data])

  // 趋势图数据
  const trendData = useMemo(() => {
    if (!data) return []
    return data.trend.map(m => ({
      month: dayjs(m.month + '-01').format('M月'),
      收入: Math.round(m.income),
      支出: Math.round(m.expense),
    }))
  }, [data])

  // ── 发送消息 ──
  async function sendMessage(text: string) {
    if (!text.trim() || !data) return
    const userMsg = text.trim()
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setInput('')
    setSending(true)

    try {
      const financialContext = {
        monthlyIncome: data.monthlyIncome,
        monthlyExpense: data.monthlyExpense,
        netSavings: data.netSavings,
        savingsRate: data.savingsRate,
        totalAssets: data.totalAssets,
        freeAssets: data.freeAssets,
        fixedExpenseTotal: data.fixedExpenseTotal,
        avg3MonthSavings: data.avg3MonthSavings,
        expenseBreakdown: data.expenseByCategory.map(c => `${c.name}: ¥${Math.round(c.amount).toLocaleString()}`).join('\n'),
        incomeBreakdown: data.incomeByCategory.map(c => `${c.name}: ¥${Math.round(c.amount).toLocaleString()}`).join('\n'),
      }

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, financialContext }),
      })

      const json = await res.json()
      if (json.error) {
        setMessages(prev => [...prev, { role: 'ai', text: json.error }])
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: json.reply }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'AI 暂时开小差了，再试一次？' }])
    } finally {
      setSending(false)
    }
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
        <ExchangeRateBanner />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>加载中…</p>
        </div>
      </div>
    )
  }

  const incPct = pctChange(data.monthlyIncome, data.lastMonthIncome)
  const expPct = pctChange(data.monthlyExpense, data.lastMonthExpense)

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <ExchangeRateBanner />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-28">

        {/* ── 月份导航 ── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button onClick={() => setMonth(m => m.subtract(1, 'month'))}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-border)' }}>
            <ChevronLeft size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {month.format('YYYY年M月')} 分析
          </span>
          <button onClick={() => !isCurrentMonth && setMonth(m => m.add(1, 'month'))}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-border)', opacity: isCurrentMonth ? 0.3 : 1 }}>
            <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* ── 1. 收支概览 ── */}
        <div className="px-4 mb-4">
          <div className="flex gap-2">
            {[
              { label: '收入', value: data.monthlyIncome, color: 'var(--color-morandi-sage)', pct: incPct },
              { label: '支出', value: data.monthlyExpense, color: 'var(--color-morandi-rose)', pct: expPct },
              { label: '净收支', value: data.netSavings,
                color: data.netSavings >= 0 ? 'var(--color-morandi-sage)' : 'var(--color-morandi-rose)', pct: null },
            ].map(({ label, value, color, pct }) => (
              <div key={label} className="flex-1 rounded-xl px-3 py-2.5" style={{ background: 'var(--color-card)' }}>
                <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                <p className="text-base font-semibold" style={{ color }}>
                  {value < 0 ? '-' : ''}{fmtJpy(value)}
                </p>
                {pct !== null && (
                  <p className="text-[10px] mt-0.5" style={{ color: Number(pct) >= 0 ? 'var(--color-morandi-sage)' : 'var(--color-morandi-rose)' }}>
                    {Number(pct) >= 0 ? '↑' : '↓'}{Math.abs(Number(pct))}% vs 上月
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 2. 收支趋势 ── */}
        <div className="px-4 mb-4">
          <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--color-card)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>近6个月收支趋势</p>
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer>
                <BarChart data={trendData} barGap={2} barSize={12}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9B9B9B' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #EFEFEF', borderRadius: 12, fontSize: 11 }}
                    formatter={(v: any) => [`¥${Number(v ?? 0).toLocaleString()}`, '']}
                  />
                  <Bar dataKey="收入" fill="#9FB5A3" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="支出" fill="#C4A09B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#9FB5A3' }} />
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>收入</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#C4A09B' }} />
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>支出</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. 支出分类饼图 ── */}
        <div className="px-4 mb-4">
          <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--color-card)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>支出分类占比</p>

            {pieData.length > 0 ? (
              <>
                <div style={{ width: '100%', height: 180 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={75}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#fff', border: '1px solid #EFEFEF', borderRadius: 12, fontSize: 11 }}
                        formatter={(v: any) => [`¥${Math.round(Number(v ?? 0)).toLocaleString()}`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* 分类明细列表 */}
                <div className="space-y-1 mt-2">
                  {data.expenseByCategory.map(c => {
                    const ratio = data.monthlyExpense > 0 ? c.amount / data.monthlyExpense : 0
                    return (
                      <button
                        key={c.name}
                        onClick={() => setExpandedCat(expandedCat === c.name ? null : c.name)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left active:opacity-60"
                      >
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                        <span className="flex-1 text-xs" style={{ color: 'var(--color-text)' }}>{c.name}</span>
                        <span className="text-xs font-semibold" style={{ color: c.color }}>
                          {fmtJpy(c.amount)}
                        </span>
                        <span className="text-[10px] w-8 text-right" style={{ color: 'var(--color-text-muted)' }}>
                          {(ratio * 100).toFixed(0)}%
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>暂无支出数据</p>
            )}
          </div>
        </div>

        {/* ── 4. 收入结构 ── */}
        {data.incomeByCategory.length > 0 && (
          <div className="px-4 mb-4">
            <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--color-card)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>收入结构</p>
              <div className="space-y-2">
                {data.incomeByCategory.map(c => {
                  const ratio = data.monthlyIncome > 0 ? c.amount / data.monthlyIncome : 0
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: 'var(--color-text)' }}>{c.name}</span>
                        <span className="text-xs font-semibold" style={{ color: c.color }}>
                          {fmtJpy(c.amount)} ({(ratio * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: c.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 5. 支付渠道统计 ── */}
        {data.accountStats.length > 0 && (
          <div className="px-4 mb-4">
            <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--color-card)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>支付渠道统计</p>
              <div className="space-y-2">
                {data.accountStats.map(a => {
                  const maxTotal = data.accountStats[0]?.total ?? 1
                  return (
                    <div key={a.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: 'var(--color-text)' }}>{a.name}</span>
                        <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                          {a.count}笔 · {fmtJpy(a.total)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${(a.total / maxTotal) * 100}%`, background: a.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 6. AI 助手入口 ── */}
        {!chatOpen && (
          <div className="px-4 mb-4">
            <button
              onClick={() => setChatOpen(true)}
              className="w-full rounded-2xl px-5 py-4 text-left active:opacity-80 transition-opacity"
              style={{ background: '#ADA8C625', border: '1px solid #ADA8C640' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--color-morandi-lavender)', color: 'white' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>AI 财务助手</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    问我关于你的消费和存款的任何问题
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ── AI 对话区域 ── */}
        {chatOpen && (
          <div className="px-4 mb-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid #ADA8C640' }}>
              {/* 标题 */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ background: '#ADA8C618', borderBottom: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles size={14} style={{ color: 'var(--color-morandi-lavender)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>AI 财务助手</span>
                </div>
                <button onClick={() => setChatOpen(false)}>
                  <X size={16} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>

              {/* 快捷问题 */}
              {messages.length === 0 && (
                <div className="px-4 py-3 flex flex-wrap gap-2">
                  {QUICK_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="px-3 py-1.5 rounded-full text-xs transition-colors active:opacity-70"
                      style={{ background: '#ADA8C618', color: 'var(--color-morandi-lavender)', border: '1px solid #ADA8C640' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* 消息列表 */}
              <div className="px-4 py-2 max-h-72 overflow-y-auto space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'ai' && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                        style={{ background: 'var(--color-morandi-lavender)', color: 'white' }}>
                        <Sparkles size={10} />
                      </div>
                    )}
                    <div
                      className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap"
                      style={{
                        background: msg.role === 'user' ? 'var(--color-morandi-lavender)' : 'var(--color-border)',
                        color: msg.role === 'user' ? 'white' : 'var(--color-text)',
                        borderBottomRightRadius: msg.role === 'user' ? '4px' : undefined,
                        borderBottomLeftRadius: msg.role === 'ai' ? '4px' : undefined,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {/* 加载动画 */}
                {sending && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--color-morandi-lavender)', color: 'white' }}>
                      <Sparkles size={10} />
                    </div>
                    <div className="flex gap-1 px-4 py-3 rounded-2xl" style={{ background: 'var(--color-border)' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: 'var(--color-morandi-lavender)', animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* 输入框 */}
              <div className="flex items-center gap-2 px-3 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !sending && sendMessage(input)}
                  placeholder="问我任何财务问题..."
                  className="flex-1 text-xs bg-transparent outline-none px-2"
                  style={{ color: 'var(--color-text)' }}
                  disabled={sending}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || sending}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity"
                  style={{
                    background: input.trim() ? 'var(--color-morandi-lavender)' : 'var(--color-border)',
                    color: 'white',
                    opacity: !input.trim() || sending ? 0.5 : 1,
                  }}
                >
                  <Send size={13} />
                </button>
              </div>

              {/* 快捷问题（对话中也显示） */}
              {messages.length > 0 && (
                <div className="px-3 pb-3 flex gap-1.5 flex-wrap">
                  {QUICK_QUESTIONS.slice(0, 2).map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      disabled={sending}
                      className="px-2.5 py-1 rounded-full text-[10px]"
                      style={{ background: '#ADA8C615', color: 'var(--color-morandi-lavender)' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
