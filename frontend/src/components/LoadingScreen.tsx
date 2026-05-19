'use client'

import { useEffect, useState } from 'react'

interface LoadingScreenProps {
  progress: number
  message: string
  isComplete: boolean
}

export function LoadingScreen({ progress, message, isComplete }: LoadingScreenProps) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setFadeOut(true), 600)
      return () => clearTimeout(timer)
    }
  }, [isComplete])

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center transition-opacity duration-700 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(145deg, #0c1220 0%, #162032 40%, #1a2740 70%, #0c1220 100%)',
      }}
    >
      {/* Decorative background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 60%)' }}
        />
      </div>

      {/* Logo with float animation */}
      <div className="relative mb-10">
        {/* Glow behind logo */}
        <div
          className="absolute inset-0 rounded-2xl animate-pulse"
          style={{
            background: 'rgba(59, 130, 246, 0.2)',
            filter: 'blur(24px)',
            transform: 'scale(1.6)',
            animationDuration: '3s',
          }}
        />
        {/* Logo block */}
        <div
          className="relative w-24 h-24 rounded-2xl flex items-center justify-center shadow-2xl border border-blue-500/20"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
            animation: 'logoFloat 3s ease-in-out infinite',
          }}
        >
          <span className="text-white font-black text-3xl tracking-tight select-none">
            TH
          </span>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-white text-2xl font-bold tracking-tight mb-1">
        TrainingHub Pro
      </h1>
      <p className="text-slate-400 text-sm mb-10">
        Preparando tu espacio de trabajo
      </p>

      {/* Progress section */}
      <div className="w-72 space-y-3">
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out relative"
            style={{
              width: `${Math.max(progress, 3)}%`,
              background: 'linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa)',
            }}
          >
            {/* Shimmer */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                animation: 'shimmer 2s infinite',
              }}
            />
          </div>
        </div>

        {/* Percentage + message */}
        <div className="flex items-center justify-between">
          <p className="text-slate-500 text-xs transition-all duration-500 max-w-[200px] truncate">
            {message}
          </p>
          <span className="text-slate-300 text-xs font-mono font-medium tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Checkmark when complete */}
      {isComplete && (
        <div
          className="mt-8 flex items-center gap-2 text-emerald-400 text-sm font-medium"
          style={{ animation: 'fadeInUp 0.4s ease-out' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>¡Todo listo!</span>
        </div>
      )}

      {/* Footer branding */}
      <p className="absolute bottom-6 text-slate-600 text-xs">
        Sistema profesional de gestión de entrenamientos
      </p>

      {/* Keyframes */}
      <style jsx>{`
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
