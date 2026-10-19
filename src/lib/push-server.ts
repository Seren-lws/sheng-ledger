/**
 * 只在服务器端用：给所有开启了提醒的设备发推送。
 */
import webpush from 'web-push'
import { supabase } from './supabase'

let configured = false
function setup() {
  if (configured) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails('https://sheng-ledger.vercel.app', pub, priv)
  configured = true
  return true
}

export async function sendToAll(msg: { title: string; body: string; url: string }) {
  if (!setup()) return { sent: 0, error: '推送钥匙没配置' }

  const { data: subs } = await supabase.from('push_subscriptions').select('endpoint, p256dh, auth')
  let sent = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(msg),
        { TTL: 60 * 60 * 3 },   // 3 小时内送不到就算了，不要半夜补发
      )
      sent++
    } catch (err: any) {
      // 手机那边已经取消/失效的地址，删掉
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      } else {
        console.error('push failed', err?.statusCode, err?.body)
      }
    }
  }
  return { sent, total: subs?.length ?? 0 }
}
