'use client'

import { useMemo, useState } from 'react'
import { Upload, Loader2, Check, AlertTriangle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  parseAnotacionesFileText,
  planAnotacionesImport,
  matchAnotacionPlayers,
  TEAM_STAT_KEYS,
  type ParsedAnotaciones,
  type AnotacionesPlan,
  type InformeExisting,
  type ConvocadoMatchable,
} from '@/lib/partidoAnotacionesJson'

interface AnotacionesImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  convocados: ConvocadoMatchable[]
  localia?: string
  equipoNombre?: string
  rivalNombre?: string
  existing: InformeExisting
  onApply: (plan: AnotacionesPlan) => Promise<void>
}

type Step = 'upload' | 'preview' | 'importing' | 'done'

function convLabel(c: ConvocadoMatchable): string {
  const p = c.jugador || c.jugadores || {}
  const name = `${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.apodo || 'Jugador'
  const dorsal = c.dorsal ?? p.dorsal
  return dorsal != null ? `${dorsal}. ${name}` : name
}

const STAT_LABELS: Record<string, string> = {
  tiros_a_puerta: 'Tiros a puerta',
  ocasiones_gol: 'Ocasiones',
  saques_esquina: 'Córners',
  penaltis: 'Penaltis',
  fueras_juego: 'Fueras de juego',
  faltas_cometidas: 'Faltas',
  tarjetas_amarillas: 'Amarillas',
  tarjetas_rojas: 'Rojas',
  balones_perdidos: 'Pérdidas',
  balones_recuperados: 'Recuperaciones',
}

export function AnotacionesImportDialog({
  open,
  onOpenChange,
  convocados,
  localia,
  equipoNombre,
  rivalNombre,
  existing,
  onApply,
}: AnotacionesImportDialogProps) {
  const [step, setStep] = useState<Step>('upload')
  const [parsed, setParsed] = useState<ParsedAnotaciones | null>(null)
  const [fileName, setFileName] = useState('')
  const [overrides, setOverrides] = useState<Record<number, string | null>>({})
  const [applySummary, setApplySummary] = useState<string>('')

  const resetState = () => {
    setStep('upload')
    setParsed(null)
    setFileName('')
    setOverrides({})
    setApplySummary('')
  }

  const handleClose = (next: boolean) => {
    if (!next) resetState()
    onOpenChange(next)
  }

  const matchedPreview = useMemo(() => {
    if (!parsed) return []
    return matchAnotacionPlayers(parsed.jugadores, convocados).map((row, i) => (
      i in overrides ? { ...row, convocatoria_id: overrides[i] } : row
    ))
  }, [parsed, convocados, overrides])

  const plan = useMemo(() => {
    if (!parsed) return null
    return planAnotacionesImport({ parsed, convocados, existing, overrides })
  }, [parsed, convocados, existing, overrides])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const result = parseAnotacionesFileText(text, { localia, equipoNombre, rivalNombre })
      if (result.avisos.includes('El archivo no es un JSON válido.')) {
        toast.error('El archivo no es un JSON válido')
        return
      }
      setFileName(file.name)
      setParsed(result)
      setOverrides({})
      setStep('preview')
    } catch (err) {
      console.error(err)
      toast.error('No se ha podido leer el archivo')
    }
  }

  const handleImport = async () => {
    if (!plan) return
    setStep('importing')
    try {
      await onApply(plan)
      const bits = []
      if (plan.score?.apply) bits.push(`marcador ${plan.score.gf}-${plan.score.gc}`)
      if (plan.matchedCount) bits.push(`${plan.matchedCount} jugador${plan.matchedCount === 1 ? '' : 'es'}`)
      if (plan.golesFavor.length || plan.golesContra.length) {
        bits.push(`${plan.golesFavor.length + plan.golesContra.length} goles detallados`)
      }
      setApplySummary(bits.length ? bits.join(', ') : 'datos del archivo')
      setStep('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al importar'
      toast.error(message)
      setStep('preview')
    }
  }

  const incomingStatKeys = parsed
    ? TEAM_STAT_KEYS.filter((k) => parsed.teamStats[k] != null || parsed.rivalStats[k] != null)
    : []

  const canApply = Boolean(
    plan && parsed && (
      plan.score?.apply
      || plan.matchedCount > 0
      || parsed.goles.length > 0
      || incomingStatKeys.length > 0
      || (plan.reflexion && plan.reflexion !== existing.reflexion)
    ),
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar anotaciones</DialogTitle>
          <DialogDescription>
            JSON del delegado (p. ej. AMISTOSO VS SAMCAM). Solo se rellena lo que trae el archivo;
            si un dato ya está en TrainingHub, se mantiene.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Arrastra o selecciona un archivo .json
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Marcador, minutos, goles, tarjetas y estadísticas de equipo. Lo que falte se deja en blanco.
            </p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFile}
                className="hidden"
              />
              <Button variant="outline" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar JSON
                </span>
              </Button>
            </label>
          </div>
        )}

        {step === 'preview' && parsed && plan && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Badge variant="outline">{fileName || 'archivo.json'}</Badge>
              {plan.score && (
                <Badge variant="outline" className={plan.score.apply ? 'bg-green-50' : 'bg-amber-50 text-amber-800'}>
                  {plan.score.apply ? `Marcador ${plan.score.gf}-${plan.score.gc}` : `Marcador JSON ${plan.score.gf}-${plan.score.gc} (no pisa)`}
                </Badge>
              )}
              <Badge variant="outline" className="bg-green-50">
                {plan.matchedCount} emparejados
              </Badge>
              {plan.unmatched.length > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {plan.unmatched.length} sin convocatoria
                </Badge>
              )}
            </div>

            {plan.avisos.length > 0 && (
              <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 space-y-1">
                {plan.avisos.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}

            {parsed.jugadores.length > 0 && (
              <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b text-left">
                      <th className="px-2 py-1.5 font-medium">JSON</th>
                      <th className="px-2 py-1.5 font-medium">Convocado</th>
                      <th className="px-2 py-1.5 font-medium text-center text-[10px]">Min</th>
                      <th className="px-2 py-1.5 font-medium text-center text-[10px]">G</th>
                      <th className="px-2 py-1.5 font-medium text-center text-[10px]">A</th>
                      <th className="px-2 py-1.5 font-medium text-center text-[10px]">TA</th>
                      <th className="px-2 py-1.5 font-medium text-center text-[10px]">TR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchedPreview.map((row, i) => (
                      <tr key={i} className={`border-b ${!row.convocatoria_id ? 'bg-red-50/60' : ''}`}>
                        <td className="px-2 py-1.5 text-xs">
                          {row.dorsal != null ? `${row.dorsal}. ` : ''}{row.nombre || '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            className={`w-full rounded border px-2 py-1 text-xs ${!row.convocatoria_id ? 'border-red-300 bg-red-50' : 'bg-background'}`}
                            value={row.convocatoria_id || ''}
                            onChange={(e) => setOverrides((prev) => ({ ...prev, [i]: e.target.value || null }))}
                          >
                            <option value="">— Sin asignar —</option>
                            {convocados.map((c) => (
                              <option key={c.id} value={c.id}>{convLabel(c)}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs">{row.minutos ?? '—'}</td>
                        <td className="px-2 py-1.5 text-center text-xs">{row.goles ?? '—'}</td>
                        <td className="px-2 py-1.5 text-center text-xs">{row.asistencias ?? '—'}</td>
                        <td className="px-2 py-1.5 text-center text-xs">{row.amarilla ? '●' : '—'}</td>
                        <td className="px-2 py-1.5 text-center text-xs">{row.roja ? '●' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(parsed.goles.length > 0 || incomingStatKeys.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                {parsed.goles.length > 0 && (
                  <div className="rounded-md border p-2 space-y-1">
                    <p className="font-medium">Goles del archivo</p>
                    {parsed.goles.map((g, i) => (
                      <p key={i} className="text-muted-foreground">
                        {g.minuto}&apos; {g.en_contra ? 'en contra' : 'a favor'}
                        {g.jugador ? ` · ${g.jugador}` : ''}
                        {g.asistencia ? ` (asiste ${g.asistencia})` : ''}
                      </p>
                    ))}
                  </div>
                )}
                {incomingStatKeys.length > 0 && plan && (
                  <div className="rounded-md border p-2 space-y-1">
                    <p className="font-medium">Estadísticas que se rellenan</p>
                    {incomingStatKeys.map((k) => (
                      <p key={k} className="text-muted-foreground">
                        {STAT_LABELS[k] || k}: {plan.teamStats[k] || 0}
                        {' / '}
                        {plan.teamStats[`rival_${k}`] || 0}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {convocados.length === 0 && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Este partido no tiene convocatoria. Se puede importar el marcador y las estadísticas de equipo, pero no los minutos de jugadores.
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={resetState}>
                Volver
              </Button>
              <Button onClick={handleImport} disabled={!canApply}>
                Aplicar anotaciones
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground">Guardando en el informe…</p>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-8 space-y-4">
            <Check className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-bold">Anotaciones importadas</p>
              <p className="text-sm text-muted-foreground">{applySummary}</p>
            </div>
            <Button onClick={() => handleClose(false)}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
