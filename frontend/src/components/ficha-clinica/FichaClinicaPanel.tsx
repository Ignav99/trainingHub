'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import {
  ExternalLink,
  FileText,
  HeartPulse,
  Loader2,
  Plus,
  Stethoscope,
  Timer,
  Upload,
  X,
  Coffee,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EvaluacionCuaderno } from '@/components/ficha-clinica/EvaluacionCuaderno'
import { HabitosPanel } from '@/components/ficha-clinica/HabitosPanel'
import { BodyInjuryMap } from '@/components/ficha-clinica/BodyInjuryMap'
import { FaseTratamientoStepper } from '@/components/ficha-clinica/FaseTratamientoStepper'
import { TratamientoCuaderno } from '@/components/ficha-clinica/TratamientoCuaderno'
import { medicoApi, type CreateRegistroMedicoData } from '@/lib/api/medico'
import { labelsFromZonas } from '@/lib/bodyRegions'
import { etiquetaPrograma, FASE_TRATAMIENTO_LABELS } from '@/lib/jugadorTipo'
import type { Jugador } from '@/lib/api/jugadores'
import type { EvaluacionClinica } from '@/lib/api/fichaClinica'
import { apiKey } from '@/lib/swr'
import type { RegistroMedico, TipoRegistroMedico } from '@/types'
import type { BloqueEvaluacion } from '@/lib/fichaClinicaCatalog'

const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
  activo: { label: 'Activo', color: 'bg-red-100 text-red-700' },
  en_recuperacion: { label: 'En recuperación', color: 'bg-amber-100 text-amber-700' },
  alta: { label: 'Alta', color: 'bg-green-100 text-green-700' },
  cronico: { label: 'Crónico', color: 'bg-purple-100 text-purple-700' },
}

const TIPOS_MEDICO: { value: TipoRegistroMedico; label: string }[] = [
  { value: 'lesion', label: 'Lesión' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'molestias', label: 'Molestias' },
  { value: 'rehabilitacion', label: 'Rehabilitación' },
  { value: 'otro', label: 'Otro' },
]

type SubTab = 'valoracion' | 'tests' | 'habitos' | 'lesiones'

function daysSince(dateStr: string): number {
  const start = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

function unwrapEvaluaciones(raw: EvaluacionClinica[] | { data?: EvaluacionClinica[] } | undefined) {
  if (!raw) return []
  return Array.isArray(raw) ? raw : raw.data || []
}

export function FichaClinicaPanel({
  jugador,
  estadoConfig,
}: {
  jugador: Jugador
  estadoConfig?: { color?: string; nombre?: string }
}) {
  const [subTab, setSubTab] = useState<SubTab>('valoracion')

  const { data: valoracionRaw, error: valoracionError } = useSWR<EvaluacionClinica[] | { data: EvaluacionClinica[] }>(
    apiKey('/ficha-clinica', { jugador_id: jugador.id, bloque: 'valoracion' }, ['jugador_id']),
  )
  const { data: testsRaw, error: testsError } = useSWR<EvaluacionClinica[] | { data: EvaluacionClinica[] }>(
    apiKey('/ficha-clinica', { jugador_id: jugador.id, bloque: 'tests' }, ['jugador_id']),
  )
  const { data: registrosMedicos } = useSWR<RegistroMedico[] | { data: RegistroMedico[] }>(
    apiKey('/medico', { jugador_id: jugador.id }, ['jugador_id']),
  )

  const valoraciones = unwrapEvaluaciones(valoracionRaw)
  const tests = unwrapEvaluaciones(testsRaw)
  const medicalRecords: RegistroMedico[] = registrosMedicos
    ? Array.isArray(registrosMedicos) ? registrosMedicos : registrosMedicos.data || []
    : []
  const activeIncident = medicalRecords.find((r) => r.estado === 'activo' || r.estado === 'en_recuperacion')

  const tabs: { id: SubTab; label: string; icon: typeof Stethoscope; count?: number }[] = [
    { id: 'valoracion', label: 'Valoración', icon: Stethoscope, count: valoraciones.length },
    { id: 'tests', label: 'Tests', icon: Timer, count: tests.length },
    { id: 'habitos', label: 'Hábitos', icon: Coffee },
    { id: 'lesiones', label: 'Lesiones', icon: HeartPulse, count: medicalRecords.length },
  ]

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg bg-[#16324F] p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-white text-[#16324F] shadow-sm' : 'text-white/75 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {typeof tab.count === 'number' && tab.count > 0 ? (
                <span className={`tabular-nums text-[11px] ${active ? 'text-slate-500' : 'text-white/60'}`}>
                  {tab.count}
                </span>
              ) : null}
              {tab.id === 'lesiones' && activeIncident ? (
                <span className="h-2 w-2 rounded-full bg-red-400" />
              ) : null}
            </button>
          )
        })}
      </div>

      {(valoracionError || testsError) ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          El cuaderno clínico aún no está disponible en la base de datos (migración 076). Los registros de lesiones siguen funcionando.
        </p>
      ) : null}

      {subTab === 'valoracion' ? (
        <EvaluacionCuaderno
          jugadorId={jugador.id}
          equipoId={jugador.equipo_id}
          bloque={'valoracion' as BloqueEvaluacion}
          evaluaciones={valoraciones}
        />
      ) : null}
      {subTab === 'tests' ? (
        <EvaluacionCuaderno
          jugadorId={jugador.id}
          equipoId={jugador.equipo_id}
          bloque={'tests' as BloqueEvaluacion}
          evaluaciones={tests}
        />
      ) : null}
      {subTab === 'habitos' ? <HabitosPanel jugadorId={jugador.id} /> : null}
      {subTab === 'lesiones' ? (
        <LesionesTab
          jugador={jugador}
          estadoConfig={estadoConfig}
          medicalRecords={medicalRecords}
          activeIncident={activeIncident}
        />
      ) : null}
    </div>
  )
}

