// 声声记账本 — Service Worker：离线缓存 + 推送提醒
const CACHE_NAME = 'sheng-ledger-v2'

// 安装：缓存 App Shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/manifest.json'])
    )
  )
  self.skipWaiting()
})

// 激活：清理旧缓存
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// 拦截请求：Network-first, fallback to cache
self.addEventListener('fetch', (e) => {
  // 只缓存同源 GET 请求，接口不缓存
  if (e.request.method !== 'GET') return
  if (!e.request.url.startsWith(self.location.origin)) return
  if (new URL(e.request.url).pathname.startsWith('/api/')) return

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

// 收到推送：一定要弹出通知（iPhone 规定不能悄悄收）
self.addEventListener('push', (e) => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch { data = { body: e.data && e.data.text() } }
  const title = data.title || '声声记账本'
  e.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '今天的小账还空着呢～',
      icon: '/icons/icon-192.svg',
      tag: data.tag || 'sheng-ledger',
      data: { url: data.url || '/' },
    })
  )
})

// 点通知：打开（或切回）记账本，并跳到通知指定的页面
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('navigate' in client) {
          return client.navigate(url).then((c) => (c || client).focus())
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
