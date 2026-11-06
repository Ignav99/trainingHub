'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Film,
  Link2,
  Loader2,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CorteMiniatura } from '@/components/biblioteca/CorteMiniatura'
import { minuteLabel } from '@/lib/bibliotecaCortes'
import {
  planIndividualApi,
  type EntradaPatch,
  type PlanCorte,
  type PlanEntrada,
  type PlanTrabajo,
  type PrioridadPlan,
  type ResultadoPlan,
} from '@/lib/api/planIndividual'
import {
  AREA_BY_ID,
  ESTADO_LABEL,
  PRIORIDAD_LABEL,
  RESULTADO_LABEL,
  fechaCorta,
  fechaLocal,
  formatDelta,
  formatMedicion,
  progresoPorMetrica,
  revisionPendiente,
  valorComparable,
  type ProgresoMetrica,
} from '@/lib/planIndividual'
import { CortesPicker } from './CortesPicker'
import { MarcasCampo, MedicionCampos, PlanEditor, fieldLabel, medicionDesdeDraft, medicionVacia, type MedicionDraft } from './PlanCampos'
import { EstadoBadge, PrioridadMarca, TendenciaChip } from './PlanBadges'

function Seccion({
  titulo,
  accion,
  children,
}: {
  titulo: string
  accion?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3 border-t pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  )
}

