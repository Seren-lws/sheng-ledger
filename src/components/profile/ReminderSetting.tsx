'use client'
import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff } from 'lucide-react'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'

/**
 * 简单版记账提醒：App 打开时检查今天是否有记录，
 * 如果已过提醒时间且当天无记录，弹 Notification。
 * 设置存在 localStorage（不需要后端表）。
 */

export default function ReminderSetting() {
  const [enabled, setEnabled] = useState(false)
  const [time, setTime] = useState('21:00')
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission)
    const saved = localStorage.getItem('reminder')
    if (saved) {
      try {
        const { enabled: e, time: t } = JSON.parse(saved)
        setEnabled(e)
        if (t) setTime(t)
      } catch {}
    }
  }, [])

  // 保存设置
  function save(e: boolean, t: string) {
    setEnabled(e); setTime(t)
    localStorage.setItem('reminder', JSON.stringify({ enabled: e, time: t }))
  }

  // 请求权限并开启
  async function toggle() {
    if (enabled) { save(false, time); return }
    if (!('Notification' in window)) return

    if (Notification.permission === 'default') {
      const p = await Notification.requestPermission()
      setPermission(p)
      if (p !== 'granted') return
    } else if (Notification.permission !== 'granted') {
      return
    }
    save(true, time)
  }

  // 检查并提醒（App 前台时每次打开检查一次）
  const checkReminder = useCallback(async () => {
    if (!enabled) return
    const now = dayjs()
    const [h, m] = time.split(':').map(Number)
    if (now.hour() < h || (now.hour() === h && now.minute() < m)) return

    // 检查今天是否已记账
    const today = now.format('YYYY-MM-DD')
    const lastCheck = localStorage.getItem('reminder_last_check')
    if (lastCheck === today) return   // 今天已检查过

    const { count } = await supabase
      .from('transactions').select('id', { count: 'exact', head: true })
      .eq('date', today)

    localStorage.setItem('reminder_last_check', today)

    if ((count ?? 0) === 0 && Notification.permission === 'granted') {
      new Notification('声声记账本', {
        body: '今天还没记账哦～',
        icon: '/icons/icon-192.svg',
      })
    }
  }, [enabled, time])

  useEffect(() => { checkReminder() }, [checkReminder])

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {enabled ? <Bell size={16} style={{ color: 'var(--color-morandi-rose)' }} />
                  : <BellOff size={16} style={{ color: 'var(--color-text-muted)' }} />}
        <div>
          <p className="text-sm" style={{ color: 'var(--color-text)' }}>记账提醒</p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {enabled ? `每天 ${time} 检查` : '关闭'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {enabled && (
          <input
            type="time"
            value={time}
            onChange={e => save(true, e.target.value)}
            className="text-xs px-2 py-1 rounded-lg outline-none"
            style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
          />
        )}
        <button
          onClick={toggle}
          className="w-12 h-7 rounded-full relative transition-colors"
          style={{ background: enabled ? 'var(--color-morandi-rose)' : 'var(--color-border)' }}
        >
          <div
            className="w-5 h-5 rounded-full bg-white absolute top-1 transition-all"
            style={{ left: enabled ? '26px' : '2px' }}
          />
        </button>
      </div>
    </div>
  )
}
