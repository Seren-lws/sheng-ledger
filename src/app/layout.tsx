import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNav from '@/components/layout/BottomNav'
import { ToastProvider } from '@/components/common/Toast'
import AppInit from '@/components/common/AppInit'

export const metadata: Metadata = {
  title: '声声记账本 — 记得快、看得清',
  description: '记得快、看得清、AI帮你算',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '声声',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FAF8F5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body>
        <ToastProvider>
          <div className="flex flex-col h-full max-w-md mx-auto relative">
            <main className="flex-1 overflow-hidden">
              {children}
            </main>
            <BottomNav />
          </div>
          <AppInit />
        </ToastProvider>
      </body>
    </html>
  )
}
