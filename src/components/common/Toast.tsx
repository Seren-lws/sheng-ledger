'use client'
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'milestone'
type ToastItem = { id: number; text: string; sub?: string; phase: 'in' | 'out'; kind: ToastKind }
type ShowToast = (text: string, opts?: { kind?: ToastKind; sub?: string }) => void
const ToastCtx = createContext<ShowToast>(() => {})

export function useToast() { return useContext(ToastCtx) }

const COLORS = ['#C4A09B', '#C9A88A', '#CBBEA6', '#A3AB8E', '#9FB5A3', '#8FB5B0', '#ADA8C6', '#B89EB5', '#FFD4D4', '#FFECD2', '#E8D5F5', '#D4F0ED']

function makeParticles(count: number, minDist: number, spread: number) {
  return Array.from({ length: count }, (_, i) => {
    const rad = ((i / count) * 360 * Math.PI) / 180
    const dist = minDist + Math.random() * spread
    return {
      tx: Math.cos(rad) * dist,
      ty: Math.sin(rad) * dist,
      color: COLORS[i % COLORS.length],
      size: 6 + Math.random() * 4,
      delay: Math.random() * 0.12,
    }
  })
}

const PARTICLES = makeParticles(12, 50, 30)
// 里程碑：两圈、更远更大的烟花
const BIG_PARTICLES = [...makeParticles(16, 70, 40), ...makeParticles(12, 130, 50)]

const STAY: Record<ToastKind, number> = { success: 1800, error: 3200, milestone: 3400 }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback<ShowToast>((text, opts) => {
    const id = Date.now()
    const kind = opts?.kind ?? 'success'
    // 有第二行小字时多停一会儿，让人看得清
    const stay = STAY[kind] + (opts?.sub && kind === 'success' ? 600 : 0)
    setToasts(p => [...p, { id, text, sub: opts?.sub, phase: 'in', kind }])
    setTimeout(() => setToasts(p => p.map(t => t.id === id ? { ...t, phase: 'out' } : t)), stay)
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), stay + 600)
  }, [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
        {toasts.map(t => {
          const particles = t.kind === 'milestone' ? BIG_PARTICLES : t.kind === 'success' ? PARTICLES : []
          const big = t.kind === 'milestone'
          return (
            <div key={t.id} className="relative flex flex-col items-center">
              {/* 烟花粒子（出错时不放） */}
              {particles.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {particles.map((p, i) => (
                    <span
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        width: big ? p.size * 1.3 : p.size,
                        height: big ? p.size * 1.3 : p.size,
                        background: p.color,
                        '--tx': `${p.tx}px`,
                        '--ty': `${p.ty}px`,
                        animation: t.phase === 'in'
                          ? `particle-burst ${big ? 0.9 : 0.6}s ${p.delay}s ease-out forwards`
                          : `particle-fade 0.5s ease-in forwards`,
                        opacity: 0,
                      } as React.CSSProperties}
                    />
                  ))}
                </div>
              )}
              {/* 文字 */}
              <div
                className={`relative mx-8 rounded-2xl shadow-lg text-center ${big ? 'px-7 py-5' : 'px-6 py-3'} ${t.phase === 'in' ? 'animate-toast-pop' : 'animate-toast-bye'}`}
                style={{
                  background: big ? 'linear-gradient(135deg, #FFF8F5, #F7EEF6)' : 'white',
                  border: `2px solid ${t.kind === 'error' ? '#E6E1EC' : big ? '#E8D5DC' : '#F0E6E4'}`,
                }}
              >
                {big && <div className="text-3xl mb-1.5">🎆</div>}
                <div>
                  {!big && <span className="text-lg mr-1.5">{t.kind === 'error' ? '🌧️' : '🎉'}</span>}
                  <span className={`${big ? 'text-base' : 'text-sm'} font-semibold`}
                    style={{ color: t.kind === 'error' ? '#7D7891' : '#C4A09B' }}>
                    {t.text}
                  </span>
                </div>
                {t.sub && (
                  <p className={`${big ? 'text-sm mt-1.5' : 'text-xs mt-1'}`} style={{ color: '#9A8A88' }}>{t.sub}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}
