/**
 * 浏览器端：把这台手机登记成「可以收提醒」的设备。
 */
import { supabase } from './supabase'

export type PushSupport =
  | 'ok'
  | 'need-home-screen'   // iPhone 上要先添加到主屏幕、从主屏幕打开
  | 'denied'             // 通知权限被关了
  | 'unsupported'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported'
  if (isIOS() && !isStandalone()) return 'need-home-screen'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIOS() ? 'need-home-screen' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  return 'ok'
}

function keyToBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

async function save(sub: PushSubscription) {
  const json = sub.toJSON()
  await supabase.from('push_subscriptions').upsert({
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
    user_agent: navigator.userAgent.slice(0, 200),
    updated_at: new Date().toISOString(),
  })
}

/** 要在点击里调用：会弹出「允许通知」的询问 */
export async function enablePush(): Promise<{ ok: boolean; message?: string }> {
  const support = pushSupport()
  if (support === 'need-home-screen') return { ok: false, message: '先把记账本添加到主屏幕，再从主屏幕打开来开启' }
  if (support === 'denied') return { ok: false, message: '通知权限被关掉了，去 设置 → 通知 → 记账本 里打开' }
  if (support === 'unsupported') return { ok: false, message: '这个浏览器收不了推送' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, message: '没有拿到通知权限，提醒发不过来' }

  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) return { ok: false, message: '推送钥匙还没配置好' }

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
      ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) })
    await save(sub)
    return { ok: true }
  } catch (err) {
    console.error(err)
    return { ok: false, message: '连接推送失败了，过一会儿再试试' }
  }
}

/** 每次打开 app 时悄悄刷新一下登记（iPhone 偶尔会换推送地址） */
export async function refreshPush() {
  if (pushSupport() !== 'ok' || Notification.permission !== 'granted') return
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
      ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) })
    await save(sub)
  } catch {}
}
