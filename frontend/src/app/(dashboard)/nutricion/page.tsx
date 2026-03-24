'use client'

import { useState, useMemo } from 'react'
import useSWR, { mutate } from 'swr'
import {
  UtensilsCrossed, Calendar, BookOpen, Users,
  Plus, Search, Trash2, Copy, Edit, Loader2,
  Droplets, Flame, X, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus, AlertCircle,
  Filter,
} from 'lucide-react'
import { useEquipoStore } from '@/stores/equipoStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { toast } from 'sonner'
import { nutricionApi } from '@/lib/api/nutricion'
import { apiKey, apiFetcher } from '@/lib/swr'
import type {
  PlantillaNutricional,
  PlanNutricionalDia,
  ComposicionCorporal,
  AlimentoItem,
  TipoComida,
  ContextoNutricional,
} from '@/types'

// ============ Constants ============

const TIPOS_COMIDA: { value: TipoComida; label: string; emoji: string }[] = [
  { value: 'desayuno', label: 'Desayuno', emoji: '🌅' },
  { value: 'almuerzo', label: 'Almuerzo', emoji: '🥪' },
  { value: 'comida', label: 'Comida', emoji: '🍽️' },
  { value: 'merienda', label: 'Merienda', emoji: '🍎' },
  { value: 'cena', label: 'Cena', emoji: '🌙' },
  { value: 'snack_pre', label: 'Snack Pre', emoji: '⚡' },
  { value: 'snack_post', label: 'Snack Post', emoji: '💪' },
]

const CONTEXTOS: { value: ContextoNutricional; label: string; color: string }[] = [
  { value: 'dia_normal', label: 'Día normal', color: 'bg-gray-100 text-gray-700' },
  { value: 'pre_partido', label: 'Pre-partido', color: 'bg-blue-100 text-blue-700' },
  { value: 'post_partido', label: 'Post-partido', color: 'bg-green-100 text-green-700' },
  { value: 'dia_descanso', label: 'Descanso', color: 'bg-purple-100 text-purple-700' },
  { value: 'viaje', label: 'Viaje', color: 'bg-amber-100 text-amber-700' },
  { value: 'cualquiera', label: 'Cualquiera', color: 'bg-gray-100 text-gray-600' },
]

const MACRO_COLORS = {
  proteinas: 'text-blue-600 bg-blue-50',
  carbos: 'text-amber-600 bg-amber-50',
  grasas: 'text-red-500 bg-red-50',
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getWeekStart(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

// ============ Main Component ============

export default function NutricionPage() {
  const { equipoActivo } = useEquipoStore()
  const [activeTab, setActiveTab] = useState<'hoy' | 'plantillas' | 'resumen'>('hoy')

  if (!equipoActivo) {
    return (
      <div className="p-6 text-center text-gray-500">Selecciona un equipo para ver la nutrición.</div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nutrición"
        description="Gestión de planes nutricionales, plantillas y composición corporal"
      />

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
        {[
          { key: 'hoy' as const, label: 'Hoy', icon: Calendar },
          { key: 'plantillas' as const, label: 'Plantillas', icon: BookOpen },
          { key: 'resumen' as const, label: 'Resumen', icon: Users },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'hoy' && <TabHoy equipoId={equipoActivo.id} />}
      {activeTab === 'plantillas' && <TabPlantillas equipoId={equipoActivo.id} />}
      {activeTab === 'resumen' && <TabResumen equipoId={equipoActivo.id} />}
    </div>
  )
}


// ============================================================
// TAB HOY — Daily Plan View
// ============================================================

function TabHoy({ equipoId }: { equipoId: string }) {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data: planes, isLoading } = useSWR<PlanNutricionalDia[]>(
    apiKey('/nutricion/planes', { equipo_id: equipoId, fecha: selectedDate }, ['equipo_id']),
    apiFetcher
  )

  const { data: contexto } = useSWR<{ contexto_sugerido: string; partido: any; label: string }>(
    apiKey('/nutricion/dia-partido', { equipo_id: equipoId, fecha: selectedDate }, ['equipo_id']),
    apiFetcher
  )

  const teamPlan = planes?.find((p) => !p.jugador_id)
  const playerPlans = planes?.filter((p) => p.jugador_id) || []

  const navigateDate = (days: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(formatDate(d))
  }

  return (
    <div className="space-y-4">
      {/* Date picker + context */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white rounded-lg border px-1">
          <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2 py-2 text-sm border-0 focus:ring-0"
          />
          <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={() => setSelectedDate(formatDate(new Date()))}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Hoy
        </button>

        {contexto && contexto.contexto_sugerido !== 'dia_normal' && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            {contexto.label}
          </Badge>
        )}

        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo plan
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : !planes?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Sin planes para esta fecha</p>
            <p className="text-sm mt-1">Crea un plan nutricional o aplica una plantilla</p>
            <Button size="sm" className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Crear plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Team plan */}
          {teamPlan && (
            <PlanCard plan={teamPlan} label="Plan de equipo" equipoId={equipoId} fecha={selectedDate} />
          )}

          {/* Player-specific plans */}
          {playerPlans.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {playerPlans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} equipoId={equipoId} fecha={selectedDate} />
              ))}
            </div>
          )}
        </div>
      )}

      {showCreateDialog && (
        <CreatePlanDialog
          equipoId={equipoId}
          fecha={selectedDate}
          contextoSugerido={contexto?.contexto_sugerido}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  )
}

