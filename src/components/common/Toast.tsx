'use client'
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastItem = { id: number; text: string }
const ToastCtx = createContext<(text: string) => void>(() => {})

export function useToast() { return useContext(ToastCtx) }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((text: string) => {
    const id = Date.now()
    setToasts(p => [...p, { id, text }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2200)
  }, [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {/* toast 渲染 */}
      <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="px-5 py-2.5 rounded-2xl text-sm font-medium text-white shadow-lg animate-bounce-in"
            style={{ background: 'var(--color-morandi-rose)' }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
