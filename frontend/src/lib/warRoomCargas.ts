import type { CargaJugador, NivelCarga } from '@/types'

export const WELLNESS_ALERTA_MAX = 4
export const DIAS_SIN_CARGA_ALERTA = 4

export function playerCargaName(
  p: Pick<CargaJugador, 'dorsal' | 'nombre' | 'apellidos'>,
): string {
  const full = `${p.nombre || ''} ${p.apellidos || ''}`.trim() || 'Jugador'
  return p.dorsal != null ? `${p.dorsal}. ${full}` : full
}

export function meanAcwr(players: Pick<CargaJugador, 'ratio_acwr'>[]): number | null {
  const vals = players
    .map((p) => p.ratio_acwr)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (vals.length === 0) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
}

export function meanWellness(players: Pick<CargaJugador, 'wellness_valor'>[]): number | null {
  const vals = players
    .map((p) => p.wellness_valor)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (vals.length === 0) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

export function acwrTone(acwr: number | null): {
  label: string
  className: string
} {
  if (acwr == null) return { label: 'Sin datos', className: 'text-muted-foreground' }
  if (acwr < 0.8) return { label: 'Bajo', className: 'text-sky-700' }
  if (acwr <= 1.5) return { label: 'Óptimo', className: 'text-emerald-700' }
  if (acwr <= 2.0) return { label: 'Alto', className: 'text-amber-700' }
  return { label: 'Crítico', className: 'text-red-700' }
}

export function rpeTone(rpe: number | null): {
  label: string
  className: string
  badgeClass: string
} {
  if (rpe == null) {
    return { label: 'Sin datos', className: 'text-muted-foreground', badgeClass: '' }
  }
  if (rpe >= 7) {
    return {
      label: 'Alta',
      className: 'text-red-600',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
    }
  }
  if (rpe >= 5) {
    return {
      label: 'Moderada',
      className: 'text-amber-600',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    }
  }
  return {
    label: 'Baja',
    className: 'text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
}

function byAcwrDesc(a: CargaJugador, b: CargaJugador) {
  return (b.ratio_acwr ?? -1) - (a.ratio_acwr ?? -1)
}

export interface WarRoomCargasResumen {
  teamAcwr: number | null
  wellnessMedio: number | null
  cargaMedia: number
  enRiesgo: number
  criticos: CargaJugador[]
  altos: CargaJugador[]
  subcarga: CargaJugador[]
  wellnessBajo: CargaJugador[]
  inactivos: CargaJugador[]
  alertados: number
}

export function summarizeWarRoomCargas(players: CargaJugador[]): WarRoomCargasResumen {
  const criticos = players.filter((p) => p.nivel_carga === 'critico').toSorted(byAcwrDesc)
  const altos = players.filter((p) => p.nivel_carga === 'alto').toSorted(byAcwrDesc)
  const subcarga = players
    .filter((p) => p.nivel_carga === 'bajo')
    .toSorted((a, b) => (a.ratio_acwr ?? 99) - (b.ratio_acwr ?? 99))
  const wellnessBajo = players
    .filter((p) => p.wellness_valor != null && p.wellness_valor <= WELLNESS_ALERTA_MAX)
    .toSorted((a, b) => (a.wellness_valor ?? 99) - (b.wellness_valor ?? 99))
  const inactivos = players
    .filter((p) => (p.dias_sin_actividad || 0) >= DIAS_SIN_CARGA_ALERTA)
    .toSorted((a, b) => (b.dias_sin_actividad || 0) - (a.dias_sin_actividad || 0))

  const ids = new Set<string>()
  for (const list of [criticos, altos, subcarga, wellnessBajo, inactivos]) {
    for (const p of list) ids.add(p.jugador_id)
  }

  const cargas = players.map((p) => p.carga_aguda || 0)
  const cargaMedia =
    cargas.length > 0 ? Math.round((cargas.reduce((a, b) => a + b, 0) / cargas.length) * 10) / 10 : 0

  return {
    teamAcwr: meanAcwr(players),
    wellnessMedio: meanWellness(players),
    cargaMedia,
    enRiesgo: criticos.length + altos.length,
    criticos,
    altos,
    subcarga,
    wellnessBajo,
    inactivos,
    alertados: ids.size,
  }
}

export function nivelCargaLabel(nivel: NivelCarga): string {
  if (nivel === 'critico') return 'Crítico'
  if (nivel === 'alto') return 'Alto'
  if (nivel === 'bajo') return 'Subcarga'
  return 'Óptimo'
}
