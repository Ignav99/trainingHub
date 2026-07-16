'use client'

import { useState, KeyboardEvent } from 'react'
import { CloudSun, Loader2, MapPin, Pill, RefreshCw, Utensils, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { NutricionPartidoPlan } from '@/types'
import { defaultNutricionPartidoPlan } from '@/lib/microcicloNutricionSync'
import { fetchMatchWeatherEstimate } from '@/lib/matchWeatherEstimate'

const DEFAULT_LUGAR = 'Madrid'

interface NutricionPartidoEditorProps {
  data?: NutricionPartidoPlan
  onChange: (data: NutricionPartidoPlan) => void
  horaPartido?: string
  fechaPartido?: string
  ciudadPartido?: string
}

function toDateInputValue(fecha?: string): string {
  if (!fecha) return ''
  // Accept YYYY-MM-DD or ISO
  return fecha.slice(0, 10)
}

function toTimeInputValue(hora?: string): string {
  if (!hora) return ''
  // Accept HH:MM or HH:MM:SS
  const m = hora.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return ''
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

function normalizePlan(
  data: NutricionPartidoPlan | undefined,
  defaults: { fecha?: string; hora?: string; lugar?: string }
): NutricionPartidoPlan {
  const base = data ?? defaultNutricionPartidoPlan()
  const legacySups = (data as NutricionPartidoPlan | undefined)?.suplementaciones ?? []
  const legacyTags = legacySups.flatMap((s) => s.etiquetas ?? []).filter(Boolean)
  const etiquetas = Array.from(new Set([...(base.etiquetas ?? []), ...legacyTags]))

  return {
    clima_fecha: base.clima_fecha || defaults.fecha || '',
    clima_hora: base.clima_hora || defaults.hora || '',
    clima_lugar: base.clima_lugar || defaults.lugar || DEFAULT_LUGAR,
    clima_estimacion: base.clima_estimacion ?? '',
    clima_actualizado_at: base.clima_actualizado_at,
    clima_resumen: base.clima_resumen,
    argumento_suplementacion: base.argumento_suplementacion ?? '',
    etiquetas,
    comida_recomendada: base.comida_recomendada ?? '',
    notas: base.notas ?? '',
  }
}

function comidaHint(hora?: string): string {
  if (!hora) {
    return 'Opcional: comida principal 3-4 h antes (HC, poca grasa/fibra).'
  }
  const h = parseInt(hora.split(':')[0] ?? '16', 10)
  if (h < 14) {
    return 'Partido matinal: desayuno copioso 3 h antes; snack ligero 1 h antes si hace falta.'
  }
  if (h < 18) {
    return 'Partido tarde: comida 3-4 h antes; merienda ligera 1-1,5 h antes si es necesario.'
  }
  return 'Partido nocturno: comida tardía 4 h antes; snack HC 1 h antes; cena post-partido de recuperación.'
}

export function NutricionPartidoEditor({
  data,
  onChange,
  horaPartido,
  fechaPartido,
  ciudadPartido,
}: NutricionPartidoEditorProps) {
  const planDefaults = {
    fecha: toDateInputValue(fechaPartido),
    hora: toTimeInputValue(horaPartido),
    lugar: (ciudadPartido || '').trim() || DEFAULT_LUGAR,
  }
  const plan = normalizePlan(data, planDefaults)
  const [tagInput, setTagInput] = useState('')
  const [loadingClima, setLoadingClima] = useState(false)

  const update = (patch: Partial<NutricionPartidoPlan>) => onChange({ ...plan, ...patch })

  const addTag = () => {
    const tag = tagInput.trim()
    if (!tag) return
    const current = plan.etiquetas ?? []
    if (current.includes(tag)) {
      setTagInput('')
      return
    }
    update({ etiquetas: [...current, tag] })
    setTagInput('')
  }

  const handleTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const handleActualizarClima = async () => {
    const fecha = (plan.clima_fecha || '').trim()
    const hora = (plan.clima_hora || '').trim()
    const lugar = (plan.clima_lugar || '').trim() || DEFAULT_LUGAR

    if (!fecha) {
      toast.error('Indica la fecha del partido para consultar el clima')
      return
    }

    setLoadingClima(true)
    try {
      const result = await fetchMatchWeatherEstimate({
        fecha,
        hora: hora || undefined,
        ciudad: lugar,
      })
      update({
        clima_fecha: fecha,
        clima_hora: hora,
        clima_lugar: lugar,
        clima_estimacion: result.texto,
        clima_resumen: result.resumen,
        clima_actualizado_at: new Date().toISOString(),
      })
      toast.success('Clima actualizado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al consultar el clima')
    } finally {
      setLoadingClima(false)
    }
  }

  const resumen = plan.clima_resumen
  const horaEfectiva = plan.clima_hora || horaPartido

  return (
    <div className="rounded-lg border border-green-200 bg-green-50/40 p-3 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Pill className="h-4 w-4 text-green-700" />
        <p className="text-xs font-semibold text-green-900">Nutrición / suplementación partido</p>
      </div>

      {/* 1. Consulta climática */}
      <div className="space-y-2 rounded-md border bg-white/70 p-3">
        <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
          <CloudSun className="h-3 w-3" />
          Consulta climática del partido
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-[9px] text-muted-foreground">Fecha</Label>
            <Input
              type="date"
              value={plan.clima_fecha ?? ''}
              onChange={(e) => update({ clima_fecha: e.target.value })}
              className="h-8 text-xs bg-white"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] text-muted-foreground">Hora</Label>
            <Input
              type="time"
              value={plan.clima_hora ?? ''}
              onChange={(e) => update({ clima_hora: e.target.value })}
              className="h-8 text-xs bg-white"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Lugar
            </Label>
            <Input
              value={plan.clima_lugar ?? DEFAULT_LUGAR}
              onChange={(e) => update({ clima_lugar: e.target.value })}
              placeholder="Madrid"
              className="h-8 text-xs bg-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-[9px] text-muted-foreground">
            Por defecto lugar = Madrid. Rellena y pulsa Actualizar.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[10px] shrink-0"
            onClick={handleActualizarClima}
            disabled={loadingClima}
          >
            {loadingClima ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Actualizar
          </Button>
        </div>

        {(resumen?.temperatura_c != null || resumen?.ciudad) && (
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {resumen.ciudad && <Badge variant="secondary">{resumen.ciudad}</Badge>}
            {resumen.temperatura_c != null && (
              <Badge variant="outline">{resumen.temperatura_c}°C</Badge>
            )}
            {resumen.humedad_pct != null && (
              <Badge variant="outline">Humedad {resumen.humedad_pct}%</Badge>
            )}
            {resumen.viento_kmh != null && (
              <Badge variant="outline">Viento {resumen.viento_kmh} km/h</Badge>
            )}
            {resumen.precipitacion_prob != null && resumen.precipitacion_prob > 0 && (
              <Badge variant="outline">Lluvia {resumen.precipitacion_prob}%</Badge>
            )}
            {resumen.condicion && <Badge variant="outline">{resumen.condicion}</Badge>}
          </div>
        )}

        <Textarea
          rows={4}
          value={plan.clima_estimacion ?? ''}
          readOnly
          placeholder="Pulsa Actualizar para obtener el tiempo exacto y la argumentación nutricional..."
          className="text-xs resize-none bg-muted/30 text-muted-foreground"
        />
        {plan.clima_actualizado_at && (
          <p className="text-[9px] text-muted-foreground">
            Actualizado{' '}
            {new Date(plan.clima_actualizado_at).toLocaleString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>

      {/* 2. Argumento nutricionista */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">
          Argumento de suplementación (nutricionista / fisio)
        </Label>
        <Textarea
          rows={3}
          value={plan.argumento_suplementacion ?? ''}
          onChange={(e) => update({ argumento_suplementacion: e.target.value })}
          placeholder="Describe el argumento de la suplementación que vas a aplicar en este partido..."
          className="text-xs resize-none bg-white"
        />
      </div>

      {/* 3. Etiquetas */}
      <div className="space-y-1.5">
        <Label className="text-[10px] text-muted-foreground">Etiquetas</Label>
        {(plan.etiquetas?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1">
            {(plan.etiquetas ?? []).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] gap-0.5 pr-1">
                {tag}
                <button
                  type="button"
                  onClick={() =>
                    update({ etiquetas: (plan.etiquetas ?? []).filter((t) => t !== tag) })
                  }
                  className="hover:text-destructive ml-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKey}
          placeholder="Añadir etiqueta y Enter..."
          className="h-7 text-[10px] bg-white"
        />
      </div>

      {/* 4. Comida opcional */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Utensils className="h-3 w-3" />
          Comida según hora del partido (opcional)
        </Label>
        <p className="text-[10px] text-muted-foreground">{comidaHint(horaEfectiva)}</p>
        <Textarea
          rows={2}
          value={plan.comida_recomendada ?? ''}
          onChange={(e) => update({ comida_recomendada: e.target.value })}
          placeholder="Ej: Arroz + pollo 3,5 h antes; plátano 1 h antes..."
          className="text-xs resize-none bg-white"
        />
      </div>
    </div>
  )
}
