'use client'

import Link from 'next/link'
import { PenTool, ScanSearch } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const SECTIONS = [
  {
    href: '/pizarra-tactica',
    icon: PenTool,
    title: 'Pizarra Táctica',
    description: 'Dibuja jugadas, anima secuencias y exporta tus pizarras.',
  },
  {
    href: '/video-analisis',
    icon: ScanSearch,
    title: 'Herramienta de Vídeo',
    description: 'Analiza un vídeo, recorta clips y usa el anotador en directo.',
  },
] as const

/** Home page of the lite edition: just the two sections, nothing to load. */
export function LiteHome() {
  const nombre = useAuthStore((s) => s.user?.nombre)

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{nombre ? `Hola, ${nombre}` : 'Hola'}</h1>
        <p className="text-muted-foreground">¿Qué quieres hacer hoy?</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex min-h-[220px] flex-col justify-between rounded-2xl border bg-card p-8 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--club-primary))] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid h-14 w-14 place-items-center rounded-xl bg-[hsl(var(--club-primary)/0.1)] text-[hsl(var(--club-primary))]">
              <s.icon className="h-7 w-7" />
            </span>
            <span>
              <span className="block text-xl font-semibold">{s.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{s.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