function PlanCard({ plan, label, equipoId, fecha }: { plan: PlanNutricionalDia; label?: string; equipoId: string; fecha: string }) {
  const [deleting, setDeleting] = useState(false)

  const totalCals = plan.comidas.reduce((sum, c) => sum + (c.calorias || 0), 0)
  const totalProt = plan.comidas.reduce((sum, c) => sum + (c.proteinas_g || 0), 0)
  const totalCarbs = plan.comidas.reduce((sum, c) => sum + (c.carbos_g || 0), 0)
  const totalFat = plan.comidas.reduce((sum, c) => sum + (c.grasas_g || 0), 0)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await nutricionApi.deletePlan(plan.id)
      toast.success('Plan eliminado')
      mutate((key: string) => typeof key === 'string' && key.includes('/nutricion/planes'))
    } catch { toast.error('Error al eliminar plan') }
    setDeleting(false)
  }

  const ctx = CONTEXTOS.find((c) => c.value === plan.contexto)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{label || (plan.jugador_id ? 'Plan individual' : 'Plan')}</CardTitle>
            {ctx && <span className={`text-xs px-2 py-0.5 rounded-full ${ctx.color}`}>{ctx.label}</span>}
          </div>
          <button onClick={handleDelete} disabled={deleting} className="text-gray-400 hover:text-red-500">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Macro summary */}
        <div className="flex gap-3 text-xs">
          <span className={`px-2 py-1 rounded ${MACRO_COLORS.proteinas}`}>
            <Flame className="h-3 w-3 inline mr-1" />{totalCals || plan.calorias_objetivo || 0} kcal
          </span>
          <span className={`px-2 py-1 rounded ${MACRO_COLORS.proteinas}`}>{totalProt.toFixed(0)}g prot</span>
          <span className={`px-2 py-1 rounded ${MACRO_COLORS.carbos}`}>{totalCarbs.toFixed(0)}g carbs</span>
          <span className={`px-2 py-1 rounded ${MACRO_COLORS.grasas}`}>{totalFat.toFixed(0)}g grasas</span>
          {plan.hidratacion_litros && (
            <span className="px-2 py-1 rounded bg-cyan-50 text-cyan-600">
              <Droplets className="h-3 w-3 inline mr-1" />{plan.hidratacion_litros}L
            </span>
          )}
        </div>

        {/* Meals */}
        <div className="space-y-2">
          {plan.comidas.map((comida, idx) => {
            const tipo = TIPOS_COMIDA.find((t) => t.value === comida.tipo_comida)
            return (
              <div key={idx} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                <span className="text-sm w-20 text-gray-500 shrink-0">
                  {tipo?.emoji} {tipo?.label || comida.tipo_comida}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{comida.nombre}</span>
                  {comida.hora_sugerida && (
                    <span className="text-xs text-gray-400 ml-2">{comida.hora_sugerida}</span>
                  )}
                  {comida.alimentos.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {comida.alimentos.map((a) => a.nombre).join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{comida.calorias || 0} kcal</span>
              </div>
            )
          })}
        </div>

        {plan.notas && (
          <p className="text-xs text-gray-500 italic">{plan.notas}</p>
        )}
      </CardContent>
    </Card>
  )
}


