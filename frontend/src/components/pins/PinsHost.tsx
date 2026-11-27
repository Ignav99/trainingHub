'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { mutate as mutateGlobal } from 'swr'
import { toast } from '@/components/ui/toast'
import { tableroApi, type PinesRespuesta } from '@/lib/api/tablero'
import { notificacionesApi } from '@/lib/api/notificaciones'
import { isNotificacionesKey } from '@/lib/api/tablero'
import { construirAncla, dianaEn, ATTR_UI, resolverAncla } from '@/lib/pins/ancla-dom'
import { hrefPin } from '@/lib/pins/ancla'
import { useAuthStore } from '@/stores/authStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { usePinsStore } from '@/stores/pinsStore'
import { useStaffPanel } from '@/stores/staffPanelStore'
import { useMiembrosStaff } from '@/components/tablero/useTablero'
import { puedeModerarTablero } from '@/components/tablero/permisos'
import type { StaffHilo } from '@/types'
import { PinBurbuja, PinResumen } from './PinBurbuja'
import { PinComposer, type EnvioPin } from './PinComposer'
import { PinMarcador } from './PinMarcador'
import { PinsFab } from './PinsFab'
import { pinesSinResolver, usePines, usePosiciones, type Pin } from './usePines'

const SIN_PINES = ['/revision/', '/video-analisis', '/pizarra-tactica', '/tablero']

