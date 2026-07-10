'use client'

import { Apple, Droplets, Utensils, Cookie, Pill, HeartPulse, FileText, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { NutricionSemana } from '@/types'

interface NutricionSemanalEditorProps {
  data: NutricionSemana | undefined
  onChange: (data: NutricionSemana) => void
}

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  icon: typeof Apple
  value: string | undefined
  onChange: (v: string) => void
  placeholder: string
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Label>
      {hint && (
        <p className="text-[10px] text-muted-foreground flex items-start gap-1">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          {hint}
        </p>
      )}
      <Textarea
        rows={2}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-xs resize-none"
      />
    </div>
  )
}

export function NutricionSemanalEditor({ data, onChange }: NutricionSemanalEditorProps) {
  const d = data ?? {}

  const update = (patch: Partial<NutricionSemana>) => onChange({ ...d, ...patch })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Apple className="h-4 w-4 text-green-600" />
          Plan nutricional semanal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg bg-green-50 p-3 text-xs text-green-800">
          <p className="font-semibold mb-1">Recomendaciones generales</p>
          <ul className="space-y-1 list-disc pl-4">
            <li>Ajusta los hidratos de carbono según la intensidad del día: 5 g/kg en días ligeros, 6-8 g/kg en días de alta intensidad y 7 g/kg las 48h previas al partido.</li>
            <li>La comida principal pre-partido debe ser 3-4 horas antes: rica en HC, moderada en proteínas, baja en grasa/fibra.</li>
            <li>Recuperación post-esfuerzo: 1 g/kg de HC + 20-25 g de proteína en las primeras 2 horas.</li>
            <li>Hidratación: 5-7 ml/kg 2-4h antes, bebidas isotónicas durante esfuerzos &gt;60 min, y rehidratación post-partido.</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Plan de hidratos de carbono semanal"
            icon={Utensils}
            value={d.plan_ch_semanal}
            onChange={(v) => update({ plan_ch_semanal: v })}
            placeholder="Ej: Lunes 5g/kg, Miércoles/Jueves 6-8g/kg, Sábado 7g/kg..."
            hint="Carga de CH según intensidad y proximidad al partido."
          />
          <Field
            label="Hidratación pre-partido / pre-entreno"
            icon={Droplets}
            value={d.hidratacion_pre}
            onChange={(v) => update({ hidratacion_pre: v })}
            placeholder="5-7 ml/kg 2-4h antes. Bebida isotónica 30 min antes..."
            hint="Incluye cantidad, tipo de bebida y momento."
          />
          <Field
            label="Hidratación durante partido / entreno"
            icon={Droplets}
            value={d.hidratacion_durante}
            onChange={(v) => update({ hidratacion_durante: v })}
            placeholder="Bebidas isotónicas, 150-250 ml cada 15-20 min..."
            hint="Para esfuerzos &gt;60 min. Aprovechar descansos y bandas."
          />
          <Field
            label="Hidratación post-partido / post-entreno"
            icon={Droplets}
            value={d.hidratacion_post}
            onChange={(v) => update({ hidratacion_post: v })}
            placeholder="Recuperar 150% de pérdida de peso en 4-6h..."
            hint="Agua + electrolitos; monitorizar color de orina."
          />
          <Field
            label="Comida principal pre-partido"
            icon={Utensils}
            value={d.comida_pre_partido}
            onChange={(v) => update({ comida_pre_partido: v })}
            placeholder="Arroz/pasta con pollo a la plancha, verduras cocidas, 3-4h antes..."
            hint="Rica en HC, moderada en proteínas, baja en grasa/fibra."
          />
          <Field
            label="Comida / recuperación post-partido"
            icon={HeartPulse}
            value={d.comida_post_partido}
            onChange={(v) => update({ comida_post_partido: v })}
            placeholder="Batido recuperador (1g/kg CH + 20-25g proteína) y comida posterior..."
            hint="Incluye opciones para las primeras 2 horas y la cena."
          />
          <Field
            label="Snacks de entrenamiento"
            icon={Cookie}
            value={d.snacks_entrenamiento}
            onChange={(v) => update({ snacks_entrenamiento: v })}
            placeholder="Plátano, barrita energética, frutos secos..."
            hint="Según duración e intensidad de la sesión."
          />
          <Field
            label="Snacks de partido"
            icon={Cookie}
            value={d.snacks_partido}
            onChange={(v) => update({ snacks_partido: v })}
            placeholder="Gel / plátano en el descanso, si es necesario..."
            hint="Solo si el partido requiere más glucosa."
          />
          <Field
            label="Suplementación"
            icon={Pill}
            value={d.suplementacion}
            onChange={(v) => update({ suplementacion: v })}
            placeholder="Creatina, cafeína, omega-3, vitamina D..."
            hint="Dosis, momento y jugadores asignados."
          />
          <Field
            label="Estrategia de recuperación"
            icon={HeartPulse}
            value={d.recuperacion}
            onChange={(v) => update({ recuperacion: v })}
            placeholder="Caseína antes de dormir, masaje nutricional, control de peso..."
            hint="Pautas para optimizar la recuperación muscular."
          />
        </div>

        <Field
          label="Notas adicionales"
          icon={FileText}
          value={d.notas}
          onChange={(v) => update({ notas: v })}
          placeholder="Alergias, intolerancias, observaciones del nutricionista..."
        />
      </CardContent>
    </Card>
  )
}
