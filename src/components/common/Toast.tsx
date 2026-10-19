'use client'
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastKind = 'success' | 'error'
type ToastItem = { id: number; text: string; phase: 'in' | 'out'; kind: ToastKind }
type ShowToast = (text: string, opts?: { kind?: ToastKind }) => void
const ToastCtx = createContext<ShowToast>(() => {})

export function useToast() { return useContext(ToastCtx) }

const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * 360
  const rad = (angle * Math.PI) / 180
  const dist = 50 + Math.random() * 30
  return {
    tx: Math.cos(rad) * dist,
    ty: Math.sin(rad) * dist,
    color: ['#C4A09B', '#C9A88A', '#CBBEA6', '#A3AB8E', '#9FB5A3', '#8FB5B0', '#ADA8C6', '#B89EB5', '#FFD4D4', '#FFECD2', '#E8D5F5', '#D4F0ED'][i],
    size: 6 + Math.random() * 4,
    delay: Math.random() * 0.12,
  }
})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback<ShowToast>((text, opts) => {
    const id = Date.now()
    const kind = opts?.kind ?? 'success'
    // 出错的提示多停一会儿，让人看得清
    const stay = kind === 'error' ? 3200 : 1800
    setToasts(p => [...p, { id, text, phase: 'in', kind }])
    setTimeout(() => setToasts(p => p.map(t => t.id === id ? { ...t, phase: 'out' } : t)), stay)
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), stay + 600)
  }, [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="relative flex flex-col items-center">
            {/* 烟花粒子（只在成功时放） */}
            {t.kind === 'success' && (
              <div className="absolute inset-0 flex items-center justify-center">
                {PARTICLES.map((p, i) => (
                  <span
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: p.size,
                      height: p.size,
                      background: p.color,
                      '--tx': `${p.tx}px`,
                      '--ty': `${p.ty}px`,
                      animation: t.phase === 'in'
                        ? `particle-burst 0.6s ${p.delay}s ease-out forwards`
                        : `particle-fade 0.5s ease-in forwards`,
                      opacity: 0,
                    } as React.CSSProperties}
                  />
                ))}
              </div>
            )}
            {/* 文字 */}
            <div
              className={`relative mx-8 px-6 py-3 rounded-2xl shadow-lg ${t.phase === 'in' ? 'animate-toast-pop' : 'animate-toast-bye'}`}
              style={{ background: 'white', border: `2px solid ${t.kind === 'error' ? '#E6E1EC' : '#F0E6E4'}` }}
            >
              <span className="text-lg mr-1.5">{t.kind === 'error' ? '🌧️' : '🎉'}</span>
              <span className="text-sm font-semibold" style={{ color: t.kind === 'error' ? '#7D7891' : '#C4A09B' }}>
                {t.text}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