function escribiendo(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

function reducirMovimiento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Reenvía la rueda al contenedor con scroll bajo el cursor mientras se elige el punto. */
function desplazarBajo(x: number, y: number, dx: number, dy: number) {
  let el: Element | null = dianaEn({ x, y })
  while (el && el !== document.body) {
    const s = getComputedStyle(el)
    const sy = /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight
    const sx = /(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth
    if (sy || sx) {
      el.scrollBy({ left: sx ? dx : 0, top: sy ? dy : 0 })
      return
    }
    el = el.parentElement
  }
  window.scrollBy({ left: dx, top: dy })
}

function Capa() {
  const user = useAuthStore((s) => s.user)
  const equipoId = useEquipoStore((s) => s.equipoActivo?.id)
  const router = useRouter()
  const miembros = useMiembrosStaff(equipoId)
  const modo = usePinsStore((s) => s.modo)
  const ocultos = usePinsStore((s) => s.ocultos)
  const abierto = usePinsStore((s) => s.abierto)
  const resaltado = usePinsStore((s) => s.resaltado)
  const borrador = usePinsStore((s) => s.borrador)
  const [contenedor, setContenedor] = useState<HTMLElement | null>(null)
  const pathname = usePathname() || ''

  const esStaff = Boolean(user) && (user!.rol === 'admin' || user!.rol === 'superadmin_plataforma' || miembros.some((m) => m.id === user!.id))
  const esAdmin = user?.rol === 'admin' || user?.rol === 'superadmin_plataforma'
  const activo = Boolean(equipoId) && esStaff && !SIN_PINES.some((r) => pathname.startsWith(r))
  const { key, ruta, todos, pines, mutate, disponible, cargando } = usePines(equipoId, activo)
  const posiciones = usePosiciones(pines, abierto)
  const puedeModerar = puedeModerarTablero(user, miembros)

  useEffect(() => {
    const c = document.createElement('div')
    c.setAttribute(ATTR_UI, '')
    document.body.appendChild(c)
    setContenedor(c)
    return () => {
      c.remove()
    }
  }, [])

  // Al cambiar de vista se cierra lo abierto.
  useEffect(() => {
    usePinsStore.setState({ abierto: null, borrador: null, modo: 'idle' })
  }, [ruta])

  // Atajo «c»: solo fuera de campos de texto y sin modificadores.
  useEffect(() => {
    if (!activo || disponible === false) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const s = usePinsStore.getState()
        if (s.modo === 'colocando' || s.borrador) s.cancelar()
        else if (s.abierto) s.abrir(null)
        return
      }
      if (e.key.toLowerCase() !== 'c' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.repeat) return
      if (escribiendo() || document.querySelector('[role="dialog"]:not([data-pins-ui])')) return
      e.preventDefault()
      usePinsStore.getState().colocar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activo, disponible])

  // ─── Enlace profundo: ?pin=<id> ─────────────────────────────────────────────
  const gestionado = useRef<string | null>(null)
  const poll = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => {
    if (poll.current) clearInterval(poll.current)
    poll.current = null
    gestionado.current = null
  }, [])
  useEffect(() => {
    if (!activo) return
    const id = new URLSearchParams(window.location.search).get('pin')
    if (!id || gestionado.current === id) return
    if (cargando || disponible === undefined) return
    gestionado.current = id

    const limpiar = () => {
      const u = new URL(window.location.href)
      u.searchParams.delete('pin')
      router.replace(u.pathname + (u.search || ''), { scroll: false })
    }
    const alHilo = () => {
      limpiar()
      useStaffPanel.getState().verHilo(id)
    }
    const hallado = todos.find((p) => p.hilo.id === id)
    if (!hallado || disponible === false) return alHilo()
    if (hallado.ancla.ruta !== ruta) {
      router.replace(hrefPin(hallado.ancla, id), { scroll: false })
      gestionado.current = null
      return
    }

    notificacionesApi
      .markThreadRead(id)
      .then(() => mutateGlobal(isNotificacionesKey))
      .catch(() => undefined)

    let intentos = 0
    if (poll.current) clearInterval(poll.current)
    const t = setInterval(() => {
      intentos += 1
      const r = resolverAncla(hallado.ancla)
      const listo = r.origen === 'elemento' || !hallado.ancla.selector
      if (!listo && intentos < 20) return
      clearInterval(t)
      poll.current = null
      const suave = reducirMovimiento() ? 'auto' : 'smooth'
      if (r.el) r.el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: suave })
      else window.scrollTo({ top: Math.max(0, hallado.ancla.y - window.innerHeight / 2), behavior: suave })
      setTimeout(() => {
        usePinsStore.setState({ abierto: id, resaltado: id, borrador: null })
        setTimeout(() => usePinsStore.getState().resaltar(null), 1400)
      }, reducirMovimiento() ? 0 : 350)
      limpiar()
    }, 150)
    poll.current = t
  }, [activo, cargando, disponible, todos, ruta, router])

  // Pulso del marcador resaltado (solo transform/opacity; sin movimiento si se pidió reducir).
  const anilloRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!resaltado || reducirMovimiento()) return
    anilloRef.current?.animate(
      [
        { transform: 'scale(1)', opacity: 0.9 },
        { transform: 'scale(2.2)', opacity: 0 },
      ],
      { duration: 700, iterations: 2, easing: 'cubic-bezier(0.2, 0, 0, 1)' }
    )
  }, [resaltado])

  // ─── Crear ─────────────────────────────────────────────────────────────────
  const publicar = useCallback(
    async (e: EnvioPin) => {
      if (!equipoId || !user || !key) return
      const ahora = new Date().toISOString()
      const yo = miembros.find((m) => m.id === user.id)
      const temp: StaffHilo = {
        id: `temp-${Date.now()}`,
        equipo_id: equipoId,
        parent_id: null,
        tipo: e.tipo,
        contenido: e.contenido,
        menciones: [],
        autor: { id: user.id, nombre: user.nombre, apellidos: user.apellidos ?? '', avatar_url: yo?.avatar_url ?? null },
        asignado: null,
        fecha_limite: null,
        estado: 'abierta',
        resuelto_por: null,
        resuelto_at: null,
        entidad_tipo: null,
        entidad_id: null,
        entidad_titulo: null,
        entidad_href: null,
        ancla: e.ancla,
        fijado: false,
        editado_at: null,
        created_at: ahora,
        ultima_actividad_at: ahora,
        respuestas: [],
        respuestas_count: 0,
      }
      const base = (cur?: PinesRespuesta): PinesRespuesta => cur ?? { data: [], disponible: true }
      usePinsStore.setState({ borrador: null, modo: 'idle', ocultos: false })
      try {
        await mutate(
          async (cur) => {
            const hilo = await tableroApi.create({
              equipo_id: equipoId,
              tipo: e.tipo,
              contenido: e.contenido,
              ancla: e.ancla,
            })
            const b = base(cur)
            return { ...b, data: [...b.data.filter((h) => !h.id.startsWith('temp-')), hilo] }
          },
          {
            optimisticData: (cur) => ({ ...base(cur), data: [...base(cur).data, temp] }),
            rollbackOnError: true,
            populateCache: true,
            revalidate: false,
          }
        )
        toast.success('Comentario guardado')
        void mutateGlobal((k) => typeof k === 'string' && k.startsWith('/tablero'))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo guardar'
        toast.error(msg)
        if (/migraci/i.test(msg)) void mutate({ data: [], disponible: false }, { revalidate: false })
      }
    },
    [equipoId, user, key, miembros, mutate]
  )

  const aplicar = useCallback(
    (id: string, h: StaffHilo | null) => {
      void mutate(
        (cur) => {
          if (!cur) return cur
          return { ...cur, data: h ? cur.data.map((x) => (x.id === id ? h : x)) : cur.data.filter((x) => x.id !== id) }
        },
        { revalidate: false }
      )
      if (!h) usePinsStore.getState().abrir(null)
    },
    [mutate]
  )

  const capturar = (ev: React.MouseEvent) => {
    const punto = { x: ev.clientX, y: ev.clientY }
    usePinsStore.getState().setBorrador({ ancla: construirAncla(punto), punto })
  }

  const ordenados = useMemo(() => pines, [pines])
  if (!activo || !contenedor || !user || !equipoId) return null

  return (
    <>
      <PinsFab
        pines={ordenados}
        sinResolver={pinesSinResolver(ordenados)}
        disponible={disponible !== false}
        esAdmin={Boolean(esAdmin)}
        posiciones={posiciones}
      />
      {createPortal(
        <>
          {modo === 'colocando' && (
            <>
              <div
                {...{ [ATTR_UI]: '' }}
                role="status"
                className="pointer-events-none fixed inset-x-0 top-0 z-[46] flex h-9 items-center justify-center border-b-[1.5px] border-line bg-card px-4 text-xs text-foreground animate-in fade-in-0 duration-base ease-sale motion-reduce:animate-none"
              >
                Haz clic donde quieras dejar el comentario · Esc para cancelar
              </div>
              <div
                {...{ [ATTR_UI]: '' }}
                data-testid="pins-captura"
                onClick={capturar}
                onWheel={(e) => desplazarBajo(e.clientX, e.clientY, e.deltaX, e.deltaY)}
                className="fixed inset-0 z-[44] cursor-crosshair"
              />
            </>
          )}

          {!ocultos && (
            <div {...{ [ATTR_UI]: '' }} className="pointer-events-none fixed inset-0 z-[39] overflow-hidden">
              {ordenados.map((p) => {
                const pos = posiciones[p.hilo.id]
                if (!pos || (!pos.visible && abierto !== p.hilo.id)) return null
                const resuelto = p.hilo.estado === 'resuelta'
                return (
                  <div
                    key={p.hilo.id}
                    className="absolute"
                    style={{ left: pos.punto.x, top: pos.punto.y, transform: 'translate(-50%, -50%)' }}
                  >
                    {resaltado === p.hilo.id && (
                      <span
                        ref={anilloRef}
                        aria-hidden
                        className="pointer-events-none absolute inset-0 rounded-[var(--radius)] border-[1.5px] border-[hsl(var(--club-primary))]"
                      />
                    )}
                    <PinMarcador
                      numero={p.numero}
                      resuelto={resuelto}
                      activo={abierto === p.hilo.id}
                      etiqueta={`Comentario ${p.numero} de ${p.hilo.autor?.nombre ?? 'alguien'}${resuelto ? ' (resuelto)' : ''}`}
                      onClick={() => usePinsStore.getState().abrir(abierto === p.hilo.id ? null : p.hilo.id)}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {!ocultos &&
            modo === 'viendo' &&
            ordenados.map((p) => {
              const pos = posiciones[p.hilo.id]
              if (!pos?.visible || abierto === p.hilo.id) return null
              return (
                <PinResumen
                  key={p.hilo.id}
                  hilo={p.hilo}
                  punto={pos.punto}
                  onAbrir={() => usePinsStore.getState().abrir(p.hilo.id)}
                />
              )
            })}

          {!ocultos && abierto && (() => {
            const p = ordenados.find((x) => x.hilo.id === abierto)
            const pos = p && posiciones[p.hilo.id]
            if (!p || !pos) return null
            return (
              <PinBurbuja
                key={p.hilo.id}
                hilo={p.hilo}
                punto={pos.punto}
                numero={p.numero}
                equipoId={equipoId}
                miembros={miembros}
                meId={user.id}
                puedeModerar={puedeModerar}
                onCerrar={() => usePinsStore.getState().abrir(null)}
                onCambio={(h) => aplicar(p.hilo.id, h)}
              />
            )
          })()}

          {borrador && (
            <>
              <div
                {...{ [ATTR_UI]: '' }}
                className="pointer-events-none fixed z-[44]"
                style={{ left: borrador.punto.x, top: borrador.punto.y, transform: 'translate(-50%, -50%)' }}
              >
                <PinMarcador numero="+" fantasma etiqueta="Nuevo comentario" />
              </div>
              <PinComposer
                key={`${borrador.punto.x}-${borrador.punto.y}`}
                punto={borrador.punto}
                ancla={borrador.ancla}
                miembros={miembros}
                meId={user.id}
                onEnviar={publicar}
                onCancelar={() => usePinsStore.getState().cancelar()}
              />
            </>
          )}
        </>,
        contenedor
      )}
    </>
  )
}

/** Comentarios anclados: botón flotante, capa de marcadores y enlace profundo. Va una sola vez en el layout. */
export function PinsHost() {
  return (
    <Suspense fallback={null}>
      <Capa />
    </Suspense>
  )
}
