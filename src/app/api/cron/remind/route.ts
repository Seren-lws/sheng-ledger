import { NextRequest, NextResponse } from 'next/server'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'
import { sendToAll } from '@/lib/push-server'
import { fetchRecordDays, currentStreak, daysSinceLast, tokyoToday, tokyoTime } from '@/lib/streak'
import { eveningMessage, morningMessage } from '@/lib/reminder-messages'

export const dynamic = 'force-dynamic'

/** 到了设定时间之后的 3 小时内才发，免得改了时间半夜突然响 */
function due(now: string, at: string) {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const diff = toMin(now) - toMin(at)
  return diff >= 0 && diff < 180
}

/**
 * Supabase 的定时任务每 15 分钟叫一次这里，看看要不要发提醒。
 * 晚上：今天还没记 → 提醒；早上：昨天整天空着 → 提醒补记。每种每天最多一次。
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: settings } = await supabase.from('reminder_settings').select('*').eq('id', 1).maybeSingle()
  if (!settings) return NextResponse.json({ skipped: 'no settings' })

  const today = tokyoToday()
  const now = tokyoTime()
  const yesterday = dayjs(today).subtract(1, 'day').format('YYYY-MM-DD')
  const result: Record<string, unknown> = { today, now }

  const eveningDue = settings.evening_enabled && settings.last_evening_sent !== today && due(now, settings.evening_time)
  const morningDue = settings.morning_enabled && settings.last_morning_sent !== today && due(now, settings.morning_time)
  if (!eveningDue && !morningDue) return NextResponse.json({ ...result, skipped: 'not due' })

  const days = await fetchRecordDays()

  if (eveningDue) {
    // 先记下「今天检查过了」，就算发送出错也不会每 15 分钟重复轰炸
    await supabase.from('reminder_settings').update({ last_evening_sent: today }).eq('id', 1)
    if (!days.has(today)) {
      result.evening = await sendToAll(eveningMessage({
        today,
        streak: currentStreak(days, today),
        daysSinceLast: daysSinceLast(days, today),
      }))
    } else {
      result.evening = 'already recorded'
    }
  }

  if (morningDue) {
    await supabase.from('reminder_settings').update({ last_morning_sent: today }).eq('id', 1)
    // 昨天空着、而且之前有在记（完全没开始用的话就不催）
    if (!days.has(yesterday) && days.size > 0 && !days.has(today)) {
      result.morning = await sendToAll(morningMessage({ today }))
    } else {
      result.morning = 'not needed'
    }
  }

  return NextResponse.json(result)
}

export const GET = handle
export const POST = handle
