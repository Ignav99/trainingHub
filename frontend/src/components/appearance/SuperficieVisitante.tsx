'use client'

import { useAppearance } from '@/lib/useAppearance'

/**
 * Superficie Visitante (oscura) de Cal para vídeo, cortes y pizarra.
 * Ocupa todo el área de contenido de <main>: compensa su padding
 * (py-6 pb-24 lg:pb-6 px-4 sm:px-6 lg:px-8) con márgenes negativos y lo repone por dentro.
 * El -mt-4 absorbe el mb-4 de la tira de la semana; la línea superior separa ambas zonas.
 * En los demás aspectos devuelve los hijos sin envolver.
 */
export function SuperficieVisitante({ children }: { children: React.ReactNode }) {
  const appearance = useAppearance()
  if (appearance !== 'cal') return <>{children}</>
  return (
    <div
      data-superficie="visitante"
      className="-mx-4 -mb-24 -mt-4 min-h-[calc(100dvh-5.5rem)] border-t-[1.5px] border-line bg-background px-4 pb-24 pt-6 text-foreground sm:-mx-6 sm:px-6 lg:-mx-8 lg:-mb-6 lg:px-8 lg:pb-6"
    >
      {children}
    </div>
  )
}
