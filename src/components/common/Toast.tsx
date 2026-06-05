'use client'
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastItem = { id: number; text: string; fading: boolean }
const ToastCtx = createContext<(text: string) => void>(() => {})

export function useToast() { return useContext(ToastCtx) }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((text: string) => {
    const id = Date.now()
    setToasts(p => [...p, { id, text, fading: false }])
    setTimeout(() => setToasts(p => p.map(t => t.id === id ? { ...t, fading: true } : t)), 1600)
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2200)
  }, [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-8 py-4 rounded-2xl text-base font-semibold text-white shadow-xl ${t.fading ? 'animate-toast-out' : 'animate-toast-in'}`}
            style={{ background: 'rgba(45,45,45,0.85)' }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
