'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ListChecks, Menu, Minus, Pause, Play, Plus } from 'lucide-react'
import { KabineMark } from '@/components/brand/KabineLogo'
import { TeamCrest } from '@/components/ui/team-crest'
import { cn } from '@/lib/utils'
import type { DatosSync } from './adaptadores'
import { IconoRevisar } from './Iconos'
import { Boton, PULSAR, Rotulo, Segmentado } from './Piezas'
import { SyncBadge } from './SyncBadge'

export interface EquipoCabecera {
  nombre: string
  escudoUrl?: string | null
}

export interface RelojProps {
  texto: string
  fase: string
  corriendo: boolean
  empezado: boolean
  cerrado: boolean
  parte: 1 | 2
  onAlternar: () => void
  onSegundaParte: () => void
  onCambiarParte: (p: 1 | 2) => void
  onAjustar: (deltaMs: number) => void
}

export interface ItemMenu {
  id: string
  etiqueta: string
  descripcion?: string
  icono?: ReactNode
  onClick?: () => void
  href?: string
}

export interface TopBarProps {
  club: EquipoCabecera
  rival: EquipoCabecera
  contexto: string
  gf: number
  gc: number
  reloj: RelojProps
  sync: DatosSync
  onSync: () => void
  onLogin?: () => void
  revision: { total: number; errores: number; onAbrir: () => void }
  cronologia: { abierta: boolean; total: number; onAlternar: () => void }
  menu: ItemMenu[]
}

export function Reloj({ r }: { r: RelojProps }) {
  const [ajuste, setAjuste] = useState(false)
  const medioTiempo = r.empezado && !r.corriendo && r.parte === 1 && !r.cerrado
  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setAjuste((v) => !v)}
        aria-expanded={ajuste}
        aria-label={`Reloj ${r.texto}, ${r.fase}. Pulsa para ajustar`}
        className={cn('flex min-h-14 flex-col items-center justify-center rounded-lg border-[1.5px] border-transparent px-2', PULSAR)}
      >
        <span className="text-[40px] font-extrabold leading-none tabular-nums" style={{ fontStretch: '90%' }}>{r.texto}</span>
        <span className="mt-0.5 text-sm font-semibold leading-none text-muted-foreground">{r.fase}</span>
      </button>

      {!r.cerrado && (
        <button
          type="button"
          onClick={r.onAlternar}
          aria-label={r.corriendo ? 'Pausar reloj' : r.empezado ? 'Reanudar reloj' : 'Saque inicial'}
          className={cn(
            'flex h-14 min-w-14 items-center justify-center gap-2 rounded-lg border-[1.5px] px-3 text-base font-bold',
            r.corriendo ? 'border-line bg-card text-foreground' : 'border-primary bg-primary text-primary-foreground',
            PULSAR,
          )}
        >
          {r.corriendo ? <Pause className="h-7 w-7" strokeWidth={1.5} /> : <Play className="h-7 w-7" strokeWidth={1.5} />}
          <span className="hidden min-[1280px]:inline">{r.corriendo ? 'Pausar' : r.empezado ? 'Reanudar' : 'Saque'}</span>
        </button>
      )}

      {medioTiempo && (
        <button
          type="button"
          onClick={r.onSegundaParte}
          className={cn('flex h-14 items-center gap-2 rounded-lg border-[1.5px] border-line bg-card px-3 text-base font-bold', PULSAR)}
        >
          2ª parte
        </button>
      )}

      {ajuste && (
        <div
          role="dialog"
          aria-label="Ajustar reloj"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] rounded-lg border-[1.5px] border-line bg-popover p-4"
        >
          <Rotulo>Ajustar el reloj</Rotulo>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Boton onClick={() => r.onAjustar(-60_000)}><Minus className="h-5 w-5" strokeWidth={1.5} /> 1 minuto</Boton>
            <Boton onClick={() => r.onAjustar(60_000)}><Plus className="h-5 w-5" strokeWidth={1.5} /> 1 minuto</Boton>
          </div>
          <Rotulo className="mt-4">Parte activa</Rotulo>
          <Segmentado
            etiqueta="Parte"
            className="mt-2"
            valor={r.parte}
            onChange={r.onCambiarParte}
            opciones={[{ valor: 1, etiqueta: '1ª parte' }, { valor: 2, etiqueta: '2ª parte' }]}
          />
          <Boton variante="secundario" className="mt-4 w-full" onClick={() => setAjuste(false)}>Listo</Boton>
        </div>
      )}
    </div>
  )
}

