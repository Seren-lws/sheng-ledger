'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import { Plus, TrendingUp, TrendingDown, Target } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSavingsData } from '@/hooks/useSavingsData'
import type { Currency } from '@/lib/types'
import ExchangeRateBanner from '@/components/common/ExchangeRateBanner'
import SavingsGoalSheet from '@/components/savings/SavingsGoalSheet'

type GoalRow = { id: string; name: string; target_amount: number; currency: Currency; deadline: string | null }

function fmtJpy(n: number) { return `¥${Math.round(Math.abs(n)).toLocaleString()}` }
function pct(n: number) { return `${(n * 100).toFixed(0)}%` }

const CHEERS_POSITIVE = [
  '这个月又存下来了，你真的很棒！',
  '每一笔存款都是未来的底气，继续加油～',
  '安心感正在一点一点累积中...',
  '宝贝你已经很努力了，存钱的你闪闪发光！',
  '存钱不是委屈自己，是给未来的自己写情书～',
  '又往安全感账户里存了一笔！',
  '慢慢来，你的节奏刚刚好。',
]
const CHEERS_NEGATIVE = [
  '这个月花多了也没关系，下个月一起追回来～',
  '偶尔对自己好一点也是必要开支呀！',
  '别忘了对自己好一点，钱会再来的～',
  '花掉的都是生活，留下的都是故事。',
  '没关系的，调整一下节奏就好～',
]
const CHEERS_MILESTONE = (amount: string) => [
  `🎊 恭喜晚声存到了 ${amount}！全服通告！`,
  `📢 【全服公告】晚声已成功积攒 ${amount}，安心感成就达成！`,
  `🏆 存款突破 ${amount}！SSR级成就已解锁～`,
]