function Sparkline({ p }: { p: ProgresoMetrica }) {
  const values = p.serie.map(valorComparable)
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 84
  const h = 24
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(' ')
  const color = p.tendencia === 'mejora' ? '#059669' : p.tendencia === 'empeora' ? '#dc2626' : '#64748b'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

const MOMENTO_LABEL = { inicial: 'Inicial', seguimiento: 'Seguimiento', resolucion: 'Resolución' } as const

export function EntradaDetalle({
  entrada,
  onClose,
  onChange,
  onDeleted,
}: {
  entrada: PlanEntrada | null
  onClose: () => void
  onChange: (entrada: PlanEntrada) => void
  onDeleted: (id: string) => void
}) {
  return (
    <Dialog open={Boolean(entrada)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[92vh] max-w-4xl gap-0 overflow-y-auto p-0">
        {entrada ? <Cuerpo key={entrada.id} entrada={entrada} onChange={onChange} onDeleted={onDeleted} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function Cuerpo({
  entrada,
  onChange,
  onDeleted,
}: {
  entrada: PlanEntrada
  onChange: (entrada: PlanEntrada) => void
  onDeleted: (id: string) => void
}) {
  const area = AREA_BY_ID[entrada.area]
  const equipoId = entrada.equipo_id
  const hoy = fechaLocal()
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<PlanEntrada | void>, ok?: string) => {
    setBusy(key)
    try {
      const next = await fn()
      if (next) onChange(next)
      if (ok) toast.success(ok)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar')
      return false
    } finally {
      setBusy(null)
    }
  }
  const patch = (key: string, data: EntradaPatch, ok?: string) => run(key, () => planIndividualApi.update(entrada.id, equipoId, data), ok)

  // Observación
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(entrada.titulo)
  const [fecha, setFecha] = useState(entrada.fecha)
  const [descripcion, setDescripcion] = useState(entrada.descripcion || '')
  const [prioridad, setPrioridad] = useState<PrioridadPlan>(entrada.prioridad)
  const [marcas, setMarcas] = useState<string[]>(entrada.marcas)
  const [revisarEl, setRevisarEl] = useState(entrada.revisar_el || '')
  useEffect(() => {
    if (editando) return
    setTitulo(entrada.titulo)
    setFecha(entrada.fecha)
    setDescripcion(entrada.descripcion || '')
    setPrioridad(entrada.prioridad)
    setMarcas(entrada.marcas)
    setRevisarEl(entrada.revisar_el || '')
  }, [entrada, editando])

  const guardarObservacion = async () => {
    if (!titulo.trim()) {
      toast.error('El título no puede quedar vacío')
      return
    }
    const ok = await patch('obs', {
      titulo: titulo.trim(),
      fecha,
      descripcion: descripcion.trim() || null,
      prioridad,
      marcas,
      ...(revisarEl ? { revisar_el: revisarEl } : { limpiar_revision: true }),
    }, 'Entrada actualizada')
    if (ok) setEditando(false)
  }

  // Mediciones
  const progreso = progresoPorMetrica(entrada.mediciones)
  const [medicionAbierta, setMedicionAbierta] = useState(false)
  const [medicion, setMedicion] = useState<MedicionDraft>(() => medicionVacia(entrada.mediciones.length ? 'seguimiento' : 'inicial'))
  const abrirMedicion = (base?: ProgresoMetrica, momento?: MedicionDraft['momento']) => {
    const draft = medicionVacia(momento || (entrada.mediciones.length ? 'seguimiento' : 'inicial'))
    if (base) {
      draft.metrica = base.metrica
      draft.unidad = base.unidad || ''
      draft.mejor = base.mejor
      draft.deTotal = base.conTotal
      draft.total = base.ultima.total ? String(base.ultima.total) : ''
    }
    setMedicion(draft)
    setMedicionAbierta(true)
  }
  const guardarMedicion = async () => {
    const { input, error } = medicionDesdeDraft(medicion)
    if (error || !input) {
      toast.error(error || 'Pon la medida y el valor')
      return
    }
    const ok = await run('med', () => planIndividualApi.addMedicion(entrada.id, equipoId, input), 'Medida guardada')
    if (ok) setMedicionAbierta(false)
  }
  const borrarMedicion = (id: string) => {
    if (!window.confirm('¿Borrar esta medida?')) return
    void run('med-' + id, async () => {
      await planIndividualApi.removeMedicion(id, equipoId)
      onChange({ ...entrada, mediciones: entrada.mediciones.filter((m) => m.id !== id) })
    })
  }

  // Plan
  const [planEdit, setPlanEdit] = useState(false)
  const [plan, setPlan] = useState<PlanTrabajo>(entrada.plan)
  useEffect(() => {
    if (!planEdit) setPlan(entrada.plan)
  }, [entrada.plan, planEdit])
  const tienePlan = Boolean(entrada.plan.objetivo || entrada.plan.ejercicios?.length || entrada.plan.notas || entrada.plan.sesiones_semana)
  const guardarPlan = async () => {
    const ok = await patch('plan', { plan }, 'Plan guardado')
    if (ok) setPlanEdit(false)
  }

  // Vídeo
  const [pickerOpen, setPickerOpen] = useState(false)
  const [viendo, setViendo] = useState<PlanCorte | null>(null)
  const enlazar = async (ids: string[]) => {
    let last: PlanEntrada | null = null
    for (const id of ids) {
      last = await planIndividualApi.linkCorte(entrada.id, equipoId, id)
    }
    if (last) onChange(last)
    toast.success(ids.length > 1 ? `${ids.length} vídeos enlazados` : 'Vídeo enlazado')
  }
  const desenlazar = (corte: PlanCorte) => {
    void run('corte-' + corte.id, async () => {
      await planIndividualApi.unlinkCorte(entrada.id, equipoId, corte.id)
      if (viendo?.id === corte.id) setViendo(null)
      onChange({ ...entrada, cortes: entrada.cortes.filter((c) => c.id !== corte.id) })
    }, 'Vídeo quitado de la entrada; sigue en la biblioteca')
  }

  // Resolución
  const [resFecha, setResFecha] = useState(hoy)
  const [resResultado, setResResultado] = useState<ResultadoPlan>('mejora')
  const [resTexto, setResTexto] = useState('')
  const cerrar = () => patch('res', {
    resolucion_fecha: resFecha,
    resolucion_resultado: resResultado,
    resolucion_texto: resTexto.trim() || null,
  }, 'Entrada resuelta')
  const reabrir = () => patch('res', { limpiar_resolucion: true, estado: 'en_trabajo' }, 'Entrada reabierta')

  const borrar = () => {
    if (!window.confirm(`¿Borrar «${entrada.titulo}» con sus medidas? Los vídeos siguen en la biblioteca.`)) return
    void run('del', async () => {
      await planIndividualApi.remove(entrada.id, equipoId)
      onDeleted(entrada.id)
    }, 'Entrada borrada')
  }

  const pendiente = revisionPendiente(entrada, hoy)

  return (
    <div>
      <header className="border-b bg-slate-50/70 px-6 pb-4 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{area.label}</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3 pr-8">
          <DialogTitle className="text-xl font-semibold leading-tight text-slate-900">{entrada.titulo}</DialogTitle>
          <div className="flex items-center gap-2">
            <PrioridadMarca prioridad={entrada.prioridad} />
            <EstadoBadge estado={entrada.estado} />
          </div>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="tabular-nums">Detectado el {fechaCorta(entrada.fecha)}</span>
          {entrada.revisar_el && entrada.estado !== 'resuelta' ? (
            <span className={`inline-flex items-center gap-1 tabular-nums ${pendiente ? 'font-medium text-amber-700' : ''}`}>
              <CalendarClock className="h-3.5 w-3.5" />
              {pendiente ? 'Revisión pendiente desde el' : 'Revisar el'} {fechaCorta(entrada.revisar_el)}
            </span>
          ) : null}
          {entrada.resolucion_fecha ? <span className="tabular-nums">Resuelto el {fechaCorta(entrada.resolucion_fecha)}</span> : null}
        </p>
      </header>

      <div className="space-y-6 px-6 py-5">
        <Seccion
          titulo="Observación"
          accion={!editando ? (
            <button type="button" onClick={() => setEditando(true)} className="inline-flex items-center gap-1 text-xs font-medium text-[#16324F] hover:underline">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
          ) : null}
        >
          {editando ? (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-4">
                  <label className={fieldLabel}>Título</label>
                  <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160} />
                </div>
                <div className="sm:col-span-2">
                  <label className={fieldLabel}>Fecha</label>
                  <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div className="sm:col-span-6">
                  <label className={fieldLabel}>Descripción</label>
                  <Textarea rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={4000} />
                </div>
                <div className="sm:col-span-3">
                  <span className={fieldLabel}>Prioridad</span>
                  <div className="inline-flex rounded-md border p-0.5">
                    {(['alta', 'media', 'baja'] as PrioridadPlan[]).map((p) => (
                      <button key={p} type="button" onClick={() => setPrioridad(p)} aria-pressed={prioridad === p}
                        className={`rounded px-3 py-1 text-xs font-medium ${prioridad === p ? 'bg-[#16324F] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {PRIORIDAD_LABEL[p]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-3">
                  <label className={fieldLabel}>Revisar el</label>
                  <Input type="date" value={revisarEl} onChange={(e) => setRevisarEl(e.target.value)} />
                </div>
              </div>
              <div>
                <span className={fieldLabel}>Marcas</span>
                <MarcasCampo sugeridas={area.marcas} value={marcas} onChange={setMarcas} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditando(false)} disabled={busy === 'obs'}>Cancelar</Button>
                <Button type="button" size="sm" onClick={() => { void guardarObservacion() }} disabled={busy === 'obs'}>
                  {busy === 'obs' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {entrada.descripcion ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{entrada.descripcion}</p>
              ) : (
                <p className="text-sm text-slate-400">Sin descripción.</p>
              )}
              {entrada.marcas.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {entrada.marcas.map((m) => (
                    <span key={m} className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">{m}</span>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </Seccion>

        <Seccion
          titulo="Mediciones"
          accion={!medicionAbierta ? (
            <button type="button" onClick={() => abrirMedicion()} className="inline-flex items-center gap-1 text-xs font-medium text-[#16324F] hover:underline">
              <Plus className="h-3.5 w-3.5" /> Nueva medida
            </button>
          ) : null}
        >
          {progreso.length ? (
            <div className="divide-y rounded-lg border">
              {progreso.map((p) => (
                <div key={p.metrica} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
                  <div className="min-w-[10rem] flex-1">
                    <p className="text-sm font-medium text-slate-800">{p.metrica}</p>
                    <p className="text-[11px] text-slate-500">
                      {p.serie.length} {p.serie.length === 1 ? 'medida' : 'medidas'} · mejor si {p.mejor === 'mas' ? 'sube' : 'baja'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm tabular-nums">
                    <span className="text-slate-500">{formatMedicion(p.inicial)}</span>
                    {p.serie.length > 1 ? (
                      <>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900">{formatMedicion(p.ultima)}</span>
                      </>
                    ) : null}
                  </div>
                  <Sparkline p={p} />
                  {p.tendencia ? <TendenciaChip tendencia={p.tendencia} texto={formatDelta(p)} /> : null}
                  <button type="button" onClick={() => abrirMedicion(p)} className="text-xs font-medium text-[#16324F] hover:underline">
                    Medir otra vez
                  </button>
                </div>
              ))}
            </div>
          ) : !medicionAbierta ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-slate-500">
              Sin medidas. Apunta la inicial para poder comparar a los 3-4 meses.
            </p>
          ) : null}

          {medicionAbierta ? (
            <div className="space-y-3 rounded-lg border bg-slate-50/60 p-3">
              <MedicionCampos area={area} value={medicion} onChange={setMedicion} conMomento />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setMedicionAbierta(false)} disabled={busy === 'med'}>Cancelar</Button>
                <Button type="button" size="sm" onClick={() => { void guardarMedicion() }} disabled={busy === 'med'}>
                  {busy === 'med' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  Guardar medida
                </Button>
              </div>
            </div>
          ) : null}

          {entrada.mediciones.length ? (
            <details className="group text-sm">
              <summary className="cursor-pointer select-none text-xs text-slate-500 hover:text-slate-700">Ver todas las medidas</summary>
              <div className="mt-2 overflow-x-auto rounded-lg border">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Fecha</th>
                      <th className="px-3 py-2 font-medium">Medida</th>
                      <th className="px-3 py-2 font-medium">Valor</th>
                      <th className="px-3 py-2 font-medium">Momento</th>
                      <th className="px-3 py-2 font-medium">Nota</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entrada.mediciones.map((m) => (
                      <tr key={m.id}>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">{fechaCorta(m.fecha)}</td>
                        <td className="px-3 py-2">{m.metrica}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatMedicion(m)}</td>
                        <td className="px-3 py-2">{MOMENTO_LABEL[m.momento]}</td>
                        <td className="max-w-[16rem] px-3 py-2 text-slate-500">{m.notas}</td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => borrarMedicion(m.id)} disabled={busy === 'med-' + m.id}
                            className="text-slate-400 hover:text-red-600" aria-label={`Borrar medida de ${m.metrica} del ${fechaCorta(m.fecha)}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : null}
        </Seccion>

        <Seccion
          titulo={area.planEtiqueta}
          accion={!planEdit ? (
            <button type="button" onClick={() => setPlanEdit(true)} className="inline-flex items-center gap-1 text-xs font-medium text-[#16324F] hover:underline">
              {tienePlan ? <><Pencil className="h-3.5 w-3.5" /> Editar plan</> : <><Plus className="h-3.5 w-3.5" /> Diseñar plan</>}
            </button>
          ) : null}
        >
          {planEdit ? (
            <div className="space-y-3 rounded-lg border p-3">
              <PlanEditor area={area} value={plan} onChange={setPlan} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setPlanEdit(false)} disabled={busy === 'plan'}>Cancelar</Button>
                <Button type="button" size="sm" onClick={() => { void guardarPlan() }} disabled={busy === 'plan'}>
                  {busy === 'plan' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                  Guardar plan
                </Button>
              </div>
            </div>
          ) : tienePlan ? (
            <PlanResumen plan={entrada.plan} conEjercicios={area.conEjercicios} />
          ) : (
            <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-slate-500">
              {area.id === 'fisico'
                ? 'Sin plan todavía: ejercicios, veces por semana y duración.'
                : 'Opcional. Apunta qué se va a trabajar aunque no haya un plan cerrado.'}
            </p>
          )}
        </Seccion>

        <Seccion
          titulo="Vídeo"
          accion={(
            <button type="button" onClick={() => setPickerOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-[#16324F] hover:underline">
              <Link2 className="h-3.5 w-3.5" /> Adjuntar vídeo
            </button>
          )}
        >
          {viendo?.url ? (
            <div className="overflow-hidden rounded-lg border bg-black">
              <video key={viendo.id} src={viendo.url} controls autoPlay playsInline className="aspect-video w-full" />
              <div className="flex items-center justify-between bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
                <span className="truncate">{viendo.titulo}</span>
                <button type="button" onClick={() => setViendo(null)} className="inline-flex items-center gap-1 hover:text-white" aria-label="Cerrar vídeo">
                  <X className="h-3.5 w-3.5" /> Cerrar
                </button>
              </div>
            </div>
          ) : null}
          {entrada.cortes.length ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {entrada.cortes.map((corte) => (
                <div key={corte.id} className="overflow-hidden rounded-lg border">
                  <button type="button" onClick={() => setViendo(corte)} className="group relative block w-full" aria-label={`Ver ${corte.titulo}`}>
                    <CorteMiniatura url={corte.url} title={corte.titulo} />
                    <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/25">
                      <Play className="h-7 w-7 text-white opacity-80 drop-shadow" />
                    </span>
                  </button>
                  <div className="flex items-start justify-between gap-2 p-2">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-medium">{corte.titulo}</p>
                      <p className="line-clamp-1 text-[11px] text-slate-500">
                        {[corte.partido_etiqueta, minuteLabel(corte.minuto_inicio, corte.minuto_fin)].filter(Boolean).join(' · ') || 'Biblioteca'}
                      </p>
                    </div>
                    <button type="button" onClick={() => desenlazar(corte)} disabled={busy === 'corte-' + corte.id}
                      className="shrink-0 text-slate-400 hover:text-red-600" aria-label={`Quitar ${corte.titulo} de la entrada`}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => setPickerOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-slate-500 hover:bg-slate-50">
              <Film className="h-4 w-4" /> Adjunta cortes de la biblioteca o sube uno nuevo
            </button>
          )}
        </Seccion>

        <Seccion titulo="Resolución">
          {entrada.resolucion_fecha ? (
            <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" />
                  {entrada.resolucion_resultado ? RESULTADO_LABEL[entrada.resolucion_resultado] : 'Resuelto'} · {fechaCorta(entrada.resolucion_fecha)}
                </p>
                <button type="button" onClick={() => { void reabrir() }} disabled={busy === 'res'}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-900 hover:underline">
                  <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                </button>
              </div>
              {entrada.resolucion_texto ? <p className="whitespace-pre-wrap text-sm text-emerald-950/80">{entrada.resolucion_texto}</p> : null}
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <label className={fieldLabel}>Fecha</label>
                  <Input type="date" value={resFecha} onChange={(e) => setResFecha(e.target.value)} />
                </div>
                <div className="sm:col-span-4">
                  <span className={fieldLabel}>Resultado</span>
                  <div className="inline-flex rounded-md border p-0.5">
                    {(['mejora', 'se_mantiene', 'empeora'] as ResultadoPlan[]).map((r) => (
                      <button key={r} type="button" onClick={() => setResResultado(r)} aria-pressed={resResultado === r}
                        className={`rounded px-3 py-1 text-xs font-medium ${resResultado === r ? 'bg-[#16324F] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {RESULTADO_LABEL[r]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-6">
                  <label className={fieldLabel}>Conclusión</label>
                  <Textarea rows={3} value={resTexto} onChange={(e) => setResTexto(e.target.value)} placeholder="Qué ha cambiado, si se mantiene el trabajo o se cierra." maxLength={4000} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                {progreso.length ? (
                  <button type="button" onClick={() => abrirMedicion(progreso[0], 'resolucion')} className="text-xs text-slate-600 hover:underline">
                    Antes, apunta la medida de resolución
                  </button>
                ) : <span />}
                <Button type="button" size="sm" onClick={() => { void cerrar() }} disabled={busy === 'res'}>
                  {busy === 'res' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                  Marcar resuelto
                </Button>
              </div>
            </div>
          )}
        </Seccion>
      </div>

      <footer className="flex items-center justify-between border-t px-6 py-3">
        <button type="button" onClick={borrar} disabled={busy === 'del'} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600">
          <Trash2 className="h-3.5 w-3.5" /> Borrar entrada
        </button>
        <span className="text-[11px] text-slate-400">Estado: {ESTADO_LABEL[entrada.estado]}</span>
      </footer>

      <CortesPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        equipoId={equipoId}
        jugadorId={entrada.jugador_id}
        yaEnlazados={entrada.cortes.map((c) => c.id)}
        onPick={enlazar}
      />
    </div>
  )
}

function PlanResumen({ plan, conEjercicios }: { plan: PlanTrabajo; conEjercicios: boolean }) {
  const datos = [
    plan.sesiones_semana ? `${plan.sesiones_semana} ${plan.sesiones_semana === 1 ? 'sesión' : 'sesiones'} por semana` : null,
    plan.semanas ? `${plan.semanas} semanas` : null,
    plan.inicio ? `desde el ${fechaCorta(plan.inicio)}` : null,
  ].filter(Boolean)
  return (
    <div className="space-y-3">
      {plan.objetivo ? <p className="text-sm font-medium text-slate-800">{plan.objetivo}</p> : null}
      {datos.length ? <p className="text-xs tabular-nums text-slate-500">{datos.join(' · ')}</p> : null}
      {plan.ejercicios?.length ? (
        <ol className="divide-y rounded-lg border">
          {plan.ejercicios.map((e, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className="w-5 shrink-0 text-xs tabular-nums text-slate-400">{i + 1}</span>
              <span className="font-medium text-slate-800">{e.nombre}</span>
              {conEjercicios ? (
                <span className="text-xs tabular-nums text-slate-500">
                  {[e.series && `${e.series} series`, e.repeticiones, e.carga, e.descanso && `desc. ${e.descanso}`].filter(Boolean).join(' · ')}
                </span>
              ) : null}
              {e.notas ? <span className="basis-full pl-8 text-xs text-slate-500">{e.notas}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
      {plan.notas ? <p className="whitespace-pre-wrap text-sm text-slate-600">{plan.notas}</p> : null}
    </div>
  )
}

