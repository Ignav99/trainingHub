'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DatosSync } from './adaptadores'
import {
  IconoErrorTarjeta, IconoGuardado, IconoSinConexion, IconoSincronizando,
} from './Iconos'
import { Boton, PULSAR } from './Piezas'
import { formatHora } from './utils'

interface Props {
  datos: DatosSync
  onSync: () => void
  onLogin?: () => void
}

/** Texto largo (panel) y corto (barra) de cada estado. Nunca solo color: forma + texto. */
export function textoSync(d: DatosSync): { corto: string; largo: string; detalle: string } {
  const hora = formatHora(d.ultimoGuardadoLocal)
  const cola = d.pendientes === 1 ? '1 cambio en cola' : `${d.pendientes} cambios en cola`
  switch (d.estado) {
    case 'guardado':
      return {
        corto: hora ? `Guardado · ${hora}` : 'Guardado',
        largo: hora ? `Guardado en la tablet · ${hora}` : 'Guardado en la tablet',
        detalle: 'Todo lo anotado está a salvo en la tablet y sincronizado.',
      }
    case 'pendiente':
      return {
        corto: 'Guardando…',
        largo: 'Guardando cambios',
        detalle: 'Los últimos cambios se guardan solos en unos segundos.',
      }
    case 'sin_conexion':
      return {
        corto: `Sin conexión · ${d.pendientes} en cola`,
        largo: `Sin conexión · ${cola} — todo seguro en la tablet`,
        detalle: 'Puedes seguir anotando. Se enviará solo cuando vuelva la conexión.',
      }
    case 'sincronizando':
      return { corto: 'Sincronizando…', largo: 'Sincronizando…', detalle: 'Enviando los cambios al servidor.' }
    case 'error':
      if (d.ultimoError?.startsWith('No se pudo guardar en la tablet')) {
        return {
          corto: 'Sin guardar en la tablet',
          largo: 'No se pudo guardar en la tablet · se reintenta',
          detalle: `${d.ultimoError}. Sigue anotando: lo de la pantalla se guarda en cuanto se pueda. No cierres la página.`,
        }
      }
      return {
        corto: 'Error al sincronizar',
        largo: 'Error al sincronizar · Reintentar',
        detalle: d.ultimoError || 'No se ha podido enviar. Tus datos siguen guardados en la tablet.',
      }
    case 'login':
      return {
        corto: 'Sesión caducada',
        largo: 'Sesión caducada · Inicia sesión — tus datos están a salvo',
        detalle: 'Inicia sesión de nuevo para enviar. Lo anotado sigue guardado en la tablet.',
      }
  }
}

function Forma({ estado }: { estado: DatosSync['estado'] }) {
  const cls = 'h-6 w-6 shrink-0'
  switch (estado) {
    case 'guardado': return <IconoGuardado className={cn(cls, 'text-success')} />
    case 'pendiente': return <IconoSincronizando className={cn(cls, 'text-muted-foreground')} />
    case 'sin_conexion': return <IconoSinConexion className={cn(cls, 'text-info')} />
    case 'sincronizando': return <IconoSincronizando className={cn(cls, 'text-info motion-safe:animate-spin')} />
    case 'error': return <IconoErrorTarjeta className={cn(cls, 'text-destructive')} />
    case 'login': return <IconoErrorTarjeta className={cn(cls, 'text-warning')} />
  }
}

export function SyncBadge({ datos, onSync, onLogin }: Props) {
  const [abierto, setAbierto] = useState(false)
  const t = textoSync(datos)
  const ultimaSync = formatHora(datos.ultimaSync)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`Estado de guardado: ${t.largo}`}
        className={cn(
          'flex min-h-12 max-w-[270px] items-center gap-2 rounded-lg border-[1.5px] px-3 text-[15px] font-semibold',
          datos.estado === 'error' ? 'border-destructive' : datos.estado === 'login' ? 'border-warning' : 'border-border',
          'bg-card',
          PULSAR,
        )}
      >
        <Forma estado={datos.estado} />
        <span className="truncate whitespace-nowrap">{t.corto}</span>
      </button>
      {abierto && (
        <div
          role="dialog"
          aria-label="Detalle de guardado"
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[340px] max-w-[calc(100vw-32px)] rounded-lg border-[1.5px] border-line bg-popover p-4 text-popover-foreground"
        >
          <p className="flex items-center gap-2 text-base font-bold"><Forma estado={datos.estado} />{t.largo}</p>
          <p className="mt-2 text-[15px] text-muted-foreground">{t.detalle}</p>
          {datos.almacenDegradado && (
            <p role="alert" className="mt-2 text-[15px] font-semibold text-warning">
              Almacenamiento limitado en este navegador: si lo cierras o se reinicia la tablet se pueden perder datos. Envía en cuanto haya conexión.
            </p>
          )}
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px] tabular-nums">
            <dt className="text-muted-foreground">En cola</dt>
            <dd className="font-semibold">{datos.pendientes}</dd>
            <dt className="text-muted-foreground">Guardado en la tablet</dt>
            <dd className="font-semibold">{formatHora(datos.ultimoGuardadoLocal) || '—'}</dd>
            <dt className="text-muted-foreground">Última sincronización</dt>
            <dd className="font-semibold">{ultimaSync || '—'}</dd>
          </dl>
          <div className="mt-4 flex gap-2">
            {datos.estado === 'login' && onLogin && (
              <Boton variante="primario" className="flex-1" onClick={() => { setAbierto(false); onLogin() }}>Iniciar sesión</Boton>
            )}
            <Boton
              variante={datos.estado === 'login' ? 'secundario' : 'primario'}
              className="flex-1"
              disabled={datos.estado === 'sincronizando'}
              onClick={() => { onSync() }}
            >
              Sincronizar ahora
            </Boton>
            <Boton variante="secundario" onClick={() => setAbierto(false)}>Cerrar</Boton>
          </div>
        </div>
      )}
    </div>
  )
}
