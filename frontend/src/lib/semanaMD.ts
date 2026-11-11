export type PartidoSemana = { id: string; fecha: string; rival?: string }
export type DiaSemana = {
  fecha: string
  dia: string
  diaMes: number
  etiqueta: string
  esHoy: boolean
  partido?: PartidoSemana
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MS_DIA = 86_400_000

const aFecha = (t: number) => new Date(t).toISOString().slice(0, 10)
const aTiempo = (fecha: string) => new Date(fecha + 'T12:00:00Z').getTime()

export function semanaMD(hoy: string, partidos: PartidoSemana[]): DiaSemana[] {
  const t0 = aTiempo(hoy)
  const desdeLunes = (new Date(t0).getUTCDay() + 6) % 7
  const lunes = t0 - desdeLunes * MS_DIA

  const porFecha = new Map<string, PartidoSemana>()
  for (const p of partidos) if (!porFecha.has(p.fecha)) porFecha.set(p.fecha, p)
  const tiempos = partidos.map((p) => aTiempo(p.fecha))

  return Array.from({ length: 7 }, (_, i) => {
    const t = lunes + i * MS_DIA
    const fecha = aFecha(t)
    const f = new Date(t)
    const partido = porFecha.get(fecha)
    const hubo = (dias: number) => tiempos.includes(t - dias * MS_DIA)
    const siguientes = tiempos.filter((x) => x > t).map((x) => Math.round((x - t) / MS_DIA))
    const proximo = siguientes.length ? Math.min(...siguientes) : Infinity

    let etiqueta = ''
    if (partido) etiqueta = 'MD'
    else if (hubo(1)) etiqueta = 'MD+1'
    else if (hubo(2) && proximo > 2) etiqueta = 'MD+2'
    else if (proximo >= 1 && proximo <= 5) etiqueta = `MD-${proximo}`

    return {
      fecha,
      dia: DIAS[f.getUTCDay()],
      diaMes: f.getUTCDate(),
      etiqueta,
      esHoy: fecha === hoy,
      ...(partido ? { partido } : {}),
    }
  })
}