function LesionesTab({
  jugador,
  estadoConfig,
  medicalRecords,
  activeIncident,
}: {
  jugador: Jugador
  estadoConfig?: { color?: string; nombre?: string }
  medicalRecords: RegistroMedico[]
  activeIncident?: RegistroMedico
}) {
  const router = useRouter()
  const [modo, setModo] = useState<'temporada' | 'historial'>('temporada')
  const [showNuevoRegistro, setShowNuevoRegistro] = useState(false)
  const [savingRegistro, setSavingRegistro] = useState(false)
  const [esHistorico, setEsHistorico] = useState(false)
  const [nuevoForm, setNuevoForm] = useState<Partial<CreateRegistroMedicoData>>({
    tipo: 'lesion',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fase_tratamiento: 'reposo',
  })
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const historial = medicalRecords.filter((r) => r.es_historico || r.estado === 'alta')
  const temporada = medicalRecords.filter((r) => !r.es_historico && r.estado !== 'alta')
  const lista = modo === 'historial' ? historial : temporada

  const resetRegistroForm = () => {
    setNuevoForm({
      tipo: 'lesion',
      fecha_inicio: new Date().toISOString().slice(0, 10),
      fase_tratamiento: 'reposo',
      zonas: [],
    })
    setEsHistorico(modo === 'historial')
    setPendingFiles([])
  }

  const handleCreateRegistro = async () => {
    if (!nuevoForm.titulo) return
    setSavingRegistro(true)
    try {
      const zonas = nuevoForm.zonas || []
      const createData: CreateRegistroMedicoData = {
        jugador_id: jugador.id,
        equipo_id: jugador.equipo_id,
        tipo: nuevoForm.tipo || 'lesion',
        titulo: nuevoForm.titulo,
        diagnostico_fisioterapeutico: nuevoForm.diagnostico_fisioterapeutico,
        fecha_inicio: nuevoForm.fecha_inicio || new Date().toISOString().slice(0, 10),
        dias_baja_estimados: esHistorico ? undefined : nuevoForm.dias_baja_estimados,
        registro_padre_id: nuevoForm.registro_padre_id,
        zonas,
        zona_corporal: labelsFromZonas(zonas) || nuevoForm.zona_corporal,
        es_historico: esHistorico,
        fase_tratamiento: esHistorico ? undefined : (nuevoForm.fase_tratamiento || 'reposo'),
      }
      if (esHistorico) {
        createData.estado = 'alta'
        createData.fecha_fin = nuevoForm.fecha_fin
        createData.fecha_alta = nuevoForm.fecha_fin
      }
      const result = await medicoApi.create(createData)
      const created = (result as { data?: { id: string } })?.data || result
      if (pendingFiles.length > 0 && created?.id) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          )
          const uploadedUrls: string[] = []
          for (const file of pendingFiles) {
            const timestamp = Date.now()
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
            const path = `medical-documents/${created.id}/${timestamp}_${safeName}`
            const { error: uploadError } = await supabase.storage
              .from('medical-documents')
              .upload(path, file, { upsert: false })
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('medical-documents').getPublicUrl(path)
              if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl)
            }
          }
          if (uploadedUrls.length) {
            await medicoApi.update(created.id, { documentos_urls: uploadedUrls } as Partial<CreateRegistroMedicoData>)
          }
        } catch {
          toast.error('Registro creado, pero falló algún adjunto')
        }
      }
      resetRegistroForm()
      setShowNuevoRegistro(false)
      mutate((key: string) => typeof key === 'string' && key.includes('/medico'), undefined, { revalidate: true })
      mutate((key: string) => typeof key === 'string' && key.includes('/jugadores'), undefined, { revalidate: true })
      toast.success(esHistorico ? 'Lesión histórica guardada' : 'Lesión registrada')
    } catch {
      toast.error('Error al crear el registro. ¿Migración 077 aplicada?')
    } finally {
      setSavingRegistro(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setModo('temporada')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${modo === 'temporada' ? 'bg-white text-[#16324F] shadow-sm' : 'text-slate-500'}`}
        >
          Temporada
          {temporada.length ? <span className="ml-1 tabular-nums text-[11px]">{temporada.length}</span> : null}
        </button>
        <button
          type="button"
          onClick={() => setModo('historial')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${modo === 'historial' ? 'bg-white text-[#16324F] shadow-sm' : 'text-slate-500'}`}
        >
          Historial
          {historial.length ? <span className="ml-1 tabular-nums text-[11px]">{historial.length}</span> : null}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {modo === 'historial'
          ? 'Lesiones antiguas y altas. Van con el jugador aunque cambie de plantilla.'
          : 'Registro de la temporada. Cambia la fase (reposo → margen → inicio grupo) a mano.'}
      </p>

      {modo === 'temporada' ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Estado en el programa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium" style={{ color: estadoConfig?.color }}>
              {etiquetaPrograma(jugador) === 'disponible'
                ? 'Disponible'
                : etiquetaPrograma(jugador) === 'admin'
                  ? (estadoConfig?.nombre || jugador.estado)
                  : 'En tratamiento'}
            </p>
            {jugador.motivo_baja ? <p className="text-sm text-muted-foreground">{jugador.motivo_baja}</p> : null}
            {activeIncident ? (
              <div className="mt-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Fase de la lesión (ficha / enfermería)</p>
                <FaseTratamientoStepper
                  value={activeIncident.fase_tratamiento || undefined}
                  onChange={async (fase) => {
                    await medicoApi.update(activeIncident.id, { fase_tratamiento: fase })
                    mutate((key: string) => typeof key === 'string' && key.includes('/medico'))
                    mutate((key: string) => typeof key === 'string' && key.includes('/jugadores'))
                    toast.success(`Fase: ${FASE_TRATAMIENTO_LABELS[fase]}`)
                  }}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {modo === 'temporada' && activeIncident ? (
        <>
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-red-700">{activeIncident.titulo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">{daysSince(activeIncident.fecha_inicio)} días</span>
                <Link href={`/enfermeria/${activeIncident.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Abrir en enfermería
                  </Button>
                </Link>
              </div>
              <BodyInjuryMap value={activeIncident.zonas} readOnly />
            </CardContent>
          </Card>
          <TratamientoCuaderno registroId={activeIncident.id} />
        </>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">
            {modo === 'historial' ? 'Lesiones anteriores' : 'Casos de temporada'}
          </CardTitle>
          <Button size="sm" onClick={() => { setEsHistorico(modo === 'historial'); setShowNuevoRegistro(true) }}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {modo === 'historial' ? 'Añadir histórica' : 'Nueva lesión'}
          </Button>
        </CardHeader>
        <CardContent>
          {lista.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {modo === 'historial' ? 'No hay lesiones históricas.' : 'Ninguna lesión abierta esta temporada.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Fecha</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Zona</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Título</th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lista.map((r) => {
                    const estadoBadge = ESTADO_BADGE[r.estado] || ESTADO_BADGE.activo
                    return (
                      <tr
                        key={r.id}
                        onClick={() => router.push(`/enfermeria/${r.id}`)}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums">
                          {new Date(r.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {labelsFromZonas(r.zonas) || r.zona_corporal || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">{r.titulo}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${estadoBadge.color}`}>
                            {r.fase_tratamiento ? FASE_TRATAMIENTO_LABELS[r.fase_tratamiento] : estadoBadge.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNuevoRegistro} onOpenChange={(open) => { setShowNuevoRegistro(open); if (!open) resetRegistroForm() }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{esHistorico ? 'Lesión histórica' : 'Nueva lesión de temporada'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {historial.length > 0 && !esHistorico ? (
              <div>
                <label className="mb-1 block text-sm font-medium">Relacionar con una anterior</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={nuevoForm.registro_padre_id || ''}
                  onChange={(e) => setNuevoForm({ ...nuevoForm, registro_padre_id: e.target.value || undefined, es_relesion: !!e.target.value })}
                >
                  <option value="">Nueva, sin antecedente</option>
                  {historial.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.titulo} — {new Date(r.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-sm font-medium">Tipo *</label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={nuevoForm.tipo || 'lesion'} onChange={(e) => setNuevoForm({ ...nuevoForm, tipo: e.target.value })}>
                {TIPOS_MEDICO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Título *</label>
              <Input value={nuevoForm.titulo || ''} onChange={(e) => setNuevoForm({ ...nuevoForm, titulo: e.target.value })} placeholder="Ej: Rotura fibrilar isquios derecho" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Zona en el cuerpo</label>
              <BodyInjuryMap
                value={nuevoForm.zonas}
                onChange={(zonas) => setNuevoForm({ ...nuevoForm, zonas })}
              />
            </div>
            {!esHistorico ? (
              <div>
                <label className="mb-1 block text-sm font-medium">Fase inicial</label>
                <FaseTratamientoStepper
                  value={nuevoForm.fase_tratamiento || 'reposo'}
                  onChange={(fase) => setNuevoForm({ ...nuevoForm, fase_tratamiento: fase })}
                />
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-sm font-medium">Diagnóstico fisioterapéutico</label>
              <Textarea value={nuevoForm.diagnostico_fisioterapeutico || ''} onChange={(e) => setNuevoForm({ ...nuevoForm, diagnostico_fisioterapeutico: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Fecha inicio</label>
                <Input type="date" value={nuevoForm.fecha_inicio || ''} onChange={(e) => setNuevoForm({ ...nuevoForm, fecha_inicio: e.target.value })} />
              </div>
              {esHistorico ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">Fecha fin / alta</label>
                  <Input type="date" value={nuevoForm.fecha_fin || ''} onChange={(e) => setNuevoForm({ ...nuevoForm, fecha_fin: e.target.value })} />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-medium">Días estimados</label>
                  <Input type="number" min={1} value={nuevoForm.dias_baja_estimados || ''} onChange={(e) => setNuevoForm({ ...nuevoForm, dias_baja_estimados: parseInt(e.target.value) || undefined })} />
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Pruebas o informes</label>
              {pendingFiles.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="mb-2 flex items-center justify-between rounded-lg border bg-muted/30 p-2">
                  <div className="mr-2 flex flex-1 items-center gap-2 truncate text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))} className="p-1 text-gray-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setPendingFiles((prev) => [...prev, file])
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Adjuntar archivo
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNuevoRegistro(false); resetRegistroForm() }}>Cancelar</Button>
            <Button onClick={handleCreateRegistro} disabled={savingRegistro || !nuevoForm.titulo}>
              {savingRegistro ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {esHistorico ? 'Guardar histórica' : 'Registrar lesión'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
/** Peek used on Datos: last anthropometry from ficha clínica. */
export function UltimaAntropometria({ jugadorId, onOpenClinica }: { jugadorId: string; onOpenClinica: () => void }) {
  const { data } = useSWR<EvaluacionClinica[] | { data: EvaluacionClinica[] }>(
    apiKey('/ficha-clinica', { jugador_id: jugadorId, bloque: 'valoracion' }, ['jugador_id']),
  )
  const latest = unwrapEvaluaciones(data)[0]
  if (!latest) {
    return (
      <button
        type="button"
        onClick={onOpenClinica}
        className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-left text-sm text-slate-500 hover:border-[#16324F]"
      >
        Talla y peso se anotan en ficha clínica, datados. Abrir valoración.
      </button>
    )
  }
  const talla = latest.datos?.talla_cm
  const peso = latest.datos?.peso_kg
  const imc = latest.datos?.imc
  return (
    <button
      type="button"
      onClick={onOpenClinica}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left card-hover"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-800">Última antropometría</p>
      <p className="mt-1 text-sm font-medium text-[#16324F]">
        {new Date(`${latest.fecha}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
      <p className="mt-2 tabular-nums text-sm text-slate-700">
        {talla != null ? `${talla} cm` : '—'}
        {peso != null ? ` · ${peso} kg` : ''}
        {imc != null ? ` · IMC ${imc}` : ''}
      </p>
    </button>
  )
}