export default function SavingsPage() {
  const { data } = useSavingsData()

  // Goals
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [editingGoal, setEditingGoal] = useState<GoalRow | null>(null)
  const [showAddGoal, setShowAddGoal] = useState(false)

  const loadGoals = useCallback(async () => {
    const { data: gd } = await supabase.from('savings_goals').select('*')
    setGoals((gd ?? []) as GoalRow[])
  }, [])
  useEffect(() => { loadGoals() }, [loadGoals])

  // 鼓励条幅（必须在 early return 之前，hooks 不能有条件调用）
  const totalAssets = data?.totalAssets ?? 0
  const isPositive = data ? data.currentMonth.net >= 0 : true
  const cheerText = useMemo(() => {
    const milestones = [5000000, 3000000, 2000000, 1000000, 500000, 300000, 100000]
    for (const m of milestones) {
      if (totalAssets >= m) {
        const arr = CHEERS_MILESTONE(fmtJpy(m))
        return arr[Math.floor(Math.random() * arr.length)]
      }
    }
    const pool = isPositive ? CHEERS_POSITIVE : CHEERS_NEGATIVE
    return pool[Math.floor(Math.random() * pool.length)]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAssets > 0, isPositive])

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

  const { currentMonth, lastMonth, totalAssets: _ta, monthlyFixed, estimatedLiving, freeBalance,
          trend, avg3MonthNet, avg3MonthRate, consecutivePositive, growthPct, dataMonths, rate } = data

  const netDiff = currentMonth.net - lastMonth.net

  // 趋势图最大值（用于缩放）
  const maxAbs = Math.max(...trend.map(m => Math.abs(m.net)), 1)

  // 资产构成比例
  const totalParts = monthlyFixed + estimatedLiving + freeBalance
  const pFixed = totalParts > 0 ? monthlyFixed / totalParts : 0
  const pLiving = totalParts > 0 ? estimatedLiving / totalParts : 0
  const pFree  = totalParts > 0 ? freeBalance / totalParts : 0

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <ExchangeRateBanner />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-28">

        {/* ── 鼓励条幅 ── */}
        <div className="mx-4 mt-3 px-4 py-3 rounded-2xl text-center"
          style={{ background: 'linear-gradient(135deg, #F5E6D3, #FFECD2, #F0E6E4)', border: '1px solid #F0E6E420' }}>
          <p className="text-xs font-medium leading-relaxed" style={{ color: '#8B7355' }}>
            {cheerText}
          </p>
        </div>

        {/* ── 1. 本月净存款 ── */}
        <div className="px-4 mt-3">
          <div className="rounded-2xl px-5 py-5" style={{ background: 'var(--color-card)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
              {dayjs().format('M月')}净存款
            </p>
            <p className="text-4xl font-light tracking-tight leading-none"
              style={{ color: isPositive ? 'var(--color-morandi-sage)' : 'var(--color-morandi-rose)' }}>
              {isPositive ? '+' : '-'}{fmtJpy(currentMonth.net)}
            </p>

            {/* 存款率 + 对比 */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="text-xs px-2.5 py-1 rounded-full"
                style={{
                  background: currentMonth.savingsRate >= 0 ? '#9FB5A320' : '#C4A09B20',
                  color: currentMonth.savingsRate >= 0 ? 'var(--color-morandi-sage)' : 'var(--color-morandi-rose)',
                }}>
                存款率 {pct(currentMonth.savingsRate)}
              </span>

              {(lastMonth.income > 0 || lastMonth.expense > 0) && (
                <span className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1"
                  style={{
                    background: netDiff >= 0 ? '#9FB5A320' : '#C4A09B20',
                    color: netDiff >= 0 ? 'var(--color-morandi-sage)' : 'var(--color-morandi-rose)',
                  }}>
                  {netDiff >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  比上月{netDiff >= 0 ? '多' : '少'}存 {fmtJpy(netDiff)}
                </span>
              )}
            </div>

            {/* 收支小字 */}
            <div className="flex gap-4 mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>收入 {fmtJpy(currentMonth.income)}</span>
              <span>支出 {fmtJpy(currentMonth.expense)}</span>
            </div>
          </div>
        </div>

        {/* ── 2. 资产构成条 ── */}
        <div className="px-4 mt-4">
          <div className="rounded-2xl px-5 py-4" style={{ background: 'var(--color-card)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>你的钱都在这里 💰</p>

            {/* 堆叠条 */}
            <div className="h-5 rounded-full overflow-hidden flex" style={{ background: 'var(--color-border)' }}>
              <div className="h-full" style={{ width: `${pFree * 100}%`, background: 'var(--color-morandi-sage)' }} />
              <div className="h-full" style={{ width: `${pFixed * 100}%`, background: 'var(--color-morandi-coral)' }} />
              <div className="h-full" style={{ width: `${pLiving * 100}%`, background: 'var(--color-morandi-sky)' }} />
            </div>

            {/* 图例 */}
            <div className="flex flex-col gap-2 mt-3">
              {[
                { label: '可自由存款', amount: freeBalance, color: 'var(--color-morandi-sage)' },
                { label: '下月固定支出', amount: monthlyFixed, color: 'var(--color-morandi-coral)' },
                { label: '预估生活费', amount: estimatedLiving, color: 'var(--color-morandi-sky)' },
              ].map(({ label, amount, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                    {fmtJpy(amount)}
                  </span>
                </div>
              ))}
            </div>

            {dataMonths < 3 && (
              <p className="text-[10px] mt-3" style={{ color: 'var(--color-text-muted)' }}>
                💡 数据积累中（{dataMonths}/3 个月），预估值会越来越准
              </p>
            )}
          </div>
        </div>

        {/* ── 3. 存款趋势图 ── */}
        <div className="px-4 mt-4">
          <div className="rounded-2xl px-5 py-4" style={{ background: 'var(--color-card)' }}>
            <p className="text-xs font-semibold mb-4" style={{ color: 'var(--color-text-muted)' }}>存款在慢慢长大 📈</p>

            {/* CSS 柱状图 */}
            <div className="flex items-end gap-2 h-28">
              {trend.map((m, i) => {
                const isCurrent = i === trend.length - 1
                const h = maxAbs > 0 ? (Math.abs(m.net) / maxAbs) * 100 : 0
                const positive = m.net >= 0
                const baseColor = positive ? 'var(--color-morandi-sage)' : 'var(--color-morandi-rose)'
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    {/* 金额标注 */}
                    <span className="text-[9px] font-medium leading-none"
                      style={{ color: isCurrent ? baseColor : 'var(--color-text-muted)', opacity: isCurrent ? 1 : 0.6 }}>
                      {m.income + m.expense > 0 ? (positive ? '+' : '-') + fmtJpy(m.net).replace('¥', '') : ''}
                    </span>
                    {/* 柱子 */}
                    <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                      <div
                        className="w-full max-w-[28px] rounded-t-lg transition-all"
                        style={{
                          height: `${Math.max(h, 2)}%`,
                          background: baseColor,
                          opacity: isCurrent ? 1 : 0.35,
                        }}
                      />
                    </div>
                    {/* 月份标签 */}
                    <span className="text-[10px] leading-none"
                      style={{ color: isCurrent ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: isCurrent ? 600 : 400 }}>
                      {dayjs(m.month + '-01').format('M月')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── 4. 存钱目标 ── */}
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>存钱目标</p>
            <button onClick={() => setShowAddGoal(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'var(--color-morandi-sage)', color: 'white' }}>
              <Plus size={11} /> 设定目标
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="rounded-2xl px-5 py-6 flex flex-col items-center gap-2"
              style={{ background: 'var(--color-card)' }}>
              <Target size={28} style={{ color: 'var(--color-text-muted)', opacity: 0.4 }} />
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                还没有存钱目标，给自己定一个小目标吧～
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {goals.map(g => {
                const targetJpy = g.currency === 'CNY' ? g.target_amount * rate : g.target_amount
                const progress = Math.min(freeBalance / targetJpy, 1)

                // 预计达成月数
                const remaining = targetJpy - freeBalance
                const monthsNeeded = avg3MonthNet > 0 && remaining > 0
                  ? Math.ceil(remaining / avg3MonthNet)
                  : null

                return (
                  <button
                    key={g.id}
                    onClick={() => setEditingGoal(g)}
                    className="w-full rounded-2xl px-4 py-3.5 text-left active:opacity-60 transition-opacity"
                    style={{ background: 'var(--color-card)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{g.name}</p>
                      <p className="text-xs font-semibold" style={{ color: 'var(--color-morandi-sage)' }}>
                        {pct(progress)}
                      </p>
                    </div>
                    {/* 进度条 */}
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${progress * 100}%`, background: 'var(--color-morandi-sage)' }} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {fmtJpy(freeBalance)} / {g.currency === 'JPY'
                          ? fmtJpy(g.target_amount)
                          : `¥${g.target_amount.toFixed(0)} CNY`}
                      </span>
                      {monthsNeeded !== null && progress < 1 && (
                        <span className="text-[11px]" style={{ color: 'var(--color-morandi-sage)' }}>
                          约 {monthsNeeded} 个月可达成
                        </span>
                      )}
                      {progress >= 1 && (
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--color-morandi-sage)' }}>
                          🎉 达成啦！你太厉害了！
                        </span>
                      )}
                    </div>
                    {g.deadline && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        截止 {dayjs(g.deadline).format('YYYY年M月D日')}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 5. 统计摘要 ── */}
        <div className="px-4 mt-4">
          <p className="text-xs font-semibold mb-2 ml-1" style={{ color: 'var(--color-text-muted)' }}>你的存钱成绩单 ✨</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '月均能存', value: fmtJpy(avg3MonthNet), color: avg3MonthNet >= 0 ? 'var(--color-morandi-sage)' : 'var(--color-morandi-rose)' },
              { label: '存款率', value: pct(avg3MonthRate), color: avg3MonthRate >= 0 ? 'var(--color-morandi-sage)' : 'var(--color-morandi-rose)' },
              { label: '总体增长', value: growthPct !== null ? (growthPct >= 0 ? '+' : '') + pct(growthPct) : '—', color: (growthPct ?? 0) >= 0 ? 'var(--color-morandi-sage)' : 'var(--color-morandi-rose)' },
              { label: '连续存钱', value: consecutivePositive > 0 ? `${consecutivePositive} 个月 🔥` : '加油！', color: consecutivePositive > 0 ? 'var(--color-morandi-sage)' : 'var(--color-text-muted)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl px-4 py-3" style={{ background: 'var(--color-card)' }}>
                <p className="text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                <p className="text-lg font-semibold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 弹层 ── */}
      {showAddGoal && (
        <SavingsGoalSheet onClose={() => setShowAddGoal(false)} onSaved={loadGoals} />
      )}
      {editingGoal && (
        <SavingsGoalSheet goal={editingGoal} onClose={() => setEditingGoal(null)} onSaved={loadGoals} />
      )}
    </div>
  )
}
