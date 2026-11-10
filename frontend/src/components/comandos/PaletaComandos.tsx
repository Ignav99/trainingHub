'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { applyAppearance, nextAppearance, readAppearance } from '@/lib/appearance'
import { apiKey } from '@/lib/swr'
import { filtrarComandos, type Comando } from '@/lib/comandos'
import { useMontado } from '@/lib/useAppearance'
import { useEquipoStore } from '@/stores/equipoStore'
import type { Jugador } from '@/lib/api/jugadores'
import { cn } from '@/lib/utils'

const EVENTO_ABRIR = 'kabine:abrir-paleta'

type Item = Comando & { accion?: () => void }

const GRUPO_IR = 'Ir a'
const GRUPO_ACCIONES = 'Acciones'
const GRUPO_JUGADORES = 'Jugadores'

const NAVEGACION: Item[] = [
  { id: 'ir:hoy', titulo: 'Hoy', grupo: GRUPO_IR, href: '/', palabras: ['dashboard', 'inicio', 'panel', 'semana'] },
  { id: 'ir:sesiones', titulo: 'Sesiones', grupo: GRUPO_IR, href: '/sesiones', palabras: ['entrenamiento', 'microciclo'] },
  { id: 'ir:plantilla', titulo: 'Plantilla', grupo: GRUPO_IR, href: '/plantilla', palabras: ['jugadores', 'equipo'] },
  { id: 'ir:partidos', titulo: 'Partidos', grupo: GRUPO_IR, href: '/partidos', palabras: ['encuentros', 'convocatoria'] },
  { id: 'ir:rivales', titulo: 'Rivales', grupo: GRUPO_IR, href: '/rivales', palabras: ['scouting', 'oponentes'] },
  { id: 'ir:abp', titulo: 'Balón parado', grupo: GRUPO_IR, href: '/abp', palabras: ['abp', 'corner', 'falta', 'saque'] },
  { id: 'ir:competicion', titulo: 'Competición', grupo: GRUPO_IR, href: '/competicion', palabras: ['liga', 'clasificacion', 'calendario'] },
  { id: 'ir:enfermeria', titulo: 'Enfermería', grupo: GRUPO_IR, href: '/enfermeria', palabras: ['salud', 'lesiones', 'medico'] },
  { id: 'ir:rpe', titulo: 'RPE', grupo: GRUPO_IR, href: '/rpe', palabras: ['salud', 'carga', 'esfuerzo'] },
  { id: 'ir:nutricion', titulo: 'Nutrición', grupo: GRUPO_IR, href: '/nutricion', palabras: ['salud', 'dieta'] },
  { id: 'ir:anotador', titulo: 'Anotador', grupo: GRUPO_IR, href: '/anotador', palabras: ['eventos', 'reloj'] },
  { id: 'ir:video', titulo: 'Vídeo análisis', grupo: GRUPO_IR, href: '/video-analisis', palabras: ['video', 'analisis'] },
  { id: 'ir:cortes', titulo: 'Biblioteca de cortes', grupo: GRUPO_IR, href: '/biblioteca-cortes', palabras: ['clips', 'video'] },
  { id: 'ir:pizarra', titulo: 'Pizarra táctica', grupo: GRUPO_IR, href: '/pizarra-tactica', palabras: ['tactica', 'dibujo'] },
  { id: 'ir:estadisticas', titulo: 'Estadísticas', grupo: GRUPO_IR, href: '/estadisticas', palabras: ['datos', 'numeros'] },
  { id: 'ir:informes', titulo: 'Informes', grupo: GRUPO_IR, href: '/informes', palabras: ['pdf', 'reportes'] },
  { id: 'acc:nueva-sesion', titulo: 'Nueva sesión', grupo: GRUPO_ACCIONES, href: '/sesiones/nueva', palabras: ['crear', 'entrenamiento'] },
  { id: 'acc:nuevo-partido', titulo: 'Nuevo partido', grupo: GRUPO_ACCIONES, href: '/partidos/nuevo', palabras: ['crear', 'encuentro'] },
  { id: 'acc:nuevo-jugador', titulo: 'Nuevo jugador', grupo: GRUPO_ACCIONES, href: '/plantilla/nuevo', palabras: ['crear', 'fichar', 'alta'] },
]

function agrupar(items: Item[]): Item[] {
  const orden: string[] = []
  for (const i of items) if (!orden.includes(i.grupo)) orden.push(i.grupo)
  return orden.flatMap((g) => items.filter((i) => i.grupo === g))
}

function dentroDeEditor(destino: EventTarget | null): boolean {
  return destino instanceof Element && !!destino.closest('.ProseMirror, .cm-editor, .monaco-editor, [data-no-paleta]')
}

