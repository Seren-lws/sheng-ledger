'use client'
import { useState, useEffect } from 'react'
import { Bell, Sunrise, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { enablePush, pushSupport, type PushSupport } from '@/lib/push-client'
import { useToast } from '@/components/common/Toast'

/**
 * 推送提醒设置：设置存在数据库里，由服务器到点发推送（不用打开 app 也会响）。
 */

type Settings = {
  evening_enabled: boolean
  evening_time: string
  morning_enabled: boolean
  morning_time: string
}

const SUPPORT_HINT: Record<Exclude<PushSupport, 'ok'>, string> = {
  'need-home-screen': '先在 Safari 里点「分享 → 添加到主屏幕」，再从主屏幕的图标打开记账本来开启（iPhone 只给主屏幕上的 app 发推送）',
  denied: '通知权限被关掉了，去 设置 → 通知 → 记账本 里打开，再回来开启',
  unsupported: '这个浏览器收不了推送，换成主屏幕上的记账本试试',
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-12 h-7 rounded-full relative transition-colors flex-shrink-0"
      style={{ background: on ? 'var(--color-morandi-rose)' : 'var(--color-border)' }}
    >
      <div className="w-5 h-5 rounded-full bg-white absolute top-1 transition-all" style={{ left: on ? '26px' : '2px' }} />
    </button>
  )
}

export default function ReminderSetting() {
  const toast = useToast()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [support, setSupport] = useState<PushSupport>('ok')
  const [connected, setConnected] = useState(false)   // 这台设备有没有登记推送
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setSupport(pushSupport())
    supabase.from('reminder_settings').select('evening_enabled, evening_time, morning_enabled, morning_time')
      .eq('id', 1).maybeSingle()
      .then(({ data }) => { if (data) setSettings(data as Settings) })
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready
        .then(reg => reg.pushManager.getSubscription())
        .then(sub => setConnected(!!sub && Notification.permission === 'granted'))
        .catch(() => {})
    }
  }, [])

  async function save(patch: Partial<Settings>) {
    setSettings(s => s ? { ...s, ...patch } : s)
    const { error } = await supabase.from('reminder_settings')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) toast('设置没存上，再试一次吧', { kind: 'error' })
  }

  async function turnOn(key: 'evening_enabled' | 'morning_enabled') {
    if (!connected) {
      setBusy(true)
      const res = await enablePush()
      setBusy(false)
      setSupport(pushSupport())
      if (!res.ok) { toast(res.message ?? '开启失败了', { kind: 'error' }); return }
      setConnected(true)
    }
    await save({ [key]: true })
  }

  async function sendTest() {
    setBusy(true)
    try {
      const res = await fetch('/api/push/test', { method: 'POST' }).then(r => r.json())
      if (res.sent > 0) toast('发出去啦，看看手机～')
      else toast(res.error ?? '还没有连上的手机，先打开上面的开关', { kind: 'error' })
    } catch {
      toast('网络好像不太好，没发出去', { kind: 'error' })
    } finally {
      setBusy(false)
    }
  }

  if (!settings) {
    return <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>提醒设置加载中…</p>
  }

  const rows = [
    {
      key: 'evening_enabled' as const, timeKey: 'evening_time' as const,
      icon: Bell, title: '晚上提醒', desc: '今天还没记的话，到点提醒你',
    },
    {
      key: 'morning_enabled' as const, timeKey: 'morning_time' as const,
      icon: Sunrise, title: '早上补记提醒', desc: '昨天整天空着的话，第二天早上提醒',
    },
  ]
  const anyOn = settings.evening_enabled || settings.morning_enabled

  return (
    <div className="space-y-3.5">
      {rows.map(({ key, timeKey, icon: Icon, title, desc }) => {
        const on = settings[key] && connected
        return (
          <div key={key} className="flex items-center gap-3">
            <Icon size={16} style={{ color: on ? 'var(--color-morandi-rose)' : 'var(--color-text-muted)', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{title}</p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{desc}</p>
            </div>
            {on && (
              <input
                type="time"
                value={settings[timeKey]}
                onChange={e => e.target.value && save({ [timeKey]: e.target.value })}
                className="text-xs px-2 py-1 rounded-lg outline-none flex-shrink-0"
                style={{ background: 'var(--color-border)', color: 'var(--color-text)' }}
              />
            )}
            <Toggle on={on} onClick={() => busy ? null : on ? save({ [key]: false }) : turnOn(key)} />
          </div>
        )
      })}

      {support !== 'ok' && !connected && (
        <p className="text-[11px] leading-relaxed px-3 py-2 rounded-lg"
          style={{ background: '#94ACBE18', color: 'var(--color-text-muted)' }}>
          {SUPPORT_HINT[support]}
        </p>
      )}

      {connected && anyOn && (
        <div className="flex items-center justify-between">
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            这台设备已连上 ✓ 不打开 app 也会收到
          </p>
          <button
            onClick={sendTest}
            disabled={busy}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: 'var(--color-border)', color: 'var(--color-text-muted)', opacity: busy ? 0.5 : 1 }}
          >
            <Send size={12} />
            发一条试试
          </button>
        </div>
      )}
    </div>
  )
}
