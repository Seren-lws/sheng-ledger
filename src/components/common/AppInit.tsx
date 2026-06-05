'use client'
import { useEffect } from 'react'

/**
 * 全局初始化：注册 Service Worker
 * 放在 layout 里以确保每次 App 启动都执行
 */
export default function AppInit() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return null
}