export function PaletaComandos() {
  const router = useRouter()
  const [abierta, setAbierta] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [activo, setActivo] = useState(0)
  const entrada = useRef<HTMLInputElement>(null)
  const lista = useRef<HTMLDivElement>(null)

  const equipoId = useEquipoStore((s) => s.equipoActivo?.id)

  // Misma clave que /plantilla. Solo se lee la caché: nunca dispara una petición.
  const { data: respuesta } = useSWR<{ data: Jugador[]; total: number }>(
    abierta ? apiKey('/jugadores', { equipo_id: equipoId, organizacion_completa: undefined }, ['equipo_id']) : null,
    {
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  const cambiarAspecto = useCallback(() => {
    applyAppearance(nextAppearance(readAppearance()))
  }, [])

  const todos = useMemo<Item[]>(() => {
    const aspecto: Item = {
      id: 'acc:aspecto',
      titulo: 'Cambiar aspecto',
      grupo: GRUPO_ACCIONES,
      palabras: ['tema', 'cal', 'acta', 'clasico', 'oscuro', 'visual'],
      accion: cambiarAspecto,
    }
    const jugadores: Item[] = (respuesta?.data ?? []).map((j) => ({
      id: `jug:${j.id}`,
      titulo: `${j.nombre} ${j.apellidos}`.trim(),
      grupo: GRUPO_JUGADORES,
      href: `/plantilla/${j.id}`,
      palabras: [j.apodo ?? '', j.dorsal != null ? String(j.dorsal) : '', j.posicion_principal ?? ''].filter(Boolean),
    }))
    // Con la consulta vacía no se vuelca toda la plantilla en la lista.
    return consulta.trim() ? [...NAVEGACION, aspecto, ...jugadores] : [...NAVEGACION, aspecto]
  }, [respuesta, consulta, cambiarAspecto])

  const visibles = useMemo(() => agrupar(filtrarComandos(todos, consulta)), [todos, consulta])

  const cerrar = useCallback(() => {
    setAbierta(false)
    setConsulta('')
    setActivo(0)
  }, [])

  const ejecutar = useCallback(
    (item: Item | undefined) => {
      if (!item) return
      cerrar()
      if (item.accion) item.accion()
      else if (item.href) router.push(item.href)
    },
    [cerrar, router]
  )

  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        if (dentroDeEditor(e.target)) return
        e.preventDefault()
        setAbierta((a) => !a)
        setConsulta('')
        setActivo(0)
      }
    }
    function alPedir() {
      setAbierta(true)
      setConsulta('')
      setActivo(0)
    }
    window.addEventListener('keydown', alTeclear)
    window.addEventListener(EVENTO_ABRIR, alPedir)
    return () => {
      window.removeEventListener('keydown', alTeclear)
      window.removeEventListener(EVENTO_ABRIR, alPedir)
    }
  }, [])

  useEffect(() => {
    if (!abierta) return
    lista.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activo, abierta, visibles])

  function alTeclearEnCampo(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (visibles.length) setActivo((a) => (a + 1) % visibles.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (visibles.length) setActivo((a) => (a - 1 + visibles.length) % visibles.length)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActivo(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActivo(Math.max(visibles.length - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      ejecutar(visibles[activo])
    }
  }

  const idOpcion = (i: number) => `paleta-opcion-${i}`
  let indice = -1

  return (
    <DialogPrimitive.Root open={abierta} onOpenChange={(o) => (o ? setAbierta(true) : cerrar())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/20 duration-[120ms] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            entrada.current?.focus()
          }}
          className="fixed left-1/2 top-[15vh] z-50 w-[calc(100%-2rem)] max-w-[36rem] -translate-x-1/2 overflow-hidden rounded-[var(--radius)] border-[1.5px] border-line bg-card text-foreground duration-[120ms] data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <DialogPrimitive.Title className="sr-only">Paleta de comandos</DialogPrimitive.Title>
          <input
            ref={entrada}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="paleta-lista"
            aria-autocomplete="list"
            aria-activedescendant={visibles.length ? idOpcion(activo) : undefined}
            aria-label="Buscar o ir a"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Buscar o ir a…"
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value)
              setActivo(0)
            }}
            onKeyDown={alTeclearEnCampo}
            className="h-12 w-full border-b-[1.5px] border-line bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <div
            ref={lista}
            id="paleta-lista"
            role="listbox"
            aria-label="Comandos"
            className="max-h-[60vh] overflow-y-auto p-1.5"
          >
            {visibles.length === 0 && (
              <p role="presentation" className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nada coincide con «{consulta.trim()}».
              </p>
            )}
            {visibles.map((item, i) => {
              const nuevoGrupo = i === 0 || visibles[i - 1].grupo !== item.grupo
              indice = i
              const esActivo = i === activo
              return (
                <div key={item.id} role="presentation">
                  {nuevoGrupo && (
                    <div role="presentation" className={cn('cal-rotulo px-2 pb-1 text-muted-foreground', i === 0 ? 'pt-1.5' : 'pt-3')}>
                      {item.grupo}
                    </div>
                  )}
                  <div
                    id={idOpcion(i)}
                    role="option"
                    aria-selected={esActivo}
                    onMouseMove={() => !esActivo && setActivo(i)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      ejecutar(item)
                    }}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius)] px-2 py-2 text-sm',
                      esActivo ? 'bg-primary text-primary-foreground' : 'text-foreground'
                    )}
                  >
                    <span className="truncate">{item.titulo}</span>
                    {item.atajo && (
                      <span className={cn('shrink-0 font-mono text-xs', esActivo ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                        {item.atajo}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-3 border-t-[1.5px] border-line bg-sunken px-3 py-1.5 text-xs text-muted-foreground">
            <span><kbd className="font-mono">↑↓</kbd> mover</span>
            <span><kbd className="font-mono">Intro</kbd> abrir</span>
            <span><kbd className="font-mono">Esc</kbd> cerrar</span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/** Botón opcional para la banda. Abre la paleta mediante un evento de ventana. */
export function PaletaBoton({ className }: { className?: string }) {
  const montado = useMontado()
  const esMac = montado && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR))}
      className={cn(
        'inline-flex h-8 items-center gap-3 rounded-[var(--radius)] border-[1.5px] border-line bg-card px-2.5 text-sm text-muted-foreground hover:bg-sunken hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <span>Buscar o ir a…</span>
      <kbd className="font-mono text-xs">{esMac ? '⌘K' : 'Ctrl K'}</kbd>
    </button>
  )
}
