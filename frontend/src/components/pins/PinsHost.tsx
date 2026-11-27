'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { mutate as mutateGlobal } from 'swr'
import { toast } from '@/components/ui/toast'
import { tableroApi, isNotificacionesKey, type PinesRespuesta } from '@/lib/api/tablero'
import { notificacionesApi } from '@/lib/api/notificaciones'
import { construirAncla, dianaEn, ATTR_UI, resolverAncla } from '@/lib/pins/ancla-dom'
import { hrefPin } from '@/lib/pins/ancla'
import { PINS_ANCLADOS } from '@/lib/pins/config'
import { ETIQUETA_ENTIDAD } from '@/lib/pins/entidad'
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
import { useHilosPagina, usePines, usePosiciones, type ListaHilos } from './usePines'

const SIN_PINES = ['/revision/', '/video-analisis', '/pizarra-tactica', '/tablero']

function escribiendo(): boolean {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

function reducirMovimiento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Esquina del botón flotante: de aquí cuelgan el compositor y la burbuja de los hilos sin ancla. */
function puntoBoton() {
  return { x: window.innerWidth - 20, y: window.innerHeight - (window.innerWidth >= 1024 ? 96 : 164) }
}

/** Título de la página para comentarios que no cuelgan de una entidad. */
function tituloPagina(): string {
  return (document.title || '').split(/\s[|·–-]\s/)[0].trim().slice(0, 120)
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
  const comentando = usePinsStore((s) => s.comentando)
  const [contenedor, setContenedor] = useState<HTMLElement | null>(null)
  const pathname = usePathname() || ''

  const esStaff = Boolean(user) && (user!.rol === 'admin' || user!.rol === 'superadmin_plataforma' || miembros.some((m) => m.id === user!.id))
  const activo = Boolean(equipoId) && esStaff && !SIN_PINES.some((r) => pathname.startsWith(r))

  // Hilos de la página: lo que de verdad usa el staff.
  const lista = useHilosPagina(equipoId, activo)
  const { hilos, entidad, key: claveLista, mutate: mutarLista } = lista

  // Anclados a un punto: dormante hasta que exista la columna `ancla`.
  const pins = usePines(equipoId, activo && PINS_ANCLADOS)
  const { ruta, todos, pines, disponible } = pins
  const pinsOn = PINS_ANCLADOS && disponible === true
  const pinesVisibles = pinsOn ? pines : []
  const posiciones = usePosiciones(pinesVisibles, abierto)
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
    usePinsStore.setState({ abierto: null, borrador: null, modo: 'idle', comentando: false })
  }, [ruta, entidad?.id])

  // Atajo «c»: comentar en esta página, solo fuera de campos de texto y sin modificadores.
  useEffect(() => {
    if (!activo) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const s = usePinsStore.getState()
        if (s.modo === 'colocando' || s.borrador) s.cancelar()
        else if (s.comentando) s.comentar(false)
        else if (s.abierto) s.abrir(null)
        return
      }
      if (e.key.toLowerCase() !== 'c' || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.repeat) return
      if (escribiendo() || document.querySelector('[role="dialog"]:not([data-pins-ui])')) return
      e.preventDefault()
      usePinsStore.getState().comentar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activo])

  // ─── Enlace profundo: ?hilo=<id> (hilos de página) y ?pin=<id> (anclados) ───
  const gestionado = useRef<string | null>(null)
  const poll = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => {
    if (poll.current) clearInterval(poll.current)
    poll.current = null
    gestionado.current = null
  }, [])
  useEffect(() => {
    if (!activo) return
    const params = new URLSearchParams(window.location.search)
    const id = params.get('hilo') ?? params.get('pin')
    if (!id || gestionado.current === id) return
    if (lista.cargando || (PINS_ANCLADOS && pins.cargando)) return
    gestionado.current = id

    const limpiar = () => {
      const u = new URL(window.location.href)
      u.searchParams.delete('hilo')
      u.searchParams.delete('pin')
      router.replace(u.pathname + (u.search || ''), { scroll: false })
    }
    const alPanel = () => {
      limpiar()
      useStaffPanel.getState().verHilo(id)
    }
    const marcarLeido = () =>
      notificacionesApi
        .markThreadRead(id)
        .then(() => mutateGlobal(isNotificacionesKey))
        .catch(() => undefined)

    const anclado = pinsOn ? todos.find((p) => p.hilo.id === id) : undefined
    if (anclado) {
      if (anclado.ancla.ruta !== ruta) {
        router.replace(hrefPin(anclado.ancla, id), { scroll: false })
        gestionado.current = null
        return
      }
      void marcarLeido()
      let intentos = 0
      if (poll.current) clearInterval(poll.current)
      const t = setInterval(() => {
        intentos += 1
        const r = resolverAncla(anclado.ancla)
        if (r.origen !== 'elemento' && anclado.ancla.selector && intentos < 20) return
        clearInterval(t)
        poll.current = null
        const suave = reducirMovimiento() ? 'auto' : 'smooth'
        if (r.el) r.el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: suave })
        else window.scrollTo({ top: Math.max(0, anclado.ancla.y - window.innerHeight / 2), behavior: suave })
        setTimeout(() => {
          usePinsStore.setState({ abierto: id, resaltado: id, borrador: null })
          setTimeout(() => usePinsStore.getState().resaltar(null), 1400)
        }, reducirMovimiento() ? 0 : 350)
        limpiar()
      }, 150)
      poll.current = t
      return
    }

    if (!hilos.some((h) => h.id === id)) return alPanel()
    void marcarLeido()
    usePinsStore.setState({ abierto: id, resaltado: id, borrador: null, comentando: false })
    setTimeout(() => usePinsStore.getState().resaltar(null), 1400)
    limpiar()
  }, [activo, lista.cargando, pins.cargando, hilos, todos, pinsOn, ruta, router])

  // Pulso del marcador anclado resaltado.
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

  // ─── Crear un hilo sobre la página (o anclado, si está disponible) ─────────
  const publicar = useCallback(
    async (e: EnvioPin) => {
      if (!equipoId || !user || !claveLista) return
      const ahora = new Date().toISOString()
      const yo = miembros.find((m) => m.id === user.id)
      const titulo = entidad ? null : tituloPagina() || pathname
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
        entidad_tipo: entidad?.tipo ?? null,
        entidad_id: entidad?.id ?? null,
        entidad_titulo: titulo,
        entidad_href: null,
        ancla: e.ancla ?? null,
        fijado: false,
        editado_at: null,
        created_at: ahora,
        ultima_actividad_at: ahora,
        respuestas: [],
        respuestas_count: 0,
      }
      const base = (cur?: ListaHilos): ListaHilos => cur ?? { data: [], siguiente: null }
      usePinsStore.setState({ borrador: null, modo: 'idle', ocultos: false, comentando: false })
      try {
        await mutarLista(
          async (cur) => {
            const hilo = await tableroApi.create({
              equipo_id: equipoId,
              tipo: e.tipo,
              contenido: e.contenido,
              ...(e.ancla ? { ancla: e.ancla } : {}),
              ...(entidad ? { entidad_tipo: entidad.tipo, entidad_id: entidad.id } : { pagina_ruta: pathname, pagina_titulo: titulo ?? undefined }),
            })
            const b = base(cur)
            return { ...b, data: [hilo, ...b.data.filter((h) => !h.id.startsWith('temp-'))] }
          },
          {
            optimisticData: (cur) => ({ ...base(cur), data: [temp, ...base(cur).data] }),
            rollbackOnError: true,
            populateCache: true,
            revalidate: false,
          }
        )
        toast.success('Comentario guardado')
        void mutateGlobal((k) => typeof k === 'string' && k.startsWith('/tablero'))
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
      }
    },
    [equipoId, user, claveLista, miembros, mutarLista, entidad, pathname]
  )

  const aplicar = useCallback(
    (id: string, h: StaffHilo | null) => {
      const act = (cur: { data: StaffHilo[] } | undefined) =>
        cur ? { ...cur, data: h ? cur.data.map((x) => (x.id === id ? h : x)) : cur.data.filter((x) => x.id !== id) } : cur
      void mutarLista((cur) => act(cur) as ListaHilos | undefined, { revalidate: false })
      if (pinsOn) void pins.mutate((cur) => act(cur) as PinesRespuesta | undefined, { revalidate: false })
      if (!h) usePinsStore.getState().abrir(null)
    },
    [mutarLista, pins, pinsOn]
  )

  const capturar = (ev: React.MouseEvent) => {
    const punto = { x: ev.clientX, y: ev.clientY }
    usePinsStore.getState().setBorrador({ ancla: construirAncla(punto), punto })
  }

  if (!activo || !contenedor || !user || !equipoId) return null

  const contexto = entidad ? `Sobre ${entidad.tipo === 'jugador' ? 'este jugador' : entidad.tipo === 'sesion' ? 'esta sesión' : entidad.tipo === 'partido' ? 'este partido' : 'este rival'}` : 'Sobre esta página'
  const abiertoHilo = abierto ? hilos.find((h) => h.id === abierto) : undefined
  const abiertoPin = abierto && pinsOn ? pines.find((p) => p.hilo.id === abierto) : undefined
  const puntoAbierto = abiertoPin ? posiciones[abiertoPin.hilo.id]?.punto : abiertoHilo ? puntoBoton() : undefined
  const hiloAbierto = abiertoPin?.hilo ?? abiertoHilo

  return (
    <>
      <PinsFab
        hilos={hilos}
        sinResolver={lista.sinResolver}
        resaltado={Boolean(resaltado) && !abiertoPin}
        pinsDisponibles={pinsOn}
        hayPines={pines.length > 0}
        onAbrirHilo={(h) => usePinsStore.getState().abrir(h.id)}
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

          {pinsOn && !ocultos && (
            <div {...{ [ATTR_UI]: '' }} className="pointer-events-none fixed inset-0 z-[39] overflow-hidden">
              {pines.map((p) => {
                const pos = posiciones[p.hilo.id]
                if (!pos || (!pos.visible && abierto !== p.hilo.id)) return null
                const resuelto = p.hilo.estado === 'resuelta'
                return (
                  <div key={p.hilo.id} className="absolute" style={{ left: pos.punto.x, top: pos.punto.y, transform: 'translate(-50%, -50%)' }}>
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

          {pinsOn && !ocultos && modo === 'viendo' &&
            pines.map((p) => {
              const pos = posiciones[p.hilo.id]
              if (!pos?.visible || abierto === p.hilo.id) return null
              return <PinResumen key={p.hilo.id} hilo={p.hilo} punto={pos.punto} onAbrir={() => usePinsStore.getState().abrir(p.hilo.id)} />
            })}

          {hiloAbierto && puntoAbierto && (
            <PinBurbuja
              key={hiloAbierto.id}
              hilo={hiloAbierto}
              punto={puntoAbierto}
              numero={abiertoPin?.numero}
              equipoId={equipoId}
              miembros={miembros}
              meId={user.id}
              puedeModerar={puedeModerar}
              onCerrar={() => usePinsStore.getState().abrir(null)}
              onCambio={(h) => aplicar(hiloAbierto.id, h)}
            />
          )}

          {comentando && (
            <PinComposer
              punto={puntoBoton()}
              contexto={contexto}
              miembros={miembros}
              meId={user.id}
              onEnviar={publicar}
              onCancelar={() => usePinsStore.getState().comentar(false)}
            />
          )}

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
                contexto={contexto}
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

/** Comentarios del staff: botón flotante, hilos de la página y enlace profundo. Va una sola vez en el layout. */
export function PinsHost() {
  return (
    <Suspense fallback={null}>
      <Capa />
    </Suspense>
  )
}