function Escudo({ e, className }: { e: EquipoCabecera; className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center', className)}>
      <TeamCrest src={e.escudoUrl} name={e.nombre} size="lg" />
    </span>
  )
}

export function TopBar(p: TopBarProps) {
  const [menu, setMenu] = useState(false)
  return (
    <header
      className="relative z-30 flex shrink-0 items-center gap-x-3 gap-y-2 border-b-[1.5px] border-line bg-background px-3 py-2 landscape:flex-nowrap portrait:flex-wrap"
      data-topbar
    >
      <div className="flex shrink-0 items-center gap-3 portrait:order-1">
        <KabineMark variant="mono" className="h-9 w-9 text-foreground" title="Kabin-e" />
        <SyncBadge datos={p.sync} onSync={p.onSync} onLogin={p.onLogin} />
      </div>

      <div className="flex min-w-0 flex-1 basis-0 flex-col items-center overflow-hidden landscape:order-2 portrait:order-3 portrait:min-w-[260px]">
        <div className="flex min-w-0 max-w-full items-center justify-center gap-3">
          <div className="flex min-w-0 items-center justify-end gap-2">
            <span className="hidden max-w-[130px] truncate text-base font-bold min-[1280px]:block" title={p.club.nombre}>{p.club.nombre}</span>
            <Escudo e={p.club} />
          </div>
          <p className="shrink-0 text-[44px] font-extrabold leading-none tabular-nums" style={{ fontStretch: '90%' }} aria-label={`Marcador ${p.gf} a ${p.gc}`}>
            {p.gf}<span className="mx-1 text-muted-foreground">–</span>{p.gc}
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <Escudo e={p.rival} />
            <span className="hidden max-w-[130px] truncate text-base font-bold min-[1280px]:block" title={p.rival.nombre}>{p.rival.nombre}</span>
          </div>
        </div>
        <p className="mt-0.5 max-w-full truncate text-sm text-muted-foreground">{p.contexto}</p>
      </div>

      <div className="shrink-0 landscape:order-3 portrait:order-4">
        <Reloj r={p.reloj} />
      </div>

      <div className="flex shrink-0 items-center gap-2 landscape:order-4 portrait:order-2 portrait:ml-auto">
        <button
          type="button"
          onClick={p.cronologia.onAlternar}
          aria-pressed={p.cronologia.abierta}
          className={cn(
            'flex min-h-12 items-center gap-2 rounded-lg border-[1.5px] px-3 text-[15px] font-semibold',
            p.cronologia.abierta ? 'border-foreground bg-foreground text-background' : 'border-border bg-card',
            PULSAR,
          )}
        >
          <ListChecks className="h-5 w-5" strokeWidth={1.5} />
          Eventos
          <span className="tabular-nums">{p.cronologia.total}</span>
        </button>
        <button
          type="button"
          onClick={p.revision.onAbrir}
          className={cn(
            'relative flex min-h-12 items-center gap-2 rounded-lg border-[1.5px] px-3 text-[15px] font-semibold bg-card',
            p.revision.errores > 0 ? 'border-destructive' : p.revision.total > 0 ? 'border-warning' : 'border-border',
            PULSAR,
          )}
        >
          <IconoRevisar size={22} className={p.revision.errores > 0 ? 'text-destructive' : p.revision.total > 0 ? 'text-warning' : ''} />
          Revisar
          {p.revision.total > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-[3px] bg-foreground px-1 text-[14px] font-extrabold text-background tabular-nums">
              {p.revision.total}
            </span>
          )}
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label="Menú"
            aria-expanded={menu}
            className={cn('flex h-12 w-12 items-center justify-center rounded-lg border-[1.5px] border-border bg-card', PULSAR)}
          >
            <Menu className="h-6 w-6" strokeWidth={1.5} />
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] rounded-lg border-[1.5px] border-line bg-popover p-2">
              {p.menu.map((it) => {
                const contenido = (
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-base font-semibold">{it.etiqueta}</span>
                    {it.descripcion && <span className="block text-sm text-muted-foreground">{it.descripcion}</span>}
                  </span>
                )
                const cls = cn('flex min-h-14 w-full items-center gap-3 rounded-lg px-3 hover:bg-accent', PULSAR)
                return it.href ? (
                  <Link key={it.id} href={it.href} role="menuitem" className={cls}>{contenido}</Link>
                ) : (
                  <button
                    key={it.id}
                    type="button"
                    role="menuitem"
                    className={cls}
                    onClick={() => { setMenu(false); it.onClick?.() }}
                  >
                    {contenido}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