// ============ Create Plan Dialog ============

function CreatePlanDialog({
  equipoId, fecha, contextoSugerido, onClose,
}: {
  equipoId: string; fecha: string; contextoSugerido?: string; onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [contexto, setContexto] = useState(contextoSugerido || 'dia_normal')
  const [comidas, setComidas] = useState<Array<{
    tipo_comida: string; nombre: string; alimentos: AlimentoItem[];
    calorias: number; proteinas_g: number; carbos_g: number; grasas_g: number; hora_sugerida: string
  }>>([])
  const [hidratacion, setHidratacion] = useState('')
  const [notas, setNotas] = useState('')

  // Load templates for quick-add
  const { data: plantillas } = useSWR<PlantillaNutricional[]>(
    apiKey('/nutricion/plantillas', { equipo_id: equipoId }, ['equipo_id']),
    apiFetcher
  )

  const addComidaFromPlantilla = (p: PlantillaNutricional) => {
    setComidas([...comidas, {
      tipo_comida: p.tipo_comida,
      nombre: p.nombre,
      alimentos: p.alimentos,
      calorias: p.calorias_total || 0,
      proteinas_g: p.proteinas_total_g || 0,
      carbos_g: p.carbohidratos_total_g || 0,
      grasas_g: p.grasas_total_g || 0,
      hora_sugerida: '',
    }])
  }

  const addEmptyComida = () => {
    setComidas([...comidas, {
      tipo_comida: 'comida', nombre: '', alimentos: [],
      calorias: 0, proteinas_g: 0, carbos_g: 0, grasas_g: 0, hora_sugerida: '',
    }])
  }

  const removeComida = (idx: number) => setComidas(comidas.filter((_, i) => i !== idx))

  const updateComida = (idx: number, field: string, value: any) => {
    const updated = [...comidas]
    ;(updated[idx] as any)[field] = value
    setComidas(updated)
  }

  const handleSave = async () => {
    if (!comidas.length) { toast.error('Agrega al menos una comida'); return }
    setSaving(true)
    try {
      await nutricionApi.createPlan({
        equipo_id: equipoId,
        fecha,
        contexto,
        comidas,
        hidratacion_litros: hidratacion ? parseFloat(hidratacion) : undefined,
        notas: notas || undefined,
      })
      toast.success('Plan creado')
      mutate((key: string) => typeof key === 'string' && key.includes('/nutricion/planes'))
      onClose()
    } catch { toast.error('Error al crear plan') }
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo plan nutricional — {fecha}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context */}
          <div>
            <label className="text-sm font-medium text-gray-700">Contexto</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CONTEXTOS.filter((c) => c.value !== 'cualquiera').map((c) => (
                <button
                  key={c.value}
                  onClick={() => setContexto(c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    contexto === c.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick-add from templates */}
          {plantillas && plantillas.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700">Agregar desde plantilla</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {plantillas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addComidaFromPlantilla(p)}
                    className="text-xs px-2.5 py-1.5 bg-gray-50 border rounded-md hover:bg-gray-100 transition"
                  >
                    {TIPOS_COMIDA.find((t) => t.value === p.tipo_comida)?.emoji} {p.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Meals */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Comidas</label>
              <Button size="sm" variant="outline" onClick={addEmptyComida}>
                <Plus className="h-3 w-3 mr-1" /> Agregar
              </Button>
            </div>
            <div className="space-y-3">
              {comidas.map((comida, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                  <div className="flex gap-2 items-center">
                    <select
                      value={comida.tipo_comida}
                      onChange={(e) => updateComida(idx, 'tipo_comida', e.target.value)}
                      className="text-sm border rounded px-2 py-1.5"
                    >
                      {TIPOS_COMIDA.map((t) => (
                        <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                      ))}
                    </select>
                    <Input
                      placeholder="Nombre de la comida"
                      value={comida.nombre}
                      onChange={(e) => updateComida(idx, 'nombre', e.target.value)}
                      className="flex-1 h-8 text-sm"
                    />
                    <Input
                      type="time"
                      value={comida.hora_sugerida}
                      onChange={(e) => updateComida(idx, 'hora_sugerida', e.target.value)}
                      className="w-28 h-8 text-sm"
                    />
                    <button onClick={() => removeComida(idx)} className="text-gray-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Calorías</label>
                      <Input type="number" value={comida.calorias || ''} onChange={(e) => updateComida(idx, 'calorias', +e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-blue-500">Proteínas (g)</label>
                      <Input type="number" value={comida.proteinas_g || ''} onChange={(e) => updateComida(idx, 'proteinas_g', +e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-amber-500">Carbos (g)</label>
                      <Input type="number" value={comida.carbos_g || ''} onChange={(e) => updateComida(idx, 'carbos_g', +e.target.value)} className="h-7 text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-red-500">Grasas (g)</label>
                      <Input type="number" value={comida.grasas_g || ''} onChange={(e) => updateComida(idx, 'grasas_g', +e.target.value)} className="h-7 text-xs" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hydration + notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Hidratación (litros)</label>
              <Input type="number" step="0.5" min="0" value={hidratacion} onChange={(e) => setHidratacion(e.target.value)} placeholder="3.0" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Notas</label>
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..." className="mt-1" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Guardar plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


// ============================================================
// TAB PLANTILLAS — Meal Template Library
// ============================================================

function TabPlantillas({ equipoId }: { equipoId: string }) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingPlantilla, setEditingPlantilla] = useState<PlantillaNutricional | null>(null)
  const [filterTipo, setFilterTipo] = useState<string>('')
  const [filterContexto, setFilterContexto] = useState<string>('')

  const { data: plantillas, isLoading } = useSWR<PlantillaNutricional[]>(
    apiKey('/nutricion/plantillas', { equipo_id: equipoId, tipo_comida: filterTipo, contexto: filterContexto }, ['equipo_id']),
    apiFetcher
  )

  const grouped = useMemo(() => {
    if (!plantillas) return {}
    const groups: Record<string, PlantillaNutricional[]> = {}
    for (const p of plantillas) {
      const key = p.tipo_comida
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }
    return groups
  }, [plantillas])

  const handleDelete = async (id: string) => {
    try {
      await nutricionApi.deletePlantilla(id)
      toast.success('Plantilla eliminada')
      mutate((key: string) => typeof key === 'string' && key.includes('/nutricion/plantillas'))
    } catch { toast.error('Error al eliminar') }
  }

  const handleDuplicate = async (p: PlantillaNutricional) => {
    try {
      await nutricionApi.createPlantilla({
        equipo_id: equipoId,
        nombre: `${p.nombre} (copia)`,
        tipo_comida: p.tipo_comida,
        contexto: p.contexto,
        descripcion: p.descripcion,
        alimentos: p.alimentos,
        calorias_total: p.calorias_total,
        proteinas_total_g: p.proteinas_total_g,
        carbohidratos_total_g: p.carbohidratos_total_g,
        grasas_total_g: p.grasas_total_g,
        notas: p.notas,
      })
      toast.success('Plantilla duplicada')
      mutate((key: string) => typeof key === 'string' && key.includes('/nutricion/plantillas'))
    } catch { toast.error('Error al duplicar') }
  }

  return (
    <div className="space-y-4">
      {/* Filters + create button */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="text-sm border rounded-md px-3 py-2"
        >
          <option value="">Todas las comidas</option>
          {TIPOS_COMIDA.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
        </select>
        <select
          value={filterContexto}
          onChange={(e) => setFilterContexto(e.target.value)}
          className="text-sm border rounded-md px-3 py-2"
        >
          <option value="">Todos los contextos</option>
          {CONTEXTOS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div className="ml-auto">
          <Button size="sm" onClick={() => { setEditingPlantilla(null); setShowCreate(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Nueva plantilla
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : !plantillas?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Sin plantillas</p>
            <p className="text-sm mt-1">Crea plantillas reutilizables para las comidas del equipo</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([tipo, items]) => {
          const tipoInfo = TIPOS_COMIDA.find((t) => t.value === tipo)
          return (
            <div key={tipo}>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                {tipoInfo?.emoji} {tipoInfo?.label || tipo}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => {
                  const ctx = CONTEXTOS.find((c) => c.value === p.contexto)
                  return (
                    <Card key={p.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-sm">{p.nombre}</h4>
                            {ctx && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ctx.color}`}>{ctx.label}</span>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditingPlantilla(p); setShowCreate(true) }} className="text-gray-400 hover:text-blue-500">
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDuplicate(p)} className="text-gray-400 hover:text-green-500">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {p.descripcion && <p className="text-xs text-gray-500 mb-2">{p.descripcion}</p>}

                        <div className="flex gap-2 text-[10px] flex-wrap">
                          {p.calorias_total && <span className="bg-gray-100 px-1.5 py-0.5 rounded">{p.calorias_total} kcal</span>}
                          {p.proteinas_total_g && <span className={`px-1.5 py-0.5 rounded ${MACRO_COLORS.proteinas}`}>{p.proteinas_total_g}g P</span>}
                          {p.carbohidratos_total_g && <span className={`px-1.5 py-0.5 rounded ${MACRO_COLORS.carbos}`}>{p.carbohidratos_total_g}g C</span>}
                          {p.grasas_total_g && <span className={`px-1.5 py-0.5 rounded ${MACRO_COLORS.grasas}`}>{p.grasas_total_g}g G</span>}
                        </div>

                        {p.alimentos.length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-2 truncate">
                            {p.alimentos.map((a) => a.nombre).join(', ')}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {showCreate && (
        <PlantillaDialog
          equipoId={equipoId}
          existing={editingPlantilla}
          onClose={() => { setShowCreate(false); setEditingPlantilla(null) }}
        />
      )}
    </div>
  )
}


// ============ Plantilla Create/Edit Dialog ============

function PlantillaDialog({
  equipoId, existing, onClose,
}: {
  equipoId: string; existing: PlantillaNutricional | null; onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [nombre, setNombre] = useState(existing?.nombre || '')
  const [tipoComida, setTipoComida] = useState<string>(existing?.tipo_comida || 'comida')
  const [contexto, setContexto] = useState<string>(existing?.contexto || '')
  const [descripcion, setDescripcion] = useState(existing?.descripcion || '')
  const [alimentos, setAlimentos] = useState<AlimentoItem[]>(existing?.alimentos || [])
  const [calorias, setCalorias] = useState(existing?.calorias_total?.toString() || '')
  const [proteinas, setProteinas] = useState(existing?.proteinas_total_g?.toString() || '')
  const [carbos, setCarbos] = useState(existing?.carbohidratos_total_g?.toString() || '')
  const [grasas, setGrasas] = useState(existing?.grasas_total_g?.toString() || '')
  const [notas, setNotas] = useState(existing?.notas || '')

  const addAlimento = () => setAlimentos([...alimentos, { nombre: '', cantidad_g: 0, calorias: 0, proteinas_g: 0, carbohidratos_g: 0, grasas_g: 0 }])
  const removeAlimento = (idx: number) => setAlimentos(alimentos.filter((_, i) => i !== idx))
  const updateAlimento = (idx: number, field: string, value: any) => {
    const updated = [...alimentos]
    ;(updated[idx] as any)[field] = value
    setAlimentos(updated)
  }

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Nombre es requerido'); return }
    setSaving(true)
    const payload = {
      equipo_id: equipoId,
      nombre,
      tipo_comida: tipoComida,
      contexto: contexto || undefined,
      descripcion: descripcion || undefined,
      alimentos,
      calorias_total: calorias ? parseInt(calorias) : undefined,
      proteinas_total_g: proteinas ? parseFloat(proteinas) : undefined,
      carbohidratos_total_g: carbos ? parseFloat(carbos) : undefined,
      grasas_total_g: grasas ? parseFloat(grasas) : undefined,
      notas: notas || undefined,
    }
    try {
      if (existing) {
        const { equipo_id, ...updateData } = payload
        await nutricionApi.updatePlantilla(existing.id, updateData)
        toast.success('Plantilla actualizada')
      } else {
        await nutricionApi.createPlantilla(payload)
        toast.success('Plantilla creada')
      }
      mutate((key: string) => typeof key === 'string' && key.includes('/nutricion/plantillas'))
      onClose()
    } catch { toast.error('Error al guardar') }
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? 'Editar' : 'Nueva'} plantilla</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de comida</label>
              <select value={tipoComida} onChange={(e) => setTipoComida(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                {TIPOS_COMIDA.map((t) => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Contexto</label>
              <select value={contexto} onChange={(e) => setContexto(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                <option value="">Sin contexto</option>
                {CONTEXTOS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="mt-1" />
            </div>
          </div>

          {/* Alimentos table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Alimentos</label>
              <Button size="sm" variant="outline" onClick={addAlimento}>
                <Plus className="h-3 w-3 mr-1" /> Agregar
              </Button>
            </div>
            {alimentos.length > 0 && (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_60px_60px_60px_60px_60px_28px] gap-1 text-[10px] text-gray-500 px-1">
                  <span>Alimento</span><span>g</span><span>kcal</span><span>P</span><span>C</span><span>G</span><span></span>
                </div>
                {alimentos.map((a, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_60px_60px_60px_60px_60px_28px] gap-1 items-center">
                    <Input value={a.nombre} onChange={(e) => updateAlimento(idx, 'nombre', e.target.value)} className="h-7 text-xs" placeholder="Nombre" />
                    <Input type="number" value={a.cantidad_g || ''} onChange={(e) => updateAlimento(idx, 'cantidad_g', +e.target.value)} className="h-7 text-xs" />
                    <Input type="number" value={a.calorias || ''} onChange={(e) => updateAlimento(idx, 'calorias', +e.target.value)} className="h-7 text-xs" />
                    <Input type="number" value={a.proteinas_g || ''} onChange={(e) => updateAlimento(idx, 'proteinas_g', +e.target.value)} className="h-7 text-xs" />
                    <Input type="number" value={a.carbohidratos_g || ''} onChange={(e) => updateAlimento(idx, 'carbohidratos_g', +e.target.value)} className="h-7 text-xs" />
                    <Input type="number" value={a.grasas_g || ''} onChange={(e) => updateAlimento(idx, 'grasas_g', +e.target.value)} className="h-7 text-xs" />
                    <button onClick={() => removeAlimento(idx)} className="text-gray-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Macros totals */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500">Calorías total</label>
              <Input type="number" value={calorias} onChange={(e) => setCalorias(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-blue-500">Proteínas (g)</label>
              <Input type="number" value={proteinas} onChange={(e) => setProteinas(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-amber-500">Carbos (g)</label>
              <Input type="number" value={carbos} onChange={(e) => setCarbos(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-red-500">Grasas (g)</label>
              <Input type="number" value={grasas} onChange={(e) => setGrasas(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Notas</label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="mt-1" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {existing ? 'Guardar cambios' : 'Crear plantilla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


// ============================================================
// TAB RESUMEN — Team Overview
// ============================================================

function TabResumen({ equipoId }: { equipoId: string }) {
  const [filterHasPlan, setFilterHasPlan] = useState<'all' | 'with' | 'without'>('all')
  const hoy = formatDate(new Date())

  const { data: jugadores, isLoading: loadingJugadores } = useSWR(
    apiKey('/jugadores', { equipo_id: equipoId }, ['equipo_id']),
    apiFetcher
  )

  const { data: planes } = useSWR<PlanNutricionalDia[]>(
    apiKey('/nutricion/planes', { equipo_id: equipoId, fecha: hoy }, ['equipo_id']),
    apiFetcher
  )

  const { data: composiciones } = useSWR<ComposicionCorporal[]>(
    apiKey('/nutricion/composicion', { equipo_id: equipoId }, ['equipo_id']),
    apiFetcher
  )

  const { data: suplementos } = useSWR(
    apiKey('/nutricion/suplementos', { equipo_id: equipoId, activo: true }, ['equipo_id']),
    apiFetcher
  )

  const playerRows = useMemo(() => {
    if (!jugadores) return []
    const jugadoresList = (jugadores as any)?.data || jugadores
    if (!Array.isArray(jugadoresList)) return []

    return jugadoresList.map((j: any) => {
      const hasPlan = planes?.some((p) => p.jugador_id === j.id || !p.jugador_id) || false
      const playerComps = (composiciones || []).filter((c) => c.jugador_id === j.id)
      const latestComp = playerComps[0]
      const prevComp = playerComps[1]
      const weightTrend = latestComp && prevComp
        ? latestComp.peso_kg > prevComp.peso_kg ? 'up' : latestComp.peso_kg < prevComp.peso_kg ? 'down' : 'stable'
        : null
      const supCount = Array.isArray(suplementos)
        ? (suplementos as any[]).filter((s) => s.jugador_id === j.id).length
        : 0

      return {
        id: j.id,
        nombre: j.nombre,
        apellidos: j.apellidos,
        dorsal: j.dorsal,
        posicion_principal: j.posicion_principal,
        peso: latestComp?.peso_kg,
        grasa: latestComp?.porcentaje_grasa,
        hasPlan,
        weightTrend,
        supCount,
      }
    })
  }, [jugadores, planes, composiciones, suplementos])

  const filteredRows = useMemo(() => {
    if (filterHasPlan === 'with') return playerRows.filter((r) => r.hasPlan)
    if (filterHasPlan === 'without') return playerRows.filter((r) => !r.hasPlan)
    return playerRows
  }, [playerRows, filterHasPlan])

  const stats = useMemo(() => ({
    withPlan: playerRows.filter((r) => r.hasPlan).length,
    total: playerRows.length,
    pct: playerRows.length ? Math.round((playerRows.filter((r) => r.hasPlan).length / playerRows.length) * 100) : 0,
  }), [playerRows])

  if (loadingJugadores) {
    return <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500 mb-1">Planes asignados hoy</p>
            <p className="text-2xl font-bold">{stats.withPlan} / {stats.total}</p>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${stats.pct}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500 mb-1">Jugadores con datos corporales</p>
            <p className="text-2xl font-bold">
              {playerRows.filter((r) => r.peso).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-gray-500 mb-1">Suplementos activos</p>
            <p className="text-2xl font-bold">
              {playerRows.reduce((sum, r) => sum + r.supCount, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'with', 'without'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterHasPlan(f)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filterHasPlan === f ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'with' ? 'Con plan' : 'Sin plan'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500 text-xs">
              <th className="pb-2 font-medium">#</th>
              <th className="pb-2 font-medium">Jugador</th>
              <th className="pb-2 font-medium">Pos</th>
              <th className="pb-2 font-medium">Peso</th>
              <th className="pb-2 font-medium">% Grasa</th>
              <th className="pb-2 font-medium">Supl.</th>
              <th className="pb-2 font-medium">Plan hoy</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-2 text-gray-400">{r.dorsal || '-'}</td>
                <td className="py-2 font-medium">{r.nombre} {r.apellidos}</td>
                <td className="py-2 text-gray-500">{r.posicion_principal}</td>
                <td className="py-2">
                  {r.peso ? (
                    <span className="flex items-center gap-1">
                      {r.peso} kg
                      {r.weightTrend === 'up' && <TrendingUp className="h-3 w-3 text-red-400" />}
                      {r.weightTrend === 'down' && <TrendingDown className="h-3 w-3 text-green-400" />}
                      {r.weightTrend === 'stable' && <Minus className="h-3 w-3 text-gray-300" />}
                    </span>
                  ) : <span className="text-gray-300">-</span>}
                </td>
                <td className="py-2">{r.grasa != null ? `${r.grasa}%` : <span className="text-gray-300">-</span>}</td>
                <td className="py-2">{r.supCount > 0 ? <Badge variant="outline" className="text-xs">{r.supCount}</Badge> : <span className="text-gray-300">0</span>}</td>
                <td className="py-2">
                  {r.hasPlan ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      Asignado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                      Sin plan
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
