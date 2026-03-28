'use client'

import { useState, useEffect } from 'react'

const FOOTBALL_FACTS = [
  { text: 'El FC Barcelona posee el récord de más pases completados en un partido de Champions: 953 contra el Celtic en 2012.', emoji: '⚽' },
  { text: 'Pelé marcó 1.283 goles en su carrera, un récord que duró décadas como el más alto de la historia.', emoji: '🏆' },
  { text: 'El estadio Rungrado May Day en Corea del Norte tiene capacidad para 114.000 espectadores, el más grande del mundo.', emoji: '🏟️' },
  { text: 'El gol más rápido de la historia del fútbol fue marcado a los 2 segundos del pitido inicial.', emoji: '⚡' },
  { text: 'España ganó 35 partidos consecutivos entre 2007 y 2009, récord mundial de selecciones.', emoji: '🇪🇸' },
  { text: 'La primera tarjeta roja en un Mundial se mostró en 1930, en el partido Chile vs Argentina.', emoji: '🟥' },
  { text: 'El arquero Rogério Ceni marcó 131 goles en su carrera, más que muchos delanteros profesionales.', emoji: '🧤' },
  { text: 'La Bundesliga fue la primera liga europea en implementar la tecnología del VAR en 2017.', emoji: '📺' },
  { text: 'Xavi Hernández completó más de 90% de pases en 6 temporadas consecutivas con el Barça.', emoji: '🎯' },
  { text: 'El fútbol femenino tuvo su primer Mundial oficial en 1991 en China.', emoji: '🌍' },
  { text: 'Maldini jugó 25 temporadas en el AC Milan sin pedir nunca un traspaso.', emoji: '❤️' },
  { text: 'En 2002, Corea del Sur se convirtió en el primer país asiático en llegar a semifinales de un Mundial.', emoji: '🇰🇷' },
  { text: 'El césped de Wembley se corta a exactamente 25mm antes de cada partido.', emoji: '🌱' },
  { text: 'Un jugador profesional recorre entre 10 y 13 km de media por partido.', emoji: '🏃' },
  { text: 'La carga de entrenamiento óptima sigue la regla del 10%: no aumentar más del 10% semanal.', emoji: '📊' },
  { text: 'Los equipos con mejor ratio de pases en el último tercio tienen un 23% más de probabilidad de victoria.', emoji: '📈' },
  { text: 'El pressing alto recupera el balón en menos de 5 segundos el 34% de las veces.', emoji: '🔄' },
  { text: 'Los jugadores sub-23 que descansan 48h entre sesiones intensas rinden un 18% más.', emoji: '💤' },
]

const LOADING_STEPS = [
  'Conectando con el servidor...',
  'Verificando credenciales...',
  'Cargando tu espacio de trabajo...',
  'Preparando datos del equipo...',
  'Casi listo...',
]

export function SplashScreen() {
  const [factIndex, setFactIndex] = useState(() => Math.floor(Math.random() * FOOTBALL_FACTS.length))
  const [fadeIn, setFadeIn] = useState(true)
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  // Rotate facts every 4 seconds with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setFactIndex(prev => (prev + 1) % FOOTBALL_FACTS.length)
        setFadeIn(true)
      }, 400)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Animate progress and steps
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return 90 // Cap at 90% until actually loaded
        return prev + Math.random() * 8 + 2
      })
    }, 600)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex(prev => Math.min(prev + 1, LOADING_STEPS.length - 1))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const fact = FOOTBALL_FACTS[factIndex]

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1040 30%, #251560 60%, #1a1040 100%)',
      }}
    >
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)',
            bottom: '20%',
            right: '10%',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center max-w-md px-6 w-full">

        {/* Logo with glow */}
        <div className="relative mb-8">
          {/* Glow behind logo */}
          <div
            className="absolute inset-0 blur-2xl opacity-60 animate-pulse"
            style={{
              background: 'radial-gradient(circle, #7c3aed 0%, transparent 60%)',
              transform: 'scale(2.5)',
            }}
          />
          {/* Outer ring */}
          <div className="absolute -inset-4 rounded-full border border-purple-500/20 animate-kabine-ping" />
          {/* Logo */}
          <img
            src="/logo-icon.png"
            alt="Kabin-e"
            className="relative w-20 h-20 drop-shadow-2xl animate-kabine-spin"
            style={{ filter: 'drop-shadow(0 0 20px rgba(124, 58, 237, 0.5))' }}
          />
        </div>

        {/* Brand name */}
        <h1
          className="text-3xl font-bold tracking-tight mb-1"
          style={{
            background: 'linear-gradient(135deg, #e2d4ff 0%, #a78bfa 50%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Kabin-e
        </h1>
        <p className="text-purple-300/60 text-xs font-medium tracking-[0.3em] uppercase mb-10">
          Gestión deportiva profesional
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-xs mb-4">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s linear infinite',
              }}
            />
          </div>
        </div>

        {/* Loading step text */}
        <p className="text-purple-200/70 text-sm mb-12 h-5 transition-all duration-300">
          {LOADING_STEPS[stepIndex]}
        </p>

        {/* Football fact card */}
        <div
          className="w-full rounded-xl border border-purple-500/10 backdrop-blur-sm px-5 py-4 transition-all duration-400"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(30,20,60,0.5) 100%)',
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5 shrink-0">{fact.emoji}</span>
            <div>
              <p className="text-[10px] font-semibold text-purple-400/70 uppercase tracking-wider mb-1">
                ¿Sabías que...?
              </p>
              <p className="text-purple-100/80 text-sm leading-relaxed">
                {fact.text}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-6 flex flex-col items-center gap-1">
        <p className="text-purple-400/30 text-[10px] tracking-widest uppercase">
          Powered by Kabin-e
        </p>
      </div>

      {/* Shimmer animation for progress bar */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
